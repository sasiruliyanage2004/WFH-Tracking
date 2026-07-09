import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Box, Typography, CircularProgress, Paper } from '@mui/material';
import { CheckCircle as CheckCircleIcon, ErrorOutline as ErrorOutlineIcon } from '@mui/icons-material';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function MobileVerify() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('locating'); // 'locating', 'verifying', 'success', 'error'
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg('Invalid QR Code. No token found.');
      return;
    }

    if (!navigator.geolocation) {
      setStatus('error');
      setErrorMsg('Geolocation is not supported by your phone browser.');
      return;
    }

    const verifyLocation = async () => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            setStatus('verifying');
            const { latitude, longitude } = position.coords;
            let address = 'Mobile Verified Location';
            
            // Reverse geocoding
            try {
              const geoRes = await axios.get(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
              );
              if (geoRes.data && geoRes.data.display_name) {
                address = geoRes.data.display_name;
              }
            } catch (err) {
              console.warn('Reverse geocoding error:', err.message);
            }

            // Post to backend
            await axios.post(`${API_URL}/api/attendance/mobile-location`, {
              token,
              latitude,
              longitude,
              address
            });

            setStatus('success');
          } catch (err) {
            setStatus('error');
            setErrorMsg(err.response?.data?.message || 'Failed to verify location with server.');
          }
        },
        (err) => {
          setStatus('error');
          setErrorMsg(`Please allow Location Permission on your phone. Error: ${err.message}`);
        },
        { enableHighAccuracy: true, timeout: 15000 }
      );
    };

    verifyLocation();
  }, [token]);

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#0f172a', p: 3 }}>
      <Paper sx={{ p: 4, borderRadius: 3, textAlign: 'center', maxWidth: 400, bgcolor: '#1e293b', color: '#fff' }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
          Mobile GPS Verification
        </Typography>

        {status === 'locating' && (
          <Box>
            <CircularProgress size={50} sx={{ mb: 3, color: '#38bdf8' }} />
            <Typography variant="body1">Finding your exact GPS location...</Typography>
            <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mt: 1 }}>
              Please allow location permission if prompted.
            </Typography>
          </Box>
        )}

        {status === 'verifying' && (
          <Box>
            <CircularProgress size={50} sx={{ mb: 3, color: '#38bdf8' }} />
            <Typography variant="body1">Verifying location with server...</Typography>
          </Box>
        )}

        {status === 'success' && (
          <Box>
            <CheckCircleIcon sx={{ fontSize: 64, color: '#10b981', mb: 2 }} />
            <Typography variant="h6" sx={{ color: '#10b981', mb: 1 }}>Verification Successful!</Typography>
            <Typography variant="body2" sx={{ color: '#cbd5e1' }}>
              Your highly accurate GPS location has been sent to your desktop app. You can now close this window and continue on your computer.
            </Typography>
          </Box>
        )}

        {status === 'error' && (
          <Box>
            <ErrorOutlineIcon sx={{ fontSize: 64, color: '#ef4444', mb: 2 }} />
            <Typography variant="h6" sx={{ color: '#ef4444', mb: 1 }}>Verification Failed</Typography>
            <Typography variant="body2" sx={{ color: '#cbd5e1' }}>
              {errorMsg}
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
}

export default MobileVerify;
