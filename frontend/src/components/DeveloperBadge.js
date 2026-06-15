import React, { useState } from 'react';
import { Box, Typography, Popover, IconButton, Tooltip } from '@mui/material';

function DeveloperBadge() {
  const [anchorEl, setAnchorEl] = useState(null);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const id = open ? 'developer-badge-popover' : undefined;

  return (
    <>
      {/* Floating Badge in Bottom-Right Corner */}
      <Tooltip title="Designed & Developed by Sasiru" placement="left">
        <IconButton
          aria-describedby={id}
          onClick={handleClick}
          sx={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            zIndex: 9999,
            width: 48,
            height: 48,
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: '#ffffff',
            boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              background: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)',
              transform: 'scale(1.1) rotate(10deg)',
              boxShadow: '0 6px 24px rgba(16, 185, 129, 0.6)',
            },
            fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif",
            fontWeight: 900,
            fontSize: '1.4rem',
            letterSpacing: '0.5px',
          }}
        >
          S
        </IconButton>
      </Tooltip>

      {/* Styled Glassmorphism Popover */}
      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        slotProps={{
          paper: {
            sx: {
              bgcolor: 'rgba(7, 11, 20, 0.92)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: 4,
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.6), 0 0 30px rgba(16, 185, 129, 0.15)',
              overflow: 'hidden',
              p: 3,
              maxWidth: 320,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }
          }
        }}
      >
        {/* Animated Avatar Circle */}
        <Box
          sx={{
            width: 70,
            height: 70,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 2,
            boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)',
            animation: 'avatarFloat 3s ease-in-out infinite alternate',
            '@keyframes avatarFloat': {
              '0%': { transform: 'translateY(0) rotate(0deg)' },
              '100%': { transform: 'translateY(-6px) rotate(3deg)' },
            }
          }}
        >
          {/* Custom Cartoon Coder SVG Avatar */}
          <svg width="50" height="50" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Head & Neck */}
            <circle cx="32" cy="27" r="12" fill="#FED7AA" />
            <path d="M26 38C26 38 28 42 32 42C36 42 38 38 38 38V45H26V38Z" fill="#FDBA74" />
            
            {/* Hair */}
            <path d="M20 25C20 18.3726 25.3726 13 32 13C38.6274 13 44 18.3726 44 25V27H20V25Z" fill="#1E293B" />
            <path d="M20 24L24 21L28 24L32 21L36 24L40 21L44 24V28H20V24Z" fill="#0F172A" />

            {/* Glowing Coder Glasses */}
            <rect x="22" y="24" width="9" height="6" rx="2" fill="rgba(16, 185, 129, 0.15)" stroke="#10B981" strokeWidth="2" />
            <rect x="33" y="24" width="9" height="6" rx="2" fill="rgba(16, 185, 129, 0.15)" stroke="#10B981" strokeWidth="2" />
            <line x1="31" y1="27" x2="33" y2="27" stroke="#10B981" strokeWidth="2.5" />
            
            {/* Neon Headphones */}
            <path d="M17 26C17 17.7157 23.7157 11 32 11C40.2843 11 47 17.7157 47 26V31H42V26C42 20.4772 37.5228 16 32 16C26.4772 16 22 20.4772 22 26V31H17V26Z" fill="#34D399" />
            <rect x="15" y="27" width="6" height="10" rx="3" fill="#10B981" />
            <rect x="43" y="27" width="6" height="10" rx="3" fill="#10B981" />
            
            {/* Hoodie Body */}
            <path d="M12 56C12 47.1634 19.1634 40 28 40H36C44.8366 40 52 47.1634 52 56V62H12V56Z" fill="#0F172A" />
            {/* Hoodie drawstrings */}
            <path d="M30 46V54" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M34 46V54" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </Box>

        {/* Text Details */}
        <Typography
          variant="h6"
          sx={{
            fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif",
            fontWeight: 800,
            color: '#ffffff',
            mb: 0.5,
          }}
        >
          Sasiru Liyanage
        </Typography>

        <Typography
          variant="caption"
          sx={{
            fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif",
            fontWeight: 700,
            color: '#10b981',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            fontSize: '0.7rem',
            mb: 2,
          }}
        >
          Designed & Developed
        </Typography>

        <Box
          sx={{
            width: '80%',
            height: '1px',
            bgcolor: 'rgba(16, 185, 129, 0.15)',
            mb: 2,
          }}
        />

        <Typography
          variant="body2"
          sx={{
            color: 'rgba(148, 163, 184, 0.8)',
            lineHeight: 1.6,
            fontSize: '0.82rem',
          }}
        >
          Built with 💻, ☕, and modern technology. Elevating user experiences through beautiful design and clean engineering.
        </Typography>
      </Popover>
    </>
  );
}

export default DeveloperBadge;
