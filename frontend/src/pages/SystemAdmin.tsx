import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
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
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  IconButton,
  Divider
} from '@mui/material';
import {
  Business as BusinessIcon,
  People as PeopleIcon,
  ContentCopy as CopyIcon,
  Campaign as CampaignIcon,
  TrendingUp as TrendingUpIcon,
  SecurityUpdateGood as SecurityIcon,
  InfoOutlined as InfoIcon,
  KeyboardArrowRight as ArrowRightIcon,
  GetApp as GetAppIcon,
  LaptopMac as LaptopMacIcon
} from '@mui/icons-material';
import CustomLoader from '../components/CustomLoader';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function SystemAdmin({ activeTab = 0 }) {
  const { token, user } = useSelector((state: any) => state.auth);
  const navigate = useNavigate();

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0); 
  
  const [analytics, setAnalytics] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [announcementColor, setAnnouncementColor] = useState('linear-gradient(90deg, #7c3aed, #2563eb)');
  const [announcementLoading, setAnnouncementLoading] = useState(false);

  const bannerColorPresets = [
    { label: 'Cosmic Violet', value: 'linear-gradient(90deg, #7c3aed, #2563eb)' },
    { label: 'Neon Sunrise', value: 'linear-gradient(90deg, #f97316, #ec4899)' },
    { label: 'Cyber Green', value: 'linear-gradient(90deg, #10b981, #06b6d4)' },
    { label: 'Danger Red', value: 'linear-gradient(90deg, #dc2626, #9f1239)' },
    { label: 'Aurora', value: 'linear-gradient(90deg, #0ea5e9, #8b5cf6)' },
    { label: 'Gold Rush', value: 'linear-gradient(90deg, #d97706, #b45309)' },
    { label: 'Midnight', value: 'linear-gradient(90deg, #1e293b, #334155)' },
    { label: 'Rose Gold', value: 'linear-gradient(90deg, #be185d, #9f1239)' },
    { label: 'Matrix', value: 'linear-gradient(90deg, #15803d, #166534)' },
  ];
  
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyEmail, setNewCompanyEmail] = useState('');
  const [newRegistrationNumber, setNewRegistrationNumber] = useState('');
  const [newIndustry, setNewIndustry] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newWebsite, setNewWebsite] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  const [openSuccessModal, setOpenSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState(null);

  const [openDetailsModal, setOpenDetailsModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);

  const handleViewDetails = (company) => {
    setSelectedCompany(company);
    setOpenDetailsModal(true);
  };

  useEffect(() => {
    if (user?.role !== 'SystemAdmin') {
      navigate('/dashboard');
      return;
    }
    const fetchAllData = async () => {
      setLoading(true);
      try {
        if (activeTab === 0) {
          const results = await Promise.allSettled([
            axios.get(`${API_URL}/api/system/analytics`, { headers: { Authorization: `Bearer ${token}` } }),
            axios.get(`${API_URL}/api/system/companies`, { headers: { Authorization: `Bearer ${token}` } }),
            axios.get(`${API_URL}/api/system/announcements`, { headers: { Authorization: `Bearer ${token}` } })
          ]);
          
          setAnalytics(results[0].status === 'fulfilled' ? results[0].value.data : { totalCompanies: 0, activeCompanies: 0, totalUsers: 0, dailyActiveUsers: 0, deviceCount: 0 });
          setCompanies(results[1].status === 'fulfilled' ? results[1].value.data : []);
          setAnnouncements(results[2].status === 'fulfilled' ? results[2].value.data : []);
        } else if (activeTab === 1) {
          try {
            const companiesRes = await axios.get(`${API_URL}/api/system/companies`, { headers: { Authorization: `Bearer ${token}` } });
            setCompanies(companiesRes.data);
          } catch (e) { setCompanies([]); }
        } else if (activeTab === 2) {
          try {
            const announcementsRes = await axios.get(`${API_URL}/api/system/announcements`, { headers: { Authorization: `Bearer ${token}` } });
            setAnnouncements(announcementsRes.data);
          } catch (e) { setAnnouncements([]); }
        }
      } catch (err) {
        console.error('Data fetch failed:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate, activeTab]);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/system/companies`, { headers: { Authorization: `Bearer ${token}` } });
      setCompanies(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/system/announcements`, { headers: { Authorization: `Bearer ${token}` } });
      setAnnouncements(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!announcementTitle || !announcementMessage) return;
    setAnnouncementLoading(true);
    try {
      await axios.post(`${API_URL}/api/system/announcements`, 
        { title: announcementTitle, message: announcementMessage, color: announcementColor },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAnnouncementTitle('');
      setAnnouncementMessage('');
      setAnnouncementColor('linear-gradient(90deg, #7c3aed, #2563eb)');
      fetchAnnouncements();
      alert('Announcement broadcasted successfully!');
    } catch (err) {
      alert('Failed to broadcast: ' + err.message);
    } finally {
      setAnnouncementLoading(false);
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!window.confirm('Are you sure you want to revoke this broadcast? It will be removed immediately for all users.')) return;
    try {
      await axios.delete(`${API_URL}/api/system/announcements/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      alert('Broadcast revoked successfully.');
    } catch (err) {
      alert('Failed to revoke broadcast: ' + err.message);
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
      console.error('Failed to update status', err);
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
    <Box sx={{ 
      color: 'text.primary', 
      bgcolor: 'background.default', // deep dark background
      minHeight: '100vh',
      m: -3, p: 3, // negate parent padding if any
      fontFamily: "'Inter', sans-serif"
    }}>
      
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 5 }}>
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.03em', mb: 1 }}>
            Platform Overlord
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
            Monitor system health, manage tenant lifecycle, and oversee global performance across the ecosystem.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {!!window.api && (
            <Button
              variant="outlined"
              color="primary"
              onClick={() => window.open('https://wfh-tracking-k5ap.vercel.app', '_blank')}
              sx={{ borderRadius: 2, fontWeight: 700, px: 3, boxShadow: '0 4px 12px rgba(0,225,171,0.1)', mr: 2 }}
            >
              Open Web Dashboard
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<BusinessIcon />}
            onClick={() => setOpenCreateModal(true)}
            sx={{ 
              borderRadius: 2, 
              bgcolor: 'primary.main', 
              color: 'background.default',
              textTransform: 'none',
              fontWeight: 700,
              px: 3,
              boxShadow: '0 0 20px rgba(94, 234, 212, 0.2)',
              '&:hover': { bgcolor: 'success.main', boxShadow: '0 0 30px rgba(74, 222, 128, 0.4)' }
            }}
          >
            Register New Business
          </Button>
        </Box>
      </Box>

      {/* Overview Dashboard Tab */}
      {activeTab === 0 && (
        <Box>
          {analytics ? (
            <Grid container spacing={3} sx={{ mb: 4 }}>
              {/* Card 1: Total Tenants */}
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper', border: '1px solid divider', height: '100%' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                    <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(94, 234, 212, 0.1)' }}>
                      <BusinessIcon sx={{ color: 'primary.main' }} />
                    </Box>
                    <Chip label="+12% this month" size="small" sx={{ bgcolor: 'rgba(94, 234, 212, 0.1)', color: 'primary.main', fontWeight: 600 }} />
                  </Box>
                  <Typography sx={{ color: 'text.secondary', fontWeight: 600, mb: 1 }}>Total Tenants</Typography>
                  <Typography variant="h3" sx={{ fontWeight: 800, color: 'text.primary' }}>{analytics.totalCompanies}</Typography>
                </Paper>
              </Grid>

              {/* Card 2: Total Employees */}
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper', border: '1px solid divider', height: '100%' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                    <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(74, 222, 128, 0.1)' }}>
                      <PeopleIcon sx={{ color: 'success.main' }} />
                    </Box>
                    <Chip label={`+${analytics.dailyActiveUsers} Active`} size="small" sx={{ bgcolor: 'rgba(74, 222, 128, 0.1)', color: 'success.main', fontWeight: 600 }} />
                  </Box>
                  <Typography sx={{ color: 'text.secondary', fontWeight: 600, mb: 1 }}>Total Employees</Typography>
                  <Typography variant="h3" sx={{ fontWeight: 800, color: 'text.primary' }}>{analytics.totalUsers}</Typography>
                </Paper>
              </Grid>

              {/* Card 3: System Uptime */}
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper', border: '1px solid divider', height: '100%' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                    <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(56, 189, 248, 0.1)' }}>
                      <SecurityIcon sx={{ color: 'info.main' }} />
                    </Box>
                    <Chip label="● Healthy" size="small" sx={{ bgcolor: 'rgba(56, 189, 248, 0.1)', color: 'info.main', fontWeight: 600 }} />
                  </Box>
                  <Typography sx={{ color: 'text.secondary', fontWeight: 600, mb: 1 }}>System Uptime</Typography>
                  <Typography variant="h3" sx={{ fontWeight: 800, color: 'text.primary' }}>99.98%</Typography>
                </Paper>
              </Grid>

              {/* Card 4: Daily Active Users */}
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper', border: '1px solid divider', height: '100%' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                    <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(167, 139, 250, 0.1)' }}>
                      <TrendingUpIcon sx={{ color: 'secondary.main' }} />
                    </Box>
                    <Chip label="Target: 2k" size="small" sx={{ bgcolor: 'rgba(167, 139, 250, 0.1)', color: 'secondary.main', fontWeight: 600 }} />
                  </Box>
                  <Typography sx={{ color: 'text.secondary', fontWeight: 600, mb: 1 }}>Daily Active Users</Typography>
                  <Typography variant="h3" sx={{ fontWeight: 800, color: 'text.primary' }}>{analytics.dailyActiveUsers}</Typography>
                </Paper>
              </Grid>

              {/* Card 5: Total Installed Laptops */}
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper', border: '1px solid divider', height: '100%' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                    <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(59, 130, 246, 0.1)' }}>
                      <LaptopMacIcon sx={{ color: 'info.main' }} />
                    </Box>
                    <Chip label="All Regions" size="small" sx={{ bgcolor: 'rgba(59, 130, 246, 0.1)', color: 'info.main', fontWeight: 600 }} />
                  </Box>
                  <Typography sx={{ color: 'text.secondary', fontWeight: 600, mb: 1 }}>Total Installed Laptops</Typography>
                  <Typography variant="h3" sx={{ fontWeight: 800, color: 'text.primary' }}>{analytics.deviceCount || 0}</Typography>
                </Paper>
              </Grid>
            </Grid>
          ) : (
            <CustomLoader />
          )}

          <Grid container spacing={4}>
            {/* Left Column (Table + Map) */}
            <Grid size={{ xs: 12, md: 8 }}>
              
              {/* Active Managed Tenants Table */}
              <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper', border: '1px solid divider', mb: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>Active Managed Tenants</Typography>
                  <Button endIcon={<ArrowRightIcon />} sx={{ color: 'primary.main', textTransform: 'none', fontWeight: 600 }}>
                    View Full Directory
                  </Button>
                </Box>
                
                <TableContainer>
                  <Table sx={{ minWidth: 600 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ color: 'text.secondary', borderBottom: '1px solid divider', fontWeight: 600 }}>Company Name</TableCell>
                        <TableCell sx={{ color: 'text.secondary', borderBottom: '1px solid divider', fontWeight: 600 }}>Active Seats</TableCell>
                        <TableCell sx={{ color: 'text.secondary', borderBottom: '1px solid divider', fontWeight: 600 }}>Status</TableCell>
                        <TableCell align="right" sx={{ color: 'text.secondary', borderBottom: '1px solid divider', fontWeight: 600 }}>Joined</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {companies.slice(0, 5).map((comp) => (
                        <TableRow key={comp.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                          <TableCell sx={{ borderBottom: '1px solid divider' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Avatar variant="rounded" sx={{ bgcolor: 'divider', color: 'text.primary', width: 40, height: 40, fontWeight: 700 }}>
                                {comp.name.substring(0,2).toUpperCase()}
                              </Avatar>
                              <Box>
                                <Typography sx={{ color: 'text.primary', fontWeight: 600 }}>{comp.name}</Typography>
                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>ID: {comp.id.substring(0,8).toUpperCase()}</Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell sx={{ color: 'text.primary', borderBottom: '1px solid divider' }}>
                            {comp.users ? comp.users[0]?.count : 0}
                          </TableCell>
                          <TableCell sx={{ borderBottom: '1px solid divider' }}>
                            <Chip 
                              label={comp.status === 'active' ? 'ENTERPRISE' : 'SUSPENDED'} 
                              size="small" 
                              sx={{ 
                                bgcolor: comp.status === 'active' ? 'rgba(74, 222, 128, 0.1)' : 'rgba(248, 113, 113, 0.1)', 
                                color: comp.status === 'active' ? 'success.main' : 'error.main', 
                                fontWeight: 700,
                                fontSize: '0.7rem',
                                letterSpacing: '0.05em'
                              }} 
                            />
                          </TableCell>
                          <TableCell align="right" sx={{ color: 'text.secondary', borderBottom: '1px solid divider' }}>
                            {new Date(comp.created_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>

            </Grid>

            {/* Right Column (System Alerts) */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>System Alerts</Typography>
                <Chip label="4 CRITICAL" size="small" sx={{ bgcolor: 'rgba(248, 113, 113, 0.1)', color: 'error.main', fontWeight: 700, fontSize: '0.7rem' }} />
              </Box>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>Priority flags requiring immediate action.</Typography>

              {/* Feed Items */}
              {announcements.length > 0 ? (
                <>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {/* Real Announcements history */}
                    {announcements.slice(0,3).map((ann, idx) => (
                      <Paper key={ann.id} sx={{ p: 2.5, borderRadius: 3, bgcolor: 'transparent', border: '1px solid', borderColor: idx === 0 ? 'rgba(248, 113, 113, 0.3)' : 'divider' }}>
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                          <InfoIcon sx={{ color: idx === 0 ? 'error.main' : 'info.main' }} />
                          <Box>
                            <Typography sx={{ color: 'text.primary', fontWeight: 700, mb: 0.5 }}>{ann.title}</Typography>
                            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
                              {ann.message.length > 60 ? ann.message.substring(0, 60) + '...' : ann.message}
                            </Typography>
                            <Typography 
                              onClick={() => handleDeleteAnnouncement(ann.id)}
                              variant="caption" 
                              sx={{ color: 'error.main', fontWeight: 700, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                            >
                              REVOKE BROADCAST
                            </Typography>
                          </Box>
                        </Box>
                      </Paper>
                    ))}
                  </Box>

                  <Button 
                    fullWidth 
                    variant="outlined" 
                    onClick={() => setAnnouncements([])}
                    sx={{ mt: 3, borderRadius: 2, color: 'text.secondary', borderColor: 'divider', textTransform: 'none', py: 1.5, '&:hover': { borderColor: 'divider', color: 'text.primary' } }}
                  >
                    Mark all as read
                  </Button>
                </>
              ) : (
                <Box sx={{ textAlign: 'center', p: 4, bgcolor: 'background.paper', borderRadius: 3, border: '1px dashed divider' }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>All caught up! No new alerts.</Typography>
                </Box>
              )}
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Companies and Broadcast Tabs - Maintained original functionality but with minimal dark theme styling */}
      {activeTab === 1 && (
        <Box>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={tabValue} onChange={handleTabChange} textColor="inherit" sx={{ '& .MuiTabs-indicator': { bgcolor: 'primary.main' } }}>
              <Tab label={`Active (${activeCount})`} sx={{ color: 'text.primary', fontWeight: 600 }} />
              <Tab label={`Inactive (${inactiveCount})`} sx={{ color: 'text.secondary', fontWeight: 600 }} />
            </Tabs>
          </Box>

          <Grid container spacing={3}>
            {getFilteredCompanies().map((company) => (
              <Grid key={company.id} size={{ xs: 12, md: 6, lg: 4 }}>
                <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper', border: '1px solid divider', position: 'relative' }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: 'divider', color: 'text.primary', width: 48, height: 48 }}>
                        <BusinessIcon />
                      </Avatar>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>{company.name}</Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>Registered: {new Date(company.created_at).toLocaleDateString()}</Typography>
                      </Box>
                    </Box>
                    <Chip 
                      label={company.status} 
                      size="small" 
                      sx={{ 
                        bgcolor: company.status === 'active' ? 'rgba(74, 222, 128, 0.1)' : 'rgba(248, 113, 113, 0.1)', 
                        color: company.status === 'active' ? 'success.main' : 'error.main', 
                        fontWeight: 600, textTransform: 'capitalize' 
                      }} 
                    />
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PeopleIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                      <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 500 }}>
                        Users: {company.users ? company.users[0]?.count : 0}
                      </Typography>
                    </Box>
                    <Button size="small" variant="outlined" onClick={() => handleViewDetails(company)} sx={{ textTransform: 'none', borderRadius: 2 }}>
                      View Details
                    </Button>
                  </Box>

                  <Divider sx={{ my: 2, borderColor: 'divider' }} />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Status: {company.status === 'active' ? 'Active' : 'Disabled'}
                    </Typography>
                    <Switch 
                      checked={company.status === 'active'}
                      onChange={() => toggleCompanyStatus(company.id, company.status)}
                      color="primary"
                      sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: 'primary.main' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: 'primary.main' } }}
                    />
                  </Box>
                </Paper>
              </Grid>
            ))}
            {getFilteredCompanies().length === 0 && (
              <Grid size={{ xs: 12 }}>
                <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3, bgcolor: 'background.paper', border: '1px dashed divider' }}>
                  <Typography color="text.secondary">No companies found in this category.</Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
        </Box>
      )}

      {activeTab === 2 && (
        <Box>
          <Typography variant="h5" sx={{ mb: 3, fontWeight: 700, color: 'text.primary' }}>Broadcast Announcement</Typography>
          <Paper sx={{ p: 3, borderRadius: 3, mb: 4, border: '1px solid divider', bgcolor: 'background.paper' }}>
            <form onSubmit={handleBroadcast}>
              <TextField
                fullWidth
                label="Announcement Title"
                variant="outlined"
                margin="normal"
                value={announcementTitle}
                onChange={e => setAnnouncementTitle(e.target.value)}
                required
                sx={{ input: { color: 'text.primary' }, label: { color: 'text.secondary' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'divider' } } }}
              />
              <TextField
                fullWidth
                label="Message Body"
                variant="outlined"
                margin="normal"
                multiline
                rows={4}
                value={announcementMessage}
                onChange={e => setAnnouncementMessage(e.target.value)}
                required
                sx={{ textarea: { color: 'text.primary' }, label: { color: 'text.secondary' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'divider' } } }}
              />

              {/* Banner Color Picker */}
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5, fontWeight: 600 }}>Banner Color</Typography>
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
                  {bannerColorPresets.map(preset => (
                    <Box
                      key={preset.value}
                      onClick={() => setAnnouncementColor(preset.value)}
                      title={preset.label}
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: '10px',
                        background: preset.value,
                        cursor: 'pointer',
                        border: announcementColor === preset.value ? '2px solid white' : '2px solid transparent',
                        boxShadow: announcementColor === preset.value ? `0 0 0 2px #7c3aed` : '0 2px 6px rgba(0,0,0,0.3)',
                        transition: 'all 0.15s ease',
                        '&:hover': { transform: 'scale(1.18)', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' },
                      }}
                    />
                  ))}
                </Box>
                {/* Live Preview */}
                <Box sx={{ mt: 2, borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                  <Box sx={{ background: announcementColor, color: '#fff', px: 2, py: 1.2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CampaignIcon fontSize="small" />
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {announcementTitle || 'Your announcement title'}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.85 }}>
                      — {announcementMessage || 'Message body will appear here.'}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Button
                type="submit"
                variant="contained"
                disabled={announcementLoading}
                startIcon={<CampaignIcon />}
                sx={{ mt: 2, bgcolor: 'primary.main', color: 'background.default', fontWeight: 700, '&:hover': { bgcolor: 'success.main' } }}
              >
                {announcementLoading ? 'Broadcasting...' : 'Broadcast Now'}
              </Button>
            </form>
          </Paper>

          <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, color: 'text.primary' }}>Recent Broadcasts</Typography>
          {announcements.length === 0 ? (
            <Typography color="text.secondary">No announcements have been broadcasted yet.</Typography>
          ) : (
            <Grid container spacing={2}>
              {announcements.map(ann => (
                <Grid key={ann.id} size={{ xs: 12 }}>
                  <Paper sx={{ p: 0, borderRadius: 3, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                    {/* Color accent strip */}
                    <Box sx={{ background: ann.color || 'linear-gradient(90deg, #7c3aed, #2563eb)', height: 6 }} />
                    <Box sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 12, height: 12, borderRadius: '4px', background: ann.color || 'linear-gradient(90deg, #7c3aed, #2563eb)', flexShrink: 0 }} />
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>{ann.title}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {new Date(ann.created_at).toLocaleString()}
                          </Typography>
                          <IconButton size="small" onClick={() => handleDeleteAnnouncement(ann.id)} sx={{ color: 'error.main', ml: 1 }}>
                            <span style={{ fontSize: 16 }}>✕</span>
                          </IconButton>
                        </Box>
                      </Box>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>{ann.message}</Typography>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* Create Company Modal */}
      <Dialog open={openCreateModal} onClose={() => setOpenCreateModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Register New Business</DialogTitle>
        <DialogContent>
          {createError && <Typography color="error" sx={{ mb: 2 }}>{createError}</Typography>}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Company Name" value={newCompanyName} onChange={e => setNewCompanyName(e.target.value)} required sx={{ input: { color: 'text.primary' }, label: { color: 'text.secondary' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'divider' } } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Admin Email" type="email" value={newCompanyEmail} onChange={e => setNewCompanyEmail(e.target.value)} required sx={{ input: { color: 'text.primary' }, label: { color: 'text.secondary' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'divider' } } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Registration Number" value={newRegistrationNumber} onChange={e => setNewRegistrationNumber(e.target.value)} required sx={{ input: { color: 'text.primary' }, label: { color: 'text.secondary' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'divider' } } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Industry" value={newIndustry} onChange={e => setNewIndustry(e.target.value)} required sx={{ input: { color: 'text.primary' }, label: { color: 'text.secondary' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'divider' } } }} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Headquarters Location" value={newLocation} onChange={e => setNewLocation(e.target.value)} required sx={{ input: { color: 'text.primary' }, label: { color: 'text.secondary' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'divider' } } }} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Website (Optional)" value={newWebsite} onChange={e => setNewWebsite(e.target.value)} sx={{ input: { color: 'text.primary' }, label: { color: 'text.secondary' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'divider' } } }} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setOpenCreateModal(false)} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateCompany} disabled={createLoading} sx={{ bgcolor: 'primary.main', color: 'background.default', fontWeight: 700, '&:hover': { bgcolor: 'success.main' } }}>
            {createLoading ? 'Creating...' : 'Register Business'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={openSuccessModal} onClose={() => setOpenSuccessModal(false)} // @ts-ignore
PaperProps={{ sx: { borderRadius: 3, bgcolor: 'background.paper', color: 'text.primary' } }}>
        <DialogTitle sx={{ fontWeight: 700, color: 'success.main' }}>Success!</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>The company has been registered and a temporary admin account has been created.</Typography>
          <Paper sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.3)', border: '1px solid divider', position: 'relative' }}>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 1 }}><strong>Company ID:</strong> {successData?.companyId}</Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 1 }}><strong>Admin Email:</strong> {successData?.email}</Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}><strong>Temp Password:</strong> {successData?.password}</Typography>
            <IconButton onClick={handleCopyCredentials} size="small" sx={{ position: 'absolute', top: 8, right: 8, color: 'primary.main' }}>
              <CopyIcon fontSize="small" />
            </IconButton>
          </Paper>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
            Please securely share these credentials with the company administrator. They will be forced to change their password on first login.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenSuccessModal(false)} sx={{ color: 'primary.main', fontWeight: 700 }}>Done</Button>
        </DialogActions>
      </Dialog>

      {/* Details Modal */}
      <Dialog open={openDetailsModal} onClose={() => setOpenDetailsModal(false)} maxWidth="sm" fullWidth // @ts-ignore
PaperProps={{ sx: { borderRadius: 3, bgcolor: 'background.paper', color: 'text.primary' } }}>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Company Details
          <Button onClick={() => setOpenDetailsModal(false)} size="small" sx={{ minWidth: 'auto', p: 0.5, color: 'text.secondary' }}>✕</Button>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: 'divider' }}>
          {selectedCompany && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Company Name</Typography>
                <Typography variant="body1" sx={{ fontWeight: '600' }}>{selectedCompany.name}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Registration Number</Typography>
                <Typography variant="body1">{selectedCompany.registrationNumber || 'N/A'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Industry</Typography>
                <Typography variant="body1">{selectedCompany.industry || 'N/A'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Location</Typography>
                <Typography variant="body1">{selectedCompany.location || 'N/A'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Website</Typography>
                <Typography variant="body1">{selectedCompany.website ? <a href={selectedCompany.website} target="_blank" rel="noopener noreferrer" style={{color: '#10b981'}}>{selectedCompany.website}</a> : 'N/A'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Total Users</Typography>
                <Typography variant="body1">{selectedCompany.users ? selectedCompany.users[0]?.count : 0}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Registered Date</Typography>
                <Typography variant="body1">{new Date(selectedCompany.created_at).toLocaleString()}</Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}

export default SystemAdmin;
