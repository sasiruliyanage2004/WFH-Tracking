import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  Grid,
  Paper,
  Chip,
  Button,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import {
  Business as BusinessIcon,
  People as PeopleIcon,
  AdminPanelSettings as AdminIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  ContentCopy as CopyIcon
} from '@mui/icons-material';
import CustomLoader from '../components/CustomLoader';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function SystemAdmin() {
  const { token, user } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  
  // Create Company Modal State
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyEmail, setNewCompanyEmail] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  // Success Modal State
  const [openSuccessModal, setOpenSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState(null);

  useEffect(() => {
    if (user?.role !== 'SystemAdmin') {
      navigate('/dashboard');
      return;
    }
    fetchCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate]);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/system/companies`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCompanies(res.data);
    } catch (err) {
      console.error('Failed to fetch companies:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleCompanyStatus = async (companyId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await axios.put(`${API_URL}/api/system/companies/${companyId}/status`, 
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCompanies(prev => prev.map(c => 
        c.id === companyId ? { ...c, status: newStatus } : c
      ));
    } catch (err) {
      console.error('Failed to toggle company status:', err.message);
      alert('Failed to update company status. Try again.');
    }
  };

  const handleCreateCompany = async (e) => {
    e.preventDefault();
    setCreateError('');
    setCreateLoading(true);
    
    try {
      const payload = { companyName: newCompanyName };
      if (newCompanyEmail) payload.email = newCompanyEmail;

      const res = await axios.post(`${API_URL}/api/system/companies`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccessData({
        companyId: res.data.company.id,
        email: res.data.admin.email,
        password: res.data.tempPassword
      });
      
      setOpenCreateModal(false);
      setNewCompanyName('');
      setNewCompanyEmail('');
      setOpenSuccessModal(true);
      fetchCompanies();
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Failed to create company.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!successData) return;
    const text = `Company ID: ${successData.companyId}\nAdmin Email: ${successData.email}\nTemporary Password: ${successData.password}\n\nPlease log in and change your password immediately.`;
    navigator.clipboard.writeText(text);
    alert('Credentials copied to clipboard!');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CustomLoader />
      </Box>
    );
  }

  const activeCount = companies.filter(c => c.status === 'active').length;
  const inactiveCount = companies.filter(c => c.status === 'inactive').length;

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const getFilteredCompanies = () => {
    if (tabValue === 0) return companies.filter(c => c.status === 'active');
    return companies.filter(c => c.status === 'inactive');
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.025em', display: 'flex', alignItems: 'center', gap: 1 }}>
            <AdminIcon color="primary" fontSize="large" /> Platform Owner Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 500 }}>
            Manage registered companies and their access to the system
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchCompanies}
            sx={{ borderRadius: 2 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setOpenCreateModal(true)}
            sx={{ borderRadius: 2, fontWeight: 700 }}
          >
            Add New Company
          </Button>
        </Box>
      </Box>

      {/* Summary Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6}>
          <Card sx={{ borderRadius: 3, p: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
              Active Companies
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: 'success.main', mt: 0.5 }}>
              {activeCount}
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Card sx={{ borderRadius: 3, p: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
              Deactivated
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: 'error.main', mt: 0.5 }}>
              {inactiveCount}
            </Typography>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label={`Active (${activeCount})`} />
          <Tab label={`Deactivated (${inactiveCount})`} />
        </Tabs>
      </Box>

      {/* Company List */}
      <Grid container spacing={3}>
        {getFilteredCompanies().map(company => (
          <Grid item xs={12} md={6} lg={4} key={company.id}>
            <Card sx={{ 
              borderRadius: 3, 
              border: '1px solid',
              borderColor: company.status === 'active' ? 'success.light' : 'error.light',
              bgcolor: company.status === 'active' ? 'background.paper' : 'rgba(239, 68, 68, 0.02)',
              transition: 'all 0.2s',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 }
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ 
                      p: 1.5, 
                      borderRadius: 2, 
                      bgcolor: company.status === 'active' ? 'primary.light' : 'grey.200',
                      color: company.status === 'active' ? 'primary.main' : 'grey.500'
                    }}>
                      <BusinessIcon />
                    </Box>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                        {company.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Joined: {new Date(company.created_at).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </Box>
                  <Chip 
                    label={company.status.toUpperCase()} 
                    size="small"
                    color={company.status === 'active' ? 'success' : 'error'}
                    sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                  />
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3, color: 'text.secondary' }}>
                  <PeopleIcon fontSize="small" />
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {company.users[0]?.count || 0} Employees
                  </Typography>
                </Box>

                <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {company.status === 'active' ? 'Access Granted' : 'Access Revoked'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {company.status === 'active' ? 'Users can log in' : 'Users are blocked'}
                    </Typography>
                  </Box>
                  <Switch 
                    checked={company.status === 'active'}
                    onChange={() => toggleCompanyStatus(company.id, company.status)}
                    color="success"
                  />
                </Paper>
              </CardContent>
            </Card>
          </Grid>
        ))}
        {companies.length === 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3, bgcolor: 'background.default' }}>
              <Typography color="text.secondary">No companies registered yet.</Typography>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Create Company Modal */}
      <Dialog open={openCreateModal} onClose={() => setOpenCreateModal(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Add New Company</DialogTitle>
        <form onSubmit={handleCreateCompany}>
          <DialogContent dividers>
            {createError && (
              <Paper sx={{ p: 1.5, mb: 2, bgcolor: 'error.light', color: 'error.contrastText', borderRadius: 2 }}>
                <Typography variant="body2">{createError}</Typography>
              </Paper>
            )}
            <TextField
              fullWidth
              label="Company Name"
              variant="outlined"
              required
              value={newCompanyName}
              onChange={(e) => setNewCompanyName(e.target.value)}
              sx={{ mb: 3 }}
            />
            <TextField
              fullWidth
              label="Admin Email (Optional)"
              variant="outlined"
              type="email"
              placeholder="Leave blank to auto-generate"
              value={newCompanyEmail}
              onChange={(e) => setNewCompanyEmail(e.target.value)}
              helperText="If left blank, an email will be generated automatically."
            />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setOpenCreateModal(false)} color="inherit" disabled={createLoading}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" color="primary" disabled={createLoading}>
              {createLoading ? 'Creating...' : 'Create Company'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Success Details Modal */}
      <Dialog open={openSuccessModal} onClose={() => setOpenSuccessModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: 'success.main' }}>Company Created Successfully!</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Please copy these credentials and securely send them to the client. They will be forced to change this password on their first login.
          </Typography>
          <Paper sx={{ p: 2, bgcolor: 'grey.900', color: 'grey.100', borderRadius: 2, fontFamily: 'monospace' }}>
            <Typography variant="body2" sx={{ mb: 1 }}><strong>Company ID:</strong> {successData?.companyId}</Typography>
            <Typography variant="body2" sx={{ mb: 1 }}><strong>Admin Email:</strong> {successData?.email}</Typography>
            <Typography variant="body2"><strong>Temporary Password:</strong> {successData?.password}</Typography>
          </Paper>
        </DialogContent>
        <DialogActions sx={{ p: 2, display: 'flex', justifyContent: 'space-between' }}>
          <Button onClick={handleCopyCredentials} variant="outlined" startIcon={<CopyIcon />}>
            Copy to Clipboard
          </Button>
          <Button onClick={() => setOpenSuccessModal(false)} variant="contained" color="primary">
            Done
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default SystemAdmin;
