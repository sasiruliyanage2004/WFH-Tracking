// frontend/src/pages/EmployeeList.js
import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Chip,
  Grid,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
  IconButton,
  Tooltip,
  Paper,
  Snackbar
} from '@mui/material';
import {
  Search as SearchIcon,
  People as PeopleIcon,
  Monitor as MonitorIcon,
  Delete as DeleteIcon,
  Email as EmailIcon,
  Business as DepartmentIcon,
  CalendarToday as JoinedIcon,
  FiberManualRecord as StatusDotIcon,
  FilterList as FilterIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
  LockOpen as LockOpenIcon,
  AccessTime as TimeIcon
} from '@mui/icons-material';
import CustomLoader from '../components/CustomLoader';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Status color mapping
const statusConfig = {
  'Active': { color: 'success', dot: '#22c55e', label: 'Active' },
  'Checked Out': { color: 'default', dot: '#94a3b8', label: 'Checked Out' },
  'Absent': { color: 'error', dot: '#ef4444', label: 'Absent' },
};
const getStatusConfig = (status) => {
  if (status?.startsWith('On Break')) return { color: 'warning', dot: '#f59e0b', label: status };
  return statusConfig[status] || { color: 'default', dot: '#94a3b8', label: status };
};

function EmployeeList() {
  const { token } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  const [employees, setEmployees] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [statusConfirm, setStatusConfirm] = useState(null);
  const [unlockConfirm, setUnlockConfirm] = useState(null);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [lastDeletedEmp, setLastDeletedEmp] = useState(null);
  const pendingDeleteRef = useRef(null);
  const timeoutIdRef = useRef(null);

  useEffect(() => {
    return () => {
      if (pendingDeleteRef.current) {
        clearTimeout(timeoutIdRef.current);
        pendingDeleteRef.current();
      }
    };
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/users/employees`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmployees(res.data);
      setFiltered(res.data);
    } catch (err) {
      console.error('Failed to fetch employees:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Filter logic
  useEffect(() => {
    let result = [...employees];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.department?.toLowerCase().includes(q)
      );
    }
    if (deptFilter !== 'All') {
      result = result.filter(e => e.department === deptFilter);
    }
    if (statusFilter !== 'All') {
      if (statusFilter === 'On Break') {
        result = result.filter(e => e.todayStatus?.startsWith('On Break'));
      } else {
        result = result.filter(e => e.todayStatus === statusFilter);
      }
    }
    setFiltered(result);
  }, [search, deptFilter, statusFilter, employees]);

  const departments = ['All', ...Array.from(new Set(employees.map(e => e.department).filter(Boolean)))];

  const handleDeleteConfirm = () => {
    if (!deleteConfirm) return;

    // Immediately execute any previous pending delete
    if (pendingDeleteRef.current) {
      clearTimeout(timeoutIdRef.current);
      pendingDeleteRef.current();
    }

    const empToDelete = deleteConfirm;

    // Optimistically remove from local state
    setEmployees(prev => prev.filter(e => e._id !== empToDelete._id));

    // Define the actual delete execution
    const performDelete = async () => {
      try {
        await axios.delete(`${API_URL}/api/users/employees/${empToDelete._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (err) {
        console.error('Delete failed:', err.message);
        // Restore employee list on failure
        fetchEmployees();
      } finally {
        if (pendingDeleteRef.current === performDelete) {
          pendingDeleteRef.current = null;
        }
      }
    };

    pendingDeleteRef.current = performDelete;
    setLastDeletedEmp(empToDelete);
    setDeleteConfirm(null);
    setSnackbarOpen(true);

    // Schedule actual delete after 6 seconds
    timeoutIdRef.current = setTimeout(() => {
      if (pendingDeleteRef.current === performDelete) {
        performDelete();
        setSnackbarOpen(false);
      }
    }, 6000);
  };

  const handleUndoDelete = () => {
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
    }
    if (lastDeletedEmp) {
      setEmployees(prev => [...prev, lastDeletedEmp]);
    }
    pendingDeleteRef.current = null;
    setLastDeletedEmp(null);
    setSnackbarOpen(false);
  };

  const handleStatusConfirm = async () => {
    if (!statusConfirm) return;
    const empToToggle = statusConfirm;
    const newStatus = !empToToggle.isActive;

    try {
      await axios.put(`${API_URL}/api/users/employees/${empToToggle._id}/status`, { isActive: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmployees(prev => prev.map(e => e._id === empToToggle._id ? { ...e, isActive: newStatus } : e));
    } catch (err) {
      console.error('Status toggle failed:', err.message);
    } finally {
      setStatusConfirm(null);
      if (selectedEmp?._id === empToToggle._id) {
        setSelectedEmp(prev => ({ ...prev, isActive: newStatus }));
      }
    }
  };

  const handleUnlockConfirm = async () => {
    if (!unlockConfirm) return;
    const empToUnlock = unlockConfirm;

    try {
      await axios.put(`${API_URL}/api/users/employees/${empToUnlock._id}/unlock`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmployees(prev => prev.map(e => e._id === empToUnlock._id ? { ...e, is_locked: false, failed_login_attempts: 0 } : e));
    } catch (err) {
      console.error('Unlock failed:', err.message);
    } finally {
      setUnlockConfirm(null);
      if (selectedEmp?._id === empToUnlock._id) {
        setSelectedEmp(prev => ({ ...prev, is_locked: false, failed_login_attempts: 0 }));
      }
    }
  };

  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') return;
    setSnackbarOpen(false);
  };

  // Summary stats
  const totalActive = employees.filter(e => e.todayStatus === 'Active').length;
  const totalAbsent = employees.filter(e => e.todayStatus === 'Absent').length;
  const totalOnBreak = employees.filter(e => e.todayStatus?.startsWith('On Break')).length;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CustomLoader />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.025em' }}>
            Employee Directory
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 500 }}>
            {employees.length} registered employees · Live status as of today
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<PeopleIcon />}
          onClick={fetchEmployees}
          sx={{ borderRadius: 2 }}
        >
          Refresh List
        </Button>
      </Box>

      {/* Summary Stats Row */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Total Employees', value: employees.length, color: 'primary.main', bg: 'primary.light' },
          { label: 'Active Now', value: totalActive, color: '#22c55e', bg: '#dcfce7' },
          { label: 'On Break', value: totalOnBreak, color: '#f59e0b', bg: '#fef3c7' },
          { label: 'Absent Today', value: totalAbsent, color: '#ef4444', bg: '#fee2e2' },
        ].map(({ label, value, color, bg }) => (
          <Grid item xs={6} sm={3} key={label}>
            <Card sx={{ borderRadius: 3, p: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.7rem' }}>
                {label}
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color, mt: 0.5 }}>
                {value}
              </Typography>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Filters Bar */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <FilterIcon color="action" sx={{ display: { xs: 'none', sm: 'block' } }} />
        <TextField
          placeholder="Search name, email, department..."
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          sx={{ minWidth: 260, flexGrow: 1 }}
        />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Department</InputLabel>
          <Select value={deptFilter} label="Department" onChange={(e) => setDeptFilter(e.target.value)}>
            {departments.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Status</InputLabel>
          <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
            <MenuItem value="All">All Statuses</MenuItem>
            <MenuItem value="Active">Active</MenuItem>
            <MenuItem value="On Break">On Break</MenuItem>
            <MenuItem value="Checked Out">Checked Out</MenuItem>
            <MenuItem value="Absent">Absent</MenuItem>
          </Select>
        </FormControl>
      </Paper>

      {/* Employee Cards Grid */}
      {filtered.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <PeopleIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">No employees found</Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>Try adjusting filters or search terms</Typography>
        </Box>
      ) : (
        <Grid container spacing={2.5}>
          {filtered.map((emp) => {
            const sc = getStatusConfig(emp.todayStatus);
            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={emp._id}>
                <Card
                  sx={{
                    borderRadius: 3,
                    height: '100%',
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    '&:hover': { transform: 'translateY(-3px)', boxShadow: 6 }
                  }}
                  onClick={() => setSelectedEmp(emp)}
                >
                  <CardContent sx={{ p: 3 }}>
                    {/* Avatar + Name */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Avatar
                        src={emp.profilePic || ''}
                        alt={emp.name}
                        sx={{ width: 52, height: 52, bgcolor: 'primary.main', fontSize: '1.2rem', fontWeight: 700 }}
                      >
                        {emp.name.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }} noWrap>
                          {emp.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                          {emp.email}
                        </Typography>
                      </Box>
                    </Box>

                    {!emp.isActive && (
                      <Box sx={{ mb: 1.5 }}>
                        <Chip
                          label="INACTIVE"
                          size="small"
                          color="error"
                          sx={{ fontSize: '0.7rem', fontWeight: 700, height: 20 }}
                        />
                      </Box>
                    )}

                    {/* Department chip */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                      <Chip
                        icon={<DepartmentIcon sx={{ fontSize: '14px !important' }} />}
                        label={emp.department || 'N/A'}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.72rem', height: 24 }}
                      />
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <StatusDotIcon sx={{ fontSize: 10, color: sc.dot }} />
                        <Typography variant="caption" sx={{ fontWeight: 600, color: sc.dot, fontSize: '0.72rem' }}>
                          {sc.label}
                        </Typography>
                      </Box>
                    </Box>

                    <Divider sx={{ my: 1.5 }} />

                    {/* Action buttons */}
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<MonitorIcon />}
                        onClick={(e) => { e.stopPropagation(); navigate(`/manager/monitoring/${emp._id}`); }}
                        sx={{ flex: 1, fontSize: '0.72rem', py: 0.5 }}
                      >
                        Monitor
                      </Button>
                      <Tooltip title={emp.isActive ? "Deactivate Employee" : "Activate Employee"}>
                        <IconButton
                          size="small"
                          color={emp.isActive ? "warning" : "success"}
                          onClick={(e) => { e.stopPropagation(); setStatusConfirm(emp); }}
                          sx={{ border: '1px solid', borderColor: emp.isActive ? 'warning.light' : 'success.light', borderRadius: 1.5 }}
                        >
                          {emp.isActive ? <BlockIcon fontSize="small" /> : <CheckCircleIcon fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Employee">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirm(emp); }}
                          sx={{ border: '1px solid', borderColor: 'error.light', borderRadius: 1.5 }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Employee Detail Dialog */}
      <Dialog
        open={Boolean(selectedEmp)}
        onClose={() => setSelectedEmp(null)}
        maxWidth="sm"
        fullWidth
      >
        {selectedEmp && (
          <>
            <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
              Employee Details
            </DialogTitle>
            <DialogContent>
              {/* Profile header */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3, p: 3, borderRadius: 3, bgcolor: 'action.hover' }}>
                <Avatar
                  src={selectedEmp.profilePic || ''}
                  alt={selectedEmp.name}
                  sx={{ width: 72, height: 72, bgcolor: 'primary.main', fontSize: '1.8rem', fontWeight: 700 }}
                >
                  {selectedEmp.name.charAt(0).toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 800 }}>{selectedEmp.name}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                    <StatusDotIcon sx={{ fontSize: 10, color: getStatusConfig(selectedEmp.todayStatus).dot }} />
                    <Typography variant="body2" sx={{ color: getStatusConfig(selectedEmp.todayStatus).dot, fontWeight: 600 }}>
                      {getStatusConfig(selectedEmp.todayStatus).label}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    <Chip label={selectedEmp.role} size="small" color="primary" sx={{ fontWeight: 700, fontSize: '0.72rem' }} />
                    {!selectedEmp.isActive && (
                      <Chip label="INACTIVE" size="small" color="error" sx={{ fontWeight: 700, fontSize: '0.72rem' }} />
                    )}
                    {selectedEmp.is_locked && (
                      <Chip label="LOCKED" size="small" color="error" sx={{ fontWeight: 700, fontSize: '0.72rem' }} />
                    )}
                  </Box>
                </Box>
              </Box>

              {/* Detail rows */}
              {[
                { icon: <EmailIcon fontSize="small" />, label: 'Email', value: selectedEmp.email },
                { icon: <DepartmentIcon fontSize="small" />, label: 'Department', value: selectedEmp.department || 'N/A' },
                { icon: <JoinedIcon fontSize="small" />, label: 'Member Since', value: new Date(selectedEmp.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) },
                { icon: <TimeIcon fontSize="small" />, label: 'Last Login', value: selectedEmp.last_login ? new Date(selectedEmp.last_login).toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never Logged In' }
              ].map(({ icon, label, value }) => (
                <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Box sx={{ color: 'text.secondary', display: 'flex' }}>{icon}</Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.68rem' }}>
                      {label}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{value}</Typography>
                  </Box>
                </Box>
              ))}
            </DialogContent>
            <DialogActions sx={{ p: 2.5, gap: 1 }}>
              <Button onClick={() => setSelectedEmp(null)} color="inherit">Close</Button>
              <Button
                variant="outlined"
                color={selectedEmp.isActive ? "warning" : "success"}
                startIcon={selectedEmp.isActive ? <BlockIcon /> : <CheckCircleIcon />}
                onClick={() => { setStatusConfirm(selectedEmp); }}
              >
                {selectedEmp.isActive ? "Deactivate" : "Activate"}
              </Button>
              {selectedEmp.is_locked && (
                <Button
                  variant="contained"
                  color="info"
                  startIcon={<LockOpenIcon />}
                  onClick={() => { setUnlockConfirm(selectedEmp); }}
                >
                  Unlock
                </Button>
              )}
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => { setDeleteConfirm(selectedEmp); setSelectedEmp(null); }}
              >
                Delete
              </Button>
              <Button
                variant="contained"
                startIcon={<MonitorIcon />}
                onClick={() => { setSelectedEmp(null); navigate(`/manager/monitoring/${selectedEmp._id}`); }}
              >
                View Monitor
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Status Confirm Dialog */}
      <Dialog open={Boolean(statusConfirm)} onClose={() => setStatusConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: statusConfirm?.isActive ? 'warning.main' : 'success.main' }}>
          {statusConfirm?.isActive ? '⚠️ Deactivate Employee' : '✅ Activate Employee'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Are you sure you want to {statusConfirm?.isActive ? 'deactivate' : 'activate'} <strong>{statusConfirm?.name}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {statusConfirm?.isActive 
              ? 'An inactive employee will not be able to log in to the system, but their data will be preserved.' 
              : 'Activating this employee will restore their access to log in.'}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setStatusConfirm(null)} color="inherit">Cancel</Button>
          <Button onClick={handleStatusConfirm} variant="contained" color={statusConfirm?.isActive ? "warning" : "success"}>
            {statusConfirm?.isActive ? 'Deactivate' : 'Activate'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Unlock Confirm Dialog */}
      <Dialog open={Boolean(unlockConfirm)} onClose={() => setUnlockConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: 'info.main' }}>
          🔓 Unlock Employee Account
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Are you sure you want to unlock the account for <strong>{unlockConfirm?.name}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This will reset their failed login attempts and allow them to log in again immediately.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setUnlockConfirm(null)} color="inherit">Cancel</Button>
          <Button onClick={handleUnlockConfirm} variant="contained" color="info">
            Unlock Account
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={Boolean(deleteConfirm)} onClose={() => setDeleteConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: 'error.main' }}>⚠️ Delete Employee</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Are you sure you want to delete <strong>{deleteConfirm?.name}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This action cannot be undone. All associated data will remain in the system.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setDeleteConfirm(null)} color="inherit">Cancel</Button>
          <Button onClick={handleDeleteConfirm} variant="contained" color="error">Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Undo Delete Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        sx={{ zIndex: 10000 }}
      >
        <Paper
          elevation={12}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            px: 2.5,
            py: 1.5,
            bgcolor: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: 3,
            color: '#fff',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
            minWidth: 320,
            animation: 'slideIn 0.3s ease-out',
            '@keyframes slideIn': {
              '0%': { transform: 'translateY(100%) scale(0.9)', opacity: 0 },
              '100%': { transform: 'translateY(0) scale(1)', opacity: 1 },
            }
          }}
        >
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Employee Deleted
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              {lastDeletedEmp?.name} has been removed.
            </Typography>
          </Box>
          <Button
            size="small"
            color="error"
            variant="contained"
            onClick={handleUndoDelete}
            sx={{
              fontWeight: 700,
              textTransform: 'uppercase',
              borderRadius: 2,
              px: 2,
              py: 0.5,
              fontSize: '0.75rem',
              boxShadow: '0 0 10px rgba(239, 68, 68, 0.4)',
              transition: 'all 0.2s',
              '&:hover': {
                bgcolor: 'error.dark',
                transform: 'scale(1.05)',
              }
            }}
          >
            Undo
          </Button>
        </Paper>
      </Snackbar>
    </Box>
  );
}

export default EmployeeList;
