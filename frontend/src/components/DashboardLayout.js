// frontend/src/components/DashboardLayout.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { io } from 'socket.io-client';
import axios from 'axios';
import {
  AppBar,
  Box,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
  Badge,
  Popover,
  Avatar,
  Snackbar,
  Alert,
  Tooltip,
  Slide
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Assignment as TaskIcon,
  Assessment as ReportIcon,
  History as HistoryIcon,
  Monitor as MonitoringIcon,
  Notifications as NotificationIcon,
  Brightness4 as DarkIcon,
  Brightness7 as LightIcon,
  ExitToApp as LogoutIcon,
  AccountCircle as ProfileIcon,
  Group as EmployeeListIcon,
  SupervisorAccount as AdminListIcon,
  Settings as SettingsIcon,
  ArrowBack as BackIcon,
  ArrowForward as ForwardIcon,
  Warning as AlertIcon,
  Timer as TimerIcon
} from '@mui/icons-material';
import { logout } from '../redux/store';
import DeveloperSignature from './DeveloperSignature';

const drawerWidth = 260;
const collapsedDrawerWidth = 64;
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function DashboardLayout({ children, isDarkMode, setIsDarkMode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user, token } = useSelector((state) => state.auth);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(false);

  const isSidebarExpanded = sidebarOpen || sidebarPinned;
  const [anchorElProfile, setAnchorElProfile] = useState(null);
  const [anchorElNotifications, setAnchorElNotifications] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });



  // Toggle mobile drawer
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // Socket Connection and Notifications Fetching
  useEffect(() => {
    if (!token || !user) return;

    // Fetch initial notifications
    const fetchNotifications = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/notifications`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setNotifications(res.data);
      } catch (err) {
        console.error('Failed to load notifications:', err.message);
      }
    };
    fetchNotifications();

    // Connect socket
    const socket = io(API_URL);
    socket.emit('register', user.id);

    socket.on('notification', (newNotif) => {
      setNotifications((prev) => [newNotif, ...prev]);
      setToast({ open: true, message: newNotif.message, severity: 'info' });
    });

    return () => {
      socket.disconnect();
    };
  }, [token, user]);

  // Read notifications
  const handleNotificationClick = async (notif) => {
    if (notif.isRead) return;
    try {
      await axios.put(`${API_URL}/api/notifications/${notif.id || notif._id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications((prev) =>
        prev.map((n) => (n._id === notif._id || n.id === notif.id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error(err.message);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const unread = notifications.filter(n => !n.isRead);
      for (let notif of unread) {
        await axios.put(`${API_URL}/api/notifications/${notif.id || notif._id}/read`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      setNotifications((prev) => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err.message);
    }
  };

  // Navigation Links configuration
  const employeeLinks = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'My Tasks', icon: <TaskIcon />, path: '/tasks' },
    { text: 'Work Reports', icon: <ReportIcon />, path: '/reports' },
    { text: 'Attendance Logs', icon: <HistoryIcon />, path: '/attendance-logs' }
  ];

  const managerLinks = [
    { text: 'Team Dashboard', icon: <DashboardIcon />, path: '/manager/dashboard' },
    { text: 'Employee List', icon: <EmployeeListIcon />, path: '/manager/employees' },
    { text: 'Admin List', icon: <AdminListIcon />, path: '/manager/admins' },
    { text: 'Super Admin List', icon: <AdminListIcon />, path: '/manager/superadmins' },
    { text: 'Task Management', icon: <TaskIcon />, path: '/manager/tasks' },
    { text: 'Work Reports', icon: <ReportIcon />, path: '/manager/reports' },
    { text: 'Employee Monitor', icon: <MonitoringIcon />, path: '/manager/monitoring' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/manager/settings' },
    { isDivider: true },
    { text: 'My Tracker', icon: <TimerIcon />, path: '/dashboard' },
    { text: 'My Tasks', icon: <TaskIcon />, path: '/tasks' },
    { text: 'My Attendance', icon: <HistoryIcon />, path: '/attendance-logs' }
  ];

  const systemAdminLinks = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/system-admin' }
  ];

  const links = user?.role === 'SystemAdmin'
    ? systemAdminLinks
    : (user?.role === 'Manager' || user?.role === 'SuperAdmin')
      ? managerLinks.filter(link => {
          if (link.text === 'Admin List') return user?.role === 'SuperAdmin';
          if (link.text === 'Super Admin List') return user?.role === 'SuperAdmin';
          if (link.text === 'Settings') return user?.role === 'SuperAdmin';
          return true;
        })
      : employeeLinks;

  // Render navigation menu
  const drawerContent = (expanded) => (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Logo / Header */}
      <Toolbar sx={{
        display: 'flex',
        flexDirection: expanded ? 'column' : 'row',
        alignItems: expanded ? 'flex-start' : 'center',
        justifyContent: expanded ? 'flex-start' : 'center',
        px: expanded ? 3 : 1,
        py: expanded ? 2.5 : 1.5,
        minHeight: '64px !important',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: expanded ? 1 : 0 }}>
          <Tooltip title={expanded ? '' : 'WorkforceOS'} placement="right">
            <DashboardIcon
              onClick={() => setSidebarPinned(p => !p)}
              sx={{
                color: isDarkMode ? '#4f8ef7' : '#0038a8',
                fontSize: '1.6rem',
                cursor: 'pointer',
                transition: 'transform 0.3s',
                '&:hover': { transform: 'rotate(20deg)' }
              }}
            />
          </Tooltip>
          <Typography variant="h6" sx={{
            fontWeight: 800,
            fontSize: '1.1rem',
            fontFamily: "'Inter', sans-serif",
            letterSpacing: '-0.025em',
            background: isDarkMode
              ? 'linear-gradient(135deg, #ffffff 0%, #a0a0a0 100%)'
              : 'linear-gradient(135deg, #0038a8 0%, #002266 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            display: 'inline-block',
            whiteSpace: 'nowrap',
            opacity: expanded ? 1 : 0,
            width: expanded ? 'auto' : 0,
            overflow: 'hidden',
            transition: 'opacity 0.25s, width 0.3s'
          }}>
            WorkforceOS
          </Typography>
        </Box>
        {expanded && (
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, mt: 0.2, pl: 4, whiteSpace: 'nowrap' }}>
            Enterprise Management
          </Typography>
        )}
      </Toolbar>
      <Divider />

      {/* Nav Links */}
      <List sx={{ px: expanded ? 1 : 0.5, py: 2, flexGrow: 1 }}>
        {links.map((link, index) => {
          if (link.isDivider) {
            return <Divider key={`div-${index}`} sx={{ my: 1.5, borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }} />;
          }
          const isActive = location.pathname === link.path;
          return (
            <ListItem key={link.text} disablePadding sx={{ mb: 0.5 }}>
              <Tooltip title={expanded ? '' : link.text} placement="right">
                <ListItemButton
                  onClick={() => {
                    navigate(link.path);
                    setMobileOpen(false);
                  }}
                  sx={{
                    borderRadius: '12px',
                    mx: expanded ? 1.5 : 0.5,
                    px: expanded ? 2 : 1,
                    py: 1.25,
                    justifyContent: expanded ? 'flex-start' : 'center',
                    position: 'relative',
                    background: isActive
                      ? isDarkMode
                        ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%)'
                        : 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(16, 185, 129, 0.04) 100%)'
                      : 'transparent',
                    color: isActive ? '#10b981' : 'text.primary',
                    border: isActive && isDarkMode
                      ? '1px solid rgba(16, 185, 129, 0.25)'
                      : isActive
                        ? '1px solid rgba(16, 185, 129, 0.15)'
                        : '1px solid transparent',
                    boxShadow: isActive
                      ? isDarkMode
                        ? '0 4px 20px rgba(16, 185, 129, 0.12)'
                        : '0 4px 15px rgba(16, 185, 129, 0.08)'
                      : 'none',
                    overflow: 'hidden',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&::before': isActive ? {
                      content: '""',
                      position: 'absolute',
                      left: 0,
                      top: '20%',
                      height: '60%',
                      width: 4,
                      borderRadius: '0 4px 4px 0',
                      backgroundColor: '#10b981'
                    } : null,
                    '&:hover': {
                      background: isActive
                        ? isDarkMode
                          ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.22) 0%, rgba(16, 185, 129, 0.1) 100%)'
                          : 'linear-gradient(135deg, rgba(16, 185, 129, 0.18) 0%, rgba(16, 185, 129, 0.08) 100%)'
                        : isDarkMode
                          ? 'rgba(16, 185, 129, 0.06)'
                          : 'action.hover',
                      transform: isActive ? 'none' : (expanded ? 'translateX(4px)' : 'scale(1.1)')
                    }
                  }}
                >
                  <ListItemIcon sx={{
                    color: isActive ? '#10b981' : 'text.secondary',
                    minWidth: expanded ? 40 : 'unset',
                    transition: 'color 0.25s, min-width 0.3s'
                  }}>
                    {link.icon}
                  </ListItemIcon>
                  {expanded && (
                    <ListItemText
                      primary={link.text}
                      primaryTypographyProps={{
                        fontSize: '0.9rem',
                        fontWeight: isActive ? 700 : 500,
                        letterSpacing: '-0.01em',
                        whiteSpace: 'nowrap'
                      }}
                    />
                  )}
                </ListItemButton>
              </Tooltip>
            </ListItem>
          );
        })}
      </List>

      <Divider />

      {/* Profile & Logout */}
      <List sx={{ px: expanded ? 1 : 0.5, py: 1 }}>
        <ListItem disablePadding>
          <Tooltip title={expanded ? '' : 'My Profile'} placement="right">
            <ListItemButton
              onClick={() => navigate('/profile')}
              sx={{
                borderRadius: 2,
                justifyContent: expanded ? 'flex-start' : 'center',
                '&:hover': isDarkMode ? { bgcolor: 'rgba(79, 142, 247, 0.08)' } : {}
              }}
            >
              <ListItemIcon sx={{ minWidth: expanded ? 40 : 'unset' }}><ProfileIcon /></ListItemIcon>
              {expanded && <ListItemText primary="My Profile" />}
            </ListItemButton>
          </Tooltip>
        </ListItem>
        <ListItem disablePadding>
          <Tooltip title={expanded ? '' : 'Logout'} placement="right">
            <ListItemButton
              onClick={() => dispatch(logout())}
              sx={{
                borderRadius: 2,
                color: 'error.main',
                justifyContent: expanded ? 'flex-start' : 'center',
                '&:hover': isDarkMode ? { bgcolor: 'rgba(248, 113, 113, 0.08)' } : {}
              }}
            >
              <ListItemIcon sx={{ color: 'error.main', minWidth: expanded ? 40 : 'unset' }}><LogoutIcon /></ListItemIcon>
              {expanded && <ListItemText primary="Logout" />}
            </ListItemButton>
          </Tooltip>
        </ListItem>
      </List>

      <Divider />
      {expanded && (
        <Box sx={{ py: 2, px: 2, display: 'flex', justifyContent: 'center' }}>
          <DeveloperSignature />
        </Box>
      )}
    </Box>
  );

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const isDashboardPage = location.pathname === '/dashboard' || location.pathname === '/manager/dashboard';

  const strokeColor = '#10b981';
  const lineOpacity = isDarkMode ? 0.08 : 0.06;
  const globeOpacity = isDarkMode ? 0.10 : 0.08;
  const nodeOpacity = isDarkMode ? 0.30 : 0.20;
  const iconColor = '#10b981';
  const iconOpacity = isDarkMode ? 0.80 : 0.70;


  return (
    <Box 
      sx={{ 
        display: 'flex', 
        width: '100%', 
        minHeight: '100vh', 
        background: !isDashboardPage
          ? (isDarkMode ? '#060913' : '#f8fafc')
          : (isDarkMode 
              ? 'linear-gradient(135deg, #060913 0%, #070b14 50%, #090d16 100%)'
              : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)'),
        position: 'relative',
        color: 'text.primary'
      }}
    >
      <CssBaseline />

      {/* Premium Static WFH Global Network Background */}
      {isDashboardPage && (
        <Box 
          sx={{ 
            position: 'fixed', 
            width: '100%', 
            height: '100%', 
            top: 0, 
            left: 0, 
            zIndex: 0, 
            overflow: 'hidden', 
            pointerEvents: 'none' 
          }}
        >
        {/* Ambient Static Glowing Orbs */}
        <Box
          sx={{
            position: 'absolute',
            width: '60vw',
            height: '60vw',
            top: '-20vw',
            left: '-10vw',
            borderRadius: '50%',
            background: isDarkMode 
              ? 'radial-gradient(circle, rgba(16, 185, 129, 0.06) 0%, rgba(16, 185, 129, 0) 70%)'
              : 'radial-gradient(circle, rgba(16, 185, 129, 0.04) 0%, rgba(16, 185, 129, 0) 70%)',
            filter: 'blur(80px)'
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            width: '50vw',
            height: '50vw',
            bottom: '-10vw',
            right: '-10vw',
            borderRadius: '50%',
            background: isDarkMode
              ? 'radial-gradient(circle, rgba(55, 65, 72, 0.12) 0%, rgba(55, 65, 72, 0) 70%)'
              : 'radial-gradient(circle, rgba(16, 185, 129, 0.03) 0%, rgba(16, 185, 129, 0) 70%)',
            filter: 'blur(100px)'
          }}
        />

        {/* Full-Screen Premium Global Network Constellation */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 0
          }}
        >
          <svg width="100%" height="100%" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="staticNeonGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComponentTransfer in="blur" result="glow">
                  <feFuncA type="linear" slope="0.6"/>
                </feComponentTransfer>
                <feMerge>
                  <feMergeNode in="glow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Globe Group (Rotated slightly for elegant tilting) */}
            <g transform="rotate(-15, 1450, 540)">
              {/* Outer boundary circle */}
              <circle cx="1450" cy="540" r="380" stroke={strokeColor} strokeWidth="1.2" opacity={globeOpacity} />
              
              {/* Longitude Ellipses */}
              <ellipse cx="1450" cy="540" rx="90" ry="380" stroke={strokeColor} strokeWidth="1.2" opacity={globeOpacity} />
              <ellipse cx="1450" cy="540" rx="190" ry="380" stroke={strokeColor} strokeWidth="1.2" opacity={globeOpacity} />
              <ellipse cx="1450" cy="540" rx="280" ry="380" stroke={strokeColor} strokeWidth="1.2" opacity={globeOpacity} />
              
              {/* Latitude Ellipses */}
              <ellipse cx="1450" cy="540" rx="380" ry="80" stroke={strokeColor} strokeWidth="1.2" opacity={globeOpacity} />
              <ellipse cx="1450" cy="540" rx="380" ry="180" stroke={strokeColor} strokeWidth="1.2" opacity={globeOpacity} />
              <ellipse cx="1450" cy="540" rx="380" ry="270" stroke={strokeColor} strokeWidth="1.2" opacity={globeOpacity} />
              
              {/* Small grid circles/points on the globe intersections */}
              <g fill={strokeColor} opacity={nodeOpacity}>
                <circle cx="1450" cy="160" r="3" />
                <circle cx="1450" cy="920" r="3" />
                <circle cx="1070" cy="540" r="3" />
                <circle cx="1830" cy="540" r="3" />
                <circle cx="1360" cy="250" r="3" />
                <circle cx="1540" cy="250" r="3" />
                <circle cx="1260" cy="360" r="3" />
                <circle cx="1640" cy="360" r="3" />
                <circle cx="1170" cy="540" r="3" />
                <circle cx="1730" cy="540" r="3" />
              </g>
            </g>

            {/* Connection lines representing the global network constellation */}
            <g stroke={strokeColor} strokeWidth="1.3" opacity={lineOpacity} fill="none">
              {/* Globe to Near-Globe */}
              <line x1="1350" y1="420" x2="1150" y2="150" />
              <line x1="1520" y1="360" x2="1700" y2="220" />
              <line x1="1220" y1="560" x2="1050" y2="320" />
              <line x1="1320" y1="590" x2="920" y2="650" />
              <line x1="1400" y1="680" x2="1250" y2="850" />
              <line x1="1620" y1="600" x2="1780" y2="780" />
              
              {/* Constellation lines spanning the screen */}
              <line x1="1150" y1="150" x2="850" y2="200" />
              <line x1="1700" y1="220" x2="1780" y2="780" />
              <line x1="850" y1="200" x2="450" y2="280" />
              <line x1="850" y1="200" x2="1050" y2="320" />
              <line x1="450" y1="280" x2="120" y2="220" />
              <line x1="450" y1="280" x2="680" y2="480" />
              <line x1="120" y1="220" x2="250" y2="540" />
              <line x1="250" y1="540" x2="680" y2="480" />
              <line x1="250" y1="540" x2="320" y2="720" />
              <line x1="250" y1="540" x2="180" y2="850" />
              <line x1="180" y1="850" x2="320" y2="720" />
              <line x1="180" y1="850" x2="550" y2="780" />
              <line x1="320" y1="720" x2="550" y2="780" />
              <line x1="320" y1="720" x2="920" y2="650" />
              <line x1="550" y1="780" x2="780" y2="880" />
              <line x1="780" y1="880" x2="920" y2="650" />
              <line x1="780" y1="880" x2="1250" y2="850" />
              <line x1="1250" y1="850" x2="920" y2="650" />
              <line x1="920" y1="650" x2="1050" y2="320" />
              <line x1="1050" y1="320" x2="680" y2="480" />
              <line x1="680" y1="480" x2="920" y2="650" />
              <line x1="1050" y1="320" x2="1150" y2="150" />
            </g>

            {/* Glowing Nodes */}
            <g fill={strokeColor} opacity={nodeOpacity} filter="url(#staticNeonGlow)">
              <circle cx="1150" cy="150" r="6" />
              <circle cx="1700" cy="220" r="6" />
              <circle cx="1050" cy="320" r="6" />
              <circle cx="920" cy="650" r="6" />
              <circle cx="1250" cy="850" r="6" />
              <circle cx="1780" cy="780" r="6" />
              <circle cx="850" cy="200" r="6" />
              <circle cx="450" cy="280" r="6" />
              <circle cx="120" cy="220" r="6" />
              <circle cx="250" cy="540" r="6" />
              <circle cx="320" cy="720" r="6" />
              <circle cx="180" cy="850" r="6" />
              <circle cx="550" cy="780" r="6" />
              <circle cx="780" cy="880" r="6" />
              <circle cx="680" cy="480" r="6" />
            </g>

            {/* Stylized Vector WFH Icons at selected nodes */}
            <g stroke={iconColor} strokeWidth="1.5" fill="none" opacity={iconOpacity} filter="url(#staticNeonGlow)">
              
              {/* Clock at Node N3 (850, 200) */}
              <g transform="translate(850, 200)">
                <circle cx="0" cy="0" r="16" />
                <path d="M0,-8 L0,0 L5,3" strokeLinecap="round" />
              </g>

              {/* Laptop at Node N7 (250, 540) */}
              <g transform="translate(250, 540)">
                <rect x="-10" y="-12" width="20" height="14" rx="2" />
                <path d="M-14,5 L14,5 L10,9 L-10,9 Z" />
                <circle cx="0" cy="0" r="17" strokeWidth="0.8" opacity="0.5" />
              </g>

              {/* Home at Node N6 (450, 280) */}
              <g transform="translate(450, 280)">
                <path d="M-8,6 L-8,-3 L0,-10 L8,-3 L8,6 Z" />
                <path d="M-3,6 L-3,1 L3,1 L3,6" />
                <circle cx="0" cy="0" r="16" strokeWidth="0.8" opacity="0.5" />
              </g>

              {/* Wifi at Node N2 (920, 650) */}
              <g transform="translate(920, 650)">
                <circle cx="0" cy="0" r="16" strokeWidth="0.8" opacity="0.5" />
                <circle cx="0" cy="5" r="2" fill={iconColor} />
                <path d="M-5,1 A7,7 0 0,1 5,1" strokeLinecap="round" />
                <path d="M-9,-3 A12,12 0 0,1 9,-3" strokeLinecap="round" />
              </g>

              {/* User Profile at Node N10 (320, 720) */}
              <g transform="translate(320, 720)">
                <circle cx="0" cy="0" r="16" />
                <circle cx="0" cy="-3" r="4" />
                <path d="M-8,7 C-8,3 -4,2 0,2 C4,2 8,3 8,7" />
              </g>

              {/* Checkmark at Node N12 (1250, 850) */}
              <g transform="translate(1250, 850)">
                <circle cx="0" cy="0" r="16" />
                <path d="M-6,0 L-2,4 L6,-4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </g>

              {/* Home at Node N13 (1150, 150) */}
              <g transform="translate(1150, 150)">
                <path d="M-7,5 L-7,-3 L0,-9 L7,-3 L7,5 Z" />
                <path d="M-2,5 L-2,1 L2,1 L2,5" />
                <circle cx="0" cy="0" r="15" strokeWidth="0.8" opacity="0.5" />
              </g>

              {/* Clock at Node N15 (1780, 780) */}
              <g transform="translate(1780, 780)">
                <circle cx="0" cy="0" r="16" />
                <path d="M0,-8 L0,0 L5,2" strokeLinecap="round" />
              </g>
            </g>
          </svg>
        </Box>
      </Box>
      )}

      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { sm: `calc(100% - ${isSidebarExpanded ? drawerWidth : collapsedDrawerWidth}px)` },
          ml: { sm: `${isSidebarExpanded ? drawerWidth : collapsedDrawerWidth}px` },
          top: 0,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: isDarkMode ? 'rgba(21, 27, 31, 0.88)' : 'rgba(255, 255, 255, 0.88)',
          backdropFilter: 'none',
          WebkitBackdropFilter: 'none',
          color: 'text.primary',
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { sm: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
            <IconButton
              onClick={() => navigate(-1)}
              color="inherit"
              sx={{ mr: 0.5 }}
              size="small"
              title="Go Back"
            >
              <BackIcon fontSize="small" />
            </IconButton>
            <IconButton
              onClick={() => navigate(1)}
              color="inherit"
              sx={{ mr: 2 }}
              size="small"
              title="Go Forward"
            >
              <ForwardIcon fontSize="small" />
            </IconButton>
            <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 700 }}>
              {links.find((l) => l.path === location.pathname)?.text || 'WFH Tracking'}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>

            {/* Dark Mode toggle */}
            <Tooltip title="Toggle Theme">
              <IconButton color="inherit" onClick={() => setIsDarkMode(!isDarkMode)}>
                {isDarkMode ? <LightIcon /> : <DarkIcon />}
              </IconButton>
            </Tooltip>

            {/* Notifications Popover Toggle */}
            <Tooltip title="Notifications">
              <IconButton color="inherit" onClick={(e) => setAnchorElNotifications(e.currentTarget)}>
                <Badge badgeContent={unreadCount} color="error">
                  <NotificationIcon />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* Profile Avatar Click */}
            <IconButton onClick={(e) => setAnchorElProfile(e.currentTarget)} sx={{ p: 0, ml: 1 }}>
              <Badge
                overlap="circular"
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                variant="dot"
                sx={{
                  '& .MuiBadge-badge': {
                    backgroundColor: '#10b981',
                    color: '#10b981',
                    width: 11,
                    height: 11,
                    borderRadius: '50%',
                    boxShadow: (theme) => `0 0 0 2px ${theme.palette.background.paper}`,
                    '&::after': {
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      animation: 'pulse-ring 1.2s infinite ease-in-out',
                      border: '1px solid currentColor',
                      content: '""',
                    },
                  },
                }}
              >
                <Avatar
                  src={user?.profilePic || ''}
                  alt={user?.name}
                  sx={{ 
                    width: 40, 
                    height: 40, 
                    bgcolor: 'primary.main',
                    border: '2px solid rgba(16, 185, 129, 0.2)',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
                  }}
                >
                  {user?.name?.charAt(0)}
                </Avatar>
              </Badge>
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Notifications Popover Content */}
      <Popover
        open={Boolean(anchorElNotifications)}
        anchorEl={anchorElNotifications}
        onClose={() => setAnchorElNotifications(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { width: 320, maxHeight: 400, mt: 1.5 } }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Notifications</Typography>
          {unreadCount > 0 && (
            <Typography
              variant="caption"
              color="primary"
              sx={{ cursor: 'pointer', fontWeight: 600 }}
              onClick={handleMarkAllRead}
            >
              Mark all as read
            </Typography>
          )}
        </Box>
        <Divider />
        <List sx={{ p: 0, overflowY: 'auto', maxHeight: 300 }}>
          {notifications.length === 0 ? (
            <ListItem sx={{ py: 3, justifyContent: 'center' }}>
              <Typography variant="body2" color="text.secondary">No notifications yet</Typography>
            </ListItem>
          ) : (
            notifications.map((notif) => {
              const getNotifIcon = (type) => {
                const style = { fontSize: '1.1rem' };
                switch (type?.toLowerCase()) {
                   case 'task':
                    return <TaskIcon sx={{ ...style, color: '#10b981' }} />;
                  case 'attendance':
                  case 'break':
                  case 'checkin':
                    return <HistoryIcon sx={{ ...style, color: '#10b981' }} />;
                  case 'report':
                    return <ReportIcon sx={{ ...style, color: '#f59e0b' }} />;
                  case 'alert':
                    return <AlertIcon sx={{ ...style, color: '#ef4444' }} />;
                  default:
                    return <NotificationIcon sx={{ ...style, color: '#6b7280' }} />;
                }
              };

              const getNotifBg = (type, isRead) => {
                if (isRead) return 'action.hover';
                switch (type?.toLowerCase()) {
                  case 'task': return 'rgba(16, 185, 129, 0.08)';
                  case 'attendance':
                  case 'break':
                  case 'checkin': return 'rgba(16, 185, 129, 0.08)';
                  case 'report': return 'rgba(245, 158, 11, 0.08)';
                  case 'alert': return 'rgba(239, 68, 68, 0.08)';
                  default: return 'rgba(16, 185, 129, 0.08)';
                }
              };

              return (
                <ListItem
                  key={notif.id || notif._id}
                  disablePadding
                  divider
                  onClick={() => handleNotificationClick(notif)}
                  sx={{
                    bgcolor: notif.isRead ? 'transparent' : 'action.selected',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                >
                  <ListItemButton sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5, px: 2 }}>
                    <Box sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 36,
                      height: 36,
                      borderRadius: '10px',
                      bgcolor: getNotifBg(notif.type, notif.isRead),
                      flexShrink: 0
                    }}>
                      {getNotifIcon(notif.type)}
                    </Box>
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography variant="body2" color="text.primary" sx={{ 
                        fontWeight: notif.isRead ? 400 : 600,
                        fontSize: '0.825rem',
                        lineHeight: 1.4,
                        wordBreak: 'break-word'
                      }}>
                        {notif.message}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', fontSize: '0.75rem' }}>
                        {new Date(notif.timestamp || notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                    </Box>
                  </ListItemButton>
                </ListItem>
              );
            })
          )}
        </List>
      </Popover>

      {/* Profile Actions Dropdown Menu */}
      <Menu
        anchorEl={anchorElProfile}
        open={Boolean(anchorElProfile)}
        onClose={() => setAnchorElProfile(null)}
        PaperProps={{ sx: { width: 200, mt: 1.5 } }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle2" noWrap sx={{ fontWeight: 600 }}>{user?.name}</Typography>
          <Typography variant="body2" color="text.secondary" noWrap>{user?.email}</Typography>
          <Typography variant="caption" color="primary.main" sx={{ display: 'block', mt: 0.5, fontWeight: 700 }}>
            {user?.role?.toUpperCase()}
          </Typography>
        </Box>
        <Divider />
        <MenuItem onClick={() => { setAnchorElProfile(null); navigate('/profile'); }}>
          Profile Settings
        </MenuItem>
        <MenuItem onClick={() => { setAnchorElProfile(null); dispatch(logout()); }} sx={{ color: 'error.main' }}>
          Logout
        </MenuItem>
      </Menu>

      {/* Navigation Drawers for Mobile & Desktop */}
      <Box
        component="nav"
        sx={{
          width: { sm: isSidebarExpanded ? drawerWidth : collapsedDrawerWidth },
          flexShrink: { sm: 0 },
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        {/* Mobile Drawer (temporary) */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              top: 0,
              height: '100%',
              background: isDarkMode
                ? 'rgba(21, 27, 31, 0.92) !important'
                : 'rgba(255, 255, 255, 0.92) !important',
              backdropFilter: 'none !important',
              WebkitBackdropFilter: 'none !important',
              borderRight: isDarkMode
                ? '1px solid rgba(255, 255, 255, 0.08) !important'
                : '1px solid rgba(16, 185, 129, 0.12) !important'
            }
          }}
        >
          {drawerContent(true)}
        </Drawer>

        {/* Desktop Drawer (permanent, auto-hide) */}
        <Drawer
          variant="permanent"
          onMouseEnter={() => setSidebarOpen(true)}
          onMouseLeave={() => setSidebarOpen(false)}
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: isSidebarExpanded ? drawerWidth : collapsedDrawerWidth,
              top: 0,
              height: '100%',
              background: isDarkMode
                ? 'rgba(21, 27, 31, 0.92) !important'
                : 'rgba(255, 255, 255, 0.92) !important',
              backdropFilter: 'none !important',
              WebkitBackdropFilter: 'none !important',
              borderRight: isDarkMode
                ? '1px solid rgba(255, 255, 255, 0.08) !important'
                : '1px solid rgba(16, 185, 129, 0.12) !important',
              overflowX: 'hidden',
              transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important',
              boxShadow: isSidebarExpanded
                ? isDarkMode
                  ? '4px 0 24px rgba(0,0,0,0.4)'
                  : '4px 0 24px rgba(0,0,0,0.10)'
                : 'none'
            }
          }}
          open
        >
          {drawerContent(isSidebarExpanded)}
        </Drawer>
      </Box>

      {/* Main Screen Layout Container */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${isSidebarExpanded ? drawerWidth : collapsedDrawerWidth}px)` },
          minHeight: '100vh',
          bgcolor: 'transparent',
          position: 'relative',
          zIndex: 1,
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        <Toolbar />
        {children}
      </Box>

      {/* Realtime Toast Banner */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        TransitionComponent={(props) => <Slide {...props} direction="up" />}
      >
        <Alert 
          severity={toast.severity} 
          onClose={() => setToast({ ...toast, open: false })} 
          variant="filled"
          sx={{
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.16)',
            background: toast.severity === 'success'
              ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
              : toast.severity === 'error'
                ? 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)'
                : toast.severity === 'warning'
                  ? 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)'
                  : 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            fontWeight: 600,
            py: 1,
            px: 2,
            alignItems: 'center',
            '& .MuiAlert-icon': {
              fontSize: '1.5rem',
              color: '#ffffff'
            }
          }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default DashboardLayout;
