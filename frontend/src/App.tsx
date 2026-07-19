// frontend/src/App.js
import React, { useState, useMemo, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import { authFail } from './redux/store';

// Layout
import DashboardLayout from './components/DashboardLayout';


// Background Trackers
import ActivityTracker from './components/ActivityTracker';
import AnnouncementBanner from './components/AnnouncementBanner';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';

import ForgotPassword from './pages/ForgotPassword';
import ForcePasswordReset from './pages/ForcePasswordReset';
import Profile from './pages/Profile';
import MobileVerify from './pages/MobileVerify';

// Employee Pages
import EmployeeDashboard from './pages/EmployeeDashboard';
import MyTasks from './pages/MyTasks';
import WorkReports from './pages/WorkReports';
import SystemAdmin from './pages/SystemAdmin';
import AttendanceLogs from './pages/AttendanceLogs';

// Manager Pages
import ManagerDashboard from './pages/ManagerDashboard';
import ManagerTasks from './pages/ManagerTasks';
import ManagerReports from './pages/ManagerReports';
import ManagerMonitoring from './pages/ManagerMonitoring';
import EmployeeMonitoring from './pages/EmployeeMonitoring';
import EmployeeList from './pages/EmployeeList';
import AdminList from './pages/AdminList';
import SuperAdminList from './pages/SuperAdminList';
import ManagerSettings from './pages/ManagerSettings';
import Settings from './pages/Settings';

function App() {
  const { isAuthenticated, user } = useSelector((state: any) => state.auth);

  // Global Zoom State and Logic
  const [zoomLevel, setZoomLevel] = useState(() => {
    const saved = localStorage.getItem('wfh_zoom_level');
    return saved ? parseFloat(saved) : 1.0;
  });

  useEffect(() => {
    if (isAuthenticated) {
      localStorage.setItem('wfh_zoom_level', zoomLevel.toString());
      window.dispatchEvent(new Event('wfh_zoom_changed'));
    }
    
    // Force zoom factor to 1.0 on authentication screens
    const activeZoom = isAuthenticated ? zoomLevel : 1.0;
    
    if (window.api && typeof window.api.setZoomFactor === 'function') {
      window.api.setZoomFactor(activeZoom);
    } else {
      document.body.style.zoom = activeZoom.toString();
    }
  }, [zoomLevel, isAuthenticated]);

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.round(Math.min(1.5, prev + 0.1) * 10) / 10);
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.round(Math.max(0.7, prev - 0.1) * 10) / 10);
  };

  useEffect(() => {
    const handleZoomChange = () => {
      const saved = localStorage.getItem('wfh_zoom_level');
      if (saved) {
        const parsed = parseFloat(saved);
        if (parsed !== zoomLevel) {
          setZoomLevel(parsed);
        }
      }
    };
    window.addEventListener('wfh_zoom_changed', handleZoomChange);
    return () => window.removeEventListener('wfh_zoom_changed', handleZoomChange);
  }, [zoomLevel]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Disallow keyboard zoom control on login/register pages
      if (!isAuthenticated) return;

      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          handleZoomIn();
        } else if (e.key === '-') {
          e.preventDefault();
          handleZoomOut();
        } else if (e.key === '0') {
          e.preventDefault();
          setZoomLevel(1.0);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthenticated]);

  // Multi-theme system: 'light' | 'dark' | 'cyberpunk' | 'ocean' | 'matrix' | 'amber'
  const [appTheme, setAppTheme] = useState(() => {
    return localStorage.getItem('wfh_app_theme') || 'dark';
  });

  // Keep isDarkMode as a boolean alias for backward compat
  const isDarkMode = appTheme !== 'light';

  const toggleTheme = (val: string) => {
    setAppTheme(val);
    localStorage.setItem('wfh_app_theme', val);
    window.dispatchEvent(new CustomEvent('wfh_theme_changed', { detail: val }));
  };

  useEffect(() => {
    const handleThemeChange = (e: any) => {
      const saved = localStorage.getItem('wfh_app_theme');
      if (saved) setAppTheme(saved);
    };
    window.addEventListener('wfh_theme_changed', handleThemeChange);
    return () => window.removeEventListener('wfh_theme_changed', handleThemeChange);
  }, []);

  // Device Registration for Desktop Agent
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    
    // Only register if we're in the desktop app
    // @ts-ignore
    if (window.api && typeof window.api.getDeviceInfo === 'function') {
      // @ts-ignore
      window.api.getDeviceInfo().then(info => {
        if (info && info.machineId) {
          const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
          const token = localStorage.getItem('token') || sessionStorage.getItem('token');
          if (token) {
            fetch(`${API_URL}/api/devices/register`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                machine_id: info.machineId,
                hostname: info.hostname
              })
            }).catch(err => console.error('Failed to register device:', err));
          }
        }
      }).catch((err: any) => console.error('Error fetching device info:', err));
    }
  }, [isAuthenticated, user]);

  // Update session last-seen timestamp periodically & on user activity
  useEffect(() => {
    if (!isAuthenticated) return;

    // Update immediately
    localStorage.setItem('wfh_last_seen', Date.now().toString());

    // Update every 10 seconds
    const interval = setInterval(() => {
      localStorage.setItem('wfh_last_seen', Date.now().toString());
    }, 10000);

    // Also update on user activity (mouse movement, keypress)
    const updateActivity = () => {
      localStorage.setItem('wfh_last_seen', Date.now().toString());
    };

    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('click', updateActivity);

    return () => {
      clearInterval(interval);
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('click', updateActivity);
    };
  }, [isAuthenticated]);

  // ── THEME PALETTES ─────────────────────────────────────────────────
  const THEMES: Record<string, any> = {
    dark: {
      mode: 'dark',
      accent: '#10b981',
      accentGlow: 'rgba(16,185,129,0.4)',
      bg: '#060913',
      paper: '#070b14',
      sidebar: 'rgba(9,13,22,0.95)',
      appbar: 'rgba(9,13,22,0.88)',
      textPrimary: '#f8fafc',
      textSecondary: 'rgba(148,163,184,0.7)',
      divider: 'rgba(255,255,255,0.08)',
      border: 'rgba(255,255,255,0.07)',
      cardBg: 'rgba(7,11,20,0.92)',
      gradient: 'linear-gradient(135deg,#10b981 0%,#059669 100%)',
      gradientHover: 'linear-gradient(135deg,#059669 0%,#10b981 100%)',
    },
    light: {
      mode: 'light',
      accent: '#10b981',
      accentGlow: 'rgba(16,185,129,0.3)',
      bg: '#f8fafc',
      paper: '#ffffff',
      sidebar: 'rgba(255,255,255,0.92)',
      appbar: 'rgba(255,255,255,0.88)',
      textPrimary: '#0f172a',
      textSecondary: '#475569',
      divider: 'rgba(15,23,42,0.08)',
      border: 'rgba(21,27,31,0.06)',
      cardBg: 'rgba(255,255,255,0.90)',
      gradient: 'linear-gradient(135deg,#059669 0%,#10b981 100%)',
      gradientHover: 'linear-gradient(135deg,#047857 0%,#059669 100%)',
    },
  };

  const t = THEMES[appTheme] || THEMES.dark;

  // ── PREMIUM THEME ─────────────────────────────────────────────────
  const theme = useMemo(() => createTheme({
    palette: {
      mode: t.mode as 'dark' | 'light',
      primary: {
        main:         t.accent,
        light:        t.accent,
        dark:         t.accent,
        contrastText: '#ffffff',
      },
      secondary: {
        main:  t.bg,
        light: t.paper,
        dark:  t.bg,
      },
      error:   { main: '#ef4444' },
      warning: { main: '#f59e0b' },
      success: { main: '#22c55e' },
      info:    { main: '#3b82f6' },
      background: {
        default: t.bg,
        paper:   t.paper,
      },
      text: {
        primary:   t.textPrimary,
        secondary: t.textSecondary,
      },
      divider: t.divider,
    },

    typography: {
      fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif",
      h1: { fontWeight: 800, letterSpacing: '-0.03em' },
      h2: { fontWeight: 800, letterSpacing: '-0.025em' },
      h3: { fontWeight: 700, letterSpacing: '-0.02em' },
      h4: { fontWeight: 700, letterSpacing: '-0.015em' },
      h5: { fontWeight: 700, letterSpacing: '-0.01em' },
      h6: { fontWeight: 700, letterSpacing: '-0.005em' },
      button: { textTransform: 'none', fontWeight: 600, letterSpacing: '0.01em' },
      caption: { fontWeight: 500 },
    },

    shape: { borderRadius: 14 },

    components: {
      // ── Cards ──────────────────────────────────────────────────────
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            background: t.cardBg,
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none',
            border: `1px solid ${t.border}`,
            boxShadow: isDarkMode
              ? `0 8px 32px rgba(0,0,0,0.4), 0 0 0 0 ${t.accentGlow}`
              : '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
            transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1), box-shadow 0.25s cubic-bezier(0.4,0,0.2,1)',
          },
        },
      },

      // ── Dialogs ────────────────────────────────────────────────────
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundImage: 'none',
            background: isDarkMode ? 'rgba(7,11,20,0.95)' : 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: `1px solid ${t.border}`,
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            borderRadius: 16,
          },
        },
      },

      // ── Buttons ────────────────────────────────────────────────────
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            fontWeight: 600,
            letterSpacing: '0.01em',
            transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
          },
          // @ts-ignore
          containedPrimary: {
            background: t.gradient,
            boxShadow: `0 4px 16px ${t.accentGlow}`,
            '&:hover': {
              background: t.gradientHover,
              boxShadow: `0 6px 24px ${t.accentGlow}`,
              transform: 'translateY(-1px)',
            },
          },
          containedSuccess: {
            background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
            '&:hover': { transform: 'translateY(-1px)' },
          },
          outlined: {
            borderWidth: '1.5px',
            '&:hover': { borderWidth: '1.5px', transform: 'translateY(-1px)' },
          },
        },
      },

      // ── Input fields ───────────────────────────────────────────────
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            transition: 'box-shadow 0.2s',
            '&.Mui-focused': {
              boxShadow: `0 0 0 3px ${t.accentGlow}`,
            },
          },
        },
      },

      // ── Drawer / Sidebar ───────────────────────────────────────────
      MuiDrawer: {
        styleOverrides: {
          paper: {
            background: t.sidebar,
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none',
            borderRight: `1px solid ${t.border}`,
          },
        },
      },

      // ── AppBar ─────────────────────────────────────────────────────
      MuiAppBar: {
        styleOverrides: {
          root: {
            background: t.appbar,
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none',
            borderBottom: `1px solid ${t.border}`,
            boxShadow: 'none',
          },
        },
      },

      // ── Paper ──────────────────────────────────────────────────────
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            background: t.cardBg,
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none',
            border: `1px solid ${t.border}`,
          },
        },
      },

      // ── Chip ───────────────────────────────────────────────────────
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 600,
            borderRadius: 8,
            fontSize: '0.75rem',
            letterSpacing: '0.02em',
          },
        },
      },

      // ── Linear Progress ────────────────────────────────────────────
      MuiLinearProgress: {
        styleOverrides: {
          root: { borderRadius: 99, overflow: 'hidden' },
          bar:  { borderRadius: 99 },
        },
      },

      // ── Skeleton ───────────────────────────────────────────────────
      MuiSkeleton: {
        styleOverrides: {
          root: {
            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
            '&::after': {
              background: isDarkMode
                ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)'
                : 'linear-gradient(90deg, transparent, rgba(0,0,0,0.04), transparent)',
            },
          },
        },
      },

      // ── Avatar ─────────────────────────────────────────────────────
      MuiAvatar: {
        styleOverrides: {
          root: {
            fontWeight: 700,
            background: t.gradient,
          },
        },
      },

      // ── Tooltip ────────────────────────────────────────────────────
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            borderRadius: 8,
            fontWeight: 600,
            fontSize: '0.75rem',
            backdropFilter: 'blur(8px)',
          },
        },
      },
    },
  }), [t, isDarkMode]);

  // Authorization Wrappers
  const ProtectedRoute = ({ children, allowedRoles = [] }: any) => {
    const dispatch = useDispatch();
    const isDesktop = !!(window as any).api;

    useEffect(() => {
      if (isAuthenticated && user?.role === 'Employee' && !isDesktop) {
        dispatch(authFail('Access denied. Employees can only log in through the Desktop Agent.'));
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isDesktop, dispatch]);

    if (!isAuthenticated || (user?.role === 'Employee' && !isDesktop)) {
      return <Navigate to="/login" replace />;
    }
    
    const path = window.location.hash.replace('#', '');
    const isManagerRoute = path.startsWith('/manager');
    const isTrackingDashboard = path === '/dashboard' || path === '/tasks';

    if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
      if (user?.role === 'SystemAdmin') {
        return <Navigate to="/system-admin" replace />;
      }
      return <Navigate to={(user?.role === 'Manager' || user?.role === 'SuperAdmin') ? '/manager/dashboard' : '/dashboard'} replace />;
    }

    // Architecture Separation Rules
    if (isDesktop && isManagerRoute) {
      // Desktop app strictly for Time Tracking
      return <Navigate to="/dashboard" replace />;
    }

    if (!isDesktop && (user?.role === 'Manager' || user?.role === 'SuperAdmin') && isTrackingDashboard) {
      // Web app strictly for Management (for Managers/Admins)
      return <Navigate to="/manager/dashboard" replace />;
    }

    return (
      <DashboardLayout isDarkMode={isDarkMode} setIsDarkMode={toggleTheme} appTheme={appTheme}>
        {children}
      </DashboardLayout>
    );
  };



  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}
      >
        <Router>
          {/* Background mouse/keyboard monitor */}
          <ActivityTracker />
          
          {/* Global Announcement Banner */}
          <AnnouncementBanner />

        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/force-reset" element={
            <ProtectedRoute>
              <ForcePasswordReset />
            </ProtectedRoute>
          } />

          {/* User Settings */}
          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />

          {/* Public or Standalone Routes */}
          <Route path="/mobile-verify" element={<MobileVerify />} />

          {/* Employee Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute allowedRoles={['Employee', 'Manager', 'SuperAdmin']}>
              <EmployeeDashboard />
            </ProtectedRoute>
          } />
          <Route path="/tasks" element={
            <ProtectedRoute allowedRoles={['Employee', 'Manager', 'SuperAdmin']}>
              <MyTasks />
            </ProtectedRoute>
          } />
          <Route path="/reports" element={
            <ProtectedRoute allowedRoles={['Employee', 'Manager', 'SuperAdmin']}>
              <WorkReports />
            </ProtectedRoute>
          } />
          <Route path="/attendance-logs" element={
            <ProtectedRoute allowedRoles={['Employee', 'Manager', 'SuperAdmin']}>
              <AttendanceLogs />
            </ProtectedRoute>
          } />

          {/* Manager Routes */}
          <Route path="/manager/dashboard" element={
            <ProtectedRoute allowedRoles={['Manager', 'SuperAdmin']}>
              <ManagerDashboard />
            </ProtectedRoute>
          } />
          <Route path="/manager/tasks" element={
            <ProtectedRoute allowedRoles={['Manager', 'SuperAdmin']}>
              <ManagerTasks />
            </ProtectedRoute>
          } />
          <Route path="/manager/reports" element={
            <ProtectedRoute allowedRoles={['Manager', 'SuperAdmin']}>
              <ManagerReports />
            </ProtectedRoute>
          } />
          <Route path="/manager/monitoring" element={
            <ProtectedRoute allowedRoles={['Manager', 'SuperAdmin']}>
              <ManagerMonitoring />
            </ProtectedRoute>
          } />
          <Route path="/manager/monitoring/:employeeId" element={
            <ProtectedRoute allowedRoles={['Manager', 'SuperAdmin']}>
              <EmployeeMonitoring />
            </ProtectedRoute>
          } />
          <Route path="/manager/employees" element={
            <ProtectedRoute allowedRoles={['Manager', 'SuperAdmin']}>
              <EmployeeList />
            </ProtectedRoute>
          } />
          <Route path="/manager/admins" element={
            <ProtectedRoute allowedRoles={['SuperAdmin']}>
              <AdminList />
            </ProtectedRoute>
          } />
          <Route path="/manager/superadmins" element={
            <ProtectedRoute allowedRoles={['SuperAdmin']}>
              <SuperAdminList />
            </ProtectedRoute>
          } />
          <Route path="/manager/settings" element={
            <ProtectedRoute allowedRoles={['SuperAdmin']}>
              <ManagerSettings />
            </ProtectedRoute>
          } />
          <Route path="/company/settings" element={
            <ProtectedRoute allowedRoles={['SuperAdmin', 'Manager']}>
              <Settings />
            </ProtectedRoute>
          } />

          <Route path="/system-admin" element={
            <ProtectedRoute>
              <SystemAdmin activeTab={0} />
            </ProtectedRoute>
          } />
          <Route path="/system-admin/companies" element={
            <ProtectedRoute>
              <SystemAdmin activeTab={1} />
            </ProtectedRoute>
          } />
          <Route path="/system-admin/broadcast" element={
            <ProtectedRoute>
              <SystemAdmin activeTab={2} />
            </ProtectedRoute>
          } />
          
          {/* Root redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Wildcard redirects */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
      </Box>
    </ThemeProvider>
  );
}

export default App;
