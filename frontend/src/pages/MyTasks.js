// frontend/src/pages/MyTasks.js
import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  TextField,
  Typography,
  Chip,
  Paper,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { AddTask as TaskIcon } from '@mui/icons-material';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function MyTasks() {
  const { token, user } = useSelector((state) => state.auth);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // New Task states
  const [taskName, setTaskName] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPriority, setTaskPriority] = useState('Medium');
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_URL}/api/tasks`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setTasks(res.data);
      } catch (err) {
        console.error(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, [token]);

  const handleCreateTask = async () => {
    if (!taskName) return;
    try {
      const res = await axios.post(
        `${API_URL}/api/tasks`,
        {
          taskName,
          description: taskDesc,
          priority: taskPriority,
          status: 'Pending',
          progress: 0,
          assignedTo: user.id
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTasks([...tasks, res.data]);
      setTaskName('');
      setTaskDesc('');
      setTaskPriority('Medium');
      setTaskDialogOpen(false);
    } catch (err) {
      console.error(err.message);
    }
  };

  const handleLocalProgressChange = (taskId, newProgress) => {
    setTasks((prev) => prev.map((t) => (t._id === taskId ? { ...t, progress: newProgress } : t)));
  };

  const handleTaskProgressChange = async (taskId, newProgress) => {
    let newStatus = 'In Progress';
    if (newProgress === 100) newStatus = 'Completed';
    else if (newProgress === 0) newStatus = 'Pending';

    try {
      const res = await axios.put(
        `${API_URL}/api/tasks/${taskId}`,
        { progress: newProgress, status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTasks((prev) => prev.map((t) => (t._id === taskId ? res.data : t)));
    } catch (err) {
      console.error(err.message);
    }
  };

  const handleTaskStatusChange = async (taskId, newStatus) => {
    try {
      const payload = { status: newStatus };
      if (newStatus === 'Completed') payload.progress = 100;
      if (newStatus === 'Pending') payload.progress = 0;

      const res = await axios.put(
        `${API_URL}/api/tasks/${taskId}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTasks((prev) => prev.map((t) => (t._id === taskId ? res.data : t)));
    } catch (err) {
      console.error(err.message);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Task Tracking Board</Typography>
        <Button
          variant="contained"
          startIcon={<TaskIcon />}
          onClick={() => setTaskDialogOpen(true)}
          sx={{ borderRadius: 2 }}
        >
          New Task
        </Button>
      </Box>

      {tasks.length === 0 ? (
        <Paper variant="outlined" sx={{ py: 6, textAlign: 'center', borderRadius: 3 }}>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            No tasks found. Click "New Task" to create your first tracking task.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {tasks.map((task) => (
            <Grid item xs={12} sm={6} key={task._id}>
              <Card sx={{ borderRadius: 3, boxShadow: '0px 4px 20px rgba(0,0,0,0.05)', border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{task.taskName}</Typography>
                    <Chip
                      label={task.priority}
                      color={task.priority === 'High' ? 'error' : task.priority === 'Medium' ? 'warning' : 'default'}
                      size="small"
                      sx={{ borderRadius: 1 }}
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3, minHeight: 40 }}>
                    {task.description || 'No description provided.'}
                  </Typography>
                  
                  <Box sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">Progress</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>{task.progress}%</Typography>
                    </Box>
                    <Slider
                      size="small"
                      value={task.progress}
                      onChange={(e, val) => handleLocalProgressChange(task._id, val)}
                      onChangeCommitted={(e, val) => handleTaskProgressChange(task._id, val)}
                      disabled={task.status === 'Completed'}
                      valueLabelDisplay="auto"
                    />
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel>Status</InputLabel>
                      <Select
                        value={task.status}
                        label="Status"
                        onChange={(e) => handleTaskStatusChange(task._id, e.target.value)}
                      >
                        <MenuItem value="Pending">Pending</MenuItem>
                        <MenuItem value="In Progress">In Progress</MenuItem>
                        <MenuItem value="Completed">Completed</MenuItem>
                        <MenuItem value="Blocked">Blocked</MenuItem>
                      </Select>
                    </FormControl>
                    
                    {task.dueDate && (
                      <Typography variant="caption" color="text.secondary">
                        Due: {new Date(task.dueDate).toLocaleDateString()}
                      </Typography>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dialog for New Task */}
      <Dialog open={taskDialogOpen} onClose={() => setTaskDialogOpen(false)} maxWidth="sm" fullWidth>
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
          <Button onClick={() => setTaskDialogOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={handleCreateTask} variant="contained" color="primary">Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default MyTasks;
