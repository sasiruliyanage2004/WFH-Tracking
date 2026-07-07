import React, { useEffect, useState, forwardRef } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { Snackbar, Alert, AlertTitle, Slide, Typography } from '@mui/material';
import CampaignIcon from '@mui/icons-material/Campaign';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const SlideTransition = forwardRef(function Transition(props: any, ref: any) {
  return <Slide direction="left" ref={ref} {...props} />;
});

function AnnouncementBanner() {
  const { isAuthenticated, token } = useSelector((state: any) => state.auth);
  const [announcement, setAnnouncement] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    const fetchLatest = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/announcements/latest`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data) {
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

  const handleDismiss = (event: any, reason?: string) => {
    if (reason === 'clickaway') {
      return; // Force user to explicitly click the close button
    }
    if (announcement) {
      localStorage.setItem('dismissed_announcement', announcement.id);
    }
    setOpen(false);
  };

  if (!announcement) return null;

  return (
    <Snackbar
      open={open}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      // @ts-ignore
      TransitionComponent={SlideTransition as any}
      onClose={handleDismiss}
      sx={{ mt: { xs: 7, sm: 8 }, mr: 2, zIndex: 9999 }}
    >
      <Alert
        icon={<CampaignIcon fontSize="large" sx={{ mt: 0.5 }} />}
        severity="info"
        onClose={handleDismiss}
        sx={{
          width: '100%',
          maxWidth: 400,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'primary.main',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          bgcolor: 'background.paper',
          color: 'text.primary',
          alignItems: 'flex-start',
          '& .MuiAlert-icon': {
            color: 'primary.main',
          },
          '& .MuiAlert-message': {
            width: '100%'
          }
        }}
      >
        <AlertTitle sx={{ fontWeight: 800, mb: 1, fontSize: '1.1rem', color: 'primary.main' }}>
          {announcement.title}
        </AlertTitle>
        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
          {announcement.message}
        </Typography>
      </Alert>
    </Snackbar>
  );
}

export default AnnouncementBanner;
