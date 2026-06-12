// frontend/src/pages/EmployeeDashboard.js
import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import { setBreakStart, setBreakEnd } from '../redux/store';
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
  Paper,
  Tabs,
  Tab,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Slider,
  Backdrop,
  Menu,
  InputAdornment
} from '@mui/material';
import {
  PlayArrow as CheckInIcon,
  Stop as CheckOutIcon,
  CameraAlt as CameraIcon,
  AddTask as TaskIcon,
  Send as SendIcon,
  TaskAlt as CheckIcon,
  HourglassEmpty as PendingIcon,
  CancelOutlined as RejectIcon,
  TrendingUp as TrendingUpIcon,
  AccessTime as AccessTimeIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import ScreenshotCapturer from '../components/ScreenshotCapturer';
import SkeletonCard from '../components/SkeletonCard';
import AnimatedCounter from '../components/AnimatedCounter';

function EmployeeDashboard() {
  const { token, user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  // States
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gpsData, setGpsData] = useState({ latitude: null, longitude: null, address: '' });
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [liveHours, setLiveHours] = useState('00:00:00');
  const [breakTimeStr, setBreakTimeStr] = useState('00:00');
  const [productivity, setProductivity] = useState(100);

  // Other Break Dialog
  const [otherBreakOpen, setOtherBreakOpen] = useState(false);
  const [otherBreakNote, setOtherBreakNote] = useState('');
  const [breakAnchorEl, setBreakAnchorEl] = useState(null);
  const [breakSearch, setBreakSearch] = useState('');

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
      const att = attendanceRes.data.attendance;
      setAttendance(att);
      if (att && att.onBreak) {
        dispatch(setBreakStart(att.currentBreakType));
      } else {
        dispatch(setBreakEnd());
      }

      const tasksRes = await axios.get(`${API_URL}/api/tasks`, authHeader);
      setTasks(tasksRes.data);

      const reportsRes = await axios.get(`${API_URL}/api/reports`, authHeader);
      setReports(reportsRes.data);

      // Fetch productivity score
      try {
        const prodRes = await axios.get(`${API_URL}/api/monitoring/my-activity`, authHeader);
        setProductivity(prodRes.data.productivityPercentage);
      } catch (err) {
        console.warn('Could not fetch productivity score on load.');
      }
    } catch (err) {
      console.error('Fetch dashboard data error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Auto-trigger Electron desktop active window tracking based on Check-In and Break states
  useEffect(() => {
    if (window.api && window.api.toggleTracking) {
      const active = !!(attendance && !attendance.checkOutTime && !attendance.onBreak);
      console.log(`[Electron] Auto-toggling active window tracking: ${active}`);
      window.api.toggleTracking(active, token);
    }
  }, [attendance, token]);

  // Break overlay ticking timer
  useEffect(() => {
    if (!attendance || !attendance.onBreak) {
      setBreakTimeStr('00:00');
      return;
    }

    if (!attendance.breaks || attendance.breaks.length === 0) return;
    const currentBreak = attendance.breaks[attendance.breaks.length - 1];

    const tick = () => {
      const diffMs = Date.now() - new Date(currentBreak.startTime);
      const minutes = Math.floor(diffMs / 60000);
      const seconds = Math.floor((diffMs % 60000) / 1000);
      const pad = (num) => String(num).padStart(2, '0');
      setBreakTimeStr(`${pad(minutes)}:${pad(seconds)}`);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [attendance]);

  // Live Timer ticker for checked in session
  useEffect(() => {
    if (!attendance) {
      setLiveHours('00:00:00');
      return;
    }

    if (attendance.checkOutTime) {
      const start = new Date(attendance.checkInTime);
      const end = new Date(attendance.checkOutTime);
      const diffMs = Math.max(0, end - start);
      
      const hours = Math.floor(diffMs / 3600000);
      const minutes = Math.floor((diffMs % 3600000) / 60000);
      const seconds = Math.floor((diffMs % 60000) / 1000);

      const pad = (num) => String(num).padStart(2, '0');
      setLiveHours(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
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
      async (err) => {
        console.warn('GPS failed, falling back to IP Geolocation:', err.message);
        try {
          const ipRes = await axios.get('https://ipapi.co/json/');
          if (ipRes.data && ipRes.data.latitude) {
            setGpsData({
              latitude: ipRes.data.latitude,
              longitude: ipRes.data.longitude,
              address: `${ipRes.data.city || 'Unknown City'}, ${ipRes.data.region || 'Region'}, ${ipRes.data.country_name || 'Country'} (IP Location)`
            });
          } else {
            setGpsData({ latitude: 40.7128, longitude: -74.0060, address: 'Remote Workplace / IP Address' });
          }
        } catch (ipErr) {
          console.warn('IP Geolocation fallback failed:', ipErr.message);
          setGpsData({ latitude: 40.7128, longitude: -74.0060, address: 'Remote Workplace / IP Address' });
        }
        setGpsError(`GPS retrieval blocked: ${err.message}. Checked in using IP location instead.`);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Webcam trigger setup
  const openWebcam = async () => {
    // Automatically trigger GPS trapping under the hood when camera is opened
    requestGPS();
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

  // Break Event Handlers
  const handleStartBreak = async (breakType, note = '') => {
    try {
      const res = await axios.post(
        `${API_URL}/api/attendance/break/start`,
        { breakType, note },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAttendance(res.data.attendance);
      dispatch(setBreakStart(breakType));
    } catch (err) {
      console.error(err.response?.data?.message || err.message);
    }
  };

  const handleStartOtherBreak = async () => {
    await handleStartBreak('Other', otherBreakNote);
    setOtherBreakOpen(false);
    setOtherBreakNote('');
  };

  const handleBreakClick = (event) => {
    setBreakAnchorEl(event.currentTarget);
  };

  const handleBreakClose = () => {
    setBreakAnchorEl(null);
    setBreakSearch('');
  };

  const handleEndBreak = async () => {
    try {
      const res = await axios.post(
        `${API_URL}/api/attendance/break/end`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAttendance(res.data.attendance);
      dispatch(setBreakEnd());
    } catch (err) {
      console.error(err.response?.data?.message || err.message);
    }
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
      <Box sx={{ p: 1 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={7}>
            <SkeletonCard variant="full" />
          </Grid>
          <Grid item xs={12} md={5}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <SkeletonCard variant="stat" />
              <SkeletonCard variant="stat" />
              <SkeletonCard variant="stat" />
            </Box>
          </Grid>
        </Grid>
      </Box>
    );
  }

  const isCheckedIn = attendance && !attendance.checkOutTime;
  const loginTimeStr = attendance ? new Date(attendance.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  // Calculate stats for the dashboard metrics
  const completedTasksCount = tasks.filter(t => t.status === 'Completed').length;
  const totalTasksCount = tasks.length;
  const taskProgressPercent = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  const getShiftProgressPercent = () => {
    if (!attendance || !liveHours) return 0;
    const parts = liveHours.split(':').map(Number);
    if (parts.length < 3 || isNaN(parts[0])) return 0;
    const [h, m, s] = parts;
    const totalHrs = h + m / 60 + s / 3600;
    return Math.min(100, Math.round((totalHrs / 8) * 100));
  };
  const shiftProgressPercent = getShiftProgressPercent();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const breakOptions = [
    { name: 'Breakfast', label: 'Breakfast', icon: '☕', action: () => handleStartBreak('Breakfast') },
    { name: 'Lunch', label: 'Lunch Break', icon: '🍔', action: () => handleStartBreak('Lunch') },
    { name: 'Dinner', label: 'Dinner', icon: '🍽️', action: () => handleStartBreak('Dinner') },
    { name: 'Washroom', label: 'Washroom', icon: '🚽', action: () => handleStartBreak('Washroom') },
    { name: 'Outgoing', label: 'Outgoing', icon: '🚗', action: () => handleStartBreak('Outgoing') },
    { name: 'Other', label: 'Other', icon: '📝', action: () => setOtherBreakOpen(true) }
  ];

  const filteredBreakOptions = breakOptions.filter(opt =>
    opt.label.toLowerCase().includes(breakSearch.toLowerCase())
  );

  return (
    <Box>
      {/* Top Greeting and GPS Status Banner matching Image 3 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.025em' }}>
            {getGreeting()}, {user?.name.split(' ')[0]}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, mt: 0.5 }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} • Hybrid Workspace
          </Typography>
        </Box>
        {attendance && (
          <Paper
            variant="outlined"
            sx={{
              px: 2,
              py: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              borderRadius: 3,
              borderColor: 'success.light',
              bgcolor: 'success.light',
              color: 'success.dark',
              fontWeight: 600,
              fontSize: '0.85rem'
            }}
          >
            🛡️ GPS STATUS: Verified {attendance.location?.address.includes('Home') ? 'Home Office' : 'Remote Location'}
          </Paper>
        )}
      </Box>

      <Grid container spacing={3}>
        {/* Row 1: Attendance Check-In Dashboard Console */}
        <Grid item xs={12} md={7}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: 4, p: 1 }}>
            <CardContent sx={{ p: 3 }}>
              {/* Status Header */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Shift Logging Console
                </Typography>
                <Chip
                  label={isCheckedIn ? 'ON-CLOCK' : 'OFF-CLOCK'}
                  color={isCheckedIn ? 'primary' : 'default'}
                  sx={{ fontWeight: 700, borderRadius: 2, fontSize: '0.75rem', height: 26 }}
                />
              </Box>

              {/* Total Time Today Clock Widget */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, bgcolor: 'action.hover', p: 3, borderRadius: 3 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                    TOTAL TIME TODAY
                  </Typography>
                  <Typography variant="h3" sx={{ fontFamily: 'monospace', fontWeight: 800, color: 'text.primary', letterSpacing: -1 }}>
                    {liveHours}
                  </Typography>
                </Box>
                {/* Simulated workspace visual component from Image 3 */}
                <Box
                  sx={{
                    width: 100,
                    height: 80,
                    borderRadius: 2,
                    bgcolor: 'primary.main',
                    display: { xs: 'none', sm: 'flex' },
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'primary.contrastText',
                    boxShadow: 2,
                    backgroundImage: 'linear-gradient(135deg, #0038a8 0%, #002266 100%)'
                  }}
                >
                  <AccessTimeIcon sx={{ fontSize: 40 }} />
                </Box>
              </Box>

              {/* GPS & Webcam configuration options with auto-GPS capture */}
              {!attendance && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>Verification Step:</Typography>
                  <Button
                    variant={capturedPhoto ? "contained" : "outlined"}
                    fullWidth
                    startIcon={gpsLoading ? <CircularProgress size={20} color="inherit" /> : <CameraIcon />}
                    onClick={openWebcam}
                    sx={{ py: 1.2, borderRadius: 2 }}
                  >
                    {capturedPhoto 
                      ? (gpsData.latitude ? 'Selfie & Location Captured' : 'Selfie Captured (Resolving GPS...)') 
                      : 'Capture Verification Selfie'}
                  </Button>

                  {gpsData.address && (
                    <Typography variant="caption" display="block" sx={{ mt: 1.5, color: 'success.main', fontWeight: 500 }}>
                      📍 Location Verified: {gpsData.address}
                    </Typography>
                  )}
                  {gpsError && (
                    <Typography variant="caption" display="block" sx={{ mt: 1.5, color: 'warning.main', fontWeight: 500 }}>
                      ⚠️ {gpsError}
                    </Typography>
                  )}

                  {capturedPhoto && (
                    <Box sx={{ mt: 2.5, display: 'flex', justifyContent: 'center' }}>
                      <Box
                        component="img"
                        src={capturedPhoto}
                        alt="selfie"
                        sx={{ width: 160, height: 120, borderRadius: 3, objectFit: 'cover', border: '3px solid', borderColor: 'primary.main', boxShadow: 3 }}
                      />
                    </Box>
                  )}
                </Box>
              )}

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {!attendance && (
                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    fullWidth
                    disabled={!capturedPhoto || gpsLoading}
                    startIcon={<CheckInIcon />}
                    onClick={handleCheckIn}
                    sx={{ py: 1.8, borderRadius: 3, fontWeight: 700, fontSize: '1rem', bgcolor: '#0038a8' }}
                  >
                    Start Work Shift (Check-In)
                  </Button>
                )}

                {isCheckedIn && (
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>Shift Break Controls</Typography>
                    <Button
                      variant="outlined"
                      onClick={handleBreakClick}
                      endIcon={<KeyboardArrowDownIcon sx={{ 
                        transition: 'transform 0.2s', 
                        transform: breakAnchorEl ? 'rotate(180deg)' : 'none',
                        color: '#f59e0b'
                      }} />}
                      sx={{
                        borderRadius: '16px',
                        py: 1.4,
                        px: 2.5,
                        textTransform: 'none',
                        fontWeight: 700,
                        fontSize: '0.925rem',
                        borderWidth: '2px',
                        borderColor: 'rgba(245, 158, 11, 0.35)',
                        color: 'warning.main',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.03) 0%, rgba(245, 158, 11, 0.08) 100%)',
                        boxShadow: '0 4px 12px rgba(245, 158, 11, 0.04)',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': {
                          borderWidth: '2px',
                          borderColor: '#f59e0b',
                          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.06) 0%, rgba(245, 158, 11, 0.12) 100%)',
                          boxShadow: '0 6px 18px rgba(245, 158, 11, 0.15)',
                          transform: 'translateY(-1px)'
                        },
                        '&:active': {
                          transform: 'translateY(0)'
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <span style={{ 
                          fontSize: '1.2rem', 
                          display: 'inline-block',
                          animation: 'emojiPulse 2.5s infinite ease-in-out'
                        }}>
                          ☕
                        </span>
                        <style>{`
                          @keyframes emojiPulse {
                            0% { transform: scale(1); }
                            50% { transform: scale(1.15) rotate(5deg); }
                            100% { transform: scale(1); }
                          }
                        `}</style>
                        <span>Take a Break / Pause Shift</span>
                      </Box>
                    </Button>
                    <Menu
                      anchorEl={breakAnchorEl}
                      open={Boolean(breakAnchorEl)}
                      onClose={handleBreakClose}
                      PaperProps={{
                        sx: {
                          borderRadius: '16px',
                          mt: 1,
                          minWidth: '240px',
                          bgcolor: 'background.paper',
                          backdropFilter: 'blur(10px)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          boxShadow: '0 12px 35px rgba(0, 0, 0, 0.4)',
                          py: 1,
                          '& .MuiList-root': {
                            py: 0
                          },
                          '& .MuiMenuItem-root': {
                            fontSize: '0.925rem',
                            fontWeight: 600,
                            py: 1.2,
                            px: 2.2,
                            display: 'flex',
                            gap: 2,
                            alignItems: 'center',
                            borderRadius: '10px',
                            mx: 1,
                            my: 0.4,
                            color: 'text.secondary',
                            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                            '& span.emoji-icon': {
                              fontSize: '1.25rem',
                              transition: 'transform 0.25s ease-in-out',
                              display: 'inline-block'
                            },
                            '&:hover': {
                              bgcolor: 'rgba(245, 158, 11, 0.08)',
                              color: 'warning.main',
                              '& span.emoji-icon': {
                                transform: 'scale(1.3) rotate(-8deg)'
                              }
                            }
                          }
                        }
                      }}
                    >
                      <Box sx={{ p: 1.5, pb: 1 }}>
                        <TextField
                          size="small"
                          placeholder="Search break..."
                          value={breakSearch}
                          onChange={(e) => setBreakSearch(e.target.value)}
                          autoFocus
                          fullWidth
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <SearchIcon sx={{ color: '#f59e0b', fontSize: '1.15rem' }} />
                              </InputAdornment>
                            ),
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: '10px',
                              backgroundColor: 'rgba(15, 23, 42, 0.4)',
                              transition: 'all 0.2s',
                              '& fieldset': {
                                borderColor: 'rgba(255, 255, 255, 0.1)',
                              },
                              '&:hover fieldset': {
                                borderColor: 'rgba(245, 158, 11, 0.4)',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#f59e0b',
                                borderWidth: '1.5px',
                              }
                            },
                            '& input': {
                              color: 'text.primary',
                              fontSize: '0.85rem',
                              py: 1
                            }
                          }}
                        />
                      </Box>
                      <Divider sx={{ my: 0.5, opacity: 0.6 }} />
                      {filteredBreakOptions.length === 0 ? (
                        <MenuItem disabled sx={{ justifyContent: 'center', py: 2 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                            No options found
                          </Typography>
                        </MenuItem>
                      ) : (
                        filteredBreakOptions.map(opt => (
                          <MenuItem key={opt.name} onClick={() => { handleBreakClose(); opt.action(); }}>
                            <span className="emoji-icon">{opt.icon}</span> 
                            <span>{opt.label}</span>
                          </MenuItem>
                        ))
                      )}
                    </Menu>
                  </Box>
                )}
                
                {isCheckedIn && (
                  <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    startIcon={<CheckOutIcon />}
                    onClick={handleCheckOut}
                    sx={{ py: 1.8, borderRadius: 3, fontWeight: 700, fontSize: '1rem', bgcolor: '#0038a8', '&:hover': { bgcolor: '#002672' } }}
                  >
                    Check-Out
                  </Button>
                )}

                {attendance && !isCheckedIn && (
                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    fullWidth
                    disabled
                    sx={{ py: 1.8, borderRadius: 3 }}
                  >
                    Shift Completed Today
                  </Button>
                )}
              </Box>

              {attendance && (
                <Typography variant="caption" display="block" align="center" color="text.secondary" sx={{ mt: 2, fontWeight: 500, mb: 1 }}>
                  Logged in today at <strong>{loginTimeStr}</strong>
                </Typography>
              )}

              {/* Integration of screenshot tracking element */}
              <ScreenshotCapturer isCheckedIn={isCheckedIn} />
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column: Dynamic metrics widgets matching Image 3 */}
        <Grid item xs={12} md={5}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, height: { xs: 'auto', md: '100%' } }}>

            {/* 1. Shift Progress Card */}
            <Card 
              sx={{ 
                borderRadius: 4, 
                p: 3, 
                flex: '1 1 auto', 
                minHeight: 140, 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'space-between',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
                }
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.75rem' }}>
                    Shift Progress
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: attendance ? 'primary.main' : 'text.primary', fontFamily: 'monospace' }}>
                    {attendance ? liveHours : '00:00:00'}
                  </Typography>
                </Box>
                <Box sx={{ width: 48, height: 48, borderRadius: 3, bgcolor: attendance ? 'rgba(79, 142, 247, 0.15)' : 'action.selected', color: attendance ? 'primary.main' : 'text.secondary', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AccessTimeIcon sx={{ fontSize: 24 }} />
                </Box>
              </Box>
              <Box sx={{ mt: 2 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={shiftProgressPercent} 
                  sx={{ height: 6, borderRadius: 3, bgcolor: 'action.hover', '& .MuiLinearProgress-bar': { borderRadius: 3 } }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, fontWeight: 600 }}>
                  {attendance ? `Completed ${shiftProgressPercent}% of 8 hrs target` : 'Not Checked-In'}
                </Typography>
              </Box>
            </Card>

            {/* 2. Productivity Level Card */}
            <Card 
              sx={{ 
                borderRadius: 4, 
                p: 3, 
                flex: '1 1 auto', 
                minHeight: 140, 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'space-between',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
                }
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.75rem' }}>
                    Productivity Level
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: productivity >= 70 ? 'success.main' : 'warning.main' }}>
                    <AnimatedCounter value={productivity} suffix="%" />
                  </Typography>
                </Box>
                <Box sx={{ width: 48, height: 48, borderRadius: 3, bgcolor: productivity >= 70 ? 'rgba(52, 211, 153, 0.15)' : 'rgba(251, 191, 36, 0.15)', color: productivity >= 70 ? 'success.main' : 'warning.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUpIcon sx={{ fontSize: 24 }} />
                </Box>
              </Box>
              <Box sx={{ mt: 2 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={productivity} 
                  color={productivity >= 70 ? 'success' : 'warning'}
                  sx={{ height: 6, borderRadius: 3, bgcolor: 'action.hover', '& .MuiLinearProgress-bar': { borderRadius: 3 } }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, fontWeight: 600 }}>
                  {productivity >= 70 ? '🛡️ Privacy Auto-Delete Enabled' : '⚠️ Full Telemetry Audit Mode'}
                </Typography>
              </Box>
            </Card>

            {/* 3. Tasks Completed Card */}
            <Card 
              sx={{ 
                borderRadius: 4, 
                p: 3, 
                flex: '1 1 auto', 
                minHeight: 140, 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'space-between',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
                }
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.75rem' }}>
                    Tasks Completed
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: 'secondary.main', display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                    <AnimatedCounter value={completedTasksCount} />
                    <Typography component="span" variant="h5" color="text.secondary" sx={{ fontWeight: 600 }}>
                      / {totalTasksCount}
                    </Typography>
                  </Typography>
                </Box>
                <Box sx={{ width: 48, height: 48, borderRadius: 3, bgcolor: 'rgba(167, 139, 250, 0.15)', color: 'secondary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckIcon sx={{ fontSize: 24 }} />
                </Box>
              </Box>
              <Box sx={{ mt: 2 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={taskProgressPercent} 
                  color="secondary"
                  sx={{ height: 6, borderRadius: 3, bgcolor: 'action.hover', '& .MuiLinearProgress-bar': { borderRadius: 3 } }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, fontWeight: 600 }}>
                  {totalTasksCount > 0 ? `${taskProgressPercent}% of assigned tasks completed` : 'No tasks assigned'}
                </Typography>
              </Box>
            </Card>

          </Box>
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

      {/* Other Break Dialog */}
      <Dialog open={otherBreakOpen} onClose={() => { setOtherBreakOpen(false); setOtherBreakNote(''); }} maxWidth="xs" fullWidth>
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
            value={otherBreakNote}
            onChange={(e) => setOtherBreakNote(e.target.value)}
            autoFocus
            inputProps={{ maxLength: 200 }}
            helperText={`${otherBreakNote.length}/200`}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => { setOtherBreakOpen(false); setOtherBreakNote(''); }} color="inherit">Cancel</Button>
          <Button
            onClick={handleStartOtherBreak}
            variant="contained"
            color="secondary"
            disabled={!otherBreakNote.trim()}
          >
            Start Break
          </Button>
        </DialogActions>
      </Dialog>

      {/* Break Mode Glassmorphic Backdrop Page Lock */}
      <Backdrop
        sx={{
          color: '#fff',
          zIndex: (theme) => theme.zIndex.drawer + 999,
          backdropFilter: 'blur(15px)',
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          p: 4,
          textAlign: 'center'
        }}
        open={Boolean(attendance && attendance.onBreak)}
      >
        <Box
          sx={{
            p: 4,
            borderRadius: 4,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.5)',
            maxWidth: 450,
            width: '100%',
            color: 'text.primary'
          }}
        >
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, color: 'warning.main' }}>
            Shift Paused
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" sx={{ mb: attendance?.currentBreakNote ? 1 : 3 }}>
            You are currently on a <strong>{attendance?.currentBreakType} Break</strong>.
          </Typography>

          {/* Show note if it exists (for Other break) */}
          {attendance?.currentBreakNote && (
            <Box sx={{
              mb: 3,
              px: 2,
              py: 1.5,
              borderRadius: 2,
              bgcolor: 'action.hover',
              border: '1px solid',
              borderColor: 'divider',
              textAlign: 'left'
            }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                📝 Note
              </Typography>
              <Typography variant="body2" color="text.primary" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                "{attendance.currentBreakNote}"
              </Typography>
            </Box>
          )}

          <Box
            sx={{
              p: 3,
              borderRadius: 3,
              bgcolor: 'action.selected',
              mb: 4,
              border: '1px dashed',
              borderColor: 'divider'
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
              Break Elapsed Time
            </Typography>
            <Typography variant="h3" sx={{ fontFamily: 'monospace', fontWeight: 800, mt: 1, color: 'text.primary' }}>
              {breakTimeStr}
            </Typography>
          </Box>

          <Button
            variant="contained"
            color="success"
            size="large"
            fullWidth
            onClick={handleEndBreak}
            sx={{ py: 1.5, borderRadius: 2, fontWeight: 700 }}
          >
            Resume Work Shift
          </Button>
        </Box>
      </Backdrop>
    </Box>
  );
}

export default EmployeeDashboard;
