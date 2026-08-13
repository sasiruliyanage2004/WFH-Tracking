import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Box, Alert, Typography, Button } from '@mui/material';

interface WebcamDialogProps {
  open: boolean;
  onClose: () => void;
  videoRef: React.RefObject<HTMLVideoElement>;
  error: string;
  onCapture: () => void;
}

const WebcamDialog: React.FC<WebcamDialogProps> = ({ open, onClose, videoRef, error, onCapture }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Capture Verification Selfie</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 2 }}>
          <Box
            sx={{
              width: 320,
              height: 240,
              bgcolor: 'black',
              borderRadius: 4,
              overflow: 'hidden',
              position: 'relative',
              boxShadow: 3
            }}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </Box>
          {error && (
            <Alert severity="error" sx={{ mt: 2, width: '100%' }}>{error}</Alert>
          )}
          <Typography variant="caption" sx={{ mt: 2, color: 'text.secondary' }}>
            Ensure your face is clearly visible. This photo will be logged with your check-in.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} sx={{ fontWeight: 600 }}>Cancel</Button>
        <Button onClick={onCapture} variant="contained" color="primary" sx={{ px: 4 }}>Capture & Use Photo</Button>
      </DialogActions>
    </Dialog>
  );
};

export default WebcamDialog;
