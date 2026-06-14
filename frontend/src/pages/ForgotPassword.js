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
  Alert
} from '@mui/material';
import { Monitor as MonitoringIcon } from '@mui/icons-material';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState(1); // 1 = request token, 2 = enter code & new password
  const [loading, setLoading] = useState(false);
  const [infoMsg, setInfoMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const navigate = useNavigate();
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

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
    <Container maxWidth="xs" sx={{ height: '100vh', display: 'flex', alignItems: 'center' }}>
      <Card sx={{ width: '100%', borderRadius: 4, boxShadow: '0px 10px 30px rgba(0,0,0,0.1)' }}>
        <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, color: 'primary.main' }}>
            <MonitoringIcon sx={{ fontSize: 36 }} />
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
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
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }} align="center">
                Enter your email address to verify your account status.
              </Typography>
              
              <TextField
                label="Email Address"
                type="email"
                fullWidth
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                sx={{ mb: 3 }}
              />
              
              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={loading}
                sx={{ py: 1.5, borderRadius: 2, fontWeight: 700 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Request Reset'}
              </Button>
            </Box>
          ) : (
            <Box component="form" onSubmit={handleResetPassword} sx={{ width: '100%' }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }} align="center">
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
                sx={{ mb: 2.5 }}
                inputProps={{ maxLength: 6, style: { textAlign: 'center', letterSpacing: '4px', fontWeight: 'bold' } }}
              />

              <TextField
                label="New Password"
                type="password"
                fullWidth
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                sx={{ mb: 3 }}
              />
              
              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={loading}
                sx={{ py: 1.5, borderRadius: 2, fontWeight: 700 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Save New Password'}
              </Button>
            </Box>
          )}

          <Box sx={{ mt: 3 }}>
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
