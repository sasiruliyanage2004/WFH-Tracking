import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography, Button, CircularProgress } from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';

interface MobileVerifyDialogProps {
  open: boolean;
  onClose: () => void;
  token: string;
}

const MobileVerifyDialog: React.FC<MobileVerifyDialogProps> = ({ open, onClose, token }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, textAlign: 'center' }}>Mobile GPS Verification</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 2 }}>
          <Typography variant="body2" sx={{ mb: 3, textAlign: 'center', color: 'text.secondary' }}>
            Scan this QR code with your smartphone camera to securely verify your exact GPS location.
          </Typography>
          
          <Box sx={{ p: 2, bgcolor: 'white', borderRadius: 2, mb: 3 }}>
            {token && (
              <QRCodeSVG 
                value={`${window.location.protocol === 'file:' ? 'https://wfh-tracking-k5ap.vercel.app' : window.location.origin}/#/mobile-verify?token=${token}`} 
                size={200} 
                level="H"
              />
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'primary.main' }}>
            <CircularProgress size={20} color="inherit" />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>Waiting for mobile scan...</Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, justifyContent: 'center' }}>
        <Button onClick={onClose} sx={{ fontWeight: 600 }}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
};

export default MobileVerifyDialog;
