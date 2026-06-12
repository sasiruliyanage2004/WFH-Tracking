import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  TextField,
  Typography,
  Chip,
  Paper,
  Tabs,
  Tab,
  List,
  LinearProgress
} from '@mui/material';
import {
  CheckCircleOutlined as ApproveIcon,
  CancelOutlined as RejectIcon,
  Check as CheckIcon,
  Undo as UndoIcon,
  Comment as CommentIcon
} from '@mui/icons-material';

function ManagerReports() {
  const { token } = useSelector((state) => state.auth);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0); // 0 = Pending, 1 = Reviewed

  // Review Dialog States
  const [feedback, setFeedback] = useState('');
  const [activeReportId, setActiveReportId] = useState(null);
  const [actionType, setActionType] = useState(''); // 'Approved' or 'Rejected'

  // Pending rejects state for 5s undo countdown
  const [pendingRejects, setPendingRejects] = useState({}); // { [reportId]: secondsRemaining }
  const activeTimers = useRef({});

  // Clear all timers on unmount
  useEffect(() => {
    const timers = activeTimers.current;
    return () => {
      if (timers) {
        Object.values(timers).forEach(clearInterval);
      }
    };
  }, []);

  const performRejection = async (reportId, customFeedback = 'Auto-rejected') => {
    try {
      await axios.put(
        `${API_URL}/api/reports/${reportId}/approve`,
        { status: 'Rejected', managerFeedback: customFeedback },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setReports((prev) =>
        prev.map((r) =>
          r._id === reportId ? { ...r, approvalStatus: 'Rejected', managerFeedback: customFeedback } : r
        )
      );
      fetchReports();
    } catch (err) {
      console.error(err.message);
    }
  };

  const handleRejectClick = (reportId) => {
    if (activeTimers.current[reportId]) {
      clearInterval(activeTimers.current[reportId]);
    }

    let timeLeft = 5;
    setPendingRejects((prev) => ({ ...prev, [reportId]: timeLeft }));

    const timer = setInterval(() => {
      timeLeft -= 1;
      if (timeLeft <= 0) {
        clearInterval(timer);
        delete activeTimers.current[reportId];
        setPendingRejects((prev) => {
          const copy = { ...prev };
          delete copy[reportId];
          return copy;
        });
        performRejection(reportId, 'Auto-rejected');
      } else {
        setPendingRejects((prev) => ({ ...prev, [reportId]: timeLeft }));
      }
    }, 1000);

    activeTimers.current[reportId] = timer;
  };

  const handleUndoReject = (reportId) => {
    if (activeTimers.current[reportId]) {
      clearInterval(activeTimers.current[reportId]);
      delete activeTimers.current[reportId];
    }
    setPendingRejects((prev) => {
      const copy = { ...prev };
      delete copy[reportId];
      return copy;
    });
  };

  const handleAddFeedbackFromPending = (reportId) => {
    if (activeTimers.current[reportId]) {
      clearInterval(activeTimers.current[reportId]);
      delete activeTimers.current[reportId];
    }
    setPendingRejects((prev) => {
      const copy = { ...prev };
      delete copy[reportId];
      return copy;
    });
    handleOpenDialog(reportId, 'Rejected');
  };

  const handleInstantReject = (reportId) => {
    if (activeTimers.current[reportId]) {
      clearInterval(activeTimers.current[reportId]);
      delete activeTimers.current[reportId];
    }
    setPendingRejects((prev) => {
      const copy = { ...prev };
      delete copy[reportId];
      return copy;
    });
    performRejection(reportId, 'Instant rejection');
  };

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/reports`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReports(res.data);
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [token]);

  const handleOpenDialog = (reportId, type) => {
    setActiveReportId(reportId);
    setActionType(type);
    setFeedback('');
  };

  const handleAction = async () => {
    try {
      await axios.put(
        `${API_URL}/api/reports/${activeReportId}/approve`,
        { status: actionType, managerFeedback: feedback },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setReports((prev) =>
        prev.map((r) =>
          r._id === activeReportId ? { ...r, approvalStatus: actionType, managerFeedback: feedback } : r
        )
      );
      setActiveReportId(null);
      fetchReports();
    } catch (err) {
      console.error(err.message);
    }
  };

  const renderPendingRejectCard = (rep) => {
    const timeLeft = pendingRejects[rep._id || rep.id];
    const progressVal = (timeLeft / 5) * 100;

    return (
      <Paper
        key={rep._id || rep.id}
        variant="outlined"
        sx={{
          p: 3,
          borderRadius: 3,
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(239, 68, 68, 0.04) 100%)',
          borderColor: 'rgba(239, 68, 68, 0.3)',
          boxShadow: '0 8px 32px rgba(239, 68, 68, 0.08)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          gap: 2
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#f87171' }}>
              Report for {rep.employee?.name} will be rejected
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Auto-rejecting in <strong>{timeLeft}s</strong>... You can undo this action or add feedback.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button
              variant="contained"
              color="inherit"
              size="small"
              startIcon={<UndoIcon />}
              onClick={() => handleUndoReject(rep._id || rep.id)}
              sx={{
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                color: 'text.primary',
                '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.2)' }
              }}
            >
              Undo
            </Button>
            <Button
              variant="outlined"
              color="error"
              size="small"
              startIcon={<CommentIcon />}
              onClick={() => handleAddFeedbackFromPending(rep._id || rep.id)}
            >
              Add Feedback
            </Button>
            <Button
              variant="contained"
              color="error"
              size="small"
              onClick={() => handleInstantReject(rep._id || rep.id)}
            >
              Reject Now
            </Button>
          </Box>
        </Box>
        <LinearProgress
          variant="determinate"
          value={progressVal}
          color="error"
          sx={{
            height: 4,
            borderRadius: 2,
            bgcolor: 'rgba(239, 68, 68, 0.1)',
            '& .MuiLinearProgress-bar': {
              transition: 'transform 1s linear'
            }
          }}
        />
      </Paper>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const pendingReports = reports.filter((r) => r.approvalStatus === 'Pending');
  const reviewedReports = reports.filter((r) => r.approvalStatus !== 'Pending');
  const displayedReports = activeTab === 0 ? pendingReports : reviewedReports;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Employee Daily Reports</Typography>
        <Tabs value={activeTab} onChange={(e, val) => setActiveTab(val)}>
          <Tab label={`Pending (${pendingReports.length})`} sx={{ fontWeight: 600 }} />
          <Tab label={`Reviewed (${reviewedReports.length})`} sx={{ fontWeight: 600 }} />
        </Tabs>
      </Box>

      {displayedReports.length === 0 ? (
        <Paper variant="outlined" sx={{ py: 6, textAlign: 'center', borderRadius: 3 }}>
          <Typography variant="body1" color="text.secondary">
            {activeTab === 0 ? 'No pending reports to review.' : 'No reviewed reports found.'}
          </Typography>
        </Paper>
      ) : (
        <List sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {displayedReports.map((rep) => {
            if (pendingRejects[rep._id || rep.id] !== undefined) {
              return renderPendingRejectCard(rep);
            }
            return (
              <Paper key={rep._id || rep.id} variant="outlined" sx={{ p: 3, borderRadius: 3, boxShadow: '0px 4px 15px rgba(0,0,0,0.02)' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    {rep.employee?.name} ({rep.employee?.department}) - Report for {rep.date}
                  </Typography>
                  
                  {rep.approvalStatus === 'Pending' ? (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        startIcon={<ApproveIcon />}
                        onClick={() => handleOpenDialog(rep._id || rep.id, 'Approved')}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="contained"
                        color="error"
                        size="small"
                        startIcon={<RejectIcon />}
                        onClick={() => handleRejectClick(rep._id || rep.id)}
                      >
                        Reject
                      </Button>
                    </Box>
                  ) : (
                  <Chip
                    label={rep.approvalStatus}
                    color={rep.approvalStatus === 'Approved' ? 'success' : 'error'}
                    icon={<CheckIcon />}
                    sx={{ borderRadius: 1.5 }}
                  />
                )}
              </Box>
              
              <Divider sx={{ mb: 2 }} />

              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="primary.main" sx={{ fontWeight: 600, mb: 1 }}>Tasks Completed:</Typography>
                  <ul>
                    {rep.tasksCompleted.map((t, idx) => (
                      <li key={idx}><Typography variant="body2">{t}</Typography></li>
                    ))}
                  </ul>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="warning.main" sx={{ fontWeight: 600, mb: 1 }}>Tasks In Progress:</Typography>
                  <ul>
                    {rep.tasksInProgress.map((t, idx) => (
                      <li key={idx}><Typography variant="body2">{t}</Typography></li>
                    ))}
                  </ul>
                </Grid>
                {rep.challengesFaced && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="error.main" sx={{ fontWeight: 600, mb: 0.5 }}>Challenges Faced:</Typography>
                    <Typography variant="body2" sx={{ pl: 2 }}>{rep.challengesFaced}</Typography>
                  </Grid>
                )}
                {rep.tomorrowPlan && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600, mb: 0.5 }}>Plan for Tomorrow:</Typography>
                    <Typography variant="body2" sx={{ pl: 2 }}>{rep.tomorrowPlan}</Typography>
                  </Grid>
                )}
                
                <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>
                    Total Hours Worked: {rep.totalHoursWorked} hrs
                  </Typography>
                </Grid>

                {rep.managerFeedback && (
                  <Grid item xs={12}>
                    <Paper sx={{ p: 2, bgcolor: 'action.hover', borderLeft: '4px solid', borderLeftColor: 'primary.main', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>Manager Feedback Comments:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{rep.managerFeedback}</Typography>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </Paper>
            );
          })}
        </List>
      )}

      {/* Review Dialog */}
      <Dialog open={activeReportId !== null} onClose={() => setActiveReportId(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Add Review Feedback</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Provide comments regarding this report's {actionType?.toLowerCase()} status:
          </Typography>
          <TextField
            label="Feedback Comments"
            multiline
            rows={3}
            fullWidth
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Add suggestions..."
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setActiveReportId(null)} color="inherit">Cancel</Button>
          <Button onClick={handleAction} variant="contained" color={actionType === 'Approved' ? 'success' : 'error'}>
            Confirm {actionType}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ManagerReports;
