import { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import { setBreakStart, setBreakEnd } from '../redux/store';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const useEmployeeDashboard = () => {
  const { token, user } = useSelector((state: any) => state.auth);
  const dispatch = useDispatch();

  // States
  const [attendance, setAttendance] = useState<any>(null);
  const [successSnackbar, setSuccessSnackbar] = useState(false);
  const [autoCheckinSnackbar, setAutoCheckinSnackbar] = useState(false);
  const [loading, setLoading] = useState(true);
  const [gpsData, setGpsData] = useState({ latitude: null, longitude: null, address: '' });
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [liveHours, setLiveHours] = useState('00:00:00');
  const [breakTimeStr, setBreakTimeStr] = useState('00:00');
  const [productivity, setProductivity] = useState(100);

  // Mobile Verification States
  const [mobileVerifyOpen, setMobileVerifyOpen] = useState(false);
  const [mobileVerifyToken, setMobileVerifyToken] = useState('');
  const mobileVerifyInterval = useRef<any>(null);
  const isInitialLoad = useRef(true);

  // Other Break Dialog
  const [otherBreakOpen, setOtherBreakOpen] = useState(false);
  const [otherBreakNote, setOtherBreakNote] = useState('');
  const [breakAnchorEl, setBreakAnchorEl] = useState<null | HTMLElement>(null);
  const [breakSearch, setBreakSearch] = useState('');

  // Idle Break Dialog States
  const [idleDialogOpen, setIdleDialogOpen] = useState(false);
  const [idleMins, setIdleMins] = useState(0);

  // Webcam States
  const [webcamOpen, setWebcamOpen] = useState(false);
  const [webcamStream, setWebcamStream] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [capturedPhoto, setCapturedPhoto] = useState('');
  const [webcamError, setWebcamError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState(0);

  // Tasks States
  const [tasks, setTasks] = useState<any[]>([]);
  const [taskName, setTaskName] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPriority, setTaskPriority] = useState('Medium');
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [showCheckoutSuccess, setShowCheckoutSuccess] = useState(false);
  const [checkoutData, setCheckoutData] = useState<any>(null);

  // Proof of Work
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [taskDetailsOpen, setTaskDetailsOpen] = useState(false);
  const [proofLinks, setProofLinks] = useState(['']);
  const [proofFiles, setProofFiles] = useState<any[]>([]);
  const [submissionComment, setSubmissionComment] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Report States
  const [reports, setReports] = useState<any[]>([]);
  const [completedText, setCompletedText] = useState('');
  const [progressText, setProgressText] = useState('');
  const [challengesText, setChallengesText] = useState('');
  const [tomorrowText, setTomorrowText] = useState('');
  const [workedHoursInput, setWorkedHoursInput] = useState(8);

  const fetchData = async () => {
    const isFirstLoad = !sessionStorage.getItem('hasAutoCheckedIn');
    if (isFirstLoad) {
      sessionStorage.setItem('hasAutoCheckedIn', 'true');
    }

    try {
      setLoading(true);
      const authHeader = { headers: { Authorization: `Bearer ${token}` } };

      if (navigator.onLine) {
        const offlineActionStr = localStorage.getItem('offlineAction');
        if (offlineActionStr) {
          try {
            const action = JSON.parse(offlineActionStr);
            if (action.type === 'checkin') {
              await axios.post(`${API_URL}/api/attendance/checkin`, { offlineTimestamp: action.timestamp, latitude: 0, longitude: 0, address: 'Offline Check-in', webcamImage: '' }, authHeader);
            } else if (action.type === 'checkout') {
              await axios.post(`${API_URL}/api/attendance/checkout`, { offlineTimestamp: action.timestamp }, authHeader);
            }
            localStorage.removeItem('offlineAction');
          } catch (e: any) {
             console.error('Failed to sync offline action:', e.message);
          }
        }
      }
      
      const attendanceRes = await axios.get(`${API_URL}/api/attendance/status`, authHeader);
      const att = attendanceRes.data.attendance;
      
      const shouldAutoCheckin = isFirstLoad && (!att || att.checkOutTime !== null);

      if (shouldAutoCheckin) {
        try {
          const checkInRes = await axios.post(
            `${API_URL}/api/attendance/checkin`,
            { latitude: 0, longitude: 0, address: 'Auto Check-in on Startup', webcamImage: '' },
            authHeader
          );
          setAttendance(checkInRes.data.attendance);
          if ((window as any).api && (window as any).api.showNotification) {
            (window as any).api.showNotification('WorkforceOS', 'Welcome! You have been automatically checked in. Have a great day! 🚀');
          } else {
            setAutoCheckinSnackbar(true);
          }
        } catch (err: any) {
          console.error('Auto checkin failed:', err.message);
          setAttendance(att);
        }
      } else {
        setAttendance(att);
        if (att && att.onBreak) {
          dispatch(setBreakStart(att.currentBreakType));
        } else {
          dispatch(setBreakEnd());
        }
      }

      const tasksRes = await axios.get(`${API_URL}/api/tasks?myTasksOnly=true`, authHeader);
      setTasks(tasksRes.data);

      const reportsRes = await axios.get(`${API_URL}/api/reports?myReportsOnly=true`, authHeader);
      setReports(reportsRes.data);

      try {
        const prodRes = await axios.get(`${API_URL}/api/monitoring/my-activity`, authHeader);
        setProductivity(prodRes.data.productivityPercentage ?? prodRes.data.productivity_percentage ?? 100);
      } catch (err) {
        console.warn('Could not fetch productivity score on load.');
      }
    } catch (err: any) {
      console.error('Fetch dashboard data error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const productivityInterval = setInterval(async () => {
      try {
        if (!token) return;
        const authHeader = { headers: { Authorization: `Bearer ${token}` } };
        const prodRes = await axios.get(`${API_URL}/api/monitoring/my-activity`, authHeader);
        setProductivity(prodRes.data.productivityPercentage ?? prodRes.data.productivity_percentage ?? 100);
      } catch (err) {
        // Silent fail
      }
    }, 15000);
    return () => clearInterval(productivityInterval);
  }, [token]);

  return {
    user,
    token,
    dispatch,
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
  };
};
