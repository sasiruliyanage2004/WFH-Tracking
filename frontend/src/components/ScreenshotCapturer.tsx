// frontend/src/components/ScreenshotCapturer.js
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { Box, Button, Typography, Alert, Paper, FormControlLabel, Switch } from '@mui/material';
import { CameraAlt as CameraIcon, Monitor as MonitorIcon } from '@mui/icons-material';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function ScreenshotCapturer({ isCheckedIn, productivity = 100 }) {
  const { token, isAuthenticated, user, onBreak } = useSelector((state: any) => state.auth);
  const [stream, setStream] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [screenshotRules, setScreenshotRules] = useState({
    threshold: 70,
    highProdInterval: 20,
    standardInterval: 5
  });
  const [privacyBlurEnabled, setPrivacyBlurEnabled] = useState(() => {
    const saved = localStorage.getItem('privacy_blur_enabled');
    return saved !== null ? saved === 'true' : true; // Default to true
  });
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const productivityRef = useRef(productivity);
  const screenshotRulesRef = useRef(screenshotRules);
  const captureAndUploadRef = useRef<any>(null);

  useEffect(() => {
    productivityRef.current = productivity;
  }, [productivity]);

  useEffect(() => {
    screenshotRulesRef.current = screenshotRules;
  }, [screenshotRules]);

  const handleToggleBlur = (event) => {
    const val = event.target.checked;
    setPrivacyBlurEnabled(val);
    localStorage.setItem('privacy_blur_enabled', String(val));
  };



  const fetchScreenshotRules = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/settings/screenshot-rules`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setScreenshotRules(res.data);
    } catch (err) {
      console.warn('Could not fetch screenshot rules setting.');
    }
  }, [token]);

  useEffect(() => {
    let interval;
    if (isAuthenticated && token && isCheckedIn && !onBreak) {
      fetchScreenshotRules();
      
      interval = setInterval(() => {
        // Poll for rules less frequently to save DB calls, or keep it every 5 min.
        // Actually, employee dashboard fetches productivity every 15s.
        // So we don't need to poll productivity here.
      }, 5 * 60 * 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAuthenticated, token, isCheckedIn, onBreak, fetchScreenshotRules]);

  // Request display media for capturing screenshots
  const startScreenCapture = async () => {
    try {
      setErrorMsg('');
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' } as any,
        audio: false
      });
      setStream(displayStream);
      setIsCapturing(true);
      
      // Keep track of stream end
      displayStream.getVideoTracks()[0].onended = () => {
        setStream(null);
        setIsCapturing(false);
        setErrorMsg('Screen share stopped. Mock screen capture active.');
      };
    } catch (err) {
      console.warn('Display Media capture denied or unavailable. Using simulator mode:', err.message);
      setErrorMsg('Display capture blocked. Using background simulator capture.');
      setIsCapturing(false);
    }
  };

  // Helper to apply Gaussian blur to base64 image data URL
  const applyBlur = (base64Data: string, blurLevel = 15): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Data;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.filter = `blur(${blurLevel}px)`;
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = () => {
        resolve(base64Data); // Fallback to original image if drawing fails
      };
    });
  };

  const stitchImages = async (base64Images: string[]): Promise<string> => {
    return new Promise((resolve) => {
      const images: HTMLImageElement[] = [];
      let loaded = 0;
      let totalWidth = 0;
      let maxHeight = 0;

      base64Images.forEach((base64, index) => {
        const img = new Image();
        img.src = base64;
        img.onload = () => {
          images[index] = img;
          totalWidth += img.width;
          if (img.height > maxHeight) maxHeight = img.height;
          loaded++;
          if (loaded === base64Images.length) {
            const canvas = document.createElement('canvas');
            canvas.width = totalWidth;
            canvas.height = maxHeight;
            const ctx = canvas.getContext('2d');
            let currentX = 0;
            images.forEach((i) => {
              if (i) {
                ctx?.drawImage(i, currentX, 0);
                currentX += i.width;
              }
            });
            resolve(canvas.toDataURL('image/jpeg', 0.7));
          }
        };
        img.onerror = () => {
          loaded++;
          if (loaded === base64Images.length) {
            resolve(base64Images[0] || ''); // fallback to first image if stitching fails partially
          }
        };
      });
    });
  };

  // Perform actual screenshot capture and upload
  const captureAndUpload = useCallback(async () => {
    if (onBreak) return;
    try {
      let imageData = '';
      let captureSuccess = false;

      if (window.api && window.api.captureScreen) {
        try {
          // Native Electron screen capture (silent, no browser prompts!)
          const nativeImgData = await window.api.captureScreen();
          
          if (Array.isArray(nativeImgData) && nativeImgData.length > 0) {
            let finalImage = '';
            if (nativeImgData.length === 1) {
              finalImage = nativeImgData[0];
            } else {
              finalImage = await stitchImages(nativeImgData);
            }
            imageData = privacyBlurEnabled ? await applyBlur(finalImage, 15) : finalImage;
            captureSuccess = true;
          } else if (typeof nativeImgData === 'string' && nativeImgData.length > 200) {
            imageData = privacyBlurEnabled ? await applyBlur(nativeImgData, 15) : nativeImgData; // Apply privacy blur conditionally
            captureSuccess = true;
          } else {
            console.warn("Native screenshot captured empty or invalid image, falling back to simulator");
          }
        } catch (err) {
          console.warn("Native screen capture failed, falling back to simulator:", err.message);
        }
      }

      if (!captureSuccess && isCapturing && stream) {
        // Capture from screen stream
        const canvas = canvasRef.current;
        const video = videoRef.current;
        if (canvas && video) {
          const ctx = canvas.getContext('2d');
          canvas.width = video.videoWidth || 800;
          canvas.height = video.videoHeight || 600;
          if (privacyBlurEnabled) {
            ctx.filter = 'blur(15px)'; // Apply privacy blur directly to canvas
          } else {
            ctx.filter = 'none'; // Capture screen without blur
          }
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          imageData = canvas.toDataURL('image/jpeg', 0.7);
          captureSuccess = true;
        }
      }

      if (!captureSuccess) {
        // Simulator Fallback: Create a simulated canvas screenshot with user work info
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 768;
        const ctx = canvas.getContext('2d');

        // Draw gradient workspace representation
        const grad = ctx.createLinearGradient(0, 0, 1024, 768);
        grad.addColorStop(0, '#1e293b');
        grad.addColorStop(1, '#0f172a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1024, 768);

        // Draw header bar
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, 1024, 60);

        // Draw title
        ctx.fillStyle = '#38bdf8';
        ctx.font = '24px Inter, sans-serif';
        ctx.fillText('WFH Enterprise Workplace Simulator', 30, 40);

        // Draw some "editor panels"
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(30, 90, 600, 600); // Main code area
        ctx.fillRect(660, 90, 330, 280); // Terminal
        ctx.fillRect(660, 400, 330, 290); // Metrics

        // Draw content details
        ctx.fillStyle = '#64748b';
        ctx.font = '16px monospace';
        ctx.fillText('// Developer Workspace - ' + user?.name, 50, 130);
        ctx.fillText('const user = ' + JSON.stringify(user || {}), 50, 170);
        ctx.fillText('function trackProductivity() {', 50, 210);
        ctx.fillText('  const focus = Math.random() * 100;', 50, 240);
        ctx.fillText('  console.log("Telemetry running...");', 50, 270);
        ctx.fillText('}', 50, 300);

        ctx.fillStyle = '#4ade80';
        ctx.fillText('$ npm run dev', 680, 130);
        ctx.fillText('> backend@1.0.0 start', 680, 160);
        ctx.fillText('[Socket.io] Client connected.', 680, 190);

        ctx.fillStyle = '#e2e8f0';
        ctx.font = '18px Inter, sans-serif';
        ctx.fillText('Active tracking indicators:', 680, 440);
        ctx.fillText('- Geolocation: Active', 680, 480);
        ctx.fillText('- Keyboard state: Normal', 680, 520);
        
        // Draw time
        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px Inter, sans-serif';
        ctx.fillText('Timestamp: ' + new Date().toLocaleString(), 50, 660);

        imageData = canvas.toDataURL('image/jpeg', 0.7);
      }

      if (imageData) {
        try {
          await axios.post(
            `${API_URL}/api/monitoring/screenshot`,
            { image: imageData },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          console.log('Screenshot uploaded successfully.');
          // The dashboard already polls productivity every 15s.
        } catch (postErr) {
          console.warn('Screenshot upload failed. Checking for offline caching wrapper...', postErr.message);
          if (window.api && window.api.cacheOfflineScreenshot) {
            window.api.cacheOfflineScreenshot(imageData);
            console.log('Screenshot cached locally for offline mode.');
          } else {
            throw postErr;
          }
        }
      }
    } catch (err) {
      console.error('Failed to capture and upload screenshot:', err.message);
    }
  }, [onBreak, privacyBlurEnabled, isCapturing, stream, token, user]);

  useEffect(() => {
    captureAndUploadRef.current = captureAndUpload;
  }, [captureAndUpload]);

  // Wire video stream
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const hasTakenInitialScreenshot = useRef(false);

  // Periodic capture loop
  useEffect(() => {
    if (!isAuthenticated || !token || user?.role !== 'Employee' || !isCheckedIn || onBreak) {
      // Clean up stream if checked out or on break
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
        setIsCapturing(false);
      }
      return;
    }

    let initialTimeout: any;
    let lastCaptureTime = Date.now();

    // Auto-capture screenshot immediately upon checking in (only once)
    if (!hasTakenInitialScreenshot.current) {
      initialTimeout = setTimeout(() => {
        captureAndUploadRef.current();
        lastCaptureTime = Date.now();
        hasTakenInitialScreenshot.current = true;
      }, 5000);
    }

    // Check every 1 minute if a capture is due based on CURRENT productivity
    const interval = setInterval(() => {
      const elapsedMinutes = (Date.now() - lastCaptureTime) / 60000;
      
      const threshold = screenshotRulesRef.current?.threshold || 50;
      const highProdInt = screenshotRulesRef.current?.highProdInterval || 20;
      const stdInt = screenshotRulesRef.current?.standardInterval || 5;
      
      const isHighProductivity = productivityRef.current >= threshold;
      const requiredInterval = isHighProductivity ? highProdInt : stdInt;
      
      if (elapsedMinutes >= requiredInterval) {
        captureAndUploadRef.current();
        lastCaptureTime = Date.now();
      }
    }, 60000);

    return () => {
      if (initialTimeout) clearTimeout(initialTimeout);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, token, isCheckedIn, onBreak, productivity]);

  if (!isAuthenticated) return null;

  const currentIntervalMin = productivity >= (screenshotRules.threshold || 50)
    ? (screenshotRules.highProdInterval || 20)
    : (screenshotRules.standardInterval || 5);

  return (
    <Paper sx={{ p: 2, mt: 3, border: '1px solid', borderColor: 'divider' }}>
      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
        Visual Screenshot Telemetry ({currentIntervalMin} min Interval)
      </Typography>
      
      {isCheckedIn && (
        <Box sx={{ mb: 2 }}>
          {productivity >= (screenshotRules.threshold || 50) ? (
            <Alert icon={false} severity="success" sx={{ py: 0.5, borderRadius: 2, mb: 1 }}>
              🛡️ <strong>Privacy Protection Active</strong>: Screenshots older than 1 hour are auto-deleted because your productivity is <strong>{productivity}%</strong> (Target &gt;= {screenshotRules.threshold || 50}%).
            </Alert>
          ) : (
            <Alert icon={false} severity="warning" sx={{ py: 0.5, borderRadius: 2, mb: 1 }}>
              ⚠️ <strong>Full Audit Active</strong>: Screenshots are retained due to low/idle productivity (<strong>{productivity}%</strong>). Maintain active work to enable {screenshotRules.threshold || 50}% privacy auto-deletion.
            </Alert>
          )}
        </Box>
      )}

      {errorMsg && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {errorMsg}
        </Alert>
      )}

      {isCheckedIn ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Privacy Shield Blur Toggle */}
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              bgcolor: 'rgba(255, 255, 255, 0.02)', 
              p: 2, 
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(10px)'
            }}
          >
            <Box sx={{ pr: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                Privacy Shield Blur
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Apply Gaussian blur to screen captures to protect your personal and confidential data.
              </Typography>
            </Box>
            <FormControlLabel
              control={
                <Switch
                  checked={privacyBlurEnabled}
                  onChange={handleToggleBlur}
                  color="primary"
                />
              }
              label=""
              sx={{ mr: 0 }}
            />
          </Box>

          <Typography variant="body2" color="text.secondary">
            {window.api
              ? 'Desktop application wrapper: Real screen capture is active and running silently in the background.'
              : (isCapturing 
                  ? 'Real screen sharing is active. Visual logs are captured automatically.' 
                  : 'Background simulated screen tracking is active. You can share your actual screen for real-time visual captures.')}
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            {!isCapturing && !window.api && (
              <Button
                variant="outlined"
                color="primary"
                startIcon={<MonitorIcon />}
                onClick={startScreenCapture}
                size="small"
              >
                Share Screen (Real Logging)
              </Button>
            )}
            
            <Button
              variant="contained"
              color="secondary"
              startIcon={<CameraIcon />}
              onClick={captureAndUpload}
              size="small"
            >
              Log Screenshot Now
            </Button>
          </Box>
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Screenshot monitoring will begin automatically after you Check-In.
        </Typography>
      )}

      {/* Hidden elements for streaming */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ display: 'none' }}
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </Paper>
  );
}

export default ScreenshotCapturer;
