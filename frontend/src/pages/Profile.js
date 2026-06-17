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
  InputLabel,
  IconButton,
  InputAdornment,
  Switch,
  FormControlLabel
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Save as SaveIcon, Visibility, VisibilityOff } from '@mui/icons-material';
import { updateProfileSuccess } from '../redux/store';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function Profile() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const { token, user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  // Form States
  const [name, setName] = useState(user?.name || '');
  const [department, setDepartment] = useState(user?.department || 'Engineering');
  const [profilePic, setProfilePic] = useState(user?.profilePic || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Display Zoom Settings State
  const [zoomSetting, setZoomSetting] = useState(() => {
    const saved = localStorage.getItem('wfh_zoom_level');
    return saved ? parseFloat(saved) : 1.0;
  });

  React.useEffect(() => {
    const handleZoomChange = () => {
      const saved = localStorage.getItem('wfh_zoom_level');
      if (saved) {
        setZoomSetting(parseFloat(saved));
      }
    };
    window.addEventListener('wfh_zoom_changed', handleZoomChange);
    return () => window.removeEventListener('wfh_zoom_changed', handleZoomChange);
  }, []);

  const handleZoomChangeSetting = (newZoom) => {
    const roundedZoom = Math.round(newZoom * 10) / 10;
    localStorage.setItem('wfh_zoom_level', roundedZoom.toString());
    setZoomSetting(roundedZoom);
    window.dispatchEvent(new Event('wfh_zoom_changed'));
  };

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
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Leave blank to keep current password"
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
            fullWidth
          />

          <Divider sx={{ my: 1 }} />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Theme Settings
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={isDark}
                  onChange={(e) => {
                    localStorage.setItem('wfh_dark_mode', JSON.stringify(e.target.checked));
                    window.dispatchEvent(new Event('wfh_theme_changed'));
                  }}
                  color="primary"
                />
              }
              label={isDark ? "Dark/Sci-Fi Theme Enabled" : "Dark/Sci-Fi Theme Disabled"}
            />
          </Box>

          <Divider sx={{ my: 1 }} />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Display Zoom Settings
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Adjust the dashboard application text and layout size to fit your display screen.
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button 
                variant="outlined" 
                size="small" 
                onClick={() => handleZoomChangeSetting(zoomSetting - 0.1)}
                disabled={zoomSetting <= 0.7}
                sx={{ minWidth: 40 }}
              >
                -
              </Button>
              <Typography sx={{ minWidth: 60, textAlign: 'center', fontWeight: 600 }}>
                {Math.round(zoomSetting * 100)}%
              </Typography>
              <Button 
                variant="outlined" 
                size="small" 
                onClick={() => handleZoomChangeSetting(zoomSetting + 0.1)}
                disabled={zoomSetting >= 1.5}
                sx={{ minWidth: 40 }}
              >
                +
              </Button>
              <Button 
                variant="text" 
                size="small" 
                onClick={() => handleZoomChangeSetting(1.0)}
                disabled={zoomSetting === 1.0}
              >
                Reset
              </Button>
            </Box>
            <Typography variant="caption" color="text.secondary">
              Shortcut: Use <kbd style={{ background: isDark ? '#334155' : '#e2e8f0', color: isDark ? '#f8fafc' : '#0f172a', padding: '2px 4px', borderRadius: '4px', fontFamily: 'monospace' }}>Ctrl +</kbd>, <kbd style={{ background: isDark ? '#334155' : '#e2e8f0', color: isDark ? '#f8fafc' : '#0f172a', padding: '2px 4px', borderRadius: '4px', fontFamily: 'monospace' }}>Ctrl -</kbd>, or <kbd style={{ background: isDark ? '#334155' : '#e2e8f0', color: isDark ? '#f8fafc' : '#0f172a', padding: '2px 4px', borderRadius: '4px', fontFamily: 'monospace' }}>Ctrl 0</kbd> anywhere inside the dashboard.
            </Typography>
          </Box>

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
