// frontend/src/pages/ForgotPassword.js
import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  TextField,
  Typography,
  Link,
  CircularProgress,
  Alert,
  IconButton,
  InputAdornment
} from '@mui/material';
import { Monitor as MonitoringIcon, Visibility, VisibilityOff } from '@mui/icons-material';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function ForgotPassword() {
  const isElectron = window.api !== undefined;
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState(1); // 1 = request token, 2 = enter code & new password
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [infoMsg, setInfoMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const navigate = useNavigate();

  const handleRequestToken = async (e) => {
    e.preventDefault();
    if (!email) return;

    try {
      setLoading(true);
      setErrorMsg('');
      setInfoMsg('');

      const res = await axios.post(`${API_URL}/api/auth/forgot-password`, { email });
      setInfoMsg(res.data.message);
      setStep(2); // move to reset password step
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Email not found.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!email || !code || !newPassword) return;

    try {
      setLoading(true);
      setErrorMsg('');
      setInfoMsg('');

      const res = await axios.post(`${API_URL}/api/auth/reset-password`, { email, code, newPassword });
      setInfoMsg(res.data.message);
      
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Reset failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container
      maxWidth="xs"
      sx={{
        height: isElectron ? 'calc(100vh - 32px)' : '100vh',
        display: 'flex',
        alignItems: 'center',
        py: { xs: 2, lg: 4 },
        '@media (max-height: 850px)': { py: 2 },
        '@media (max-height: 720px)': { py: 1 }
      }}
    >
      <Card sx={{ width: '100%', borderRadius: 4, boxShadow: '0px 10px 30px rgba(0,0,0,0.1)' }}>
        <CardContent
          sx={{
            p: { xs: 3, sm: 4 },
            '@media (max-height: 850px)': { p: { xs: 2.5, sm: 3 } },
            '@media (max-height: 720px)': { p: { xs: 2, sm: 2.5 } },
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
              color: 'primary.main',
              mb: { xs: 1.5, lg: 2 },
              '@media (max-height: 850px)': { mb: 1.5 },
              '@media (max-height: 720px)': { mb: 1 }
            }}
          >
            <MonitoringIcon sx={{
              fontSize: 36,
              '@media (max-height: 850px)': { fontSize: 30 },
              '@media (max-height: 720px)': { fontSize: 24 }
            }} />
            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                fontSize: '1.25rem',
                '@media (max-height: 850px)': { fontSize: '1.1rem' },
                '@media (max-height: 720px)': { fontSize: '1.0rem' }
              }}
            >
              RESET PASSWORD
            </Typography>
          </Box>

          {infoMsg && (
            <Alert severity="success" sx={{ width: '100%', mb: 2 }}>
              {infoMsg}
            </Alert>
          )}

          {errorMsg && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {errorMsg}
            </Alert>
          )}

          {step === 1 ? (
            <Box component="form" onSubmit={handleRequestToken} sx={{ width: '100%' }}>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mb: { xs: 2, lg: 3 },
                  '@media (max-height: 850px)': { mb: 2 },
                  '@media (max-height: 720px)': { mb: 1.2 }
                }}
                align="center"
              >
                Enter your email address to verify your account status.
              </Typography>
              
              <TextField
                label="Email Address"
                type="email"
                fullWidth
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                sx={{
                  mb: { xs: 2, lg: 3 },
                  '@media (max-height: 850px)': { mb: 2 },
                  '@media (max-height: 720px)': { mb: 1.5 }
                }}
              />
              
              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={loading}
                sx={{
                  py: { xs: 1.2, lg: 1.5 },
                  borderRadius: 2,
                  fontWeight: 700,
                  '@media (max-height: 850px)': { py: 1.2 }
                }}
              >
                {loading ? <CircularProgress size={24} /> : 'Request Reset'}
              </Button>
            </Box>
          ) : (
            <Box component="form" onSubmit={handleResetPassword} sx={{ width: '100%' }}>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mb: { xs: 2, lg: 3 },
                  '@media (max-height: 850px)': { mb: 2 },
                  '@media (max-height: 720px)': { mb: 1.2 }
                }}
                align="center"
              >
                Confirm your identity by entering the code sent to your email and setting your new password.
              </Typography>
              
              <TextField
                label="Verification Code"
                type="text"
                fullWidth
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="6-Digit Code"
                sx={{
                  mb: { xs: 1.5, lg: 2.5 },
                  '@media (max-height: 850px)': { mb: 1.8 },
                  '@media (max-height: 720px)': { mb: 1.2 }
                }}
                inputProps={{ maxLength: 6, style: { textAlign: 'center', letterSpacing: '4px', fontWeight: 'bold' } }}
              />

              <TextField
                label="New Password"
                type={showPassword ? 'text' : 'password'}
                fullWidth
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword((v) => !v)}
                        edge="end"
                        sx={{ color: 'text.secondary', '&:hover': { color: '#10b981' } }}
                      >
                        {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                sx={{
                  mb: { xs: 2, lg: 3 },
                  '@media (max-height: 850px)': { mb: 2 },
                  '@media (max-height: 720px)': { mb: 1.5 }
                }}
              />
              
              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={loading}
                sx={{
                  py: { xs: 1.2, lg: 1.5 },
                  borderRadius: 2,
                  fontWeight: 700,
                  '@media (max-height: 850px)': { py: 1.2 }
                }}
              >
                {loading ? <CircularProgress size={24} /> : 'Save New Password'}
              </Button>
            </Box>
          )}

          <Box
            sx={{
              mt: { xs: 2, lg: 3 },
              '@media (max-height: 850px)': { mt: 2 },
              '@media (max-height: 720px)': { mt: 1 }
            }}
          >
            <Link component={RouterLink} to="/login" variant="body2" color="primary" sx={{ fontWeight: 600 }}>
              Back to Login
            </Link>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}

export default ForgotPassword;
