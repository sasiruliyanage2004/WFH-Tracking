import React, { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import DevicesIcon from '@mui/icons-material/Devices';

const WelcomeSplash = ({ onFinish }) => {
  const [fadeClass, setFadeClass] = useState('fade-in');

  useEffect(() => {
    // Start fade out transition after 2.2s
    const fadeOutTimer = setTimeout(() => {
      setFadeClass('fade-out');
    }, 2200);

    // Call onFinish when fade animation completes (2.7s)
    const finishTimer = setTimeout(() => {
      onFinish();
    }, 2700);

    return () => {
      clearTimeout(fadeOutTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <Box
      className={fadeClass}
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'linear-gradient(135deg, #090e1a 0%, #030712 50%, #0c1424 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 99999,
        transition: 'opacity 0.5s ease-in-out',
        '&.fade-out': {
          opacity: 0,
          pointerEvents: 'none'
        },
        '&.fade-in': {
          opacity: 1
        }
      }}
    >
      {/* Glowing background blur effect */}
      <Box
        sx={{
          position: 'absolute',
          width: '350px',
          height: '350px',
          background: 'radial-gradient(circle, rgba(37, 99, 235, 0.15) 0%, rgba(37, 99, 235, 0) 70%)',
          filter: 'blur(30px)',
          animation: 'pulseGlow 3s infinite alternate',
          '@keyframes pulseGlow': {
            '0%': { transform: 'scale(0.9)', opacity: 0.5 },
            '100%': { transform: 'scale(1.15)', opacity: 0.8 }
          }
        }}
      />

      {/* Main Logo & Text Container */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          animation: 'scaleUp 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          '@keyframes scaleUp': {
            '0%': { transform: 'scale(0.85)', opacity: 0 },
            '100%': { transform: 'scale(1)', opacity: 1 }
          }
        }}
      >
        {/* Glowing glass icon circle */}
        <Box
          sx={{
            width: '90px',
            height: '90px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.2) 0%, rgba(79, 142, 247, 0.05) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            boxShadow: '0 8px 32px 0 rgba(37, 99, 235, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
            marginBottom: '24px',
            animation: 'floatIcon 4s ease-in-out infinite',
            '@keyframes floatIcon': {
              '0%': { transform: 'translateY(0px)' },
              '50%': { transform: 'translateY(-6px)' },
              '100%': { transform: 'translateY(0px)' }
            }
          }}
        >
          <DevicesIcon sx={{ fontSize: '42px', color: '#4f8ef7' }} />
        </Box>

        {/* Title */}
        <Typography
          variant="h3"
          sx={{
            fontWeight: 800,
            letterSpacing: '5px',
            color: '#ffffff',
            fontFamily: "'Outfit', 'Inter', sans-serif",
            textTransform: 'uppercase',
            background: 'linear-gradient(to right, #ffffff, #93c5fd, #ffffff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundSize: '200% auto',
            animation: 'shine 4s linear infinite',
            marginBottom: '8px',
            textAlign: 'center',
            '@keyframes shine': {
              '0%': { backgroundPosition: '0% center' },
              '100%': { backgroundPosition: '200% center' }
            }
          }}
        >
          WorkforceOS
        </Typography>

        {/* Subtitle */}
        <Typography
          variant="subtitle2"
          sx={{
            color: '#7c94b6',
            letterSpacing: '1px',
            fontWeight: 500,
            textTransform: 'uppercase',
            fontSize: '0.75rem',
            marginBottom: '40px',
            textAlign: 'center',
            opacity: 0.8
          }}
        >
          Enterprise WFH Monitoring & Analytics
        </Typography>
      </Box>

      {/* Loading Status Indicator */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <CircularProgress 
          size={28} 
          thickness={4.5} 
          sx={{ 
            color: '#4f8ef7',
            animationDuration: '650ms'
          }} 
        />
        <Typography
          variant="caption"
          sx={{
            color: '#4b5563',
            fontSize: '0.65rem',
            marginTop: '16px',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            fontWeight: 600
          }}
        >
          Securing Workspace...
        </Typography>
      </Box>
    </Box>
  );
};

export default WelcomeSplash;
