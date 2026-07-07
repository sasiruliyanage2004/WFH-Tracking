// frontend/src/pages/WorkReports.js
import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Grid,
  TextField,
  Typography,
  Chip,
  Paper,
  Tabs,
  Tab,
  List
} from '@mui/material';
import {
  Send as SendIcon,
  CheckCircleOutlined as CheckIcon,
  HourglassEmpty as PendingIcon,
  CancelOutlined as RejectIcon
} from '@mui/icons-material';

import CustomLoader from '../components/CustomLoader';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function WorkReports() {
  const { token } = useSelector((state: any) => state.auth);
  
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  // Form inputs
  const [completedText, setCompletedText] = useState('');
  const [progressText, setProgressText] = useState('');
  const [challengesText, setChallengesText] = useState('');
  const [tomorrowText, setTomorrowText] = useState('');
  const [workedHours, setWorkedHours] = useState(8);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_URL}/api/reports?myReportsOnly=true`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setReports(res.data);
      } catch (err) {
        console.error(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!completedText || !progressText) return;

    try {
      const res = await axios.post(
        `${API_URL}/api/reports`,
        {
          tasksCompleted: completedText.split('\n').filter(Boolean),
          tasksInProgress: progressText.split('\n').filter(Boolean),
          challengesFaced: challengesText,
          tomorrowPlan: tomorrowText,
          totalHoursWorked: workedHours
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setReports([res.data.report, ...reports]);
      setCompletedText('');
      setProgressText('');
      setChallengesText('');
      setTomorrowText('');
      setWorkedHours(8);
      setActiveTab(1); // shift to history tab
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
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, val) => setActiveTab(val)}>
          <Tab label="Submit Daily Report" sx={{ fontWeight: 600 }} />
          <Tab label="Report History logs" sx={{ fontWeight: 600 }} />
        </Tabs>
      </Box>

      {activeTab === 0 ? (
        <Card sx={{ maxWidth: 650, mx: 'auto', borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: '0px 4px 20px rgba(0,0,0,0.05)' }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }} align="center">
              Submit Daily Work Report
            </Typography>

            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <TextField
                label="Tasks Completed Today"
                multiline
                rows={3}
                placeholder="Enter completed task names (one task per line)..."
                required
                fullWidth
                value={completedText}
                onChange={(e) => setCompletedText(e.target.value)}
              />

              <TextField
                label="Tasks In Progress"
                multiline
                rows={3}
                placeholder="Enter tasks you worked on but are still in progress (one per line)..."
                required
                fullWidth
                value={progressText}
                onChange={(e) => setProgressText(e.target.value)}
              />

              <TextField
                label="Challenges / Blockers (Optional)"
                multiline
                rows={2}
                placeholder="Describe any issues that slowed you down..."
                fullWidth
                value={challengesText}
                onChange={(e) => setChallengesText(e.target.value)}
              />

              <TextField
                label="Plan for Tomorrow"
                multiline
                rows={2}
                placeholder="What will you work on tomorrow?"
                fullWidth
                value={tomorrowText}
                onChange={(e) => setTomorrowText(e.target.value)}
              />

              <Grid container spacing={2} sx={{ alignItems: 'center' }}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Total Hours Worked"
                    type="number"
                    // @ts-ignore
                    // @ts-ignore
                    inputProps={{ min: 1, max: 24, step: 0.5 }}
                    fullWidth
                    value={workedHours}
                    onChange={(e) => setWorkedHours(parseFloat(e.target.value))}
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    size="large"
                    startIcon={<SendIcon />}
                    sx={{ py: 1.5, borderRadius: 2 }}
                  >
                    Submit Report
                  </Button>
                </Grid>
              </Grid>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Box>
          {reports.length === 0 ? (
            <Paper variant="outlined" sx={{ py: 6, textAlign: 'center', borderRadius: 3 }}>
              <Typography variant="body1" color="text.secondary">
                No reports submitted yet. Go to the submission tab to create one.
              </Typography>
            </Paper>
          ) : (
            <List sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {reports.map((rep) => (
                <Paper key={rep._id || rep.id} variant="outlined" sx={{ p: 3, borderRadius: 3, boxShadow: '0px 4px 15px rgba(0,0,0,0.02)' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      Report date: {rep.date}
                    </Typography>
                    <Chip
                      label={rep.approvalStatus}
                      color={
                        rep.approvalStatus === 'Approved'
                          ? 'success'
                          : rep.approvalStatus === 'Rejected'
                          ? 'error'
                          : 'warning'
                      }
                      icon={
                        rep.approvalStatus === 'Approved' ? (
                          <CheckIcon />
                        ) : rep.approvalStatus === 'Rejected' ? (
                          <RejectIcon />
                        ) : (
                          <PendingIcon />
                        )
                      }
                      sx={{ borderRadius: 1.5 }}
                    />
                  </Box>
                  <Divider sx={{ mb: 2 }} />
                  
                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant="subtitle2" color="primary.main" sx={{ fontWeight: 600, mb: 1 }}>Tasks Completed:</Typography>
                      <ul>
                        {rep.tasksCompleted.map((t, idx) => (
                          <li key={idx}><Typography variant="body2">{t}</Typography></li>
                        ))}
                      </ul>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant="subtitle2" color="warning.main" sx={{ fontWeight: 600, mb: 1 }}>Tasks In Progress:</Typography>
                      <ul>
                        {rep.tasksInProgress.map((t, idx) => (
                          <li key={idx}><Typography variant="body2">{t}</Typography></li>
                        ))}
                      </ul>
                    </Grid>
                    {rep.challengesFaced && (
                      <Grid size={{ xs: 12 }}>
                        <Typography variant="subtitle2" color="error.main" sx={{ fontWeight: 600, mb: 0.5 }}>Challenges Faced:</Typography>
                        <Typography variant="body2" sx={{ pl: 2 }}>{rep.challengesFaced}</Typography>
                      </Grid>
                    )}
                    {rep.tomorrowPlan && (
                      <Grid size={{ xs: 12 }}>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600, mb: 0.5 }}>Plan for Tomorrow:</Typography>
                        <Typography variant="body2" sx={{ pl: 2 }}>{rep.tomorrowPlan}</Typography>
                      </Grid>
                    )}
                    
                    <Grid sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }} size={{ xs: 12 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>
                        Total logged hours: {rep.totalHoursWorked} hrs
                      </Typography>
                    </Grid>

                    {rep.managerFeedback && (
                      <Grid size={{ xs: 12 }}>
                        <Paper sx={{ p: 2, bgcolor: 'action.hover', borderLeft: '4px solid', borderLeftColor: 'primary.main', borderRadius: 1 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>Manager Review Comments:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>{rep.managerFeedback}</Typography>
                        </Paper>
                      </Grid>
                    )}
                  </Grid>
                </Paper>
              ))}
            </List>
          )}
        </Box>
      )}
    </Box>
  );
}

export default WorkReports;
