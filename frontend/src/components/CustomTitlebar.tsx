// frontend/src/components/CustomTitlebar.js
import React from 'react';
import { Box, Typography } from '@mui/material';
import { Dashboard as LogoIcon } from '@mui/icons-material';

function CustomTitlebar() {
  const isElectron = window.api !== undefined;

  if (!isElectron) return null;

  return (
    <Box
      sx={{
        height: 32,
        bgcolor: '#060913',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 1.5,
        userSelect: 'none',
        position: 'fixed',
        top: 0,
        left: 0,
        // Span the full width (OS native buttons will overlap)
        right: 0,
        zIndex: 9999,
        // Webkit application region properties for Electron window dragging
        WebkitAppRegion: 'drag',
        WebkitUserSelect: 'none'
      }}
    >
      {/* Brand Logo & Name */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <LogoIcon sx={{ color: '#10b981', fontSize: '1rem' }} />
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

      {/* Windows 11 Native Controls Overlay will be injected by Electron on the right side */}
      {/* We leave an empty space (drag region) because the OS will draw the buttons over it */}
      <Box sx={{ height: 32, WebkitAppRegion: 'no-drag' }} />
    </Box>
  );
}

export default CustomTitlebar;
