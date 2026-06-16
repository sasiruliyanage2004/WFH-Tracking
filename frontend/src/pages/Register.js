// frontend/src/pages/Register.js
import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useDispatch } from 'react-redux';
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
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  IconButton,
  InputAdornment
} from '@mui/material';
import { Monitor as MonitoringIcon, Visibility, VisibilityOff } from '@mui/icons-material';
import { authSuccess } from '../redux/store';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Employee');
  const [department, setDepartment] = useState('Engineering');
  const [managerKey, setManagerKey] = useState('');
  const [superAdminKey, setSuperAdminKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) return;
    if (role === 'Manager' && !managerKey) {
      setErrorMsg('Manager Secret Key is required.');
      return;
    }
    if (role === 'SuperAdmin' && !superAdminKey) {
      setErrorMsg('Super Admin Secret Key is required.');
      return;
    }

    // Password complexity validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;
    if (!passwordRegex.test(password)) {
      setErrorMsg('Password must be at least 6 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&).');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');

      if (!otpSent) {
        // Step 1: Request OTP
        await axios.post(`${API_URL}/api/auth/register-otp`, { email });
        setOtpSent(true);
      } else {
        // Step 2: Complete Registration with OTP
        if (!otp) {
          setErrorMsg('Verification code is required.');
          return;
        }

        const res = await axios.post(`${API_URL}/api/auth/register`, {
          name,
          email,
          password,
          role,
          department: role === 'SuperAdmin' ? 'HR' : department,
          managerKey: role === 'Manager' ? managerKey : undefined,
          superAdminKey: role === 'SuperAdmin' ? superAdminKey : undefined,
          otp
        });

        dispatch(authSuccess({
          token: res.data.token,
          user: res.data.user
        }));

        localStorage.setItem('register_success', 'true');

        // Redirect
        if (res.data.user.role === 'Manager' || res.data.user.role === 'SuperAdmin') {
          navigate('/manager/dashboard');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xs" sx={{ height: '100vh', display: 'flex', alignItems: 'center' }}>
      <Card sx={{ width: '100%', borderRadius: 4, boxShadow: '0px 10px 30px rgba(0,0,0,0.1)' }}>
        <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1, color: 'primary.main' }}>
            <MonitoringIcon sx={{ fontSize: 36 }} />
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              CREATE ACCOUNT
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }} align="center">
            Register to join your corporate WFH tracker.
          </Typography>

          {errorMsg && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {errorMsg}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
            {!otpSent ? (
              <>
                <TextField
                  label="Full Name"
                  type="text"
                  fullWidth
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  sx={{ mb: 2 }}
                />
                <TextField
                  label="Email Address"
                  type="email"
                  fullWidth
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  sx={{ mb: 2 }}
                />
                <TextField
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  fullWidth
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword((v) => !v)}
                          edge="end"
                          sx={{ color: 'rgba(255, 255, 255, 0.45)', '&:hover': { color: '#10b981' } }}
                        >
                          {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                  sx={{ mb: 2 }}
                />
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Role Type</InputLabel>
                  <Select
                    value={role}
                    label="Role Type"
                    onChange={(e) => setRole(e.target.value)}
                  >
                    <MenuItem value="Employee">Employee / Staff</MenuItem>
                    <MenuItem value="Manager">Manager / Admin</MenuItem>
                    <MenuItem value="SuperAdmin">HR Head (Super Admin)</MenuItem>
                  </Select>
                </FormControl>

                {role === 'Manager' && (
                  <TextField
                    label="Manager Secret Key"
                    type="password"
                    fullWidth
                    required
                    value={managerKey}
                    onChange={(e) => setManagerKey(e.target.value)}
                    placeholder="Enter company manager registration code..."
                    sx={{ mb: 2 }}
                  />
                )}

                {role === 'SuperAdmin' && (
                  <TextField
                    label="Super Admin Secret Key"
                    type="password"
                    fullWidth
                    required
                    value={superAdminKey}
                    onChange={(e) => setSuperAdminKey(e.target.value)}
                    placeholder="Enter company super admin key..."
                    sx={{ mb: 2 }}
                  />
                )}

                {role !== 'SuperAdmin' && (
                  <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel>Department</InputLabel>
                    <Select
                      value={department}
                      label="Department"
                      onChange={(e) => setDepartment(e.target.value)}
                    >
                      <MenuItem value="Engineering">Engineering</MenuItem>
                      <MenuItem value="Design">Design</MenuItem>
                      <MenuItem value="Product">Product</MenuItem>
                      <MenuItem value="Operations">Operations</MenuItem>
                      <MenuItem value="HR">HR / Finance</MenuItem>
                    </Select>
                  </FormControl>
                )}

                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  size="large"
                  disabled={loading}
                  sx={{ py: 1.5, borderRadius: 2, fontWeight: 700 }}
                >
                  {loading ? <CircularProgress size={24} /> : 'Register'}
                </Button>
              </>
            ) : (
              <>
                <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }} align="center">
                  A verification OTP code has been sent to <strong>{email}</strong>. Please enter the 6-digit code below to complete your registration.
                </Typography>
                <TextField
                  label="OTP Code"
                  type="text"
                  fullWidth
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  inputProps={{ maxLength: 6, style: { textAlign: 'center', letterSpacing: '8px', fontSize: '20px', fontWeight: 'bold' } }}
                  sx={{ mb: 3 }}
                  placeholder="------"
                />
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  size="large"
                  disabled={loading}
                  sx={{ py: 1.5, borderRadius: 2, fontWeight: 700, mb: 1.5 }}
                >
                  {loading ? <CircularProgress size={24} /> : 'Verify & Complete'}
                </Button>
                <Button
                  variant="text"
                  fullWidth
                  onClick={() => setOtpSent(false)}
                  disabled={loading}
                  sx={{ fontWeight: 600 }}
                >
                  Back to Edit Details
                </Button>
              </>
            )}
          </Box>

          <Box sx={{ mt: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Already have an account?{' '}
              <Link component={RouterLink} to="/login" color="primary" sx={{ fontWeight: 600 }}>
                Login here
              </Link>
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}

export default Register;
