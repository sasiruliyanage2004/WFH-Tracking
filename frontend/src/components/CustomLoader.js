import React from 'react';
import { Box } from '@mui/material';

function CustomLoader({ size = 60, color = '#10b981' }) {
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        width: size,
        height: size,
      }}
    >
      {/* Outer subtle rotating glow ring */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: '2px dashed rgba(16, 185, 129, 0.25)',
          animation: 'rotateRing 8s linear infinite',
          '@keyframes rotateRing': {
            from: { transform: 'rotate(0deg)' },
            to: { transform: 'rotate(360deg)' },
          },
        }}
      />
      
      {/* Central animated S logo SVG */}
      <svg
        width={size * 0.7}
        height={size * 0.7}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: 'drop-shadow(0px 0px 8px rgba(16, 185, 129, 0.6))' }}
      >
        <path
          d="M 72 28 C 72 12, 28 12, 28 35 C 28 50, 72 50, 72 65 C 72 88, 28 88, 28 72"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: 300,
            strokeDashoffset: 300,
            animation: 'drawS 3s ease-in-out infinite alternate',
          }}
        />
        <style>{`
          @keyframes drawS {
            0% {
              stroke-dashoffset: 300;
            }
            100% {
              stroke-dashoffset: 0;
            }
          }
        `}</style>
      </svg>
    </Box>
  );
}

export default CustomLoader;
