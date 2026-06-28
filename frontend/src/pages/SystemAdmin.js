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
  ContentCopy as CopyIcon,
  Campaign as CampaignIcon,
  BarChart as BarChartIcon,
  Domain as DomainIcon
} from '@mui/icons-material';
import CustomLoader from '../components/CustomLoader';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function SystemAdmin() {
  const { token, user } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0); // For active/inactive companies
  const [masterTab, setMasterTab] = useState(0); // 0=Overview, 1=Companies, 2=Announcements
  
  // New States
  const [analytics, setAnalytics] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [announcementLoading, setAnnouncementLoading] = useState(false);
  
  // Create Company Modal State
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyEmail, setNewCompanyEmail] = useState('');
  const [newRegistrationNumber, setNewRegistrationNumber] = useState('');
  const [newIndustry, setNewIndustry] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newWebsite, setNewWebsite] = useState('');
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
    if (masterTab === 0) fetchAnalytics();
    if (masterTab === 1) fetchCompanies();
    if (masterTab === 2) fetchAnnouncements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate, masterTab]);

  const fetchAnalytics = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/system/analytics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnalytics(res.data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/system/announcements`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnnouncements(res.data);
    } catch (err) {
      console.error('Failed to fetch announcements:', err);
    }
  };

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!announcementTitle || !announcementMessage) return;
    setAnnouncementLoading(true);
    try {
      await axios.post(`${API_URL}/api/system/announcements`, 
        { title: announcementTitle, message: announcementMessage },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAnnouncementTitle('');
      setAnnouncementMessage('');
      fetchAnnouncements();
      alert('Announcement broadcasted successfully!');
    } catch (err) {
      alert('Failed to broadcast: ' + err.message);
    } finally {
      setAnnouncementLoading(false);
    }
  };

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

    if (!newCompanyName || !newCompanyEmail || !newRegistrationNumber || !newIndustry || !newLocation) {
      setCreateError('Please fill in all required fields.');
      return;
    }

    setCreateLoading(true);
    
    try {
      const payload = {
        companyName: newCompanyName,
        email: newCompanyEmail,
        registrationNumber: newRegistrationNumber,
        industry: newIndustry,
        location: newLocation,
        website: newWebsite
      };

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
      setNewRegistrationNumber('');
      setNewIndustry('');
      setNewLocation('');
      setNewWebsite('');
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


      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={masterTab} onChange={(e, v) => setMasterTab(v)}>
          <Tab icon={<BarChartIcon />} iconPosition="start" label="Overview & Analytics" />
          <Tab icon={<DomainIcon />} iconPosition="start" label="Manage Companies" />
          <Tab icon={<CampaignIcon />} iconPosition="start" label="Broadcast" />
        </Tabs>
      </Box>

      {masterTab === 0 && (
        <Box>
          <Typography variant="h5" sx={{ mb: 3, fontWeight: 700 }}>Platform Overview</Typography>
          {analytics ? (
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                  <Typography color="text.secondary" variant="body2" sx={{ fontWeight: 600 }}>Total Companies</Typography>
                  <Typography variant="h3" sx={{ mt: 1, fontWeight: 800, color: 'primary.main' }}>{analytics.totalCompanies}</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                  <Typography color="text.secondary" variant="body2" sx={{ fontWeight: 600 }}>Active Companies</Typography>
                  <Typography variant="h3" sx={{ mt: 1, fontWeight: 800, color: 'success.main' }}>{analytics.activeCompanies}</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                  <Typography color="text.secondary" variant="body2" sx={{ fontWeight: 600 }}>Total Users</Typography>
                  <Typography variant="h3" sx={{ mt: 1, fontWeight: 800, color: 'info.main' }}>{analytics.totalUsers}</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                  <Typography color="text.secondary" variant="body2" sx={{ fontWeight: 600 }}>24h Active Users</Typography>
                  <Typography variant="h3" sx={{ mt: 1, fontWeight: 800, color: 'secondary.main' }}>{analytics.dailyActiveUsers}</Typography>
                </Paper>
              </Grid>
            </Grid>
          ) : (
            <CustomLoader />
          )}
        </Box>
      )}

      {masterTab === 1 && (
        <Box>
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

                <Box sx={{ mb: 2, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 650, color: 'text.primary' }}>
                    Reg: {company.registrationNumber || 'N/A'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Industry: {company.industry || 'N/A'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Location: {company.location || 'N/A'}
                  </Typography>
                  {company.website && (
                    <Typography variant="body2">
                      Website: <a href={company.website.startsWith('http') ? company.website : `https://${company.website}`} target="_blank" rel="noopener noreferrer" style={{ color: '#10b981', textDecoration: 'none', fontWeight: 700 }}>
                        {company.website}
                      </a>
                    </Typography>
                  )}
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
        </Box>
      )}

      {masterTab === 2 && (
        <Box>
          <Typography variant="h5" sx={{ mb: 3, fontWeight: 700 }}>Broadcast Announcement</Typography>
          <Paper sx={{ p: 3, borderRadius: 3, mb: 4, border: '1px solid', borderColor: 'divider' }}>
            <form onSubmit={handleBroadcast}>
              <TextField
                fullWidth label="Announcement Title" variant="outlined" required
                value={announcementTitle} onChange={e => setAnnouncementTitle(e.target.value)}
                sx={{ mb: 3 }}
              />
              <TextField
                fullWidth label="Message" variant="outlined" required multiline rows={4}
                value={announcementMessage} onChange={e => setAnnouncementMessage(e.target.value)}
                sx={{ mb: 3 }}
              />
              <Button type="submit" variant="contained" color="primary" disabled={announcementLoading} size="large">
                {announcementLoading ? 'Broadcasting...' : 'Broadcast to All Companies'}
              </Button>
            </form>
          </Paper>

          <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>Announcement History</Typography>
          <Grid container spacing={2}>
            {announcements.map(ann => (
              <Grid item xs={12} key={ann.id}>
                <Paper sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{ann.title}</Typography>
                  <Typography variant="body2" sx={{ mt: 1, mb: 1 }}>{ann.message}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Sent on {new Date(ann.created_at).toLocaleString()} by {ann.created_by_user?.name || 'System Admin'}
                  </Typography>
                </Paper>
              </Grid>
            ))}
            {announcements.length === 0 && (
              <Typography color="text.secondary">No announcements sent yet.</Typography>
            )}
          </Grid>
        </Box>
      )}

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
              label="Admin Email"
              variant="outlined"
              type="email"
              required
              value={newCompanyEmail}
              onChange={(e) => setNewCompanyEmail(e.target.value)}
              sx={{ mb: 3 }}
            />
            <TextField
              fullWidth
              label="Registration Number"
              variant="outlined"
              required
              placeholder="e.g. CRN-12345678"
              value={newRegistrationNumber}
              onChange={(e) => setNewRegistrationNumber(e.target.value)}
              sx={{ mb: 3 }}
            />
            <TextField
              fullWidth
              label="Industry Vertical"
              variant="outlined"
              required
              placeholder="e.g. Technology, Healthcare, Finance"
              value={newIndustry}
              onChange={(e) => setNewIndustry(e.target.value)}
              sx={{ mb: 3 }}
            />
            <TextField
              fullWidth
              label="Headquarters Location"
              variant="outlined"
              required
              placeholder="e.g. Colombo, Sri Lanka"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              sx={{ mb: 3 }}
            />
            <TextField
              fullWidth
              label="Company Website (Optional)"
              variant="outlined"
              placeholder="e.g. www.company.com"
              value={newWebsite}
              onChange={(e) => setNewWebsite(e.target.value)}
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
