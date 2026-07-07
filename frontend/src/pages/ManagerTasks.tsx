import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Link
} from '@mui/material';
import { 
  AddTask as TaskIcon, 
  Delete as DeleteIcon,
  Comment as CommentIcon,
  Attachment as AttachmentIcon,
  Link as LinkIcon,
  OpenInNew as OpenInNewIcon,
  Close as CloseIcon,
  Send as SendIcon
} from '@mui/icons-material';

import CustomLoader from '../components/CustomLoader';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function ManagerTasks() {
  const { token, user } = useSelector((state: any) => state.auth);
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [taskName, setTaskName] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [dialogOpen, setDialogOpen] = useState(false);

  // Details Dialog & Comments States
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskDetailsOpen, setTaskDetailsOpen] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const handleOpenTaskDetails = (task) => {
    setSelectedTask(task);
    setNewCommentText('');
    setTaskDetailsOpen(true);
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!selectedTask || !newCommentText.trim()) return;

    setIsSubmittingComment(true);
    try {
      const res = await axios.post(
        `${API_URL}/api/tasks/${selectedTask._id}/comments`,
        { text: newCommentText.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update task in state
      setTasks((prev) => prev.map((t) => (t._id === selectedTask._id ? res.data : t)));
      setSelectedTask(res.data);
      setNewCommentText('');
    } catch (err) {
      console.error('Failed to add comment:', err.message);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const authHeader = { headers: { Authorization: `Bearer ${token}` } };
      
      const tasksRes = await axios.get(`${API_URL}/api/tasks`, authHeader);
      setTasks(tasksRes.data);

      const employeesRes = await axios.get(`${API_URL}/api/users/employees`, authHeader);
      setEmployees(employeesRes.data);
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateTask = async () => {
    if (!taskName || !assignedTo) return;
    try {
      const res = await axios.post(
        `${API_URL}/api/tasks`,
        { taskName, description: taskDesc, priority, assignedTo },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTasks([res.data, ...tasks]);
      setTaskName('');
      setTaskDesc('');
      setAssignedTo('');
      setPriority('Medium');
      setDialogOpen(false);
      fetchData();
    } catch (err) {
      console.error(err.message);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await axios.delete(`${API_URL}/api/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
    } catch (err) {
      console.error(err.message);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CustomLoader />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Task Assignments Board</Typography>
        <Button variant="contained" startIcon={<TaskIcon />} onClick={() => setDialogOpen(true)} sx={{ borderRadius: 2 }}>
          Assign New Task
        </Button>
      </Box>

      {tasks.length === 0 ? (
        <Paper variant="outlined" sx={{ py: 6, textAlign: 'center', borderRadius: 3 }}>
          <Typography variant="body1" color="text.secondary">No tasks assigned yet. Assign one to start tracking!</Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: '0px 4px 20px rgba(0,0,0,0.03)' }}>
          <Table>
            <TableHead sx={{ bgcolor: 'action.hover' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Task Name</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Assigned To</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Priority</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Progress</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="center">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task._id}>
                  <TableCell sx={{ fontWeight: 500 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{task.taskName}</Typography>
                    <Typography variant="caption" color="text.secondary">{task.description}</Typography>
                  </TableCell>
                  <TableCell>{task.assignedTo?.name || 'N/A'}</TableCell>
                  <TableCell>
                    <Chip
                      label={task.priority}
                      color={task.priority === 'High' ? 'error' : task.priority === 'Medium' ? 'warning' : 'default'}
                      size="small"
                      sx={{ borderRadius: 1 }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{task.progress}%</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                      <Chip
                        label={task.status}
                        color={task.status === 'Completed' ? 'success' : task.status === 'Blocked' ? 'error' : 'default'}
                        size="small"
                      />
                      {task.status === 'Completed' && (task.proofLinks?.length > 0 || task.proofFiles?.length > 0) && (
                        <Chip
                          label="Proof"
                          color="success"
                          variant="outlined"
                          size="small"
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                      <IconButton color="primary" onClick={() => handleOpenTaskDetails(task)} title="Review Proof / Add Comment">
                        <CommentIcon />
                      </IconButton>
                      <IconButton color="error" onClick={() => handleDeleteTask(task._id)}>
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Assign Task Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Assign Team Task</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
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
            <InputLabel>Assign To Employee</InputLabel>
            <Select
              value={assignedTo}
              label="Assign To Employee"
              onChange={(e) => setAssignedTo(e.target.value)}
              required
            >
              {employees.map(e => (
                <MenuItem key={e._id || e.id} value={e._id || e.id}>{e.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Priority</InputLabel>
            <Select
              value={priority}
              label="Priority"
              onChange={(e) => setPriority(e.target.value)}
            >
              <MenuItem value="Low">Low</MenuItem>
              <MenuItem value="Medium">Medium</MenuItem>
              <MenuItem value="High">High</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={handleCreateTask} variant="contained" color="primary">Assign Task</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog for Manager to Review Task Details & Proof / Comments */}
      <Dialog
        open={taskDetailsOpen}
        onClose={() => setTaskDetailsOpen(false)}
        maxWidth="md"
        fullWidth
        scroll="paper"
        sx={{ '& .MuiDialog-paper': { borderRadius: 3 } }}
      >
        {selectedTask && (
          <>
            <DialogTitle sx={{ fontWeight: 800, m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TaskIcon color="primary" />
                <Typography variant="h6" component="span" sx={{ fontWeight: 800 }}>{selectedTask.taskName}</Typography>
              </Box>
              <IconButton onClick={() => setTaskDetailsOpen(false)} size="small" color="inherit">
                <CloseIcon />
              </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ p: 3, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
              {/* Left Column: Details & Proof */}
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Description</Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap', bgcolor: 'action.hover', p: 1.5, borderRadius: 2 }}>
                    {selectedTask.description || 'No description provided.'}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ minWidth: 100 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Assigned To</Typography>
                    <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 600 }}>
                      {selectedTask.assignedTo?.name || 'N/A'}
                    </Typography>
                  </Box>
                  <Box sx={{ minWidth: 100 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Status</Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <Chip label={selectedTask.status} color={selectedTask.status === 'Completed' ? 'success' : 'warning'} size="small" />
                    </Box>
                  </Box>
                  <Box sx={{ minWidth: 100 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Priority</Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <Chip label={selectedTask.priority} color={selectedTask.priority === 'High' ? 'error' : 'default'} size="small" />
                    </Box>
                  </Box>
                  {selectedTask.dueDate && (
                    <Box sx={{ minWidth: 100 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Due Date</Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {new Date(selectedTask.dueDate).toLocaleDateString()}
                      </Typography>
                    </Box>
                  )}
                </Box>

                {/* Submitted Proof Display */}
                {(selectedTask.proofLinks?.length > 0 || selectedTask.proofFiles?.length > 0) ? (
                  <Box sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: 'success.main' }}>
                      Proof of Work Submitted
                    </Typography>

                    {selectedTask.submittedAt && (
                      <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 1.5 }}>
                        Submitted on: {new Date(selectedTask.submittedAt).toLocaleString()}
                      </Typography>
                    )}

                    {selectedTask.proofLinks?.length > 0 && (
                      <Box sx={{ mb: 1.5 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Links</Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mt: 0.5 }}>
                          {selectedTask.proofLinks.map((link, idx) => (
                            <Link 
                              key={idx} 
                              href={link.startsWith('http') ? link : `https://${link}`} 
                              target="_blank" 
                              rel="noopener"
                              sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.875rem' }}
                            >
                              <LinkIcon fontSize="small" sx={{ fontSize: 16 }} />
                              {link}
                              <OpenInNewIcon sx={{ fontSize: 14 }} />
                            </Link>
                          ))}
                        </Box>
                      </Box>
                    )}

                    {selectedTask.proofFiles?.length > 0 && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Files / Screenshots</Typography>
                        <Grid container spacing={1} sx={{ mt: 0.5 }}>
                          {selectedTask.proofFiles.map((file, idx) => {
                            const filename = file.split('/').pop();
                            return (
                              <Grid key={idx} size={{ xs: 12, sm: 6 }}>
                                <Paper variant="outlined" sx={{ p: 1, display: 'flex', alignItems: 'center', gap: 1, borderRadius: 2 }}>
                                  <AttachmentIcon color="action" sx={{ fontSize: 16 }} />
                                  <Link 
                                    href={file.startsWith('/uploads') ? `${API_URL}${file}` : file} 
                                    target="_blank" 
                                    download 
                                    sx={{ 
                                      overflow: 'hidden', 
                                      textOverflow: 'ellipsis', 
                                      whiteSpace: 'nowrap', 
                                      fontSize: '0.75rem',
                                      flex: 1
                                    }}
                                  >
                                    {filename}
                                  </Link>
                                </Paper>
                              </Grid>
                            );
                          })}
                        </Grid>
                      </Box>
                    )}
                  </Box>
                ) : (
                  selectedTask.status === 'Completed' && (
                    <Box sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        No proof links or files were submitted for this completed task.
                      </Typography>
                    </Box>
                  )
                )}
              </Box>

              {/* Right Column: Comments Section */}
              <Box sx={{ width: { xs: '100%', md: '350px' }, display: 'flex', flexDirection: 'column', borderLeft: { md: '1px solid' }, borderColor: 'divider', pl: { md: 3 }, minHeight: '300px' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CommentIcon fontSize="small" /> Comments & Activity
                </Typography>

                {/* Scrollable Comments Container */}
                <Box sx={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1.5, pr: 1, maxHeight: '350px', minHeight: '180px', mb: 2 }}>
                  {(!selectedTask.comments || selectedTask.comments.length === 0) ? (
                    <Typography variant="body2" color="text.secondary" align="center" sx={{ my: 'auto', py: 2 }}>
                      No comments yet. Start the conversation!
                    </Typography>
                  ) : (
                    selectedTask.comments.map((comment) => {
                      const isMe = comment.userId === user?.id || comment.userId === user?._id || comment.userName === user?.name;
                      return (
                        <Box 
                          key={comment.id} 
                          sx={{ 
                            alignSelf: isMe ? 'flex-end' : 'flex-start',
                            maxWidth: '90%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: isMe ? 'flex-end' : 'flex-start'
                          }}
                        >
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.25 }}>
                            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.7rem' }}>
                              {comment.userName}
                            </Typography>
                            <Chip 
                              label={comment.userRole} 
                              size="small" 
                              variant="outlined"
                              sx={{ 
                                fontSize: '0.6rem', 
                                height: 16, 
                                px: 0.5,
                                color: comment.userRole === 'Employee' ? 'text.secondary' : 'primary.main',
                                borderColor: comment.userRole === 'Employee' ? 'divider' : 'primary.light'
                              }} 
                            />
                          </Box>

                          <Paper 
                            sx={{ 
                              p: 1.25, 
                              borderRadius: 2, 
                              borderTopRightRadius: isMe ? 0 : 2,
                              borderTopLeftRadius: isMe ? 2 : 0,
                              bgcolor: isMe ? 'primary.main' : 'action.selected',
                              color: isMe ? 'primary.contrastText' : 'text.primary'
                            }}
                          >
                            <Typography variant="body2" sx={{ fontSize: '0.825rem' }}>{comment.text}</Typography>
                          </Paper>

                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', mt: 0.25 }}>
                            {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Typography>
                        </Box>
                      );
                    })
                  )}
                </Box>

                {/* Comment Input */}
                <Box component="form" onSubmit={handleSubmitComment} sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    placeholder="Reply or comment..."
                    size="small"
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    fullWidth
                    required
                  />
                  <IconButton type="submit" color="primary" disabled={isSubmittingComment} size="small">
                    <SendIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Box>
              </Box>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
}

export default ManagerTasks;
