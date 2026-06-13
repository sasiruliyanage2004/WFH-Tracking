// frontend/src/App.js
import React, { useState, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';

// Layout
import DashboardLayout from './components/DashboardLayout';
import CustomTitlebar from './components/CustomTitlebar';

// Background Trackers
import ActivityTracker from './components/ActivityTracker';
import WelcomeSplash from './components/WelcomeSplash';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Profile from './pages/Profile';

// Employee Pages
import EmployeeDashboard from './pages/EmployeeDashboard';
import MyTasks from './pages/MyTasks';
import WorkReports from './pages/WorkReports';
import AttendanceLogs from './pages/AttendanceLogs';

// Manager Pages
import ManagerDashboard from './pages/ManagerDashboard';
import ManagerTasks from './pages/ManagerTasks';
import ManagerReports from './pages/ManagerReports';
import ManagerMonitoring from './pages/ManagerMonitoring';
import EmployeeMonitoring from './pages/EmployeeMonitoring';
import EmployeeList from './pages/EmployeeList';
import AdminList from './pages/AdminList';
import ManagerSettings from './pages/ManagerSettings';

function App() {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const [showSplash, setShowSplash] = useState(true);

  // Dark mode — default true for premium look
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('wfh_dark_mode');
    if (saved !== null) return JSON.parse(saved);
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const toggleTheme = (val) => {
    setIsDarkMode(val);
    localStorage.setItem('wfh_dark_mode', JSON.stringify(val));
  };

  // ── PREMIUM THEME ─────────────────────────────────────────────────
  const theme = useMemo(() => createTheme({
    palette: {
      mode: isDarkMode ? 'dark' : 'light',
      primary: {
        main:          '#66B539',
        light:         isDarkMode ? '#85d156' : '#e2f5d7',
        dark:          '#4d8b28',
        contrastText:  '#ffffff',
      },
      secondary: {
        main:  isDarkMode ? '#374148' : '#151B1F',
        light: isDarkMode ? '#4a5560' : '#374148',
        dark:  isDarkMode ? '#151B1F' : '#0a0d0f',
      },
      error:   { main: '#ef4444' },
      warning: { main: '#f59e0b' },
      success: { main: '#66B539' },
      info:    { main: '#3b82f6' },
      background: {
        default: isDarkMode ? '#151B1F' : '#E8F7DD',
        paper:   isDarkMode ? '#1c242a' : '#ffffff',
      },
      text: {
        primary:   isDarkMode ? '#F3F4F6' : '#151B1F',
        secondary: isDarkMode ? '#8A949F' : '#374148',
      },
      divider: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(21, 27, 31, 0.08)',
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
              ? 'rgba(28, 36, 42, 0.8)'
              : '#ffffff',
            backdropFilter: isDarkMode ? 'blur(20px)' : 'none',
            WebkitBackdropFilter: isDarkMode ? 'blur(20px)' : 'none',
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
              ? 'linear-gradient(135deg, #66B539 0%, #85d156 100%)'
              : 'linear-gradient(135deg, #4d8b28 0%, #66B539 100%)',
            boxShadow: isDarkMode
              ? '0 4px 16px rgba(102, 181, 57, 0.4)'
              : '0 4px 12px rgba(77, 139, 40, 0.3)',
            '&:hover': {
              background: isDarkMode
                ? 'linear-gradient(135deg, #4d8b28 0%, #66B539 100%)'
                : 'linear-gradient(135deg, #3c6e1e 0%, #4d8b28 100%)',
              boxShadow: isDarkMode
                ? '0 6px 24px rgba(102, 181, 57, 0.5)'
                : '0 6px 20px rgba(77, 139, 40, 0.4)',
              transform: 'translateY(-1px)',
            },
          },
          containedSuccess: {
            background: 'linear-gradient(135deg, #4d8b28 0%, #66B539 100%)',
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
                ? '0 0 0 3px rgba(102, 181, 57, 0.2)'
                : '0 0 0 3px rgba(102, 181, 57, 0.15)',
            },
          },
        },
      },

      // ── Drawer / Sidebar ───────────────────────────────────────────
      MuiDrawer: {
        styleOverrides: {
          paper: {
            background: isDarkMode
              ? 'rgba(21, 27, 31, 0.85)'
              : '#ffffff',
            backdropFilter: isDarkMode ? 'blur(24px)' : 'none',
            WebkitBackdropFilter: isDarkMode ? 'blur(24px)' : 'none',
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
              ? 'rgba(21, 27, 31, 0.7)'
              : 'rgba(255,255,255,0.9)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
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
              ? 'rgba(28, 36, 42, 0.85)'
              : '#ffffff',
            backdropFilter: isDarkMode ? 'blur(16px)' : 'none',
            WebkitBackdropFilter: isDarkMode ? 'blur(16px)' : 'none',
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
            background: 'linear-gradient(135deg, #66B539, #4d8b28)',
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
    if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
      return <Navigate to={(user?.role === 'Manager' || user?.role === 'SuperAdmin') ? '/manager/dashboard' : '/dashboard'} replace />;
    }
    return (
      <DashboardLayout isDarkMode={isDarkMode} setIsDarkMode={toggleTheme}>
        {children}
      </DashboardLayout>
    );
  };

  const isElectron = window.api !== undefined;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <CustomTitlebar />
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          pt: isElectron ? '32px' : 0,
          border: isElectron ? '1px solid rgba(102, 181, 57, 0.2)' : 'none',
          boxShadow: isElectron ? '0 0 30px rgba(102, 181, 57, 0.15)' : 'none',
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

          {/* User Settings */}
          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />

          {/* Employee Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute allowedRoles={['Employee']}>
              <EmployeeDashboard />
            </ProtectedRoute>
          } />
          <Route path="/tasks" element={
            <ProtectedRoute allowedRoles={['Employee']}>
              <MyTasks />
            </ProtectedRoute>
          } />
          <Route path="/reports" element={
            <ProtectedRoute allowedRoles={['Employee']}>
              <WorkReports />
            </ProtectedRoute>
          } />
          <Route path="/attendance-logs" element={
            <ProtectedRoute allowedRoles={['Employee']}>
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
            <ProtectedRoute allowedRoles={['SuperAdmin']}>
              <EmployeeList />
            </ProtectedRoute>
          } />
          <Route path="/manager/admins" element={
            <ProtectedRoute allowedRoles={['SuperAdmin']}>
              <AdminList />
            </ProtectedRoute>
          } />
          <Route path="/manager/settings" element={
            <ProtectedRoute allowedRoles={['Manager', 'SuperAdmin']}>
              <ManagerSettings />
            </ProtectedRoute>
          } />

          {/* Wildcard redirects */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
      </Box>
    </ThemeProvider>
  );
}

export default App;
