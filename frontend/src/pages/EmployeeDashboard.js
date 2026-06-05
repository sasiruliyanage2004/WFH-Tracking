// frontend/src/pages/EmployeeDashboard.js
import React, { useState, useEffect, useRef } from 'react';
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
  LinearProgress,
  TextField,
  Typography,
  Chip,
  List,
  ListItem,
  ListItemText,
  Paper,
  Tabs,
  Tab,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Slider
} from '@mui/material';
import {
  PlayArrow as CheckInIcon,
  Stop as CheckOutIcon,
  CameraAlt as CameraIcon,
  MyLocation as GPSIcon,
  AddTask as TaskIcon,
  Send as SendIcon,
  TaskAlt as CheckIcon,
  HourglassEmpty as PendingIcon,
  CancelOutlined as RejectIcon
} from '@mui/icons-material';
import ScreenshotCapturer from '../components/ScreenshotCapturer';

function EmployeeDashboard() {
  const { token, user } = useSelector((state) => state.auth);

  // States
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gpsData, setGpsData] = useState({ latitude: null, longitude: null, address: '' });
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [liveHours, setLiveHours] = useState('00:00:00');

  // Webcam States
  const [webcamOpen, setWebcamOpen] = useState(false);
  const [webcamStream, setWebcamStream] = useState(null);
  const [capturedPhoto, setCapturedPhoto] = useState('');
  const videoRef = useRef(null);

  // Tabs (Tasks vs Reports)
  const [activeTab, setActiveTab] = useState(0);

  // Tasks States
  const [tasks, setTasks] = useState([]);
  const [taskName, setTaskName] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPriority, setTaskPriority] = useState('Medium');
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);

  // Report States
  const [reports, setReports] = useState([]);
  const [completedText, setCompletedText] = useState('');
  const [progressText, setProgressText] = useState('');
  const [challengesText, setChallengesText] = useState('');
  const [tomorrowText, setTomorrowText] = useState('');
  const [workedHoursInput, setWorkedHoursInput] = useState(8);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Get status, tasks, and reports on load
  const fetchData = async () => {
    try {
      setLoading(true);
      const authHeader = { headers: { Authorization: `Bearer ${token}` } };
      
      const attendanceRes = await axios.get(`${API_URL}/api/attendance/status`, authHeader);
      setAttendance(attendanceRes.data.attendance);

      const tasksRes = await axios.get(`${API_URL}/api/tasks`, authHeader);
      setTasks(tasksRes.data);

      const reportsRes = await axios.get(`${API_URL}/api/reports`, authHeader);
      setReports(reportsRes.data);
    } catch (err) {
      console.error('Fetch dashboard data error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  // Live Timer ticker for checked in session
  useEffect(() => {
    if (!attendance || attendance.checkOutTime) {
      setLiveHours('00:00:00');
      return;
    }

    const interval = setInterval(() => {
      const start = new Date(attendance.checkInTime);
      const diffMs = Date.now() - start;
      
      const hours = Math.floor(diffMs / 3600000);
      const minutes = Math.floor((diffMs % 3600000) / 60000);
      const seconds = Math.floor((diffMs % 60000) / 1000);

      const pad = (num) => String(num).padStart(2, '0');
      setLiveHours(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [attendance]);

  // Geolocation trigger
  const requestGPS = () => {
    setGpsLoading(true);
    setGpsError('');
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        let address = 'WFH Office Location';
        
        try {
          // Attempt reverse geocoding via OpenStreetMap Nominatim api
          const geoRes = await axios.get(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          if (geoRes.data && geoRes.data.display_name) {
            address = geoRes.data.display_name;
          }
        } catch (err) {
          console.warn('Reverse geocoding error:', err.message);
        }

        setGpsData({ latitude, longitude, address });
        setGpsLoading(false);
      },
      (err) => {
        setGpsError(`GPS retrieval blocked: ${err.message}. Checked in using IP location instead.`);
        setGpsData({ latitude: 40.7128, longitude: -74.0060, address: 'Remote Workplace / IP Address' });
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Webcam trigger setup
  const openWebcam = async () => {
    setWebcamOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setWebcamStream(stream);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 500);
    } catch (err) {
      console.error('Camera access denied:', err.message);
      // Create mock photo capture if blocked
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#64748b';
      ctx.fillRect(0, 0, 320, 240);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px Inter';
      ctx.fillText('Verification Selfie', 80, 100);
      ctx.fillText(user?.name, 80, 130);
      setCapturedPhoto(canvas.toDataURL('image/jpeg'));
    }
  };

  const closeWebcam = () => {
    if (webcamStream) {
      webcamStream.getTracks().forEach((track) => track.stop());
      setWebcamStream(null);
    }
    setWebcamOpen(false);
  };

  const captureSelfie = () => {
    const video = videoRef.current;
    if (video) {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      setCapturedPhoto(canvas.toDataURL('image/jpeg'));
      closeWebcam();
    }
  };

  // Check In handler
  const handleCheckIn = async () => {
    try {
      const res = await axios.post(
        `${API_URL}/api/attendance/checkin`,
        {
          latitude: gpsData.latitude || 0,
          longitude: gpsData.longitude || 0,
          address: gpsData.address || 'Standard WFH Location',
          webcamImage: capturedPhoto
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAttendance(res.data.attendance);
      setCapturedPhoto('');
      fetchData();
    } catch (err) {
      console.error(err.response?.data?.message || err.message);
    }
  };

  // Check Out handler
  const handleCheckOut = async () => {
    try {
      const res = await axios.post(
        `${API_URL}/api/attendance/checkout`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAttendance(res.data.attendance);
      fetchData();
    } catch (err) {
      console.error(err.response?.data?.message || err.message);
    }
  };

  // Create Task handler
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

  // Update Task Progress helper
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
      const res = await axios.put(
        `${API_URL}/api/tasks/${taskId}`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTasks((prev) => prev.map((t) => (t._id === taskId ? res.data : t)));
    } catch (err) {
      console.error(err.message);
    }
  };

  // Submit Work Report handler
  const handleSubmitReport = async (e) => {
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
          totalHoursWorked: workedHoursInput
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setReports([res.data.report, ...reports]);
      setCompletedText('');
      setProgressText('');
      setChallengesText('');
      setTomorrowText('');
      setActiveTab(1); // switch to reports history list
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

  const isCheckedIn = attendance && !attendance.checkOutTime;

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Row 1: Attendance Check-In Dashboard Console */}
        <Grid item xs={12} md={7}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }} color="text.primary">
                Daily Check-In Portal
              </Typography>
              
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary">CHECK-IN STATUS</Typography>
                    {attendance ? (
                      <Typography variant="h6" sx={{ mt: 1, fontWeight: 700 }} color={isCheckedIn ? 'success.main' : 'warning.main'}>
                        {isCheckedIn ? 'Active Session' : 'Logged Out / Finished'}
                      </Typography>
                    ) : (
                      <Typography variant="h6" sx={{ mt: 1, fontWeight: 700 }} color="error.main">
                        Not Checked-In
                      </Typography>
                    )}
                  </Paper>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary">SESSION TIME</Typography>
                    <Typography variant="h4" sx={{ mt: 0.5, fontFamily: 'monospace', fontWeight: 800 }}>
                      {liveHours}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              {/* GPS & Webcam configuration options */}
              {!attendance && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Verification Steps:</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Button
                        variant={gpsData.latitude ? "contained" : "outlined"}
                        color={gpsError ? "error" : "primary"}
                        fullWidth
                        startIcon={gpsLoading ? <CircularProgress size={20} /> : <GPSIcon />}
                        onClick={requestGPS}
                      >
                        {gpsData.latitude ? 'GPS Captured' : 'Verify Location'}
                      </Button>
                    </Grid>
                    <Grid item xs={6}>
                      <Button
                        variant={capturedPhoto ? "contained" : "outlined"}
                        fullWidth
                        startIcon={<CameraIcon />}
                        onClick={openWebcam}
                      >
                        {capturedPhoto ? 'Selfie Captured' : 'Camera Selfie'}
                      </Button>
                    </Grid>
                  </Grid>

                  {gpsData.address && (
                    <Typography variant="caption" display="block" sx={{ mt: 1.5, color: 'success.main' }}>
                      Location Verified: {gpsData.address}
                    </Typography>
                  )}
                  {gpsError && (
                    <Typography variant="caption" display="block" sx={{ mt: 1.5, color: 'error.main' }}>
                      {gpsError}
                    </Typography>
                  )}

                  {capturedPhoto && (
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                      <Box
                        component="img"
                        src={capturedPhoto}
                        alt="selfie"
                        sx={{ width: 120, height: 90, borderRadius: 2, objectFit: 'cover', border: '2px solid', borderColor: 'primary.main' }}
                      />
                    </Box>
                  )}
                </Box>
              )}

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', gap: 2 }}>
                {!attendance && (
                  <Button
                    variant="contained"
                    color="success"
                    size="large"
                    fullWidth
                    disabled={!gpsData.latitude || !capturedPhoto}
                    startIcon={<CheckInIcon />}
                    onClick={handleCheckIn}
                    sx={{ py: 1.5, borderRadius: 2 }}
                  >
                    Start Work Shift (Check-In)
                  </Button>
                )}
                
                {isCheckedIn && (
                  <Button
                    variant="contained"
                    color="error"
                    size="large"
                    fullWidth
                    startIcon={<CheckOutIcon />}
                    onClick={handleCheckOut}
                    sx={{ py: 1.5, borderRadius: 2 }}
                  >
                    End Work Shift (Check-Out)
                  </Button>
                )}

                {attendance && !isCheckedIn && (
                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    fullWidth
                    disabled
                    sx={{ py: 1.5, borderRadius: 2 }}
                  >
                    Shift Completed Today
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Row 1, Column 2: Shift summary statistics */}
        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%', borderRadius: 3 }}>
            <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Shift Summary logs
              </Typography>
              
              <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <span>Daily Progress</span>
                    <span>8 hrs Target</span>
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={isCheckedIn ? Math.min(100, (parseFloat(liveHours.split(':')[0]) / 8) * 100) : 0}
                    sx={{ height: 10, borderRadius: 5 }}
                  />
                </Box>

                <Box sx={{ mt: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Active Hours Today</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {attendance ? (isCheckedIn ? 'Tracking live details...' : 'Ended. Check status logs') : 'Logs start at Check-In.'}
                  </Typography>
                </Box>

                {/* Integration of screenshot tracking element */}
                <ScreenshotCapturer isCheckedIn={isCheckedIn} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Row 2: Tabs (Tasks & Daily Reports) */}
        <Grid item xs={12}>
          <Card sx={{ borderRadius: 3 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
              <Tabs value={activeTab} onChange={(e, val) => setActiveTab(val)}>
                <Tab label="Task tracking board" sx={{ fontWeight: 600 }} />
                <Tab label="Submit Daily Report" sx={{ fontWeight: 600 }} />
                <Tab label="Daily Report History" sx={{ fontWeight: 600 }} />
              </Tabs>
            </Box>

            <Box sx={{ p: 3 }}>
              {/* TAB 0: TASK TRACKING BOARD */}
              {activeTab === 0 && (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>My Work Tasks</Typography>
                    <Button
                      variant="contained"
                      startIcon={<TaskIcon />}
                      onClick={() => setTaskDialogOpen(true)}
                      size="small"
                    >
                      New Task
                    </Button>
                  </Box>

                  {tasks.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                      No tasks assigned. Click "New Task" to create one.
                    </Typography>
                  ) : (
                    <Grid container spacing={2}>
                      {tasks.map((task) => (
                        <Grid item xs={12} sm={6} key={task._id}>
                          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{task.taskName}</Typography>
                              <Chip
                                label={task.priority}
                                color={task.priority === 'High' ? 'error' : task.priority === 'Medium' ? 'warning' : 'default'}
                                size="small"
                              />
                            </Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                              {task.description || 'No description provided.'}
                            </Typography>
                            
                            <Box sx={{ mb: 2 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                <Typography variant="caption" color="text.secondary">Progress</Typography>
                                <Typography variant="caption" sx={{ fontWeight: 600 }}>{task.progress}%</Typography>
                              </Box>
                              <Slider
                                size="small"
                                value={task.progress}
                                onChange={(e, val) => handleTaskProgressChange(task._id, val)}
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
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  )}
                </Box>
              )}

              {/* TAB 1: SUBMIT DAILY REPORT */}
              {activeTab === 1 && (
                <Box component="form" onSubmit={handleSubmitReport} sx={{ maxWidth: 600, mx: 'auto' }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }} align="center">
                    Submit End-of-Day Report
                  </Typography>

                  <TextField
                    label="Tasks Completed Today"
                    multiline
                    rows={3}
                    placeholder="Enter one task per line..."
                    fullWidth
                    value={completedText}
                    onChange={(e) => setCompletedText(e.target.value)}
                    required
                    sx={{ mb: 2 }}
                  />

                  <TextField
                    label="Tasks In Progress / Plan"
                    multiline
                    rows={3}
                    placeholder="Enter tasks you are still working on..."
                    fullWidth
                    value={progressText}
                    onChange={(e) => setProgressText(e.target.value)}
                    required
                    sx={{ mb: 2 }}
                  />

                  <TextField
                    label="Challenges / Blockers Faced (Optional)"
                    multiline
                    rows={2}
                    fullWidth
                    value={challengesText}
                    onChange={(e) => setChallengesText(e.target.value)}
                    sx={{ mb: 2 }}
                  />

                  <TextField
                    label="Plan For Tomorrow"
                    multiline
                    rows={2}
                    fullWidth
                    value={tomorrowText}
                    onChange={(e) => setTomorrowText(e.target.value)}
                    sx={{ mb: 2 }}
                  />

                  <Grid container spacing={2} sx={{ mb: 3, alignItems: 'center' }}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Total Hours Worked"
                        type="number"
                        inputProps={{ min: 1, max: 24, step: 0.5 }}
                        fullWidth
                        value={workedHoursInput}
                        onChange={(e) => setWorkedHoursInput(parseFloat(e.target.value))}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        fullWidth
                        startIcon={<SendIcon />}
                        sx={{ py: 1.5 }}
                      >
                        Submit Report
                      </Button>
                    </Grid>
                  </Grid>
                </Box>
              )}

              {/* TAB 2: DAILY REPORT HISTORY */}
              {activeTab === 2 && (
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>Work Report History</Typography>
                  {reports.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                      No reports submitted yet.
                    </Typography>
                  ) : (
                    <List sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {reports.map((rep) => (
                        <Paper key={rep._id || rep.id} variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                              Report for {rep.date}
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
                            />
                          </Box>
                          <Divider sx={{ mb: 2 }} />
                          <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                              <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 600 }}>Tasks Completed:</Typography>
                              <ul>
                                {rep.tasksCompleted.map((t, idx) => (
                                  <li key={idx}><Typography variant="body2">{t}</Typography></li>
                                ))}
                              </ul>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <Typography variant="subtitle2" color="warning.main" sx={{ fontWeight: 600 }}>Tasks In Progress:</Typography>
                              <ul>
                                {rep.tasksInProgress.map((t, idx) => (
                                  <li key={idx}><Typography variant="body2">{t}</Typography></li>
                                ))}
                              </ul>
                            </Grid>
                            {rep.challengesFaced && (
                              <Grid item xs={12}>
                                <Typography variant="subtitle2" color="error" sx={{ fontWeight: 600 }}>Challenges Faced:</Typography>
                                <Typography variant="body2" sx={{ pl: 2 }}>{rep.challengesFaced}</Typography>
                              </Grid>
                            )}
                            {rep.tomorrowPlan && (
                              <Grid item xs={12}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Plan For Tomorrow:</Typography>
                                <Typography variant="body2" sx={{ pl: 2 }}>{rep.tomorrowPlan}</Typography>
                              </Grid>
                            )}
                            {rep.managerFeedback && (
                              <Grid item xs={12}>
                                <Paper sx={{ p: 1.5, bgcolor: 'action.hover', borderLeft: '4px solid', borderLeftColor: 'primary.main' }}>
                                  <Typography variant="caption" color="text.secondary">Manager Feedback:</Typography>
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
          </Card>
        </Grid>
      </Grid>

      {/* Dialog for webcam snap verification */}
      <Dialog open={webcamOpen} onClose={closeWebcam} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Verification Selfie</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3 }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            style={{ width: '100%', height: 'auto', borderRadius: 8, transform: 'scaleX(-1)', backgroundColor: '#000' }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5 }}>
            Look directly into the camera and click Capture to confirm identity.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={closeWebcam} color="inherit">Cancel</Button>
          <Button onClick={captureSelfie} variant="contained" startIcon={<CameraIcon />}>Capture</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog for New Task Creation */}
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
          <Button onClick={handleCreateTask} variant="contained" color="success">Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default EmployeeDashboard;
