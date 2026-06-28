import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { Alert, AlertTitle, Box, Collapse, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CampaignIcon from '@mui/icons-material/Campaign';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function AnnouncementBanner() {
  const { isAuthenticated, token } = useSelector(state => state.auth);
  const [announcement, setAnnouncement] = useState(null);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    const fetchLatest = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/announcements/latest`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data) {
          // Only show if the user hasn't dismissed this specific announcement
          const dismissedId = localStorage.getItem('dismissed_announcement');
          if (dismissedId !== res.data.id) {
            setAnnouncement(res.data);
            setOpen(true);
          }
        }
      } catch (err) {
        console.error('Failed to fetch latest announcement:', err);
      }
    };

    fetchLatest();
  }, [isAuthenticated, token]);

  const handleDismiss = () => {
    if (announcement) {
      localStorage.setItem('dismissed_announcement', announcement.id);
    }
    setOpen(false);
  };

  if (!announcement) return null;

  return (
    <Box sx={{ width: '100%', mb: open ? 2 : 0, px: 2, pt: 2, boxSizing: 'border-box' }}>
      <Collapse in={open}>
        <Alert
          icon={<CampaignIcon fontSize="inherit" />}
          severity="info"
          action={
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={handleDismiss}
            >
              <CloseIcon fontSize="inherit" />
            </IconButton>
          }
          sx={{
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'info.light',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            bgcolor: 'background.paper',
            '& .MuiAlert-icon': {
              color: 'info.main',
              alignItems: 'center'
            }
          }}
        >
          <AlertTitle sx={{ fontWeight: 700, mb: 0.5 }}>{announcement.title}</AlertTitle>
          {announcement.message}
        </Alert>
      </Collapse>
    </Box>
  );
}

export default AnnouncementBanner;
