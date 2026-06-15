// frontend/src/pages/Profile.js
import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import {
  Box,
  Button,
  Divider,
  TextField,
  Typography,
  Avatar,
  Paper,
  Snackbar,
  Alert,
  MenuItem,
  Select,
  FormControl,
  InputLabel
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { updateProfileSuccess } from '../redux/store';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function Profile() {
  const { token, user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  // Form States
  const [name, setName] = useState(user?.name || '');
  const [department, setDepartment] = useState(user?.department || 'Engineering');
  const [profilePic, setProfilePic] = useState(user?.profilePic || '');
  const [password, setPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const updateData = { name, department, profilePic };
      if (password) updateData.password = password;

      const res = await axios.put(
        `${API_URL}/api/auth/profile`,
        updateData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      dispatch(updateProfileSuccess(res.data));
      setPassword('');
      setToast({ open: true, message: 'Profile updated successfully!', severity: 'success' });
    } catch (err) {
      setToast({
        open: true,
        message: err.response?.data?.message || 'Failed to update profile.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
      <Paper sx={{ p: 4, borderRadius: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Avatar
            src={profilePic || ''}
            alt={name}
            sx={{ width: 80, height: 80, bgcolor: 'primary.main', fontSize: 32 }}
          >
            {name.charAt(0)}
          </Avatar>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Profile Management
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Update your corporate employee account settings
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ mb: 4 }} />

        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <TextField
            label="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            fullWidth
          />

          <TextField
            label="Email Address (Disabled)"
            value={user?.email}
            disabled
            fullWidth
            helperText="To change your corporate email, contact IT Support."
          />

          <FormControl fullWidth>
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

          <TextField
            label="Profile Picture URL"
            value={profilePic}
            onChange={(e) => setProfilePic(e.target.value)}
            placeholder="https://example.com/avatar.jpg"
            fullWidth
          />

          <TextField
            label="Update Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Leave blank to keep current password"
            fullWidth
          />

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={loading}
            startIcon={<SaveIcon />}
            sx={{ py: 1.5, borderRadius: 2 }}
          >
            Save Changes
          </Button>
        </Box>
      </Paper>

      {/* Toast Alert */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast({ ...toast, open: false })}
      >
        <Alert severity={toast.severity} onClose={() => setToast({ ...toast, open: false })} variant="filled">
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default Profile;
