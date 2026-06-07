// frontend/src/components/ScreenshotCapturer.js
import React, { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { Box, Button, Typography, Alert, Paper } from '@mui/material';
import { CameraAlt as CameraIcon, Monitor as MonitorIcon } from '@mui/icons-material';

function ScreenshotCapturer({ isCheckedIn }) {
  const { token, isAuthenticated, user, onBreak } = useSelector((state) => state.auth);
  const [stream, setStream] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [productivity, setProductivity] = useState(100);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const fetchProductivity = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/monitoring/my-activity`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProductivity(res.data.productivityPercentage);
    } catch (err) {
      console.warn('Could not fetch productivity score.');
    }
  };

  useEffect(() => {
    if (isAuthenticated && token && isCheckedIn && !onBreak) {
      fetchProductivity();
      const interval = setInterval(fetchProductivity, 60000); // refresh every minute
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, token, isCheckedIn, onBreak]);

  // Request display media for capturing screenshots
  const startScreenCapture = async () => {
    try {
      setErrorMsg('');
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
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

  // Perform actual screenshot capture and upload
  const captureAndUpload = async () => {
    if (onBreak) return;
    try {
      let imageData = '';

      if (isCapturing && stream) {
        // Capture from screen stream
        const canvas = canvasRef.current;
        const video = videoRef.current;
        if (canvas && video) {
          const ctx = canvas.getContext('2d');
          canvas.width = video.videoWidth || 800;
          canvas.height = video.videoHeight || 600;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          imageData = canvas.toDataURL('image/jpeg', 0.7);
        }
      } else {
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
        await axios.post(
          `${API_URL}/api/monitoring/screenshot`,
          { image: imageData },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log('Screenshot uploaded successfully.');
        // Refresh local productivity state after logging a new screenshot
        fetchProductivity();
      }
    } catch (err) {
      console.error('Failed to capture and upload screenshot:', err.message);
    }
  };

  // Wire video stream
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

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

    // Auto-capture screenshot immediately upon checking in
    const initialTimeout = setTimeout(() => {
      captureAndUpload();
    }, 5000);

    // Repeat every 5 minutes (300000ms)
    const interval = setInterval(() => {
      captureAndUpload();
    }, 300000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [isAuthenticated, token, user, isCheckedIn, onBreak, isCapturing, stream]);

  if (!isAuthenticated || user?.role !== 'Employee') return null;

  return (
    <Paper sx={{ p: 2, mt: 3, border: '1px solid', borderColor: 'divider' }}>
      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
        Visual Screenshot Telemetry (5 min Interval)
      </Typography>
      
      {isCheckedIn && (
        <Box sx={{ mb: 2 }}>
          {productivity >= 70 ? (
            <Alert severity="success" sx={{ py: 0.5, borderRadius: 2, mb: 1 }}>
              🛡️ <strong>Privacy Protection Active</strong>: Screenshots older than 1 hour are auto-deleted because your productivity is <strong>{productivity}%</strong> (Target &gt;= 70%).
            </Alert>
          ) : (
            <Alert severity="warning" sx={{ py: 0.5, borderRadius: 2, mb: 1 }}>
              ⚠️ <strong>Full Audit Active</strong>: Screenshots are retained due to low/idle productivity (<strong>{productivity}%</strong>). Maintain active work to enable 1-hour privacy auto-deletion.
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
          <Typography variant="body2" color="text.secondary">
            {isCapturing 
              ? 'Real screen sharing is active. Visual logs are captured automatically.' 
              : 'Background simulated screen tracking is active. You can share your actual screen for real-time visual captures.'}
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            {!isCapturing && (
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
