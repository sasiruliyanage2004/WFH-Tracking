import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Typography, Box, Button } from '@mui/material';

interface SmartIdleBreakDialogProps {
  open: boolean;
  onClose: () => void;
  idleMins: number;
  onRetroactiveBreak: (type: string) => void;
}

const SmartIdleBreakDialog: React.FC<SmartIdleBreakDialogProps> = ({
  open,
  onClose,
  idleMins,
  onRetroactiveBreak
}) => {
  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="xs" 
      fullWidth
      // @ts-ignore
      disableEscapeKeyDown
    >
      <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
        ⏰ Inactivity Alert
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
          You returned after being away.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Our system detected no activity for approximately <strong>{idleMins} minutes</strong>. How would you like to log this offline period?
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Button 
            variant="outlined" 
            color="primary" 
            onClick={() => onRetroactiveBreak('Tea / Coffee Break')}
            sx={{ justifyContent: 'flex-start', py: 1.2, px: 2, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            startIcon={<span>🍵</span>}
          >
            Log as Tea / Coffee Break
          </Button>
          <Button 
            variant="outlined" 
            color="primary" 
            onClick={() => onRetroactiveBreak('Lunch')}
            sx={{ justifyContent: 'flex-start', py: 1.2, px: 2, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            startIcon={<span>🍔</span>}
          >
            Log as Lunch Break
          </Button>
          <Button 
            variant="outlined" 
            color="primary" 
            onClick={() => onRetroactiveBreak('Washroom')}
            sx={{ justifyContent: 'flex-start', py: 1.2, px: 2, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            startIcon={<span>🚽</span>}
          >
            Log as Washroom Break
          </Button>
          <Button 
            variant="outlined" 
            color="primary" 
            onClick={() => onRetroactiveBreak('Offline Meeting / Call')}
            sx={{ justifyContent: 'flex-start', py: 1.2, px: 2, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            startIcon={<span>🤝</span>}
          >
            Log as Offline Meeting / Call
          </Button>
          <Button 
            variant="outlined" 
            color="primary" 
            onClick={() => onRetroactiveBreak('Other')}
            sx={{ justifyContent: 'flex-start', py: 1.2, px: 2, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            startIcon={<span>📝</span>}
          >
            Log as Other Break
          </Button>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2.5, justifyContent: 'space-between' }}>
        <Typography variant="caption" color="text.secondary">
          Select an option to update shift log.
        </Typography>
        <Button 
          onClick={onClose} 
          color="error" 
          variant="contained"
          sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
        >
          Ignore (On-Clock)
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SmartIdleBreakDialog;
