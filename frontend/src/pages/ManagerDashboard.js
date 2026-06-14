// frontend/src/pages/ManagerDashboard.js
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Chip,
  Paper,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  IconButton,
  List,
  Avatar,
  Tooltip as MuiTooltip,
  LinearProgress,
  useTheme
} from '@mui/material';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import {
  People as TeamIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Assignment as TaskIcon,
  GetApp as ExportIcon,
  Visibility as ViewIcon,
  TrendingUp as TrendIcon,
  HourglassEmpty as PendingIcon,
  FiberManualRecord as DotIcon,
  Undo as UndoIcon,
  Comment as CommentIcon
} from '@mui/icons-material';

import SkeletonCard from '../components/SkeletonCard';
import AnimatedCounter from '../components/AnimatedCounter';

const COLORS = ['#fbbf24', '#4f8ef7', '#34d399', '#f87171'];

const CustomTooltip = ({ active, payload, label }) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  if (active && payload && payload.length) {
    return (
      <Box sx={{
        bgcolor: isDarkMode ? 'rgba(17, 17, 17, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        p: 1.5,
        boxShadow: 5
      }}>
        <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, color: 'text.primary' }}>
          {label}
        </Typography>
        {payload.map((pld, index) => (
          <Typography key={index} variant="caption" sx={{ display: 'block', color: pld.color || 'primary.main', fontWeight: 700 }}>
            {pld.name}: {pld.value}
          </Typography>
        ))}
      </Box>
    );
  }
  return null;
};

function ManagerDashboard() {
  const navigate = useNavigate();
  const { token } = useSelector((state) => state.auth);
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  // States
  const [summary, setSummary] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [reports, setReports] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);



  // Filters for Export
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterDate, setFilterDate] = useState('');

  // Dialog States
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [reportFeedback, setReportFeedback] = useState('');
  const [activeReportId, setActiveReportId] = useState(null);
  const [reportActionType, setReportActionType] = useState(''); // 'Approved' or 'Rejected'

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
        prev.map((r) => (r._id === reportId ? { ...r, approvalStatus: 'Rejected', managerFeedback: customFeedback } : r))
      );
      fetchData();
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
    handleOpenReportDialog(reportId, 'Rejected');
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

  // Task Form
  const [taskName, setTaskName] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskAssignedTo, setTaskAssignedTo] = useState('');
  const [taskPriority, setTaskPriority] = useState('Medium');

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const fetchData = async () => {
    try {
      setLoading(true);
      const authHeader = { headers: { Authorization: `Bearer ${token}` } };
      
      const summaryRes = await axios.get(`${API_URL}/api/monitoring/summary`, authHeader);
      setSummary(summaryRes.data);

      const reportsRes = await axios.get(`${API_URL}/api/reports`, authHeader);
      setReports(reportsRes.data);

      const tasksRes = await axios.get(`${API_URL}/api/tasks`, authHeader);
      setTasks(tasksRes.data);



      // Get list of employees
      // For simplicity, we get users from reports and checkins, or query a mock list
      // Let's query reports populate users to extract employee directory
      const employeeMap = new Map();
      reportsRes.data.forEach(r => {
        if (r.employee) employeeMap.set(r.employee._id || r.employee.id, r.employee);
      });
      summaryRes.data.liveCheckins.forEach(c => {
        if (c.employee) employeeMap.set(c.employee._id || c.employee.id, c.employee);
      });
      
      // Fallback: If map empty, insert seeded users
      let employeeList = Array.from(employeeMap.values());
      if (employeeList.length === 0) {
        employeeList = [
          { _id: 'e1', name: 'Alice Green', email: 'employee1@wfh.com', department: 'Engineering' },
          { _id: 'e2', name: 'John Smith', email: 'employee2@wfh.com', department: 'Design' }
        ];
      }
      setEmployees(employeeList);

    } catch (err) {
      console.error('Fetch manager details error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Report Approvals
  const handleOpenReportDialog = (reportId, type) => {
    setActiveReportId(reportId);
    setReportActionType(type);
    setReportFeedback('');
  };

  const handleReportAction = async () => {
    try {
      await axios.put(
        `${API_URL}/api/reports/${activeReportId}/approve`,
        { status: reportActionType, managerFeedback: reportFeedback },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setReports((prev) =>
        prev.map((r) => (r._id === activeReportId ? { ...r, approvalStatus: reportActionType, managerFeedback: reportFeedback } : r))
      );
      setActiveReportId(null);
      fetchData();
    } catch (err) {
      console.error(err.message);
    }
  };

  // Assign Task
  const handleAssignTask = async () => {
    if (!taskName || !taskAssignedTo) return;
    try {
      await axios.post(
        `${API_URL}/api/tasks`,
        {
          taskName,
          description: taskDesc,
          priority: taskPriority,
          assignedTo: taskAssignedTo
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTaskDialogOpen(false);
      setTaskName('');
      setTaskDesc('');
      setTaskPriority('Medium');
      fetchData();
    } catch (err) {
      console.error(err.message);
    }
  };

  // CSV Report Generator Export
  const exportToCSV = () => {
    const today = new Date().toISOString().split('T')[0];
    let records = summary?.liveCheckins || [];
    
    // Apply filters
    if (filterEmployee) {
      records = records.filter(r => r.employee?._id === filterEmployee || r.employee?.id === filterEmployee);
    }
    if (filterDate) {
      records = records.filter(r => r.date === filterDate);
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Employee,Department,Check-In Time,Check-Out Time,Hours Worked,GPS Location\n";

    records.forEach(r => {
      const name = r.employee?.name || 'N/A';
      const dept = r.employee?.department || 'N/A';
      const checkin = r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString() : 'N/A';
      const checkout = r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString() : 'N/A';
      const hours = r.durationHours || 0;
      const addr = (r.location?.address || 'N/A').replace(/,/g, ' ');

      csvContent += `"${name}","${dept}","${checkin}","${checkout}",${hours},"${addr}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `WFH_Attendance_Report_${filterDate || today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Styled PDF Print
  const exportToPDF = () => {
    window.print();
  };

  if (loading || !summary) {
    return (
      <Box sx={{ p: 1 }}>
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <SkeletonCard variant="stat" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <SkeletonCard variant="stat" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <SkeletonCard variant="stat" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <SkeletonCard variant="stat" />
          </Grid>
        </Grid>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <SkeletonCard variant="chart" />
          </Grid>
          <Grid item xs={12} md={4}>
            <SkeletonCard variant="list" />
          </Grid>
        </Grid>
      </Box>
    );
  }

  // Visual chart datasets
  const pieData = [
    { name: 'Online', value: summary.onlineEmployees },
    { name: 'Offline', value: summary.offlineEmployees }
  ];

  const productivityTrendData = summary.weeklyTrend && summary.weeklyTrend.length > 0
    ? summary.weeklyTrend
    : [
        { day: 'Mon', score: 0 },
        { day: 'Tue', score: 0 },
        { day: 'Wed', score: 0 },
        { day: 'Thu', score: 0 },
        { day: 'Fri', score: summary.productivityScore || 0 }
      ];

  const taskCompletionData = [
    { status: 'Pending', count: tasks.filter(t => t.status === 'Pending').length },
    { status: 'In Progress', count: tasks.filter(t => t.status === 'In Progress').length },
    { status: 'Completed', count: tasks.filter(t => t.status === 'Completed').length },
    { status: 'Blocked', count: tasks.filter(t => t.status === 'Blocked').length }
  ];

  const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <Box sx={{ pb: 5 }}>
      {/* Visual Analytics top summary cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        
        {/* Total Employees */}
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              borderRadius: 4, 
              borderLeft: '6px solid', 
              borderLeftColor: 'primary.main',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 12px 30px rgba(0, 0, 0, 0.4)',
                borderColor: 'primary.main'
              }
            }}
          >
            <CardContent sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  Total Employees
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: 'text.primary' }}>
                  <AnimatedCounter value={summary.totalEmployees} />
                </Typography>
              </Box>
              <Box sx={{ width: 48, height: 48, borderRadius: 3, bgcolor: 'rgba(79, 142, 247, 0.15)', color: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TeamIcon sx={{ fontSize: 24 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Online Now */}
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              borderRadius: 4, 
              borderLeft: '6px solid', 
              borderLeftColor: 'success.main',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 12px 30px rgba(0, 0, 0, 0.4)',
                borderColor: 'success.main'
              }
            }}
          >
            <CardContent sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  Online Now
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: 'success.main' }}>
                  <AnimatedCounter value={summary.onlineEmployees} />
                </Typography>
              </Box>
              <Box sx={{ width: 48, height: 48, borderRadius: 3, bgcolor: 'rgba(52, 211, 153, 0.15)', color: 'success.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <DotIcon 
                  sx={{ 
                    fontSize: 20, 
                    animation: 'pulse-dot 2s infinite',
                    '@keyframes pulse-dot': {
                      '0%': { transform: 'scale(0.9)', opacity: 0.6 },
                      '50%': { transform: 'scale(1.2)', opacity: 1 },
                      '100%': { transform: 'scale(0.9)', opacity: 0.6 }
                    }
                  }} 
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Avg Productivity */}
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              borderRadius: 4, 
              borderLeft: '6px solid', 
              borderLeftColor: 'secondary.main',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 12px 30px rgba(0, 0, 0, 0.4)',
                borderColor: 'secondary.main'
              }
            }}
          >
            <CardContent sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  Avg Productivity
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: 'text.primary' }}>
                  <AnimatedCounter value={summary.productivityScore} suffix="%" />
                </Typography>
              </Box>
              <Box sx={{ width: 48, height: 48, borderRadius: 3, bgcolor: 'rgba(167, 139, 250, 0.15)', color: 'secondary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendIcon sx={{ fontSize: 24 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Pending Reports */}
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              borderRadius: 4, 
              borderLeft: '6px solid', 
              borderLeftColor: 'warning.main',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 12px 30px rgba(0, 0, 0, 0.4)',
                borderColor: 'warning.main'
              }
            }}
          >
            <CardContent sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  Pending Reports
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: 'warning.main' }}>
                  <AnimatedCounter value={summary.pendingReportsCount} />
                </Typography>
              </Box>
              <Box sx={{ width: 48, height: 48, borderRadius: 3, bgcolor: 'rgba(251, 191, 36, 0.15)', color: 'warning.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PendingIcon sx={{ fontSize: 24 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

      </Grid>

      {/* Row 2: Analytics Charts */}
      <Grid container spacing={3} sx={{ mb: 4 }} className="no-print">
        <Grid item xs={12} md={4}>
          <Card 
            sx={{ 
              borderRadius: 4, 
              height: 350,
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
              }
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary', mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Live Shift Status
              </Typography>
              <Box sx={{ height: 250, display: 'flex', justifyContent: 'center', position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      <Cell fill="#34d399" /> {/* Online */}
                      <Cell fill={isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'} /> {/* Offline */}
                    </Pie>
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center text overlay */}
                <Box sx={{ position: 'absolute', top: '43%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: 'success.main' }}>
                    {summary.onlineEmployees}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                    Active
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card 
            sx={{ 
              borderRadius: 4, 
              height: 350,
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
              }
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary', mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Weekly Productivity Trend
              </Typography>
              <Box sx={{ height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={productivityTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f8ef7" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#4f8ef7" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={isDarkMode ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.08)"} strokeDasharray="3 3" />
                    <XAxis dataKey="day" stroke={isDarkMode ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.5)"} style={{ fontSize: 11 }} />
                    <YAxis domain={[50, 100]} stroke={isDarkMode ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.5)"} style={{ fontSize: 11 }} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="score" 
                      name="Productivity"
                      stroke="#4f8ef7" 
                      strokeWidth={3} 
                      fillOpacity={1}
                      fill="url(#colorProd)"
                      activeDot={{ r: 8, stroke: isDarkMode ? '#111' : '#fff', strokeWidth: 2 }} 
                      dot={{ stroke: '#4f8ef7', strokeWidth: 2, r: 4, fill: isDarkMode ? '#111' : '#fff' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card 
            sx={{ 
              borderRadius: 4, 
              height: 350,
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
              }
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary', mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Task Completion Distribution
              </Typography>
              <Box sx={{ height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart data={taskCompletionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke={isDarkMode ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.08)"} strokeDasharray="3 3" />
                    <XAxis dataKey="status" stroke={isDarkMode ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.5)"} style={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} stroke={isDarkMode ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.5)"} style={{ fontSize: 11 }} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Tasks" radius={[6, 6, 0, 0]}>
                      {taskCompletionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </RechartsBarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Row 3: Team Attendance table */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <Card sx={{ borderRadius: 4 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }} className="no-print">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ width: 4, height: 24, borderRadius: 2, bgcolor: 'primary.main' }} />
                  <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.015em' }}>Active Attendance Check-Ins</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                  <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel>Filter Employee</InputLabel>
                    <Select
                      value={filterEmployee}
                      label="Filter Employee"
                      onChange={(e) => setFilterEmployee(e.target.value)}
                      sx={{ borderRadius: 2 }}
                    >
                      <MenuItem value="">All Staff</MenuItem>
                      {employees.map(e => (
                        <MenuItem key={e._id} value={e._id}>{e.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <TextField
                    type="date"
                    size="small"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    label="Filter Date"
                    sx={{
                      '& .MuiOutlinedInput-root': { borderRadius: 2 },
                      '& input[type="date"]::-webkit-datetime-edit-text, & input[type="date"]::-webkit-datetime-edit-month-field, & input[type="date"]::-webkit-datetime-edit-day-field, & input[type="date"]::-webkit-datetime-edit-year-field': {
                        color: filterDate ? 'inherit' : 'transparent',
                      }
                    }}
                  />

                  <Button 
                    variant="contained" 
                    size="small" 
                    startIcon={<ExportIcon />} 
                    onClick={exportToCSV}
                    sx={{ py: 1, px: 2, borderRadius: 2 }}
                  >
                    Export CSV
                  </Button>
                  <Button 
                    variant="outlined" 
                    size="small" 
                    onClick={exportToPDF}
                    sx={{ py: 1, px: 2, borderRadius: 2 }}
                  >
                    Print PDF
                  </Button>
                </Box>
              </Box>

              {summary.liveCheckins.length === 0 ? (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 5 }}>
                  No employees checked in today.
                </Typography>
              ) : (
                <TableContainer sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                  <Table>
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Employee</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Department</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Check-In Time</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Check-Out Time / Status</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Hours Worked</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>GPS Location</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }} align="center" className="no-print">Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {summary.liveCheckins.map((rec) => {
                        const initials = getInitials(rec.employee?.name);
                        return (
                          <TableRow 
                            key={rec._id || rec.id}
                            sx={{ '&:hover': { bgcolor: 'action.hover' } }}
                          >
                            <TableCell sx={{ fontWeight: 600 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Avatar 
                                  sx={{ 
                                    width: 32, 
                                    height: 32, 
                                    fontSize: '0.85rem', 
                                    fontWeight: 700, 
                                    bgcolor: 'primary.main', 
                                    color: 'primary.contrastText' 
                                  }}
                                >
                                  {initials}
                                </Avatar>
                                <Box>
                                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                    {rec.employee?.name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                    {rec.employee?.email}
                                  </Typography>
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={rec.employee?.department || 'Staff'} 
                                size="small" 
                                variant="outlined"
                                sx={{ borderRadius: 1.5, fontSize: '0.75rem' }} 
                              />
                            </TableCell>
                            <TableCell sx={{ fontWeight: 500 }}>
                              {new Date(rec.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </TableCell>
                            <TableCell>
                              {rec.checkOutTime ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {new Date(rec.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </Typography>
                                  <Chip label="Checked Out" size="small" variant="outlined" sx={{ borderRadius: 1.5, fontSize: '0.7rem' }} />
                                </Box>
                              ) : rec.onBreak ? (
                                <Chip 
                                  label={`Break: ${rec.currentBreakType}`} 
                                  color="warning" 
                                  size="small" 
                                  sx={{ borderRadius: 1.5, fontWeight: 700 }}
                                />
                              ) : (
                                <Chip 
                                  label="Working Live" 
                                  color="success" 
                                  size="small" 
                                  sx={{ 
                                    borderRadius: 1.5, 
                                    fontWeight: 700,
                                    animation: 'pulse-working 2s infinite',
                                    '@keyframes pulse-working': {
                                      '0%': { opacity: 0.8 },
                                      '50%': { opacity: 1 },
                                      '100%': { opacity: 0.8 }
                                    }
                                  }} 
                                />
                              )}
                            </TableCell>
                            <TableCell sx={{ fontWeight: 700, color: 'text.primary' }}>
                              {rec.durationHours || '--'} hrs
                            </TableCell>
                            <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              <MuiTooltip title={rec.location?.address || 'N/A'}>
                                <span>{rec.location?.address || 'N/A'}</span>
                              </MuiTooltip>
                            </TableCell>
                            <TableCell align="center" className="no-print">
                              <IconButton 
                                color="primary" 
                                onClick={() => navigate(`/manager/monitoring/${rec.employee?._id || rec.employee?.id}`)}
                                sx={{ bgcolor: 'rgba(79, 142, 247, 0.1)', '&:hover': { bgcolor: 'rgba(79, 142, 247, 0.2)' } }}
                              >
                                <ViewIcon sx={{ fontSize: 20 }} />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Row 4: Tasks Panel & Daily Reports approvals */}
      <Grid container spacing={3} className="no-print">
        {/* Task assign widget */}
        <Grid item xs={12} md={5}>
          <Card sx={{ borderRadius: 4, height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2.5, alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ width: 4, height: 24, borderRadius: 2, bgcolor: 'secondary.main' }} />
                  <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.015em' }}>Task Distribution</Typography>
                </Box>
                <Button 
                  variant="outlined" 
                  size="small" 
                  startIcon={<TaskIcon />} 
                  onClick={() => setTaskDialogOpen(true)}
                  sx={{ borderRadius: 2 }}
                >
                  Assign Task
                </Button>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              <List sx={{ maxHeight: 320, overflowY: 'auto', pr: 0.5 }}>
                {tasks.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 5 }}>
                    No tasks assigned yet.
                  </Typography>
                ) : (
                  tasks.slice(0, 5).map((task) => {
                    const taskProgress = task.progress !== undefined ? task.progress : 0;
                    return (
                      <Paper 
                        key={task._id} 
                        variant="outlined" 
                        sx={{ 
                          p: 2, 
                          mb: 2, 
                          borderRadius: 3,
                          borderColor: 'divider',
                          bgcolor: 'background.paper',
                          transition: 'border-color 0.2s',
                          '&:hover': { borderColor: 'primary.main' }
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{task.taskName}</Typography>
                          <Chip 
                            label={task.status} 
                            size="small" 
                            color={task.status === 'Completed' ? 'success' : task.status === 'Blocked' ? 'error' : task.status === 'In Progress' ? 'primary' : 'default'} 
                            sx={{ borderRadius: 1.5, fontSize: '0.65rem', height: 20 }}
                          />
                        </Box>
                        
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5, fontWeight: 500 }}>
                          Assigned to: <strong>{task.assignedTo?.name || 'Unassigned'}</strong>
                        </Typography>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <LinearProgress 
                            variant="determinate" 
                            value={taskProgress} 
                            sx={{ flexGrow: 1, height: 4, borderRadius: 2 }}
                          />
                          <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 28, textAlign: 'right' }}>
                            {taskProgress}%
                          </Typography>
                        </Box>
                      </Paper>
                    );
                  })
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Pending daily report review section */}
        <Grid item xs={12} md={7}>
          <Card sx={{ borderRadius: 4, height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                <Box sx={{ width: 4, height: 24, borderRadius: 2, bgcolor: 'warning.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.015em', mb: 0 }}>
                  Pending Daily Work Reports
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />

              <Box sx={{ maxHeight: 320, overflowY: 'auto', pr: 0.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {reports.filter(r => r.approvalStatus === 'Pending').length === 0 ? (
                  <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 6 }}>
                    No pending report reviews. All caught up!
                  </Typography>
                ) : (
                   reports.filter(r => r.approvalStatus === 'Pending').map((rep) => {
                    if (pendingRejects[rep._id || rep.id] !== undefined) {
                      const timeLeft = pendingRejects[rep._id || rep.id];
                      const progressVal = (timeLeft / 5) * 100;
                      return (
                        <Paper
                          key={rep._id || rep.id}
                          variant="outlined"
                          sx={{
                            p: 2,
                            borderRadius: 3,
                            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(239, 68, 68, 0.04) 100%)',
                            borderColor: 'rgba(239, 68, 68, 0.3)',
                            boxShadow: '0 4px 20px rgba(239, 68, 68, 0.05)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 1.5
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                            <Box>
                              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#f87171' }}>
                                Rejecting {rep.employee?.name}'s report
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Rejection triggers in <strong>{timeLeft}s</strong>...
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Button
                                variant="contained"
                                color="inherit"
                                size="small"
                                startIcon={<UndoIcon />}
                                onClick={() => handleUndoReject(rep._id || rep.id)}
                                sx={{
                                  py: 0.25,
                                  px: 1,
                                  borderRadius: 1.5,
                                  fontSize: '0.7rem',
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
                                sx={{ py: 0.25, px: 1, borderRadius: 1.5, fontSize: '0.7rem' }}
                              >
                                Feedback
                              </Button>
                              <Button
                                variant="contained"
                                color="error"
                                size="small"
                                onClick={() => handleInstantReject(rep._id || rep.id)}
                                sx={{ py: 0.25, px: 1, borderRadius: 1.5, fontSize: '0.7rem' }}
                              >
                                Now
                              </Button>
                            </Box>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={progressVal}
                            color="error"
                            sx={{
                              height: 3,
                              borderRadius: 1.5,
                              bgcolor: 'rgba(239, 68, 68, 0.1)',
                              '& .MuiLinearProgress-bar': {
                                transition: 'transform 1s linear'
                              }
                            }}
                          />
                        </Paper>
                      );
                    }

                    const initials = getInitials(rep.employee?.name);
                    return (
                      <Paper 
                        key={rep._id || rep.id} 
                        variant="outlined" 
                        sx={{ 
                          p: 2, 
                          borderRadius: 3,
                          borderColor: 'divider',
                          bgcolor: 'background.paper',
                          transition: 'border-color 0.2s',
                          '&:hover': { borderColor: 'primary.main' }
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, alignItems: 'flex-start', flexWrap: 'wrap', gap: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{ width: 32, height: 32, fontSize: '0.85rem', fontWeight: 700, bgcolor: 'secondary.main', color: 'primary.contrastText' }}>
                              {initials}
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                {rep.employee?.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                Report for {rep.date}
                              </Typography>
                            </Box>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                              variant="contained"
                              color="success"
                              size="small"
                              startIcon={<ApproveIcon />}
                              onClick={() => handleOpenReportDialog(rep._id || rep.id, 'Approved')}
                              sx={{ py: 0.5, borderRadius: 1.5, fontSize: '0.75rem' }}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="contained"
                              color="error"
                              size="small"
                              startIcon={<RejectIcon />}
                              onClick={() => handleRejectClick(rep._id || rep.id)}
                              sx={{ py: 0.5, borderRadius: 1.5, fontSize: '0.75rem' }}
                            >
                              Reject
                            </Button>
                          </Box>
                        </Box>
                        
                        <Box sx={{ pl: { xs: 0, sm: 6 }, mt: { xs: 1, sm: 0 } }}>
                          <Typography variant="body2" color="text.primary" sx={{ mb: 1, fontWeight: 500 }}>
                            <strong>Completed:</strong> {rep.tasksCompleted?.join(', ') || 'None'}
                          </Typography>
                          {rep.tasksInProgress?.length > 0 && (
                            <Typography variant="body2" color="text.primary" sx={{ mb: 1, fontWeight: 500 }}>
                              <strong>In Progress:</strong> {rep.tasksInProgress?.join(', ')}
                            </Typography>
                          )}
                          <Typography variant="caption" display="block" color="text.secondary" sx={{ fontWeight: 600 }}>
                            ⏱️ Total Time Claimed: <strong>{rep.totalHoursWorked} hrs</strong>
                          </Typography>
                        </Box>
                      </Paper>
                    );
                  })
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>



      {/* Task Assignment Dialog Modal */}
      <Dialog open={taskDialogOpen} onClose={() => setTaskDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Assign Team Task</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          <TextField
            label="Task Name"
            fullWidth
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            required
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
              value={taskAssignedTo}
              label="Assign To Employee"
              onChange={(e) => setTaskAssignedTo(e.target.value)}
            >
              {employees.map(e => (
                <MenuItem key={e._id || e.id} value={e._id || e.id}>{e.name} ({e.department})</MenuItem>
              ))}
            </Select>
          </FormControl>

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
          <Button onClick={handleAssignTask} variant="contained" color="primary">Assign Task</Button>
        </DialogActions>
      </Dialog>

      {/* Report Review Feedback Dialog */}
      <Dialog open={activeReportId !== null} onClose={() => setActiveReportId(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Report Decision Feedback</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Provide comments or action details to explain why this report is {reportActionType?.toLowerCase()}:
          </Typography>
          <TextField
            label="Manager Comments"
            multiline
            rows={3}
            fullWidth
            value={reportFeedback}
            onChange={(e) => setReportFeedback(e.target.value)}
            placeholder="Add review suggestions..."
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setActiveReportId(null)} color="inherit">Cancel</Button>
          <Button onClick={handleReportAction} variant="contained" color={reportActionType === 'Approved' ? 'success' : 'error'}>
            Confirm {reportActionType}
          </Button>
        </DialogActions>
      </Dialog>


    </Box>
  );
}

export default ManagerDashboard;
