import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const Settings = () => {
  const { user, token } = useSelector((state: any) => state.auth);
  const [productiveApps, setProductiveApps] = useState<string[]>([]);
  const [unproductiveApps, setUnproductiveApps] = useState<string[]>([]);
  
  const [prodInput, setProdInput] = useState('');
  const [unprodInput, setUnprodInput] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/settings/productivity`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProductiveApps(res.data.productive_apps || []);
      setUnproductiveApps(res.data.unproductive_apps || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await axios.put(
        `${API_URL}/api/settings/productivity`,
        { productive_apps: productiveApps, unproductive_apps: unproductiveApps },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage('Productivity settings saved successfully!');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const addProd = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && prodInput.trim()) {
      if (!productiveApps.includes(prodInput.trim().toLowerCase())) {
        setProductiveApps([...productiveApps, prodInput.trim().toLowerCase()]);
      }
      setProdInput('');
    }
  };

  const removeProd = (app: string) => {
    setProductiveApps(productiveApps.filter(a => a !== app));
  };

  const addUnprod = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && unprodInput.trim()) {
      if (!unproductiveApps.includes(unprodInput.trim().toLowerCase())) {
        setUnproductiveApps([...unproductiveApps, unprodInput.trim().toLowerCase()]);
      }
      setUnprodInput('');
    }
  };

  const removeUnprod = (app: string) => {
    setUnproductiveApps(unproductiveApps.filter(a => a !== app));
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ color: 'primary.main', mb: 3, fontWeight: 700 }}>
        Company Settings
      </Typography>

      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ p: 4, borderRadius: 3, bgcolor: 'background.paper', mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 1, color: 'text.primary' }}>
          Productivity Configuration
        </Typography>
        <Typography variant="body2" sx={{ mb: 4, color: 'text.secondary' }}>
          Define the application names and window titles that are considered productive or unproductive for your company. The desktop agent will use these rules to classify employee activity.
        </Typography>

        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle1" sx={{ color: 'success.main', mb: 2, fontWeight: 600 }}>
            Productive Keywords
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {productiveApps.map((app) => (
              <Chip 
                key={app} 
                label={app} 
                onDelete={user.role === 'SuperAdmin' ? () => removeProd(app) : undefined}
                color="success"
                variant="outlined"
              />
            ))}
          </Box>
          {user.role === 'SuperAdmin' && (
            <TextField
              label="Add Productive Keyword (Press Enter)"
              variant="outlined"
              size="small"
              fullWidth
              value={prodInput}
              onChange={(e) => setProdInput(e.target.value)}
              onKeyDown={addProd}
              placeholder="e.g., visual studio code"
            />
          )}
        </Box>

        <Divider sx={{ my: 4, borderColor: 'rgba(255,255,255,0.1)' }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle1" sx={{ color: 'error.main', mb: 2, fontWeight: 600 }}>
            Unproductive Keywords
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {unproductiveApps.map((app) => (
              <Chip 
                key={app} 
                label={app} 
                onDelete={user.role === 'SuperAdmin' ? () => removeUnprod(app) : undefined}
                color="error"
                variant="outlined"
              />
            ))}
          </Box>
          {user.role === 'SuperAdmin' && (
            <TextField
              label="Add Unproductive Keyword (Press Enter)"
              variant="outlined"
              size="small"
              fullWidth
              value={unprodInput}
              onChange={(e) => setUnprodInput(e.target.value)}
              onKeyDown={addUnprod}
              placeholder="e.g., youtube"
            />
          )}
        </Box>

        {user.role === 'SuperAdmin' && (
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleSave}
            disabled={saving}
            sx={{ mt: 2, px: 4, py: 1 }}
          >
            {saving ? <CircularProgress size={24} /> : 'Save Settings'}
          </Button>
        )}
      </Paper>
    </Box>
  );
};

export default Settings;
