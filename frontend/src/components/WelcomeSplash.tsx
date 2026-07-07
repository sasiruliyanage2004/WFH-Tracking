// frontend/src/components/WelcomeSplash.js
import React, { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';

/* Tiny floating orb helper */
const Orb = ({ size, top, left, color, delay = 0, duration = 6 }: { size: any, top: any, left: any, color: any, delay?: number, duration?: number }) => (
  <Box
    sx={{
      position: 'absolute',
      width: size,
      height: size,
      top,
      left,
      borderRadius: '50%',
      background: color,
      filter: 'blur(60px)',
      opacity: 0.55,
      animation: `floatOrb ${duration}s ease-in-out ${delay}s infinite alternate`,
      '@keyframes floatOrb': {
        '0%':   { transform: 'translateY(0px) scale(1)' },
        '100%': { transform: 'translateY(-30px) scale(1.1)' },
      },
      pointerEvents: 'none',
    }}
  />
);

/* Grid dot particle */
const Particle = ({ x, y, delay }) => (
  <Box
    sx={{
      position: 'absolute',
      left: x,
      top:  y,
      width: 3,
      height: 3,
      borderRadius: '50%',
      bgcolor: 'rgba(255,255,255,0.25)',
      animation: `twinkle 3s ease-in-out ${delay}s infinite`,
      '@keyframes twinkle': {
        '0%,100%': { opacity: 0.1, transform: 'scale(1)' },
        '50%':     { opacity: 0.7, transform: 'scale(1.6)' },
      },
    }}
  />
);

const WelcomeSplash = ({ onFinish }) => {
  const [phase, setPhase] = useState('enter'); // 'enter' | 'exit'
  const [barWidth, setBarWidth] = useState(0);

  useEffect(() => {
    // Animate progress bar 0 → 100% over 2s
    const barTimer = setInterval(() => {
      setBarWidth(prev => {
        if (prev >= 100) {
          clearInterval(barTimer);
          return 100;
        }
        return prev + 2.5;
      });
    }, 50);

    const exitTimer  = setTimeout(() => setPhase('exit'),    2400);
    const doneTimer  = setTimeout(() => onFinish(),          3000);

    return () => {
      clearInterval(barTimer);
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, [onFinish]);

  // Generate sparse particle grid
  const particles = [];
  for (let i = 0; i < 18; i++) {
    particles.push({
      x:     `${Math.random() * 100}%`,
      y:     `${Math.random() * 100}%`,
      delay: (Math.random() * 3).toFixed(2),
    });
  }

  return (
    <Box
      sx={{
        position:  'fixed',
        inset:     0,
        background: 'radial-gradient(ellipse at 30% 20%, #0e1c3d 0%, #060913 55%, #0a0e1a 100%)',
        display:    'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 99999,
        overflow: 'hidden',
        opacity: phase === 'exit' ? 0 : 1,
        transform: phase === 'exit' ? 'scale(1.04)' : 'scale(1)',
        transition: 'opacity 0.6s ease, transform 0.6s ease',
        pointerEvents: phase === 'exit' ? 'none' : 'all',
      }}
    >
      {/* ── Ambient orbs ── */}
      <Orb size="400px" top="-100px" left="-80px"  color="rgba(37,99,235,0.35)"  delay={0} duration={7} />
      <Orb size="350px" top="50%"   left="70%"    color="rgba(124,58,237,0.3)"   delay={1} duration={8} />
      <Orb size="280px" top="65%"   left="-60px"  color="rgba(16,185,129,0.2)"   delay={2} duration={9} />

      {/* ── Particle dots ── */}
      {particles.map((p, i) => (
        <Particle key={i} x={p.x} y={p.y} delay={p.delay} />
      ))}

      {/* ── Thin top accent bar ── */}
      <Box
        sx={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: '2px',
          background: 'linear-gradient(90deg, transparent 0%, #10b981 40%, #34d399 70%, transparent 100%)',
          opacity: 0.8,
        }}
      />

      {/* ── Main content ── */}
      <Box
        sx={{
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          animation:      'splashEnter 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          '@keyframes splashEnter': {
            from: { opacity: 0, transform: 'translateY(24px) scale(0.96)' },
            to:   { opacity: 1, transform: 'translateY(0) scale(1)' },
          },
        }}
      >
        {/* Logo ring with S loader */}
        <Box
          sx={{
            position: 'relative',
            width: 110,
            height: 110,
            mb: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Outer glowing rotating ring */}
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '2px dashed #10b981',
              animation: 'rotateSlow 6s linear infinite',
              '@keyframes rotateSlow': {
                from: { transform: 'rotate(0deg)' },
                to:   { transform: 'rotate(360deg)' },
              },
            }}
          />
          {/* Inner glow circle containing animated S */}
          <Box
            sx={{
              position: 'absolute',
              inset: 10,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(55, 65, 72, 0.1) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 35px rgba(16, 185, 129, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
              animation: 'float 3s ease-in-out infinite',
              '@keyframes float': {
                '0%,100%': { transform: 'translateY(0)' },
                '50%':     { transform: 'translateY(-5px)' },
              },
            }}
          >
            {/* Animated S SVG Logo */}
            <svg
              width="45"
              height="45"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ filter: 'drop-shadow(0px 0px 6px rgba(16, 185, 129, 0.5))' }}
            >
              <path
                d="M 72 28 C 72 12, 28 12, 28 35 C 28 50, 72 50, 72 65 C 72 88, 28 88, 28 72"
                stroke="#10b981"
                strokeWidth="12"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  strokeDasharray: 300,
                  strokeDashoffset: 300,
                  animation: 'drawSplashS 2.4s ease-in-out infinite alternate',
                }}
              />
              <style>{`
                @keyframes drawSplashS {
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
        </Box>

        {/* Brand name */}
        <Typography
          variant="h3"
          sx={{
            fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif",
            fontWeight: 800,
            letterSpacing: '6px',
            textTransform: 'uppercase',
            background: 'linear-gradient(135deg, #ffffff 0%, #93c5fd 40%, #c4b5fd 70%, #ffffff 100%)',
            backgroundSize: '300% auto',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            animation: 'shine 5s linear infinite',
            '@keyframes shine': {
              '0%':   { backgroundPosition: '0% center' },
              '100%': { backgroundPosition: '300% center' },
            },
            mb: 1,
            textAlign: 'center',
          }}
        >
          WorkforceOS
        </Typography>

        <Typography
          variant="caption"
          sx={{
            color: 'rgba(148,163,184,0.7)',
            letterSpacing: '3px',
            fontWeight: 600,
            textTransform: 'uppercase',
            fontSize: '0.65rem',
            mb: 5,
          }}
        >
          Enterprise WFH Monitoring & Analytics
        </Typography>

        {/* ── Progress bar ── */}
        <Box sx={{ width: 220, position: 'relative' }}>
          {/* Track */}
          <Box
            sx={{
              width: '100%',
              height: 3,
              bgcolor: 'rgba(255,255,255,0.08)',
              borderRadius: 99,
              overflow: 'hidden',
            }}
          >
            {/* Fill */}
            <Box
              sx={{
                height: '100%',
                width: `${barWidth}%`,
                 background: 'linear-gradient(90deg, #059669 0%, #10b981 50%, #34d399 100%)',
                 borderRadius: 99,
                 transition: 'width 0.05s linear',
                 boxShadow: '0 0 8px rgba(102,181,57,0.6)',
              }}
            />
          </Box>

          <Typography
            variant="caption"
            sx={{
              display: 'block',
              textAlign: 'center',
              mt: 1.5,
              color: 'rgba(100,116,139,0.9)',
              letterSpacing: '1.5px',
              fontWeight: 600,
              fontSize: '0.6rem',
              textTransform: 'uppercase',
            }}
          >
            {barWidth < 100 ? 'Securing Workspace...' : 'Ready'}
          </Typography>
        </Box>
      </Box>

      {/* Bottom brand */}
      <Typography
        variant="caption"
        sx={{
          position: 'absolute',
          bottom: 28,
          color: 'rgba(100,116,139,0.5)',
          letterSpacing: '1px',
          fontSize: '0.6rem',
          fontWeight: 500,
        }}
      >
        Powered by WorkforceOS Enterprise v2.0
      </Typography>
    </Box>
  );
};

export default WelcomeSplash;
