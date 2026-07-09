// frontend/src/pages/ForcePasswordReset.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../redux/store';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  TextField,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
  InputAdornment
} from '@mui/material';
import { Security as SecurityIcon, Visibility, VisibilityOff } from '@mui/icons-material';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function ForcePasswordReset() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { token, user } = useSelector((state: any) => state.auth);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // If the user somehow gets here without the flag or without auth, redirect them
  React.useEffect(() => {
    if (!user || !user.forcePasswordReset) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) return;

    try {
      setLoading(true);
      setErrorMsg('');

      await axios.put(
        `${API_URL}/api/auth/force-reset-password`,
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccessMsg('Password updated successfully! Please log in again with your new password.');
      
      // Force user to log in again to clear old state and flag
      setTimeout(() => {
        dispatch(logout());
        navigate('/login');
      }, 3000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to update password. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <Container
      maxWidth="xs"
      sx={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        py: { xs: 2, lg: 4 }
      }}
    >
      <Card sx={{ width: '100%', borderRadius: 4, boxShadow: '0px 10px 30px rgba(0,0,0,0.1)' }}>
        <CardContent
          sx={{
            p: { xs: 3, sm: 4 },
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              color: 'error.main',
              mb: 2
            }}
          >
            <SecurityIcon sx={{ fontSize: 36 }} />
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.25rem' }}>
              ACTION REQUIRED
            </Typography>
          </Box>

          <Typography
            variant="body2"
            color="text.secondary"
            align="center"
            sx={{ mb: 3 }}
          >
            Your administrator requires you to change your password before you can access the system.
          </Typography>

          {successMsg && (
            <Alert severity="success" sx={{ width: '100%', mb: 2 }}>
              {successMsg}
            </Alert>
          )}

          {errorMsg && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {errorMsg}
            </Alert>
          )}

          {!successMsg && (
            <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
              <TextField
                label="Current Password"
                variant="outlined"
                type={showPassword ? 'text' : 'password'}
                fullWidth
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                sx={{ mb: 2 }}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }
                }}
              />
              
              <TextField
                label="New Password"
                variant="outlined"
                type={showPassword ? 'text' : 'password'}
                fullWidth
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                sx={{ mb: 3 }}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }
                }}
              />

              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={loading}
                sx={{ py: 1.5, borderRadius: 2, fontWeight: 700 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Update Password'}
              </Button>
            </Box>
          )}

          <Button
            variant="text"
            color="inherit"
            onClick={handleLogout}
            sx={{ mt: 2, opacity: 0.7 }}
          >
            Cancel and Logout
          </Button>
        </CardContent>
      </Card>
    </Container>
  );
}

export default ForcePasswordReset;
