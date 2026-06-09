import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Divider,
  Chip,
  TextField,
  Button,
  CircularProgress,
  Snackbar,
  Alert
} from '@mui/material';
import {
  Email as EmailIcon,
  Add as AddIcon,
  Save as SaveIcon
} from '@mui/icons-material';

function ManagerSettings() {
  const { token } = useSelector((state) => state.auth);

  // Warning Emails configurations states
  const [warningEmails, setWarningEmails] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState({ show: false, text: '', severity: 'success' });
  const [initialLoading, setInitialLoading] = useState(true);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setInitialLoading(true);
        const authHeader = { headers: { Authorization: `Bearer ${token}` } };
        const emailsRes = await axios.get(`${API_URL}/api/settings/warning-emails`, authHeader);
        setWarningEmails(emailsRes.data);
      } catch (err) {
        console.warn('Failed to load warning emails setting:', err.message);
      } finally {
        setInitialLoading(false);
      }
    };

    fetchSettings();
  }, [token, API_URL]);

  const handleAddEmail = () => {
    const emailVal = newEmail.trim().toLowerCase();
    if (!emailVal) return;
    
    // Simple email regex validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailVal)) {
      setSettingsMessage({ show: true, text: 'Please enter a valid email address.', severity: 'error' });
      return;
    }

    if (warningEmails.includes(emailVal)) {
      setSettingsMessage({ show: true, text: 'Email is already in the list.', severity: 'warning' });
      return;
    }

    setWarningEmails((prev) => [...prev, emailVal]);
    setNewEmail('');
  };

  const handleRemoveEmail = (emailToRemove) => {
    setWarningEmails((prev) => prev.filter((e) => e !== emailToRemove));
  };

  const handleSaveSettings = async () => {
    try {
      setSettingsLoading(true);
      const authHeader = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.post(`${API_URL}/api/settings/warning-emails`, { emails: warningEmails }, authHeader);
      setWarningEmails(res.data.value);
      setSettingsMessage({ show: true, text: 'Alert email settings saved successfully.', severity: 'success' });
    } catch (err) {
      console.error('Failed to save settings:', err.message);
      setSettingsMessage({ show: true, text: 'Failed to save settings.', severity: 'error' });
    } finally {
      setSettingsLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 5, maxWidth: 800 }}>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 4 }}>
        System Settings
      </Typography>

      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <EmailIcon color="primary" /> Low Productivity Email Alerts
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
            Configure email addresses to receive instant warning notifications when an employee's daily productivity falls to 50% or below.
          </Typography>
          <Divider sx={{ mb: 2 }} />

          {/* Emails List as Chips */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2.5, minHeight: 40, p: 1, border: '1px dashed', borderColor: 'divider', borderRadius: 2, bgcolor: 'action.hover' }}>
            {warningEmails.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', m: 'auto' }}>
                No recipient emails configured. Fallback (liyanagesasiru@gmail.com) active.
              </Typography>
            ) : (
              warningEmails.map((email) => (
                <Chip
                  key={email}
                  label={email}
                  onDelete={() => handleRemoveEmail(email)}
                  color="primary"
                  variant="outlined"
                  sx={{ fontWeight: 500 }}
                />
              ))
            )}
          </Box>

          {/* Add Email Form */}
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              placeholder="Enter recipient email address..."
              size="small"
              fullWidth
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddEmail();
                }
              }}
              InputProps={{
                startAdornment: <EmailIcon color="action" fontSize="small" sx={{ mr: 1 }} />
              }}
            />
            <Button
              variant="outlined"
              onClick={handleAddEmail}
              startIcon={<AddIcon />}
              sx={{ minWidth: 90 }}
            >
              Add
            </Button>
          </Box>

          {/* Save Settings Action Button */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSaveSettings}
              disabled={settingsLoading}
              startIcon={settingsLoading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
            >
              {settingsLoading ? 'Saving...' : 'Save Settings'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Settings Snackbar Notifications */}
      <Snackbar
        open={settingsMessage.show}
        autoHideDuration={4000}
        onClose={() => setSettingsMessage((prev) => ({ ...prev, show: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSettingsMessage((prev) => ({ ...prev, show: false }))}
          severity={settingsMessage.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {settingsMessage.text}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default ManagerSettings;
