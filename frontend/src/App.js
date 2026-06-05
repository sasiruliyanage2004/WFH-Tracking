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

function App() {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  
  // Dark mode setting in local storage
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('wfh_dark_mode');
    return saved ? JSON.parse(saved) : true;
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
        main: '#38bdf8', // sky-400
        light: '#e0f2fe',
        dark: '#0284c7',
        contrastText: isDarkMode ? '#0f172a' : '#ffffff'
      },
      secondary: {
        main: '#fb7185' // rose-400
      },
      background: {
        default: isDarkMode ? '#0f172a' : '#f8fafc',
        paper: isDarkMode ? '#1e293b' : '#ffffff'
      },
      text: {
        primary: isDarkMode ? '#f8fafc' : '#0f172a',
        secondary: isDarkMode ? '#94a3b8' : '#475569'
      }
    },
    typography: {
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      button: {
        textTransform: 'none',
        fontWeight: 600
      }
    },
    shape: {
      borderRadius: 12
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            boxShadow: isDarkMode 
              ? '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -4px rgba(0, 0, 0, 0.3)' 
              : '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -4px rgba(0, 0, 0, 0.05)'
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

          {/* Wildcard redirects */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
