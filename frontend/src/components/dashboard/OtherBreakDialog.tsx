import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Typography, Button } from '@mui/material';

interface OtherBreakDialogProps {
  open: boolean;
  onClose: () => void;
  note: string;
  setNote: (note: string) => void;
  onStartBreak: () => void;
}

const OtherBreakDialog: React.FC<OtherBreakDialogProps> = ({
  open,
  onClose,
  note,
  setNote,
  onStartBreak
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>📝 Other Break</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Please add a note describing the reason for this break.
        </Typography>
        <TextField
          label="Reason / Note"
          placeholder="e.g. Doctor's appointment, personal errand..."
          fullWidth
          multiline
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          autoFocus
          // @ts-ignore
          inputProps={{ maxLength: 200 }}
          helperText={`${note.length}/200`}
        />
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button
          onClick={onStartBreak}
          variant="contained"
          color="secondary"
          disabled={!note.trim()}
        >
          Start Break
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default OtherBreakDialog;
