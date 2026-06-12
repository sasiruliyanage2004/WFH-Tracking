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
  InputLabel
} from '@mui/material';
import { Monitor as MonitoringIcon } from '@mui/icons-material';
import { authSuccess } from '../redux/store';

function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Employee');
  const [department, setDepartment] = useState('Engineering');
  const [managerKey, setManagerKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) return;
    if (role === 'Manager' && !managerKey) {
      setErrorMsg('Manager Secret Key is required.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');

      const res = await axios.post(`${API_URL}/api/auth/register`, {
        name,
        email,
        password,
        role,
        department,
        managerKey: role === 'Manager' ? managerKey : undefined
      });

      dispatch(authSuccess({
        token: res.data.token,
        user: res.data.user
      }));

      // Redirect
      if (res.data.user.role === 'Manager') {
        navigate('/manager/dashboard');
      } else {
        navigate('/dashboard');
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
              type="password"
              fullWidth
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
