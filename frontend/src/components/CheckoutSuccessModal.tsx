import React, { useEffect, useState } from 'react';
import { Dialog, Box, Typography, Button, Fade, IconButton } from '@mui/material';
import Confetti from 'react-confetti';
import { Close as CloseIcon } from '@mui/icons-material';

interface CheckoutSuccessModalProps {
  open: boolean;
  onClose: () => void;
  attendanceData: any;
  userName: string;
}

const CheckoutSuccessModal: React.FC<CheckoutSuccessModalProps> = ({ open, onClose, attendanceData, userName }) => {
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    if (open) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [open]);

  if (!attendanceData || !attendanceData.checkOutTime) return null;

  const checkInTime = new Date(attendanceData.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const checkOutTime = new Date(attendanceData.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const start = new Date(attendanceData.checkInTime).getTime();
  const end = new Date(attendanceData.checkOutTime).getTime();
  const totalHours = ((end - start) / 3600000).toFixed(2);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      sx={{
        '& .MuiDialog-paper': {
          background: 'transparent',
          boxShadow: 'none',
          overflow: 'visible',
        },
        '& .MuiBackdrop-root': {
          background: 'rgba(4, 6, 15, 0.85)',
          backdropFilter: 'blur(12px)',
        },
      }}
    >
      {/* Confetti */}
      {open && (
        <Box sx={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 0, pointerEvents: 'none' }}>
          <Confetti
            width={window.innerWidth}
            height={window.innerHeight}
            recycle={showConfetti}
            numberOfPieces={300}
            gravity={0.12}
            colors={['#10b981', '#4f8ef7', '#a78bfa', '#34d399', '#f59e0b']}
          />
        </Box>
      )}

      <Fade in={open} timeout={600}>
        <Box sx={{
          position: 'relative',
          zIndex: 1,
          p: { xs: 3, sm: 4 },
          textAlign: 'center',
          background: 'linear-gradient(145deg, rgba(10, 14, 28, 0.97) 0%, rgba(6, 9, 19, 0.99) 100%)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          border: '1px solid rgba(79, 142, 247, 0.18)',
          borderRadius: '24px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 60px rgba(16, 185, 129, 0.08), inset 0 1px 0 rgba(255,255,255,0.06)',
          overflow: 'hidden',
        }}>

          {/* Background glow blobs */}
          <Box sx={{
            position: 'absolute', top: '-80px', right: '-80px',
            width: '240px', height: '240px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)',
            filter: 'blur(40px)', pointerEvents: 'none',
          }} />
          <Box sx={{
            position: 'absolute', bottom: '-80px', left: '-80px',
            width: '240px', height: '240px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(79,142,247,0.1) 0%, transparent 70%)',
            filter: 'blur(40px)', pointerEvents: 'none',
          }} />

          {/* Close button */}
          <IconButton
            onClick={onClose}
            sx={{
              position: 'absolute', top: 12, right: 12,
              color: 'rgba(148,163,184,0.5)',
              '&:hover': { color: 'rgba(255,255,255,0.8)', background: 'rgba(255,255,255,0.06)' },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>

          {/* Success icon */}
          <Box sx={{
            position: 'relative', display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center',
            width: 88, height: 88, mb: 3,
            mx: 'auto',
          }}>
            {/* Animated ring */}
            <Box sx={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              border: '2px solid transparent',
              borderTopColor: '#10b981',
              borderRightColor: 'rgba(16,185,129,0.3)',
              animation: 'spin 3s linear infinite',
              '@keyframes spin': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } },
            }} />
            <Box sx={{
              position: 'absolute', inset: '6px', borderRadius: '50%',
              border: '1px solid rgba(16,185,129,0.2)',
            }} />
            {/* Check icon */}
            <Box sx={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(5,150,105,0.15) 100%)',
              border: '1px solid rgba(16,185,129,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 30px rgba(16,185,129,0.3)',
            }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Box>
          </Box>

          {/* Title */}
          <Typography variant="h4" sx={{
            fontWeight: 800,
            fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif",
            mb: 1,
            background: 'linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.75) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.02em',
          }}>
            Great Job Today, {userName}!
          </Typography>

          <Typography variant="body2" sx={{ color: 'rgba(148,163,184,0.7)', mb: 4, fontWeight: 500 }}>
            You've successfully checked out. Here's a summary of your shift.
          </Typography>

          {/* Stats card */}
          <Box sx={{
            p: 3, mb: 3, borderRadius: '16px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            backdropFilter: 'blur(10px)',
          }}>
            {[
              { label: 'Check-in Time', value: checkInTime, color: '#4f8ef7' },
              { label: 'Check-out Time', value: checkOutTime, color: '#a78bfa' },
            ].map(({ label, value, color }) => (
              <Box key={label} sx={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                py: 1.5,
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                '&:last-of-type': { borderBottom: '1px solid rgba(255,255,255,0.05)' }
              }}>
                <Typography sx={{ color: 'rgba(148,163,184,0.65)', fontWeight: 500, fontSize: '0.9rem' }}>{label}</Typography>
                <Typography sx={{ color, fontWeight: 700, fontSize: '0.95rem' }}>{value}</Typography>
              </Box>
            ))}

            {/* Divider */}
            <Box sx={{ my: 2, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.3), transparent)' }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600, fontSize: '1rem' }}>
                Total Hours Worked
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                <Typography sx={{
                  fontWeight: 800, fontSize: '1.5rem',
                  background: 'linear-gradient(135deg, #10b981, #34d399)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>
                  {totalHours}
                </Typography>
                <Typography sx={{ color: 'rgba(16,185,129,0.7)', fontWeight: 600, fontSize: '0.85rem' }}>hrs</Typography>
              </Box>
            </Box>
          </Box>

          {/* Quote */}
          <Typography sx={{
            fontSize: '0.8rem', color: 'rgba(148,163,184,0.4)', mb: 3, fontStyle: 'italic',
          }}>
            "Rest and recharge — we'll see you tomorrow! 🌙"
          </Typography>

          {/* CTA button */}
          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={onClose}
            sx={{
              py: 1.6,
              borderRadius: '14px',
              fontWeight: 700,
              textTransform: 'none',
              fontSize: '1rem',
              fontFamily: "'Outfit', sans-serif",
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              boxShadow: '0 8px 24px rgba(16,185,129,0.35)',
              border: '1px solid rgba(16,185,129,0.3)',
              color: '#fff',
              letterSpacing: '0.01em',
              transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
              '&:hover': {
                background: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)',
                boxShadow: '0 12px 32px rgba(16,185,129,0.5)',
                transform: 'translateY(-2px)',
              },
            }}
          >
            Back to Dashboard
          </Button>
        </Box>
      </Fade>
    </Dialog>
  );
};

export default CheckoutSuccessModal;
