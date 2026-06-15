// frontend/src/pages/AdminList.js
import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import {
  Box,
  Alert,
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
  Paper
} from '@mui/material';
import {
  Search as SearchIcon,
  People as PeopleIcon,
  Delete as DeleteIcon,
  Email as EmailIcon,
  Business as DepartmentIcon,
  CalendarToday as JoinedIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import CustomLoader from '../components/CustomLoader';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function AdminList() {
  const { token, user } = useSelector((state) => state.auth);

  const [admins, setAdmins] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [roleFilter, setRoleFilter] = useState('All');
  const [selectedAdm, setSelectedAdm] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await axios.get(`${API_URL}/api/users/admins`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAdmins(res.data || []);
      setFiltered(res.data || []);
    } catch (err) {
      console.error('Failed to fetch admins:', err.message);
      setErrorMsg(err.response?.data?.message || 'Failed to load administrator accounts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchAdmins();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Filter logic
  useEffect(() => {
    let result = [...admins];
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
    if (roleFilter !== 'All') {
      result = result.filter(e => e.role === roleFilter);
    }
    setFiltered(result);
  }, [search, deptFilter, roleFilter, admins]);

  const departments = ['All', ...Array.from(new Set(admins.map(e => e.department).filter(Boolean)))];

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      setErrorMsg('');
      await axios.delete(`${API_URL}/api/users/admins/${deleteConfirm._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDeleteConfirm(null);
      fetchAdmins();
    } catch (err) {
      console.error('Delete failed:', err.message);
      setErrorMsg(err.response?.data?.message || 'Failed to delete administrator account.');
      setDeleteConfirm(null);
    }
  };

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
            Admin Directory
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 500 }}>
            {admins.length} registered admins & managers
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<PeopleIcon />}
          onClick={fetchAdmins}
          sx={{ borderRadius: 2 }}
        >
          Refresh List
        </Button>
      </Box>

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {errorMsg}
        </Alert>
      )}

      {/* Summary Stats Row */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Total Admins', value: admins.length, color: 'primary.main' },
          { label: 'HR Heads (SuperAdmins)', value: admins.filter(a => a.role === 'SuperAdmin').length, color: 'success.main' },
          { label: 'Managers', value: admins.filter(a => a.role === 'Manager').length, color: 'warning.main' }
        ].map(({ label, value, color }) => (
          <Grid item xs={12} sm={4} key={label}>
            <Card sx={{ borderRadius: 3, p: 2, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
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
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Role Type</InputLabel>
          <Select value={roleFilter} label="Role Type" onChange={(e) => setRoleFilter(e.target.value)}>
            <MenuItem value="All">All Roles</MenuItem>
            <MenuItem value="Manager">Manager</MenuItem>
            <MenuItem value="SuperAdmin">HR Head (SuperAdmin)</MenuItem>
          </Select>
        </FormControl>
      </Paper>

      {/* Admin Cards Grid */}
      {filtered.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <PeopleIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">No admin accounts found</Typography>
        </Box>
      ) : (
        <Grid container spacing={2.5}>
          {filtered.map((adm) => {
            const isSelf = adm._id.toString() === user?.id?.toString();
            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={adm._id}>
                <Card
                  sx={{
                    borderRadius: 3,
                    height: '100%',
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    '&:hover': { transform: 'translateY(-3px)', boxShadow: 6 }
                  }}
                  onClick={() => setSelectedAdm(adm)}
                >
                  <CardContent sx={{ p: 3 }}>
                    {/* Avatar + Name */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Avatar
                        src={adm.profilePic || ''}
                        alt={adm.name}
                        sx={{ width: 52, height: 52, bgcolor: adm.role === 'SuperAdmin' ? 'success.main' : 'primary.main', fontSize: '1.2rem', fontWeight: 700 }}
                      >
                        {adm.name.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }} noWrap>
                          {adm.name} {isSelf && "(You)"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                          {adm.role === 'SuperAdmin' ? 'HR Head' : 'Manager'}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Department Info */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                      <Chip
                        icon={<DepartmentIcon sx={{ fontSize: '14px !important' }} />}
                        label={adm.department || 'N/A'}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.72rem', height: 24 }}
                      />
                    </Box>

                    <Divider sx={{ my: 1.5 }} />

                    {/* Action buttons */}
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={(e) => { e.stopPropagation(); setSelectedAdm(adm); }}
                        sx={{ flex: 1, fontSize: '0.72rem', py: 0.5 }}
                      >
                        View Profile
                      </Button>
                      {!isSelf && (
                        <Tooltip title="Delete Admin">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirm(adm); }}
                            sx={{ border: '1px solid', borderColor: 'error.light', borderRadius: 1.5 }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Admin Detail Dialog */}
      <Dialog
        open={Boolean(selectedAdm)}
        onClose={() => setSelectedAdm(null)}
        maxWidth="sm"
        fullWidth
      >
        {selectedAdm && (
          <>
            <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
              Administrator Details
            </DialogTitle>
            <DialogContent>
              {/* Profile header */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3, p: 3, borderRadius: 3, bgcolor: 'action.hover' }}>
                <Avatar
                  src={selectedAdm.profilePic || ''}
                  alt={selectedAdm.name}
                  sx={{ width: 72, height: 72, bgcolor: selectedAdm.role === 'SuperAdmin' ? 'success.main' : 'primary.main', fontSize: '1.8rem', fontWeight: 700 }}
                >
                  {selectedAdm.name.charAt(0).toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 800 }}>{selectedAdm.name}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    {selectedAdm.role === 'SuperAdmin' ? 'HR Head (SuperAdmin)' : 'Department Manager'}
                  </Typography>
                </Box>
              </Box>

              {/* Detail rows */}
              {[
                { icon: <EmailIcon fontSize="small" />, label: 'Email', value: selectedAdm.email },
                { icon: <DepartmentIcon fontSize="small" />, label: 'Department', value: selectedAdm.department || 'N/A' },
                { icon: <JoinedIcon fontSize="small" />, label: 'Registered on', value: new Date(selectedAdm.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) },
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
              <Button onClick={() => setSelectedAdm(null)} color="inherit">Close</Button>
              {selectedAdm._id.toString() !== user?.id?.toString() && (
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => { setDeleteConfirm(selectedAdm); setSelectedAdm(null); }}
                >
                  Delete Account
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={Boolean(deleteConfirm)} onClose={() => setDeleteConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: 'error.main' }}>⚠️ Delete Administrator Account</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Are you sure you want to delete the administrator account for <strong>{deleteConfirm?.name}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This action cannot be undone. All associated manager details will be removed from the system.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setDeleteConfirm(null)} color="inherit">Cancel</Button>
          <Button onClick={handleDelete} variant="contained" color="error">Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default AdminList;
