// frontend/src/components/DeveloperSignature.js
import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';

function DeveloperSignature({ lightMode = false, sx = {} }) {
  const [hovered, setHovered] = useState(false);

  return (
    <Box
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        cursor: 'pointer',
        py: 0.8,
        px: 1.5,
        borderRadius: '20px',
        bgcolor: hovered
          ? (lightMode ? 'rgba(16, 185, 129, 0.06)' : 'rgba(16, 185, 129, 0.04)')
          : 'transparent',
        border: hovered
          ? (lightMode ? '1px solid rgba(16, 185, 129, 0.15)' : '1px solid rgba(16, 185, 129, 0.1)')
          : '1px solid transparent',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        width: 'fit-content',
        ...sx,
      }}
    >
      {/* ── Vector Avatar with Pulsing Halo ── */}
      <Box
        sx={{
          position: 'relative',
          width: 32,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          flexShrink: 0,
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          boxShadow: hovered 
            ? '0 0 12px rgba(16, 185, 129, 0.6)' 
            : '0 0 5px rgba(16, 185, 129, 0.2)',
          transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          transform: hovered ? 'scale(1.15) rotate(5deg)' : 'scale(1)',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: -2,
            borderRadius: '50%',
            border: '1.5px solid rgba(16, 185, 129, 0.4)',
            opacity: hovered ? 1 : 0,
            animation: 'pingGlow 2s infinite ease-in-out',
            transition: 'opacity 0.3s',
          },
          '@keyframes pingGlow': {
            '0%': { transform: 'scale(1)', opacity: 0.8 },
            '50%': { transform: 'scale(1.25)', opacity: 0.1 },
            '100%': { transform: 'scale(1)', opacity: 0.8 },
          }
        }}
      >
        {/* Custom Cartoon Coder SVG Avatar */}
        <svg width="24" height="24" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
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

      {/* ── Sliding Text Container ── */}
      <Box
        sx={{
          position: 'relative',
          height: 20,
          width: 175,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        {/* Text 1: Default State */}
        <Typography
          variant="caption"
          sx={{
            fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif",
            fontWeight: 800,
            fontSize: '0.8rem',
            color: lightMode ? 'text.secondary' : 'rgba(148, 163, 184, 0.6)',
            letterSpacing: '0.04em',
            position: 'absolute',
            left: 0,
            transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: hovered ? 'translateY(-22px)' : 'translateY(0)',
            opacity: hovered ? 0 : 1,
            pointerEvents: 'none',
          }}
        >
          Built by <Box component="span" sx={{ color: '#10b981', fontWeight: 900 }}>Sasiru</Box>
        </Typography>

        {/* Text 2: Hover State */}
        <Typography
          variant="caption"
          sx={{
            fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif",
            fontWeight: 850,
            fontSize: '0.76rem',
            color: '#10b981',
            letterSpacing: '0.01em',
            position: 'absolute',
            left: 0,
            transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: hovered ? 'translateY(0)' : 'translateY(22px)',
            opacity: hovered ? 1 : 0,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          Built with 💻 & ☕ by <Box component="span" sx={{ color: '#34d399', fontWeight: 900 }}>Sasiru</Box>
        </Typography>
      </Box>
    </Box>
  );
}

export default DeveloperSignature;
