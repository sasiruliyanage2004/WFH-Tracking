import React, { useEffect, useState } from 'react';
import { Dialog, Box, Typography, Button, Fade, Paper, IconButton } from '@mui/material';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import { Close as CloseIcon, CheckCircleOutlined as CheckCircleOutlineIcon } from '@mui/icons-material';

interface CheckoutSuccessModalProps {
  open: boolean;
  onClose: () => void;
  attendanceData: any;
  userName: string;
}

const CheckoutSuccessModal: React.FC<CheckoutSuccessModalProps> = ({ open, onClose, attendanceData, userName }) => {
  const { width, height } = useWindowSize();
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    if (open) {
      setShowConfetti(true);
      // Stop generating confetti after 5 seconds
      const timer = setTimeout(() => {
        setShowConfetti(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [open]);

  if (!attendanceData || !attendanceData.checkOutTime) return null;

  const checkInTime = new Date(attendanceData.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const checkOutTime = new Date(attendanceData.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  // Calculate total hours
  const start = new Date(attendanceData.checkInTime).getTime();
  const end = new Date(attendanceData.checkOutTime).getTime();
  const totalHours = ((end - start) / 3600000).toFixed(2);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
    >
      {/* Confetti canvas spanning the dialog */}
      {open && (
        <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}>
          <Confetti
            width={600}
            height={600}
            recycle={showConfetti}
            numberOfPieces={400}
            gravity={0.15}
          />
        </Box>
      )}

      <Box sx={{ 
        position: 'relative', 
        zIndex: 1, 
        p: 4, 
        textAlign: 'center',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderRadius: 4
      }}>
        <IconButton 
          onClick={onClose} 
          sx={{ position: 'absolute', top: 8, right: 8, color: 'text.secondary' }}
        >
          <CloseIcon />
        </IconButton>

        <Fade in={open} timeout={1000}>
          <Box>
            <CheckCircleOutlineIcon sx={{ fontSize: 80, color: '#4caf50', mb: 2 }} />
            
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, background: 'linear-gradient(90deg, #1976d2, #9c27b0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Great Job Today, {userName}!
            </Typography>
            
            <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 4, fontWeight: 500 }}>
              You have successfully checked out. Here's a summary of your day.
            </Typography>

            <Paper elevation={0} sx={{ p: 3, mb: 4, borderRadius: 3, bgcolor: 'rgba(25, 118, 210, 0.04)', border: '1px solid rgba(25, 118, 210, 0.1)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>Check-in Time:</Typography>
                <Typography variant="body1" sx={{ fontWeight: 700 }}>{checkInTime}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>Check-out Time:</Typography>
                <Typography variant="body1" sx={{ fontWeight: 700 }}>{checkOutTime}</Typography>
              </Box>
              
              <Box sx={{ my: 2, height: '1px', bgcolor: 'rgba(0,0,0,0.08)' }} />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" color="primary.main" sx={{ fontWeight: 600 }}>Total Hours Worked:</Typography>
                <Typography variant="h5" color="primary.main" sx={{ fontWeight: 800 }}>{totalHours} hrs</Typography>
              </Box>
            </Paper>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, fontStyle: 'italic' }}>
              "Rest and recharge. We'll see you tomorrow!"
            </Typography>

            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={onClose}
              sx={{ 
                py: 1.5, 
                borderRadius: 3, 
                fontWeight: 700,
                textTransform: 'none',
                fontSize: '1.1rem',
                background: 'linear-gradient(45deg, #1976d2, #2196f3)',
                boxShadow: '0 4px 14px 0 rgba(33, 150, 243, 0.39)'
              }}
            >
              Back to Dashboard
            </Button>
          </Box>
        </Fade>
      </Box>
    </Dialog>
  );
};

export default CheckoutSuccessModal;
