import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { Box, Typography, IconButton } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CampaignIcon from '@mui/icons-material/Campaign';
import CloseIcon from '@mui/icons-material/Close';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function AnnouncementBanner() {
  const { isAuthenticated, token } = useSelector((state: any) => state.auth);
  const [announcement, setAnnouncement] = useState<any>(null);
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
            document.documentElement.style.setProperty('--banner-height', '44px');
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
    document.documentElement.style.setProperty('--banner-height', '0px');
  };

  if (!announcement || !open) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '44px',
        zIndex: 99999, // Above everything
        background: announcement.color || 'linear-gradient(90deg, #7c3aed, #2563eb)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 3,
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', maxWidth: '1200px', width: '100%' }}>
        {announcement.title.toLowerCase().includes('technical') || announcement.title.toLowerCase().includes('issue') ? (
          <WarningAmberIcon sx={{ mr: 1.5, opacity: 0.9 }} />
        ) : (
          <CampaignIcon sx={{ mr: 1.5, opacity: 0.9 }} />
        )}
        
        <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography variant="body2" sx={{ fontWeight: 600, mr: 1, fontSize: '0.85rem' }}>
            {announcement.title}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9, fontSize: '0.85rem' }}>
            {announcement.message}
          </Typography>
        </Box>

        <IconButton
          size="small"
          onClick={handleDismiss}
          sx={{
            color: 'inherit',
            opacity: 0.8,
            '&:hover': { opacity: 1, bgcolor: 'rgba(255,255,255,0.1)' },
            ml: 2,
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
}

export default AnnouncementBanner;
