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
  Tooltip
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Assignment as TaskIcon,
  Assessment as ReportIcon,
  History as HistoryIcon,
  People as TeamIcon,
  Monitor as MonitoringIcon,
  Notifications as NotificationIcon,
  Brightness4 as DarkIcon,
  Brightness7 as LightIcon,
  ExitToApp as LogoutIcon,
  AccountCircle as ProfileIcon,
  Group as EmployeeListIcon
} from '@mui/icons-material';
import { logout } from '../redux/store';

const drawerWidth = 240;

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
  }, [token, user, API_URL]);

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
    { text: 'Employee Monitor', icon: <MonitoringIcon />, path: '/manager/monitoring' }
  ];

  const links = user?.role === 'Manager' ? managerLinks : employeeLinks;

  // Render navigation menu
  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', px: 3, py: 2.5 }}>
        <Typography variant="h6" sx={{
          fontWeight: 800,
          fontSize: '1.25rem',
          fontFamily: "'Inter', sans-serif",
          letterSpacing: '-0.025em',
          background: isDarkMode
            ? 'linear-gradient(135deg, #ffffff 0%, #a0a0a0 100%)'
            : '#0038a8',
          WebkitBackgroundClip: isDarkMode ? 'text' : undefined,
          WebkitTextFillColor: isDarkMode ? 'transparent' : undefined,
          color: isDarkMode ? undefined : '#0038a8'
        }}>
          WorkforceOS
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, mt: -0.2 }}>
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
                  borderRadius: 2,
                  mx: 1,
                  position: 'relative',
                  background: isActive
                    ? isDarkMode
                      ? 'linear-gradient(135deg, rgba(79, 142, 247, 0.18) 0%, rgba(167, 139, 250, 0.12) 100%)'
                      : 'rgba(0, 56, 168, 0.08)'
                    : 'transparent',
                  color: isActive
                    ? isDarkMode ? '#7aaeff' : '#0038a8'
                    : 'text.primary',
                  border: isActive && isDarkMode
                    ? '1px solid rgba(255, 255, 255, 0.12)'
                    : '1px solid transparent',
                  boxShadow: isActive && isDarkMode
                    ? '0 0 10px rgba(255, 255, 255, 0.06)'
                    : 'none',
                  '&:hover': {
                    background: isActive
                      ? isDarkMode
                        ? 'linear-gradient(135deg, rgba(79, 142, 247, 0.25) 0%, rgba(167, 139, 250, 0.18) 100%)'
                        : 'rgba(0, 56, 168, 0.14)'
                      : isDarkMode
                        ? 'rgba(79, 142, 247, 0.08)'
                        : 'action.hover'
                  }
                }}
              >
                <ListItemIcon sx={{
                  color: isActive
                    ? isDarkMode ? '#7aaeff' : '#0038a8'
                    : 'text.secondary',
                  minWidth: 40
                }}>
                  {link.icon}
                </ListItemIcon>
                <ListItemText
                  primary={link.text}
                  primaryTypographyProps={{
                    fontSize: '0.9rem',
                    fontWeight: isActive ? 700 : 500
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
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
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
              <Avatar
                src={user?.profilePic || ''}
                alt={user?.name}
                sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}
              >
                {user?.name?.charAt(0)}
              </Avatar>
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
            notifications.map((notif) => (
              <ListItem
                key={notif.id || notif._id}
                disablePadding
                divider
                onClick={() => handleNotificationClick(notif)}
                sx={{
                  bgcolor: notif.isRead ? 'transparent' : 'action.selected',
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'action.hover' }
                }}
              >
                <ListItemButton sx={{ flexDirection: 'column', alignItems: 'flex-start', py: 1.5 }}>
                  <Typography variant="body2" color="text.primary" sx={{ fontWeight: notif.isRead ? 400 : 600 }}>
                    {notif.message}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                    {new Date(notif.timestamp || notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Typography>
                </ListItemButton>
              </ListItem>
            ))
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
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth }
          }}
        >
          {drawerContent}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth }
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
          bgcolor: 'background.default'
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
      >
        <Alert severity={toast.severity} onClose={() => setToast({ ...toast, open: false })} variant="filled">
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default DashboardLayout;
