// frontend/src/components/CustomTitlebar.js
import React from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import {
  Close as CloseIcon,
  Remove as MinimizeIcon,
  CropSquare as MaximizeIcon,
  Dashboard as LogoIcon
} from '@mui/icons-material';

function CustomTitlebar() {
  const isElectron = window.api !== undefined;

  if (!isElectron) return null;

  const handleMinimize = () => {
    window.api.minimizeWindow();
  };

  const handleMaximize = () => {
    window.api.maximizeWindow();
  };

  const handleClose = () => {
    window.api.closeWindow();
  };

  return (
    <Box
      sx={{
        height: 32,
        bgcolor: '#151B1F',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 1.5,
        userSelect: 'none',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        // Webkit application region properties for Electron window dragging
        WebkitAppRegion: 'drag',
        WebkitUserSelect: 'none'
      }}
    >
      {/* Brand Logo & Name */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <LogoIcon sx={{ color: '#66B539', fontSize: '1rem' }} />
        <Typography
          variant="caption"
          sx={{
            fontWeight: 800,
            fontSize: '0.75rem',
            color: '#a0a0a0',
            letterSpacing: '0.05em'
          }}
        >
          WorkforceOS Enterprise
        </Typography>
      </Box>

      {/* Control Buttons */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          WebkitAppRegion: 'no-drag' // Buttons must not be draggable to be clickable
        }}
      >
        <IconButton
          onClick={handleMinimize}
          size="small"
          sx={{
            width: 26,
            height: 26,
            borderRadius: '6px',
            color: 'text.secondary',
            transition: 'all 0.2s',
            '&:hover': {
              bgcolor: 'rgba(255, 255, 255, 0.08)',
              color: 'text.primary'
            }
          }}
        >
          <MinimizeIcon sx={{ fontSize: '0.9rem' }} />
        </IconButton>

        <IconButton
          onClick={handleMaximize}
          size="small"
          sx={{
            width: 26,
            height: 26,
            borderRadius: '6px',
            color: 'text.secondary',
            transition: 'all 0.2s',
            '&:hover': {
              bgcolor: 'rgba(255, 255, 255, 0.08)',
              color: 'text.primary'
            }
          }}
        >
          <MaximizeIcon sx={{ fontSize: '0.8rem' }} />
        </IconButton>

        <IconButton
          onClick={handleClose}
          size="small"
          sx={{
            width: 26,
            height: 26,
            borderRadius: '6px',
            color: 'text.secondary',
            transition: 'all 0.2s',
            '&:hover': {
              bgcolor: '#dc2626',
              color: '#ffffff',
              boxShadow: '0 0 15px rgba(220, 38, 38, 0.5)'
            }
          }}
        >
          <CloseIcon sx={{ fontSize: '0.9rem' }} />
        </IconButton>
      </Box>
    </Box>
  );
}

export default CustomTitlebar;
