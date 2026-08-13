import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl, InputLabel, Select, MenuItem, Button } from '@mui/material';

interface CreateTaskDialogProps {
  open: boolean;
  onClose: () => void;
  taskName: string;
  setTaskName: (name: string) => void;
  taskDesc: string;
  setTaskDesc: (desc: string) => void;
  taskPriority: string;
  setTaskPriority: (priority: string) => void;
  onCreateTask: () => void;
}

const CreateTaskDialog: React.FC<CreateTaskDialogProps> = ({
  open,
  onClose,
  taskName,
  setTaskName,
  taskDesc,
  setTaskDesc,
  taskPriority,
  setTaskPriority,
  onCreateTask
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Create New Task</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
        <TextField
          label="Task Name"
          fullWidth
          value={taskName}
          onChange={(e) => setTaskName(e.target.value)}
          required
          autoFocus
        />
        <TextField
          label="Description"
          multiline
          rows={3}
          fullWidth
          value={taskDesc}
          onChange={(e) => setTaskDesc(e.target.value)}
        />
        <FormControl fullWidth>
          <InputLabel>Priority</InputLabel>
          <Select
            value={taskPriority}
            label="Priority"
            onChange={(e) => setTaskPriority(e.target.value)}
          >
            <MenuItem value="Low">Low</MenuItem>
            <MenuItem value="Medium">Medium</MenuItem>
            <MenuItem value="High">High</MenuItem>
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button onClick={onCreateTask} variant="contained" color="success">Create</Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateTaskDialog;
