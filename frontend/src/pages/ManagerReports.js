// frontend/src/pages/ManagerReports.js
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
  Divider,
  Grid,
  TextField,
  Typography,
  Chip,
  Paper,
  Tabs,
  Tab,
  List,
  ListItem
} from '@mui/material';
import {
  CheckCircleOutlined as ApproveIcon,
  CancelOutlined as RejectIcon,
  HourglassEmpty as PendingIcon,
  Check as CheckIcon
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
          {displayedReports.map((rep) => (
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
                      onClick={() => handleOpenDialog(rep._id || rep.id, 'Rejected')}
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
          ))}
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
