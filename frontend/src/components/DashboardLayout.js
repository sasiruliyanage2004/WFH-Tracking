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
  Settings as SettingsIcon,
  ArrowBack as BackIcon,
  ArrowForward as ForwardIcon,
  Warning as AlertIcon
} from '@mui/icons-material';
import { logout } from '../redux/store';

const drawerWidth = 260;

function DashboardLayout({ children, isDarkMode, setIsDarkMode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user, token } = useSelector((state) => state.auth);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorElProfile, setAnchorElProfile] = useState(null);
  const [anchorElNotifications, setAnchorElNotifications] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });

  // Get backend API URL
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

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
  }, [token, user?.id, API_URL]);

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
    { text: 'Task Management', icon: <TaskIcon />, path: '/manager/tasks' },
    { text: 'Work Reports', icon: <ReportIcon />, path: '/manager/reports' },
    { text: 'Employee Monitor', icon: <MonitoringIcon />, path: '/manager/monitoring' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/manager/settings' }
  ];

  const links = user?.role === 'Manager' ? managerLinks : employeeLinks;

  // Render navigation menu
  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', px: 3, py: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DashboardIcon sx={{ 
            color: isDarkMode ? '#4f8ef7' : '#0038a8',
            fontSize: '1.5rem'
          }} />
          <Typography variant="h6" sx={{
            fontWeight: 800,
            fontSize: '1.25rem',
            fontFamily: "'Inter', sans-serif",
            letterSpacing: '-0.025em',
            background: isDarkMode
              ? 'linear-gradient(135deg, #ffffff 0%, #a0a0a0 100%)'
              : 'linear-gradient(135deg, #0038a8 0%, #002266 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            display: 'inline-block'
          }}>
            WorkforceOS
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, mt: 0.2, pl: 4 }}>
          Enterprise Management
        </Typography>
      </Toolbar>
      <Divider />
      <List sx={{ px: 1, py: 2, flexGrow: 1 }}>
        {links.map((link) => {
          const isActive = location.pathname === link.path;
          return (
            <ListItem key={link.text} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => {
                  navigate(link.path);
                  setMobileOpen(false);
                }}
                sx={{
                  borderRadius: '12px',
                  mx: 1.5,
                  px: 2,
                  py: 1.25,
                  position: 'relative',
                  background: isActive
                    ? isDarkMode
                      ? 'linear-gradient(135deg, rgba(91, 156, 246, 0.18) 0%, rgba(167, 139, 250, 0.12) 100%)'
                      : 'linear-gradient(135deg, rgba(26, 86, 219, 0.08) 0%, rgba(26, 86, 219, 0.04) 100%)'
                    : 'transparent',
                  color: isActive
                    ? isDarkMode ? '#5b9cf6' : '#1a56db'
                    : 'text.primary',
                  border: isActive && isDarkMode
                    ? '1px solid rgba(91, 156, 246, 0.25)'
                    : isActive
                      ? '1px solid rgba(26, 86, 219, 0.12)'
                      : '1px solid transparent',
                  boxShadow: isActive
                    ? isDarkMode
                      ? '0 4px 20px rgba(91, 156, 246, 0.15)'
                      : '0 4px 15px rgba(26, 86, 219, 0.08)'
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
                    backgroundColor: isDarkMode ? '#5b9cf6' : '#1a56db'
                  } : null,
                  '&:hover': {
                    background: isActive
                      ? isDarkMode
                        ? 'linear-gradient(135deg, rgba(91, 156, 246, 0.25) 0%, rgba(167, 139, 250, 0.18) 100%)'
                        : 'linear-gradient(135deg, rgba(26, 86, 219, 0.12) 0%, rgba(26, 86, 219, 0.06) 100%)'
                      : isDarkMode
                        ? 'rgba(91, 156, 246, 0.08)'
                        : 'action.hover',
                    transform: isActive ? 'none' : 'translateX(4px)'
                  }
                }}
              >
                <ListItemIcon sx={{
                  color: isActive
                    ? isDarkMode ? '#5b9cf6' : '#1a56db'
                    : 'text.secondary',
                  minWidth: 40,
                  transition: 'color 0.25s'
                }}>
                  {link.icon}
                </ListItemIcon>
                <ListItemText
                  primary={link.text}
                  primaryTypographyProps={{
                    fontSize: '0.9rem',
                    fontWeight: isActive ? 700 : 500,
                    letterSpacing: '-0.01em'
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      <Divider />
      <List sx={{ px: 1, py: 1 }}>
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => navigate('/profile')}
            sx={{
              borderRadius: 2,
              '&:hover': isDarkMode ? { bgcolor: 'rgba(79, 142, 247, 0.08)' } : {}
            }}
          >
            <ListItemIcon><ProfileIcon /></ListItemIcon>
            <ListItemText primary="My Profile" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => dispatch(logout())}
            sx={{
              borderRadius: 2,
              color: 'error.main',
              '&:hover': isDarkMode ? { bgcolor: 'rgba(248, 113, 113, 0.08)' } : {}
            }}
          >
            <ListItemIcon sx={{ color: 'error.main' }}><LogoutIcon /></ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <Box sx={{ display: 'flex', width: '100%', minHeight: '100vh', bgcolor: 'background.default', position: 'relative' }}>
      <CssBaseline />

      {/* Background Decorative Glass Glow Blobs */}
      {isDarkMode && (
        <Box sx={{ position: 'fixed', width: '100%', height: '100%', top: 0, left: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          {/* Top Left Blue Glow */}
          <Box
            sx={{
              position: 'absolute',
              width: '45vw',
              height: '45vw',
              top: '-15vw',
              left: '-10vw',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(79, 142, 247, 0.12) 0%, rgba(79, 142, 247, 0) 70%)',
              filter: 'blur(100px)',
            }}
          />
          {/* Bottom Right Violet Glow */}
          <Box
            sx={{
              position: 'absolute',
              width: '50vw',
              height: '50vw',
              bottom: '-15vw',
              right: '-10vw',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(167, 139, 250, 0.1) 0%, rgba(167, 139, 250, 0) 70%)',
              filter: 'blur(120px)',
            }}
          />
          {/* Center-Right Green Glow */}
          <Box
            sx={{
              position: 'absolute',
              width: '35vw',
              height: '35vw',
              top: '30vh',
              right: '15vw',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(52, 211, 153, 0.06) 0%, rgba(52, 211, 153, 0) 70%)',
              filter: 'blur(110px)',
            }}
          />
        </Box>
      )}

      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          top: window.api !== undefined ? '32px' : 0,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: isDarkMode ? 'transparent' : 'background.paper',
          color: 'text.primary'
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
                    border: '2px solid rgba(91, 156, 246, 0.2)',
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
                    return <TaskIcon sx={{ ...style, color: '#1a56db' }} />;
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
                  case 'task': return 'rgba(26, 86, 219, 0.08)';
                  case 'attendance':
                  case 'break':
                  case 'checkin': return 'rgba(16, 185, 129, 0.08)';
                  case 'report': return 'rgba(245, 158, 11, 0.08)';
                  case 'alert': return 'rgba(239, 68, 68, 0.08)';
                  default: return 'rgba(91, 156, 246, 0.08)';
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
      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
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
              top: window.api !== undefined ? 32 : 0,
              height: window.api !== undefined ? 'calc(100% - 32px)' : '100%'
            }
          }}
        >
          {drawerContent}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              top: window.api !== undefined ? 32 : 0,
              height: window.api !== undefined ? 'calc(100% - 32px)' : '100%'
            }
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* Main Screen Layout Container */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          bgcolor: isDarkMode ? 'transparent' : 'background.default',
          position: 'relative',
          zIndex: 1
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
