// frontend/src/App.js
import React, { useState, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';

// Layout
import DashboardLayout from './components/DashboardLayout';

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
import ManagerSettings from './pages/ManagerSettings';

function App() {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const [showSplash, setShowSplash] = useState(true);
  
  // Dark mode setting in local storage - default to false (light mode)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('wfh_dark_mode');
    return saved ? JSON.parse(saved) : false;
  });

  // Persist dark mode preference
  const toggleTheme = (val) => {
    setIsDarkMode(val);
    localStorage.setItem('wfh_dark_mode', JSON.stringify(val));
  };

  // Modern UI custom styling values
  const theme = useMemo(() => createTheme({
    palette: {
      mode: isDarkMode ? 'dark' : 'light',
      primary: {
        main: isDarkMode ? '#4f8ef7' : '#0038a8', // Vivid electric blue in dark, deep royal blue in light
        light: isDarkMode ? '#7aaeff' : '#e0e7ff',
        dark: isDarkMode ? '#2563eb' : '#002672',
        contrastText: '#ffffff'
      },
      secondary: {
        main: isDarkMode ? '#a78bfa' : '#818cf8' // Bright violet in dark, indigo in light
      },
      error: {
        main: isDarkMode ? '#f87171' : '#ef4444'
      },
      warning: {
        main: isDarkMode ? '#fbbf24' : '#f59e0b'
      },
      success: {
        main: isDarkMode ? '#34d399' : '#10b981'
      },
      background: {
        default: isDarkMode ? '#0a0a0a' : '#f1f5f9', // Pure dark black
        paper: isDarkMode ? '#111111' : '#ffffff'    // Dark charcoal panels
      },
      text: {
        primary: isDarkMode ? '#e2e8f0' : '#0f172a',
        secondary: isDarkMode ? '#7c94b6' : '#475569'
      },
      divider: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0'
    },
    typography: {
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      button: {
        textTransform: 'none',
        fontWeight: 600
      }
    },
    shape: {
      borderRadius: 16
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            background: isDarkMode
              ? 'rgba(20, 20, 20, 0.65)'
              : '#ffffff',
            backdropFilter: isDarkMode ? 'blur(16px)' : 'none',
            WebkitBackdropFilter: isDarkMode ? 'blur(16px)' : 'none',
            border: isDarkMode
              ? '1px solid rgba(255, 255, 255, 0.08)'
              : '1px solid #e2e8f0',
            boxShadow: isDarkMode
              ? '0 8px 32px 0 rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.04)'
              : '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'
          }
        }
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 10
          },
          containedPrimary: {
            background: isDarkMode
              ? 'linear-gradient(135deg, #2563eb 0%, #4f8ef7 100%)'
              : undefined,
            boxShadow: isDarkMode
              ? '0 4px 14px rgba(79, 142, 247, 0.35)'
              : undefined,
            '&:hover': isDarkMode ? {
              background: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
              boxShadow: '0 6px 20px rgba(79, 142, 247, 0.45)'
            } : undefined
          }
        }
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            background: isDarkMode
              ? 'rgba(15, 15, 15, 0.65)'
              : '#ffffff',
            backdropFilter: isDarkMode ? 'blur(20px)' : 'none',
            WebkitBackdropFilter: isDarkMode ? 'blur(20px)' : 'none',
            borderRight: isDarkMode
              ? '1px solid rgba(255, 255, 255, 0.08)'
              : '1px solid #e2e8f0'
          }
        }
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            background: isDarkMode 
              ? 'rgba(15, 15, 15, 0.55)' 
              : '#ffffff',
            backdropFilter: isDarkMode ? 'blur(20px)' : 'none',
            WebkitBackdropFilter: isDarkMode ? 'blur(20px)' : 'none',
            borderBottom: isDarkMode
              ? '1px solid rgba(255, 255, 255, 0.08)'
              : '1px solid #e2e8f0'
          }
        }
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 600
          }
        }
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            background: isDarkMode
              ? 'rgba(25, 25, 25, 0.75)'
              : undefined,
            backdropFilter: isDarkMode ? 'blur(16px)' : 'none',
            WebkitBackdropFilter: isDarkMode ? 'blur(16px)' : 'none',
            border: isDarkMode
              ? '1px solid rgba(255, 255, 255, 0.08)'
              : undefined
          }
        }
      }
    }
  }), [isDarkMode]);

  // Authorization Wrappers
  const ProtectedRoute = ({ children, allowedRoles = [] }) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }
    if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
      return <Navigate to={user?.role === 'Manager' ? '/manager/dashboard' : '/dashboard'} replace />;
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
            <ProtectedRoute allowedRoles={['Manager']}>
              <ManagerDashboard />
            </ProtectedRoute>
          } />

          <Route path="/manager/tasks" element={
            <ProtectedRoute allowedRoles={['Manager']}>
              <ManagerTasks />
            </ProtectedRoute>
          } />

          <Route path="/manager/reports" element={
            <ProtectedRoute allowedRoles={['Manager']}>
              <ManagerReports />
            </ProtectedRoute>
          } />

          <Route path="/manager/monitoring" element={
            <ProtectedRoute allowedRoles={['Manager']}>
              <ManagerMonitoring />
            </ProtectedRoute>
          } />

          <Route path="/manager/monitoring/:employeeId" element={
            <ProtectedRoute allowedRoles={['Manager']}>
              <EmployeeMonitoring />
            </ProtectedRoute>
          } />

          <Route path="/manager/employees" element={
            <ProtectedRoute allowedRoles={['Manager']}>
              <EmployeeList />
            </ProtectedRoute>
          } />

          <Route path="/manager/settings" element={
            <ProtectedRoute allowedRoles={['Manager']}>
              <ManagerSettings />
            </ProtectedRoute>
          } />

          {/* Wildcard redirects */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
