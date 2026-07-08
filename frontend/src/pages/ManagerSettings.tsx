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
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  Email as EmailIcon,
  Add as AddIcon,
  Save as SaveIcon,
  Monitor as MonitorIcon,
  CloudUpload as CloudUploadIcon,
  CheckCircle as CheckCircleIcon,
  SettingsInputComponent as SmtpIcon
} from '@mui/icons-material';

import CustomLoader from '../components/CustomLoader';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function ManagerSettings() {
  const { token } = useSelector((state: any) => state.auth);

  // Warning Emails configurations states
  const [warningEmails, setWarningEmails] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState({ show: false, text: '', severity: 'success' });
  const [initialLoading, setInitialLoading] = useState(true);

  // Screenshot Rules configurations states
  const [screenshotRules, setScreenshotRules] = useState({
    threshold: 70,
    highProdInterval: 20,
    standardInterval: 5
  });

  // SMTP Settings
  const [smtpConfig, setSmtpConfig] = useState({
    host: '',
    port: 587,
    user: '',
    pass: '',
    sender_email: '',
    use_custom: false
  });
  const [smtpLoading, setSmtpLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setInitialLoading(true);
        const authHeader = { headers: { Authorization: `Bearer ${token}` } };
        
        // Fetch emails setting
        const emailsRes = await axios.get(`${API_URL}/api/settings/warning-emails`, authHeader);
        setWarningEmails(emailsRes.data);

        // Fetch screenshot rules setting
        const rulesRes = await axios.get(`${API_URL}/api/settings/screenshot-rules`, authHeader);
        setScreenshotRules(rulesRes.data);

        // Fetch SMTP config
        const smtpRes = await axios.get(`${API_URL}/api/settings/smtp`, authHeader);
        if (smtpRes.data) {
          setSmtpConfig(smtpRes.data);
        }
      } catch (err) {
        console.warn('Failed to load settings:', err.message);
      } finally {
        setInitialLoading(false);
      }
    };

    fetchSettings();
  }, [token]);

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

  const handleSaveScreenshotRules = async () => {
    try {
      setSettingsLoading(true);
      const authHeader = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.post(`${API_URL}/api/settings/screenshot-rules`, screenshotRules, authHeader);
      setScreenshotRules(res.data.value);
      setSettingsMessage({ show: true, text: 'Smart screenshot rules saved successfully.', severity: 'success' });
    } catch (err) {
      console.error('Failed to save screenshot rules:', err.message);
      setSettingsMessage({ show: true, text: 'Failed to save screenshot rules.', severity: 'error' });
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleSaveSmtpSettings = async () => {
    try {
      setSmtpLoading(true);
      const authHeader = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post(`${API_URL}/api/settings/smtp`, smtpConfig, authHeader);
      setSettingsMessage({ show: true, text: 'SMTP settings saved successfully.', severity: 'success' });
    } catch (err) {
      console.error('Failed to save SMTP settings:', err.message);
      setSettingsMessage({ show: true, text: 'Failed to save SMTP settings.', severity: 'error' });
    } finally {
      setSmtpLoading(false);
    }
  };

  const handleTestSmtpConnection = async () => {
    try {
      setTestLoading(true);
      const authHeader = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.post(`${API_URL}/api/settings/smtp/test`, smtpConfig, authHeader);
      setSettingsMessage({ show: true, text: res.data.message || 'Test successful.', severity: 'success' });
    } catch (err) {
      console.error('Failed to test SMTP connection:', err.message);
      setSettingsMessage({ show: true, text: err.response?.data?.message || 'SMTP Connection Test Failed.', severity: 'error' });
    } finally {
      setTestLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CustomLoader />
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
          <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 2 }}>
            Configure email addresses to receive instant warning notifications when an employee's daily productivity falls to 50% or below.
          </Typography>
          <Divider sx={{ mb: 2 }} />

          {/* Emails List as Chips */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2.5, minHeight: 40, p: 1, border: '1px dashed', borderColor: 'divider', borderRadius: 2, bgcolor: 'action.hover' }}>
            {warningEmails.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', m: 'auto' }}>
                No recipient emails configured. Fallback (l************u@gmail.com) active.
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
              // @ts-ignore
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

      <Card sx={{ borderRadius: 3, mt: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <MonitorIcon color="primary" /> Smart Screenshot Capture Rules
          </Typography>
          <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 2 }}>
            Configure how frequently screenshots are captured from employee screens based on their real-time daily productivity.
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <TextField
                label="High Productivity Threshold (%)"
                type="number"
                size="small"
                value={screenshotRules.threshold}
                onChange={(e) => setScreenshotRules(prev => ({ ...prev, threshold: Number(e.target.value) }))}
                helperText="Productivity score equal or above this is considered high productivity."
                sx={{ flex: 1, minWidth: 200 }}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <TextField
                label="Standard Screenshot Interval (mins)"
                type="number"
                size="small"
                value={screenshotRules.standardInterval}
                onChange={(e) => setScreenshotRules(prev => ({ ...prev, standardInterval: Number(e.target.value) }))}
                helperText="Interval for normal/low productivity users."
                sx={{ flex: 1, minWidth: 200 }}
              />
              <TextField
                label="High Productivity Interval (mins)"
                type="number"
                size="small"
                value={screenshotRules.highProdInterval}
                onChange={(e) => setScreenshotRules(prev => ({ ...prev, highProdInterval: Number(e.target.value) }))}
                helperText="Screenshot frequency when productivity is high (protects privacy & saves bandwidth)."
                sx={{ flex: 1, minWidth: 200 }}
              />
            </Box>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSaveScreenshotRules}
              disabled={settingsLoading}
              startIcon={settingsLoading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
            >
              {settingsLoading ? 'Saving...' : 'Save Screenshot Rules'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 3, mt: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <SmtpIcon color="primary" /> Custom Email Server (SMTP)
          </Typography>
          <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 2 }}>
            Configure your own email server to send alerts and OTPs from your company's email address. Leave disabled to use the system default.
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <input 
              type="checkbox" 
              checked={smtpConfig.use_custom} 
              onChange={(e) => setSmtpConfig(prev => ({ ...prev, use_custom: e.target.checked }))} 
              style={{ width: '20px', height: '20px', cursor: 'pointer', marginRight: '10px' }}
            />
            <Typography sx={{ fontWeight: 600 }}>Enable Custom SMTP Server</Typography>
          </Box>

          {smtpConfig.use_custom && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mb: 3 }}>
              
              <Alert severity="info" sx={{ '& .MuiAlert-message': { width: '100%' } }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>How to get a Gmail App Password:</Typography>
                <ol style={{ margin: '8px 0', paddingLeft: '20px' }}>
                  <li>Go to your Google Account (Manage your Google Account).</li>
                  <li>Go to Security &rarr; Enable 2-Step Verification.</li>
                  <li>Search for "App Passwords" in the top search bar.</li>
                  <li>Create a new App Password (e.g. name it "WFH App").</li>
                  <li>Copy the 16-character password and paste it below.</li>
                </ol>
              </Alert>

              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <FormControl size="small" sx={{ flex: 1, minWidth: 150 }}>
                  <InputLabel>Provider</InputLabel>
                  <Select
                    label="Provider"
                    value={smtpConfig.host === 'smtp.gmail.com' ? 'gmail' : 'custom'}
                    onChange={(e) => {
                      if (e.target.value === 'gmail') {
                        setSmtpConfig(prev => ({ ...prev, host: 'smtp.gmail.com', port: 465 }));
                      }
                    }}
                  >
                    <MenuItem value="gmail">Gmail</MenuItem>
                    <MenuItem value="custom">Custom Server</MenuItem>
                  </Select>
                </FormControl>
                
                <TextField label="SMTP Host" size="small" value={smtpConfig.host} onChange={(e) => setSmtpConfig(prev => ({ ...prev, host: e.target.value }))} sx={{ flex: 2, minWidth: 200 }} />
                <TextField label="Port" type="number" size="small" value={smtpConfig.port} onChange={(e) => setSmtpConfig(prev => ({ ...prev, port: Number(e.target.value) }))} sx={{ flex: 1, minWidth: 100 }} />
              </Box>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <TextField label="SMTP Username / Email" size="small" value={smtpConfig.user} onChange={(e) => setSmtpConfig(prev => ({ ...prev, user: e.target.value }))} sx={{ flex: 1, minWidth: 200 }} />
                <TextField label="SMTP App Password" type="password" size="small" value={smtpConfig.pass} onChange={(e) => setSmtpConfig(prev => ({ ...prev, pass: e.target.value }))} sx={{ flex: 1, minWidth: 200 }} />
              </Box>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <TextField label="Sender Email Address (From)" size="small" value={smtpConfig.sender_email} onChange={(e) => setSmtpConfig(prev => ({ ...prev, sender_email: e.target.value }))} helperText="The email address your employees will see (e.g. no-reply@company.com)" sx={{ flex: 1, minWidth: 200 }} />
              </Box>
            </Box>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button
              variant="outlined"
              color="secondary"
              onClick={handleTestSmtpConnection}
              disabled={testLoading || !smtpConfig.use_custom}
              startIcon={testLoading ? <CircularProgress size={20} color="inherit" /> : <CloudUploadIcon />}
            >
              {testLoading ? 'Testing...' : 'Test Connection'}
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSaveSmtpSettings}
              disabled={smtpLoading}
              startIcon={smtpLoading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
            >
              {smtpLoading ? 'Saving...' : 'Save SMTP Config'}
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
          severity={settingsMessage.severity as any}
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
