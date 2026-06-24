// frontend/src/App.js
import React, { useState, useMemo, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';

// Layout
import DashboardLayout from './components/DashboardLayout';


// Background Trackers
import ActivityTracker from './components/ActivityTracker';
import WelcomeSplash from './components/WelcomeSplash';
import DeveloperBadge from './components/DeveloperBadge';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';

import ForgotPassword from './pages/ForgotPassword';
import ForcePasswordReset from './pages/ForcePasswordReset';
import Profile from './pages/Profile';

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

function App() {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const [showSplash, setShowSplash] = useState(true);

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
      document.body.style.zoom = activeZoom;
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

  // Default to Light Mode
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('wfh_dark_mode');
    if (saved !== null) return JSON.parse(saved);
    return false; // Default to Light Mode
  });

  const toggleTheme = (val) => {
    setIsDarkMode(val);
    localStorage.setItem('wfh_dark_mode', JSON.stringify(val));
    window.dispatchEvent(new Event('wfh_theme_changed'));
  };

  useEffect(() => {
    const handleThemeChange = () => {
      const saved = localStorage.getItem('wfh_dark_mode');
      if (saved !== null) {
        setIsDarkMode(JSON.parse(saved));
      }
    };
    window.addEventListener('wfh_theme_changed', handleThemeChange);
    return () => window.removeEventListener('wfh_theme_changed', handleThemeChange);
  }, []);

  // ── PREMIUM THEME ─────────────────────────────────────────────────
  const theme = useMemo(() => createTheme({
    palette: {
      mode: isDarkMode ? 'dark' : 'light',
      primary: {
        main:          '#10b981',
        light:         isDarkMode ? '#34d399' : '#d1fae5',
        dark:          '#059669',
        contrastText:  '#ffffff',
      },
      secondary: {
        main:  isDarkMode ? '#090d16' : '#090d16',
        light: isDarkMode ? '#0b1324' : '#1e293b',
        dark:  isDarkMode ? '#060913' : '#020617',
      },
      error:   { main: '#ef4444' },
      warning: { main: '#f59e0b' },
      success: { main: '#10b981' },
      info:    { main: '#3b82f6' },
      background: {
        default: isDarkMode ? '#060913' : '#f8fafc',
        paper:   isDarkMode ? '#070b14' : '#ffffff',
      },
      text: {
        primary:   isDarkMode ? '#f8fafc' : '#0f172a',
        secondary: isDarkMode ? 'rgba(148, 163, 184, 0.7)' : '#475569',
      },
      divider: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
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
            background: isDarkMode
              ? 'rgba(7, 11, 20, 0.92)'
              : 'rgba(255, 255, 255, 0.90)',
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none',
            border: isDarkMode
              ? '1px solid rgba(255, 255, 255, 0.07)'
              : '1px solid rgba(21, 27, 31, 0.06)',
            boxShadow: isDarkMode
              ? '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)'
              : '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
            transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1), box-shadow 0.25s cubic-bezier(0.4,0,0.2,1)',
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
          containedPrimary: {
            background: isDarkMode
              ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
              : 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
            boxShadow: isDarkMode
              ? '0 4px 16px rgba(16, 185, 129, 0.4)'
              : '0 4px 12px rgba(5, 150, 105, 0.3)',
            '&:hover': {
              background: isDarkMode
                ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
                : 'linear-gradient(135deg, #047857 0%, #059669 100%)',
              boxShadow: isDarkMode
                ? '0 6px 24px rgba(16, 185, 129, 0.5)'
                : '0 6px 20px rgba(5, 150, 105, 0.4)',
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
              boxShadow: isDarkMode
                ? '0 0 0 3px rgba(16, 185, 129, 0.2)'
                : '0 0 0 3px rgba(16, 185, 129, 0.15)',
            },
          },
        },
      },

      // ── Drawer / Sidebar ───────────────────────────────────────────
      MuiDrawer: {
        styleOverrides: {
          paper: {
            background: isDarkMode
              ? 'rgba(9, 13, 22, 0.95)'
              : 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none',
            borderRight: isDarkMode
              ? '1px solid rgba(255, 255, 255, 0.07)'
              : '1px solid rgba(0,0,0,0.08)',
          },
        },
      },

      // ── AppBar ─────────────────────────────────────────────────────
      MuiAppBar: {
        styleOverrides: {
          root: {
            background: isDarkMode
              ? 'rgba(9, 13, 22, 0.88)'
              : 'rgba(255, 255, 255, 0.88)',
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none',
            borderBottom: isDarkMode
              ? '1px solid rgba(255, 255, 255, 0.07)'
              : '1px solid rgba(0,0,0,0.08)',
            boxShadow: 'none',
          },
        },
      },

      // ── Paper ──────────────────────────────────────────────────────
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            background: isDarkMode
              ? 'rgba(7, 11, 20, 0.92)'
              : 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none',
            border: isDarkMode
              ? '1px solid rgba(255, 255, 255, 0.07)'
              : undefined,
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
            backgroundColor: isDarkMode
              ? 'rgba(255,255,255,0.06)'
              : 'rgba(0,0,0,0.06)',
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
            background: 'linear-gradient(135deg, #10b981, #059669)',
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
  }), [isDarkMode]);

  // Authorization Wrappers
  const ProtectedRoute = ({ children, allowedRoles = [] }) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }
    
    const isDesktop = !!window.api;
    const path = window.location.hash.replace('#', '');
    const isManagerRoute = path.startsWith('/manager');
    const isTrackingDashboard = path === '/dashboard' || path === '/tasks';

    if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
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
      <DashboardLayout isDarkMode={isDarkMode} setIsDarkMode={toggleTheme}>
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
        {showSplash && <WelcomeSplash onFinish={() => setShowSplash(false)} />}
        <Router>
        {/* Background mouse/keyboard monitor */}
        <ActivityTracker />

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

          <Route path="/system-admin" element={
            <ProtectedRoute>
              <SystemAdmin />
            </ProtectedRoute>
          } />
          
          {/* Default Route */}
          <Route path="/" element={<Navigate to="/dashboard" />} />

          {/* Wildcard redirects */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
      <DeveloperBadge />
      </Box>
    </ThemeProvider>
  );
}

export default App;
