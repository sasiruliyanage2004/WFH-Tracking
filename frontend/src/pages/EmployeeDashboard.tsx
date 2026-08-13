/* eslint-disable @typescript-eslint/no-unused-vars */
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
  InputAdornment,
  Snackbar,
  Alert,
  IconButton,
  Link
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
  Search as SearchIcon,
  Attachment as AttachmentIcon,
  Link as LinkIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Comment as CommentIcon,
  OpenInNew as OpenInNewIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import DashboardLayout from '../components/DashboardLayout';
import ActivityTracker from '../components/ActivityTracker';
import AnnouncementBanner from '../components/AnnouncementBanner';
import CustomLoader from '../components/CustomLoader';
import DeveloperSignature from '../components/DeveloperSignature';
import ScreenshotCapturer from '../components/ScreenshotCapturer';
import CheckoutSuccessModal from '../components/CheckoutSuccessModal';
import { maskEmail } from '../utils/maskEmail';
import SkeletonCard from '../components/SkeletonCard';
import AnimatedCounter from '../components/AnimatedCounter';
import WebcamDialog from '../components/dashboard/WebcamDialog';
import MobileVerifyDialog from '../components/dashboard/MobileVerifyDialog';
import CreateTaskDialog from '../components/dashboard/CreateTaskDialog';
import OtherBreakDialog from '../components/dashboard/OtherBreakDialog';
import SmartIdleBreakDialog from '../components/dashboard/SmartIdleBreakDialog';
import StatCards from '../components/dashboard/StatCards';
import { useEmployeeDashboard } from '../hooks/useEmployeeDashboard';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function EmployeeDashboard() {
  const {
    user, token, dispatch,
    attendance, setAttendance,
    successSnackbar, setSuccessSnackbar,
    autoCheckinSnackbar, setAutoCheckinSnackbar,
    loading, setLoading,
    gpsData, setGpsData,
    gpsLoading, setGpsLoading,
    gpsError, setGpsError,
    liveHours, setLiveHours,
    breakTimeStr, setBreakTimeStr,
    productivity, setProductivity,
    mobileVerifyOpen, setMobileVerifyOpen,
    mobileVerifyToken, setMobileVerifyToken,
    otherBreakOpen, setOtherBreakOpen,
    otherBreakNote, setOtherBreakNote,
    breakAnchorEl, setBreakAnchorEl,
    breakSearch, setBreakSearch,
    idleDialogOpen, setIdleDialogOpen,
    idleMins, setIdleMins,
    webcamOpen, setWebcamOpen,
    webcamStream, setWebcamStream,
    currentTime, setCurrentTime,
    capturedPhoto, setCapturedPhoto,
    webcamError, setWebcamError,
    videoRef,
    activeTab, setActiveTab,
    tasks, setTasks,
    taskName, setTaskName,
    taskDesc, setTaskDesc,
    taskPriority, setTaskPriority,
    taskDialogOpen, setTaskDialogOpen,
    showCheckoutSuccess, setShowCheckoutSuccess,
    checkoutData, setCheckoutData,
    selectedTask, setSelectedTask,
    taskDetailsOpen, setTaskDetailsOpen,
    proofLinks, setProofLinks,
    proofFiles, setProofFiles,
    submissionComment, setSubmissionComment,
    newCommentText, setNewCommentText,
    isSubmittingProof, setIsSubmittingProof,
    isSubmittingComment, setIsSubmittingComment,
    reports, setReports,
    completedText, setCompletedText,
    progressText, setProgressText,
    challengesText, setChallengesText,
    tomorrowText, setTomorrowText,
    workedHoursInput, setWorkedHoursInput,
    fetchData,
    mobileVerifyInterval
  } = useEmployeeDashboard();





  useEffect(() => {
    if (localStorage.getItem('register_success') === 'true') {
      setSuccessSnackbar(true);
      localStorage.removeItem('register_success');
    }

    if (window.api && typeof window.api.onIdlePrompt === 'function') {
      window.api.onIdlePrompt((data) => {
        setIdleMins(data.durationMinutes);
        setIdleDialogOpen(true);
      });
    }

    if (window.api && typeof window.api.onAutoCheckedOut === 'function') {
      window.api.onAutoCheckedOut(() => {
        // Clear local state and refetch
        setAttendance(null);
        fetchData();
      });
    }

    if (window.api && typeof window.api.onIdleAutoCheckout === 'function') {
      window.api.onIdleAutoCheckout(async () => {
        try {
          await axios.post(`${API_URL}/api/attendance/checkout`, {}, { headers: { Authorization: `Bearer ${token}` } });
          setAttendance(null);
          fetchData();
          if (window.api.showNotification) {
            window.api.showNotification('Auto Check-Out', 'You have been automatically checked out due to 2 hours of inactivity.');
          }
        } catch (err) {
          if (!navigator.onLine) {
            const timestamp = new Date().toISOString();
            const action = { type: 'checkout', timestamp };
            localStorage.setItem('offlineAction', JSON.stringify(action));
            setAttendance(null);
          }
        }
      });
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-trigger Electron desktop active window tracking based on Check-In and Break states
  useEffect(() => {
    if (window.api && window.api.toggleTracking) {
      const active = !!(attendance && !attendance.checkOutTime && !attendance.onBreak);
      console.log(`[Electron] Auto-toggling active window tracking: ${active}`);
      window.api.toggleTracking(active, token);
    }
    if (window.api && window.api.setBreakStatus) {
      const isOnBreak = !!(attendance && attendance.onBreak);
      window.api.setBreakStatus(isOnBreak);
    }
  }, [attendance, token]);

  // Break overlay ticking timer
  useEffect(() => {
    if (!attendance || !attendance.onBreak) {
      setBreakTimeStr('00:00');
      return;
    }

    const currentBreak = attendance && Array.isArray(attendance.breakHistory) && attendance.breakHistory.length > 0
      ? attendance.breakHistory[attendance.breakHistory.length - 1]
      : null;

    if (!currentBreak || (!currentBreak.startTime && !currentBreak.start_time)) {
      setBreakTimeStr('00:00');
      return;
    }

    const startTimeStr = currentBreak.startTime || currentBreak.start_time;

    const tick = () => {
      const diffMs = Date.now() - new Date(startTimeStr).getTime();
      const minutes = Math.floor(diffMs / 60000);
      const seconds = Math.floor((diffMs % 60000) / 1000);
      const pad = (num) => String(num || 0).padStart(2, '0');
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
      const diffMs = attendance.durationHours ? attendance.durationHours * 3600000 : 0;
      
      const hours = Math.floor(diffMs / 3600000);
      const minutes = Math.floor((diffMs % 3600000) / 60000);
      const seconds = Math.floor((diffMs % 60000) / 1000);

      const pad = (num) => String(num).padStart(2, '0');
      setLiveHours(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
      return;
    }

    const interval = setInterval(() => {
      const start = new Date(attendance.checkInTime);
      const diffMs = Date.now() - start.getTime() + (attendance.durationHours ? attendance.durationHours * 3600000 : 0);
      
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
        setGpsError(`GPS retrieval blocked: ${err.message}. Please complete mobile verification to continue.`);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const openWebcam = async () => {
    // Automatically trigger GPS trapping under the hood when camera is opened
    requestGPS();
    setWebcamOpen(true);
    setWebcamError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setWebcamStream(stream);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => {
            console.error('Error starting video playback:', e.message);
          });
        }
      }, 500);
    } catch (err) {
      console.error('Camera access denied:', err.message);
      setWebcamError(err.message || String(err));
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
    setWebcamError('');
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

  const handleRetroactiveBreak = async (breakType) => {
    try {
      const res = await axios.post(
        `${API_URL}/api/attendance/break/retroactive`,
        { breakType, durationMinutes: idleMins },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAttendance(res.data.attendance);
      setIdleDialogOpen(false);
    } catch (err) {
      console.error(err.response?.data?.message || err.message);
    }
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
      alert(`Failed to resume shift: ${err.response?.data?.message || err.message}`);
      window.location.reload();
    }
  };

  const startMobileVerification = () => {
    const newToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    setMobileVerifyToken(newToken);
    setMobileVerifyOpen(true);

    if (mobileVerifyInterval.current) clearInterval(mobileVerifyInterval.current);
    
    // Poll for verification status every 3 seconds
    mobileVerifyInterval.current = setInterval(async () => {
      try {
        const res = await axios.get(`${API_URL}/api/attendance/mobile-location-status?token=${newToken}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.data.status === 'success') {
          clearInterval(mobileVerifyInterval.current);
          setGpsData({
            latitude: res.data.data.latitude,
            longitude: res.data.data.longitude,
            address: res.data.data.address
          });
          setGpsError(''); // Clear error since we have exact GPS now
          setMobileVerifyOpen(false);
          setSuccessSnackbar(true);
        } else if (res.data.status === 'expired') {
          clearInterval(mobileVerifyInterval.current);
          setMobileVerifyOpen(false);
          setGpsError('Mobile verification expired. Please try again.');
        }
      } catch (err) {
        console.warn('Mobile verify poll failed:', err.message);
      }
    }, 3000);
  };

  const handleCloseMobileVerify = () => {
    if (mobileVerifyInterval.current) clearInterval(mobileVerifyInterval.current);
    setMobileVerifyOpen(false);
  };

  const captureSelfie = () => {
    const video = videoRef.current;
    if (video) {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
      setCapturedPhoto(canvas.toDataURL('image/jpeg'));
      closeWebcam();
    }
  };

  // Check In handler
  const handleCheckIn = async () => {
    try {
      const res = await axios.post(
        `${API_URL}/api/attendance/checkin`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAttendance(res.data.attendance);
      setCapturedPhoto('');
      fetchData();
    } catch (err: any) {
      if (!navigator.onLine || !err.response) {
        const timestamp = new Date().toISOString();
        const action = { type: 'checkin', timestamp };
        localStorage.setItem('offlineAction', JSON.stringify(action));
        setAttendance({
          id: 'offline-' + Date.now(),
          checkInTime: timestamp,
          checkOutTime: null,
          status: 'Present',
          durationHours: 0,
          date: timestamp.split('T')[0],
          isOffline: true
        });
        setCapturedPhoto('');
      } else {
        console.error(err.response?.data?.message || err.message);
      }
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
      setCheckoutData(res.data.attendance);
      setShowCheckoutSuccess(true);
      fetchData();
    } catch (err: any) {
      if (!navigator.onLine || !err.response) {
        const timestamp = new Date().toISOString();
        const action = { type: 'checkout', timestamp };
        localStorage.setItem('offlineAction', JSON.stringify(action));
        if (attendance) {
          const updatedAtt = { ...attendance, checkOutTime: timestamp, status: 'Completed' };
          setAttendance(updatedAtt);
          setCheckoutData(updatedAtt);
          setShowCheckoutSuccess(true);
        }
      } else {
        console.error(err.response?.data?.message || err.message);
      }
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
      const payload: any = { status: newStatus };
      if (newStatus === 'Completed') payload.progress = 100;
      if (newStatus === 'Pending') payload.progress = 0;

      const res = await axios.put(
        `${API_URL}/api/tasks/${taskId}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTasks((prev) => prev.map((t) => (t._id === taskId ? res.data : t)));
      
      // If status is changed to Completed, automatically open details modal to submit proof
      if (newStatus === 'Completed') {
        const updatedTask = res.data;
        handleOpenTaskDetails(updatedTask);
      }
    } catch (err) {
      console.error(err.message);
    }
  };

  const handleOpenTaskDetails = (task) => {
    setSelectedTask(task);
    setProofLinks(task.proofLinks && task.proofLinks.length > 0 ? task.proofLinks : ['']);
    setProofFiles([]);
    setSubmissionComment('');
    setNewCommentText('');
    setTaskDetailsOpen(true);
  };

  const handleAddProofLinkField = () => {
    setProofLinks([...proofLinks, '']);
  };

  const handleRemoveProofLinkField = (index) => {
    const updated = proofLinks.filter((_, i) => i !== index);
    setProofLinks(updated.length > 0 ? updated : ['']);
  };

  const handleProofLinkChange = (index, value) => {
    const updated = [...proofLinks];
    updated[index] = value;
    setProofLinks(updated);
  };

  const handleProofFilesChange = (e) => {
    setProofFiles(Array.from(e.target.files));
  };

  const handleSubmitProof = async (e) => {
    e.preventDefault();
    if (!selectedTask) return;
    
    setIsSubmittingProof(true);
    try {
      const formData = new FormData();
      const filteredLinks = proofLinks.map(l => l.trim()).filter(Boolean);
      formData.append('proofLinks', JSON.stringify(filteredLinks));
      formData.append('comment', submissionComment.trim());
      
      proofFiles.forEach((file) => {
        formData.append('files', file);
      });

      const res = await axios.post(
        `${API_URL}/api/tasks/${selectedTask._id}/submit`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      setTasks((prev) => prev.map((t) => (t._id === selectedTask._id ? res.data : t)));
      setSelectedTask(res.data);
      setProofLinks(res.data.proofLinks && res.data.proofLinks.length > 0 ? res.data.proofLinks : ['']);
      setProofFiles([]);
      setSubmissionComment('');
    } catch (err) {
      console.error('Failed to submit proof of work:', err.message);
    } finally {
      setIsSubmittingProof(false);
    }
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

      setTasks((prev) => prev.map((t) => (t._id === selectedTask._id ? res.data : t)));
      setSelectedTask(res.data);
      setNewCommentText('');
    } catch (err) {
      console.error('Failed to add comment:', err.message);
    } finally {
      setIsSubmittingComment(false);
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
          <Grid size={{ xs: 12, md: 7 }}>
            <SkeletonCard variant="full" />
          </Grid>
          <Grid size={{ xs: 12, md: 5 }}>
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
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const isRecentCheckout = attendance?.checkOutTime && 
    (Date.now() - new Date(attendance.checkOutTime).getTime() < 30 * 60 * 1000);

  const breakOptions = [
    { name: 'Breakfast', label: 'Breakfast', icon: '☕', action: () => handleStartBreak('Breakfast') },
    { name: 'Tea', label: 'Tea / Coffee Break', icon: '🍵', action: () => handleStartBreak('Tea / Coffee Break') },
    { name: 'Lunch', label: 'Lunch Break', icon: '🍔', action: () => handleStartBreak('Lunch') },
    { name: 'Dinner', label: 'Dinner', icon: '🍽️', action: () => handleStartBreak('Dinner') },
    { name: 'Washroom', label: 'Washroom', icon: '🚽', action: () => handleStartBreak('Washroom') },
    { name: 'PowerCut', label: 'Power Cut', icon: '⚡', action: () => handleStartBreak('Power Cut') },
    { name: 'InternetIssue', label: 'Internet Issue', icon: '🌐', action: () => handleStartBreak('Internet Issue') },
    { name: 'Stretch', label: 'Stretch / Wellness Break', icon: '🧘', action: () => handleStartBreak('Stretch / Wellness Break') },
    { name: 'OfflineMeeting', label: 'Offline Meeting / Call', icon: '🤝', action: () => handleStartBreak('Offline Meeting / Call') },
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.025em' }}>
              {getGreeting()}, {user?.name.split(' ')[0]}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, mt: 0.5 }}>
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} • {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} • Hybrid Workspace
            </Typography>
          </Box>
          {!!window.api && (user?.role === 'Admin' || user?.role === 'SuperAdmin' || user?.role === 'Manager') && (
            <Button
              variant="outlined"
              color="primary"
              onClick={() => window.open('https://wfh-tracking-k5ap.vercel.app', '_blank')}
              sx={{ borderRadius: 2, fontWeight: 700, px: 3, boxShadow: '0 4px 12px rgba(0,225,171,0.1)' }}
            >
              Open Web Dashboard
            </Button>
          )}

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
        <Grid size={{ xs: 12, md: 7 }}>
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

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {!isCheckedIn && !isRecentCheckout && (
                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    fullWidth
                    startIcon={<CheckInIcon />}
                    onClick={handleCheckIn}
                    sx={{ py: 1.8, borderRadius: 3, fontWeight: 700, fontSize: '1rem', bgcolor: '#0038a8' }}
                  >
                    Start Work Shift (Check-In)
                  </Button>
                )}

                {!isCheckedIn && isRecentCheckout && (
                  <Box
                    sx={{
                      p: 3,
                      borderRadius: 4,
                      bgcolor: 'rgba(16, 185, 129, 0.05)',
                      border: '2px solid rgba(16, 185, 129, 0.3)',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 1.5,
                      boxShadow: '0 4px 15px rgba(16,185,129,0.05)',
                    }}
                  >
                    <Box sx={{ width: 64, height: 64, borderRadius: '50%', bgcolor: 'success.main', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 8px 16px rgba(16, 185, 129, 0.3)' }}>
                      <CheckIcon sx={{ fontSize: 36 }} />
                    </Box>
                    <Typography variant="h6" sx={{ color: 'success.light', fontWeight: 800 }}>
                      Shift Completed! 🎉
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1, px: 2, lineHeight: 1.6 }}>
                      Great job today. Your work hours and activities have been securely logged. See you tomorrow!
                    </Typography>
                    <Button
                      variant="outlined"
                      color="success"
                      size="small"
                      onClick={handleCheckIn}
                      sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                    >
                      Wait, I need to re-start work
                    </Button>
                  </Box>
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
                      // @ts-ignore
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
                          // @ts-ignore
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


              </Box>

              {attendance && (
                <Typography variant="caption" component="div" align="center" color="text.secondary" sx={{ mt: 2, fontWeight: 500, mb: 1 }}>
                  Logged in today at <strong>{loginTimeStr}</strong>
                </Typography>
              )}

              {/* Integration of screenshot tracking element */}
              <ScreenshotCapturer isCheckedIn={isCheckedIn} productivity={productivity} />
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column: Dynamic metrics widgets matching Image 3 */}
        <Grid size={{ xs: 12, md: 5 }}>
          <StatCards
            attendance={attendance}
            liveHours={liveHours}
            shiftProgressPercent={shiftProgressPercent}
            productivity={productivity}
            completedTasksCount={completedTasksCount}
            totalTasksCount={totalTasksCount}
            taskProgressPercent={taskProgressPercent}
          />
        </Grid>

      </Grid>

      {/* Web Cam Dialog */}
      <WebcamDialog
        open={webcamOpen}
        onClose={() => setWebcamOpen(false)}
        videoRef={videoRef}
        error={webcamError}
        onCapture={captureSelfie}
      />

      {/* Mobile Verification Dialog */}
      <MobileVerifyDialog
        open={mobileVerifyOpen}
        onClose={handleCloseMobileVerify}
        token={mobileVerifyToken}
      />

      <Snackbar open={successSnackbar} autoHideDuration={4000} onClose={() => setSuccessSnackbar(false)}>
        <Alert severity="success" sx={{ width: '100%' }}>
          Action completed successfully!
        </Alert>
      </Snackbar>

      {/* Dialog for New Task Creation */}
      <CreateTaskDialog
        open={taskDialogOpen}
        onClose={() => setTaskDialogOpen(false)}
        taskName={taskName}
        setTaskName={setTaskName}
        taskDesc={taskDesc}
        setTaskDesc={setTaskDesc}
        taskPriority={taskPriority}
        setTaskPriority={setTaskPriority}
        onCreateTask={handleCreateTask}
      />

      {/* Other Break Dialog */}
      <OtherBreakDialog
        open={otherBreakOpen}
        onClose={() => { setOtherBreakOpen(false); setOtherBreakNote(''); }}
        note={otherBreakNote}
        setNote={setOtherBreakNote}
        onStartBreak={handleStartOtherBreak}
      />

      {/* Smart Idle Break Dialog */}
      <SmartIdleBreakDialog
        open={idleDialogOpen}
        onClose={() => setIdleDialogOpen(false)}
        idleMins={idleMins}
        onRetroactiveBreak={handleRetroactiveBreak}
      />

      {/* Dialog for Task Details & Proof Submission / Comments */}
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
              {/* Left Column: Details & Proof Form */}
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Description</Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap', bgcolor: 'action.hover', p: 1.5, borderRadius: 2 }}>
                    {selectedTask.description || 'No description provided.'}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
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
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Due Date</Typography>
                      <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 500 }}>
                        {new Date(selectedTask.dueDate).toLocaleDateString()}
                      </Typography>
                    </Box>
                  )}
                </Box>

                {/* Submitted Proof Display (If exists) */}
                {(selectedTask.proofLinks?.length > 0 || selectedTask.proofFiles?.length > 0) && (
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
                )}

                {/* Form to submit proof of work (if status is Completed but no proof files/links submitted yet, OR if they want to submit/update proof) */}
                {selectedTask.status === 'Completed' && !(selectedTask.proofLinks?.length > 0 || selectedTask.proofFiles?.length > 0) && (
                  <Box component="form" onSubmit={handleSubmitProof} sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
                      Submit Proof of Work
                    </Typography>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {/* Dynamic Links Fields */}
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
                          Work Links (e.g. GitHub PR, Figma)
                        </Typography>
                        {proofLinks.map((link, index) => (
                          <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <TextField
                              size="small"
                              placeholder="https://github.com/..."
                              value={link}
                              onChange={(e) => handleProofLinkChange(index, e.target.value)}
                              fullWidth
                            />
                            {proofLinks.length > 1 && (
                              <IconButton size="small" color="error" onClick={() => handleRemoveProofLinkField(index)}>
                                <DeleteIcon />
                              </IconButton>
                            )}
                          </Box>
                        ))}
                        <Button 
                          size="small" 
                          startIcon={<AddIcon />} 
                          onClick={handleAddProofLinkField}
                          sx={{ mt: 0.5, textTransform: 'none' }}
                        >
                          Add Link
                        </Button>
                      </Box>

                      {/* File uploads */}
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
                          Attachments (Screenshots / Files)
                        </Typography>
                        <Button
                          variant="outlined"
                          component="label"
                          startIcon={<AttachmentIcon />}
                          size="small"
                          sx={{ textTransform: 'none' }}
                        >
                          Select Files
                          <input
                            type="file"
                            multiple
                            hidden
                            onChange={handleProofFilesChange}
                          />
                        </Button>
                        
                        {proofFiles.length > 0 && (
                          <Box sx={{ mt: 1.5 }}>
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>Selected Files:</Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.5 }}>
                              {proofFiles.map((f, i) => (
                                <Typography key={i} variant="caption" color="text.secondary" component="div">
                                  • {f.name} ({(f.size / 1024).toFixed(1)} KB)
                                </Typography>
                              ))}
                            </Box>
                          </Box>
                        )}
                      </Box>

                      <TextField
                        label="Submission Note / Comment"
                        placeholder="Add details about your completion..."
                        multiline
                        rows={2}
                        size="small"
                        value={submissionComment}
                        onChange={(e) => setSubmissionComment(e.target.value)}
                        fullWidth
                      />

                      <Button
                        type="submit"
                        variant="contained"
                        color="success"
                        disabled={isSubmittingProof}
                        sx={{ textTransform: 'none', borderRadius: 2, mt: 1 }}
                      >
                        {isSubmittingProof ? 'Submitting...' : 'Submit Proof & Complete Task'}
                      </Button>
                    </Box>
                  </Box>
                )}
              </Box>

              {/* Right Column: Comments Thread */}
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
                    placeholder="Add a comment..."
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

      <Snackbar
        open={successSnackbar}
        autoHideDuration={6000}
        onClose={() => setSuccessSnackbar(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setSuccessSnackbar(false)} severity="success" sx={{ width: '100%', borderRadius: 2 }}>
          Registration successful! Welcome to your WorkforceOS WFH dashboard.
        </Alert>
      </Snackbar>

      <Snackbar
        open={autoCheckinSnackbar}
        autoHideDuration={6000}
        onClose={() => setAutoCheckinSnackbar(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setAutoCheckinSnackbar(false)} severity="success" sx={{ width: '100%', borderRadius: 2 }}>
          Welcome! You have been automatically checked in. Have a great day! 🚀
        </Alert>
      </Snackbar>

      <CheckoutSuccessModal 
        open={showCheckoutSuccess} 
        onClose={() => setShowCheckoutSuccess(false)} 
        attendanceData={checkoutData} 
        userName={user?.name || ''} 
      />
    </Box>
  );
}

export default EmployeeDashboard;
