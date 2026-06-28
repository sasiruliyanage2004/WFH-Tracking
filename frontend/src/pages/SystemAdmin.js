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
  AdminPanelSettings as AdminIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  ContentCopy as CopyIcon,
  Campaign as CampaignIcon,
  BarChart as BarChartIcon,
  Domain as DomainIcon,
  Settings as SettingsIcon,
  TrendingUp as TrendingUpIcon,
  SecurityUpdateGood as SecurityIcon,
  ShowChart as ShowChartIcon,
  InfoOutlined as InfoIcon,
  KeyboardArrowRight as ArrowRightIcon
} from '@mui/icons-material';
import CustomLoader from '../components/CustomLoader';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function SystemAdmin({ activeTab = 0 }) {
  const { token, user } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0); 
  
  const [analytics, setAnalytics] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [announcementLoading, setAnnouncementLoading] = useState(false);
  
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

  useEffect(() => {
    if (user?.role !== 'SystemAdmin') {
      navigate('/dashboard');
      return;
    }
    const fetchAllData = async () => {
      setLoading(true);
      try {
        if (activeTab === 0) {
          const [analyticsRes, companiesRes, announcementsRes] = await Promise.all([
            axios.get(`${API_URL}/api/system/analytics`, { headers: { Authorization: `Bearer ${token}` } }),
            axios.get(`${API_URL}/api/system/companies`, { headers: { Authorization: `Bearer ${token}` } }),
            axios.get(`${API_URL}/api/system/announcements`, { headers: { Authorization: `Bearer ${token}` } })
          ]);
          setAnalytics(analyticsRes.data);
          setCompanies(companiesRes.data);
          setAnnouncements(announcementsRes.data);
        } else if (activeTab === 1) {
          const companiesRes = await axios.get(`${API_URL}/api/system/companies`, { headers: { Authorization: `Bearer ${token}` } });
          setCompanies(companiesRes.data);
        } else if (activeTab === 2) {
          const announcementsRes = await axios.get(`${API_URL}/api/system/announcements`, { headers: { Authorization: `Bearer ${token}` } });
          setAnnouncements(announcementsRes.data);
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
      color: '#fff', 
      bgcolor: '#0F111A', // deep dark background
      minHeight: '100vh',
      m: -3, p: 3, // negate parent padding if any
      fontFamily: "'Inter', sans-serif"
    }}>
      
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 5 }}>
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', mb: 1 }}>
            Platform Overlord
          </Typography>
          <Typography variant="body1" sx={{ color: '#8b949e', fontWeight: 500 }}>
            Monitor system health, manage tenant lifecycle, and oversee global performance across the ecosystem.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<SettingsIcon />}
            sx={{ 
              borderRadius: 2, 
              color: '#fff', 
              borderColor: 'rgba(255,255,255,0.1)',
              textTransform: 'none',
              px: 3,
              fontWeight: 600,
              '&:hover': { borderColor: 'rgba(255,255,255,0.2)', bgcolor: 'rgba(255,255,255,0.05)' }
            }}
          >
            System Settings
          </Button>
          <Button
            variant="contained"
            startIcon={<BusinessIcon />}
            onClick={() => setOpenCreateModal(true)}
            sx={{ 
              borderRadius: 2, 
              bgcolor: '#5EEAD4', 
              color: '#0F111A',
              textTransform: 'none',
              fontWeight: 700,
              px: 3,
              boxShadow: '0 0 20px rgba(94, 234, 212, 0.2)',
              '&:hover': { bgcolor: '#4ADE80', boxShadow: '0 0 30px rgba(74, 222, 128, 0.4)' }
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
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 3, borderRadius: 3, bgcolor: '#161B22', border: '1px solid rgba(255,255,255,0.05)', height: '100%' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                    <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(94, 234, 212, 0.1)' }}>
                      <BusinessIcon sx={{ color: '#5EEAD4' }} />
                    </Box>
                    <Chip label="+12% this month" size="small" sx={{ bgcolor: 'rgba(94, 234, 212, 0.1)', color: '#5EEAD4', fontWeight: 600 }} />
                  </Box>
                  <Typography sx={{ color: '#8b949e', fontWeight: 600, mb: 1 }}>Total Tenants</Typography>
                  <Typography variant="h3" sx={{ fontWeight: 800, color: '#fff' }}>{analytics.totalCompanies}</Typography>
                </Paper>
              </Grid>

              {/* Card 2: Total Employees */}
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 3, borderRadius: 3, bgcolor: '#161B22', border: '1px solid rgba(255,255,255,0.05)', height: '100%' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                    <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(74, 222, 128, 0.1)' }}>
                      <PeopleIcon sx={{ color: '#4ADE80' }} />
                    </Box>
                    <Chip label={`+${analytics.dailyActiveUsers} Active`} size="small" sx={{ bgcolor: 'rgba(74, 222, 128, 0.1)', color: '#4ADE80', fontWeight: 600 }} />
                  </Box>
                  <Typography sx={{ color: '#8b949e', fontWeight: 600, mb: 1 }}>Total Employees</Typography>
                  <Typography variant="h3" sx={{ fontWeight: 800, color: '#fff' }}>{analytics.totalUsers}</Typography>
                </Paper>
              </Grid>

              {/* Card 3: System Uptime */}
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 3, borderRadius: 3, bgcolor: '#161B22', border: '1px solid rgba(255,255,255,0.05)', height: '100%' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                    <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(56, 189, 248, 0.1)' }}>
                      <SecurityIcon sx={{ color: '#38BDF8' }} />
                    </Box>
                    <Chip label="● Healthy" size="small" sx={{ bgcolor: 'rgba(56, 189, 248, 0.1)', color: '#38BDF8', fontWeight: 600 }} />
                  </Box>
                  <Typography sx={{ color: '#8b949e', fontWeight: 600, mb: 1 }}>System Uptime</Typography>
                  <Typography variant="h3" sx={{ fontWeight: 800, color: '#fff' }}>99.98%</Typography>
                </Paper>
              </Grid>

              {/* Card 4: Daily Active Users */}
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 3, borderRadius: 3, bgcolor: '#161B22', border: '1px solid rgba(255,255,255,0.05)', height: '100%' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                    <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(167, 139, 250, 0.1)' }}>
                      <TrendingUpIcon sx={{ color: '#A78BFA' }} />
                    </Box>
                    <Chip label="Target: 2k" size="small" sx={{ bgcolor: 'rgba(167, 139, 250, 0.1)', color: '#A78BFA', fontWeight: 600 }} />
                  </Box>
                  <Typography sx={{ color: '#8b949e', fontWeight: 600, mb: 1 }}>Daily Active Users</Typography>
                  <Typography variant="h3" sx={{ fontWeight: 800, color: '#fff' }}>{analytics.dailyActiveUsers}</Typography>
                </Paper>
              </Grid>
            </Grid>
          ) : (
            <CustomLoader />
          )}

          <Grid container spacing={4}>
            {/* Left Column (Table + Map) */}
            <Grid item xs={12} md={8}>
              
              {/* Active Managed Tenants Table */}
              <Paper sx={{ p: 3, borderRadius: 3, bgcolor: '#161B22', border: '1px solid rgba(255,255,255,0.05)', mb: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff' }}>Active Managed Tenants</Typography>
                  <Button endIcon={<ArrowRightIcon />} sx={{ color: '#5EEAD4', textTransform: 'none', fontWeight: 600 }}>
                    View Full Directory
                  </Button>
                </Box>
                
                <TableContainer>
                  <Table sx={{ minWidth: 600 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ color: '#8b949e', borderBottom: '1px solid rgba(255,255,255,0.05)', fontWeight: 600 }}>Company Name</TableCell>
                        <TableCell sx={{ color: '#8b949e', borderBottom: '1px solid rgba(255,255,255,0.05)', fontWeight: 600 }}>Active Seats</TableCell>
                        <TableCell sx={{ color: '#8b949e', borderBottom: '1px solid rgba(255,255,255,0.05)', fontWeight: 600 }}>Status</TableCell>
                        <TableCell align="right" sx={{ color: '#8b949e', borderBottom: '1px solid rgba(255,255,255,0.05)', fontWeight: 600 }}>Joined</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {companies.slice(0, 5).map((comp) => (
                        <TableRow key={comp.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                          <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Avatar variant="rounded" sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: '#fff', width: 40, height: 40, fontWeight: 700 }}>
                                {comp.name.substring(0,2).toUpperCase()}
                              </Avatar>
                              <Box>
                                <Typography sx={{ color: '#fff', fontWeight: 600 }}>{comp.name}</Typography>
                                <Typography variant="caption" sx={{ color: '#8b949e' }}>ID: {comp.id.substring(0,8).toUpperCase()}</Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell sx={{ color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            {comp.users ? comp.users[0]?.count : 0}
                          </TableCell>
                          <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <Chip 
                              label={comp.status === 'active' ? 'ENTERPRISE' : 'SUSPENDED'} 
                              size="small" 
                              sx={{ 
                                bgcolor: comp.status === 'active' ? 'rgba(74, 222, 128, 0.1)' : 'rgba(248, 113, 113, 0.1)', 
                                color: comp.status === 'active' ? '#4ADE80' : '#F87171', 
                                fontWeight: 700,
                                fontSize: '0.7rem',
                                letterSpacing: '0.05em'
                              }} 
                            />
                          </TableCell>
                          <TableCell align="right" sx={{ color: '#8b949e', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            {new Date(comp.created_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>

              {/* Map UI */}
              <Paper sx={{ p: 3, borderRadius: 3, bgcolor: '#161B22', border: '1px solid rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, position: 'relative', zIndex: 2 }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff' }}>Global Node Distribution</Typography>
                    <Typography variant="body2" sx={{ color: '#8b949e' }}>Real-time load balancing across 14 clusters</Typography>
                  </Box>
                  <Chip icon={<Box sx={{width:6,height:6,bgcolor:'#5EEAD4',borderRadius:'50%',mr:0.5}}/>} label="LIVE MONITORING" size="small" sx={{ bgcolor: 'rgba(94, 234, 212, 0.1)', color: '#5EEAD4', fontWeight: 600, border: '1px solid rgba(94, 234, 212, 0.2)' }} />
                </Box>
                {/* Abstract CSS Map background */}
                <Box sx={{ 
                  height: 250, 
                  background: 'radial-gradient(circle at center, rgba(94, 234, 212, 0.15) 0%, transparent 70%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: 0.8
                }}>
                  <ShowChartIcon sx={{ fontSize: 150, color: 'rgba(255,255,255,0.05)' }} />
                </Box>
                
                <Box sx={{ display: 'flex', gap: 2, position: 'absolute', bottom: 24, left: 24, zIndex: 2 }}>
                  <Box sx={{ bgcolor: 'rgba(0,0,0,0.6)', p: 1.5, borderRadius: 2, border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)' }}>
                    <Typography variant="caption" sx={{ color: '#8b949e', display: 'block', mb: 0.5, fontWeight: 700 }}>LATENCY</Typography>
                    <Typography variant="subtitle1" sx={{ color: '#5EEAD4', fontWeight: 700, lineHeight: 1 }}>24ms</Typography>
                  </Box>
                  <Box sx={{ bgcolor: 'rgba(0,0,0,0.6)', p: 1.5, borderRadius: 2, border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)' }}>
                    <Typography variant="caption" sx={{ color: '#8b949e', display: 'block', mb: 0.5, fontWeight: 700 }}>THROUGHPUT</Typography>
                    <Typography variant="subtitle1" sx={{ color: '#5EEAD4', fontWeight: 700, lineHeight: 1 }}>1.2 GB/s</Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>

            {/* Right Column (System Alerts) */}
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff' }}>System Alerts</Typography>
                <Chip label="4 CRITICAL" size="small" sx={{ bgcolor: 'rgba(248, 113, 113, 0.1)', color: '#F87171', fontWeight: 700, fontSize: '0.7rem' }} />
              </Box>
              <Typography variant="body2" sx={{ color: '#8b949e', mb: 3 }}>Priority flags requiring immediate action.</Typography>

              {/* Feed Items */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                
                {/* Real Announcements history */}
                {announcements.slice(0,3).map((ann, idx) => (
                  <Paper key={ann.id} sx={{ p: 2.5, borderRadius: 3, bgcolor: 'transparent', border: '1px solid', borderColor: idx === 0 ? 'rgba(248, 113, 113, 0.3)' : 'rgba(255,255,255,0.1)' }}>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                      <InfoIcon sx={{ color: idx === 0 ? '#F87171' : '#38BDF8' }} />
                      <Box>
                        <Typography sx={{ color: '#fff', fontWeight: 700, mb: 0.5 }}>{ann.title}</Typography>
                        <Typography variant="body2" sx={{ color: '#8b949e', mb: 1.5 }}>
                          {ann.message.length > 60 ? ann.message.substring(0, 60) + '...' : ann.message}
                        </Typography>
                        <Typography variant="caption" sx={{ color: idx === 0 ? '#F87171' : '#5EEAD4', fontWeight: 700, cursor: 'pointer' }}>
                          REVIEW LOGS
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                ))}

                {/* Mock Alerts for UI perfection */}
                <Paper sx={{ p: 2.5, borderRadius: 3, bgcolor: 'transparent', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                    <SettingsIcon sx={{ color: '#8b949e' }} />
                    <Box>
                      <Typography sx={{ color: '#fff', fontWeight: 700, mb: 0.5 }}>Storage Limit Warning</Typography>
                      <Typography variant="body2" sx={{ color: '#8b949e', mb: 1.5 }}>
                        Cyberdyne Systems at 92% of allocated disk space.
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                        UPSELL STORAGE
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              </Box>

              <Button fullWidth variant="outlined" sx={{ mt: 3, borderRadius: 2, color: '#8b949e', borderColor: 'rgba(255,255,255,0.1)', textTransform: 'none', py: 1.5, '&:hover': { borderColor: 'rgba(255,255,255,0.2)', color: '#fff' } }}>
                Mark all as read
              </Button>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Companies and Broadcast Tabs - Maintained original functionality but with minimal dark theme styling */}
      {activeTab === 1 && (
        <Box>
          <Box sx={{ borderBottom: 1, borderColor: 'rgba(255,255,255,0.1)', mb: 3 }}>
            <Tabs value={tabValue} onChange={handleTabChange} textColor="inherit" sx={{ '& .MuiTabs-indicator': { bgcolor: '#5EEAD4' } }}>
              <Tab label={`Active (${activeCount})`} sx={{ color: '#fff', fontWeight: 600 }} />
              <Tab label={`Inactive (${inactiveCount})`} sx={{ color: '#8b949e', fontWeight: 600 }} />
            </Tabs>
          </Box>

          <Grid container spacing={3}>
            {getFilteredCompanies().map((company) => (
              <Grid item xs={12} md={6} lg={4} key={company.id}>
                <Paper sx={{ p: 3, borderRadius: 3, bgcolor: '#161B22', border: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: '#fff', width: 48, height: 48 }}>
                        <BusinessIcon />
                      </Avatar>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff' }}>{company.name}</Typography>
                        <Typography variant="body2" sx={{ color: '#8b949e' }}>Registered: {new Date(company.created_at).toLocaleDateString()}</Typography>
                      </Box>
                    </Box>
                    <Chip 
                      label={company.status} 
                      size="small" 
                      sx={{ 
                        bgcolor: company.status === 'active' ? 'rgba(74, 222, 128, 0.1)' : 'rgba(248, 113, 113, 0.1)', 
                        color: company.status === 'active' ? '#4ADE80' : '#F87171', 
                        fontWeight: 600, textTransform: 'capitalize' 
                      }} 
                    />
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                    <PeopleIcon fontSize="small" sx={{ color: '#8b949e' }} />
                    <Typography variant="body2" sx={{ color: '#fff', fontWeight: 500 }}>
                      Users: {company.users ? company.users[0]?.count : 0}
                    </Typography>
                  </Box>

                  <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.05)' }} />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ color: '#8b949e' }}>
                      Status: {company.status === 'active' ? 'Active' : 'Disabled'}
                    </Typography>
                    <Switch 
                      checked={company.status === 'active'}
                      onChange={() => toggleCompanyStatus(company.id, company.status)}
                      color="primary"
                      sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#5EEAD4' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#5EEAD4' } }}
                    />
                  </Box>
                </Paper>
              </Grid>
            ))}
            {getFilteredCompanies().length === 0 && (
              <Grid item xs={12}>
                <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3, bgcolor: '#161B22', border: '1px dashed rgba(255,255,255,0.1)' }}>
                  <Typography color="text.secondary">No companies found in this category.</Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
        </Box>
      )}

      {activeTab === 2 && (
        <Box>
          <Typography variant="h5" sx={{ mb: 3, fontWeight: 700, color: '#fff' }}>Broadcast Announcement</Typography>
          <Paper sx={{ p: 3, borderRadius: 3, mb: 4, border: '1px solid rgba(255,255,255,0.05)', bgcolor: '#161B22' }}>
            <form onSubmit={handleBroadcast}>
              <TextField
                fullWidth
                label="Announcement Title"
                variant="outlined"
                margin="normal"
                value={announcementTitle}
                onChange={e => setAnnouncementTitle(e.target.value)}
                required
                sx={{ input: { color: '#fff' }, label: { color: '#8b949e' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }}
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
                sx={{ textarea: { color: '#fff' }, label: { color: '#8b949e' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }}
              />
              <Button
                type="submit"
                variant="contained"
                disabled={announcementLoading}
                startIcon={<CampaignIcon />}
                sx={{ mt: 2, bgcolor: '#5EEAD4', color: '#0F111A', fontWeight: 700, '&:hover': { bgcolor: '#4ADE80' } }}
              >
                {announcementLoading ? 'Broadcasting...' : 'Broadcast Now'}
              </Button>
            </form>
          </Paper>

          <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, color: '#fff' }}>Recent Broadcasts</Typography>
          {announcements.length === 0 ? (
            <Typography color="#8b949e">No announcements have been broadcasted yet.</Typography>
          ) : (
            <Grid container spacing={2}>
              {announcements.map(ann => (
                <Grid item xs={12} key={ann.id}>
                  <Paper sx={{ p: 3, borderRadius: 3, bgcolor: '#161B22', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#fff' }}>{ann.title}</Typography>
                      <Typography variant="caption" sx={{ color: '#8b949e' }}>
                        {new Date(ann.created_at).toLocaleString()}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ color: '#8b949e' }}>{ann.message}</Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* Create Company Modal */}
      <Dialog open={openCreateModal} onClose={() => setOpenCreateModal(false)} PaperProps={{ sx: { borderRadius: 3, bgcolor: '#161B22', color: '#fff' } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Register New Business</DialogTitle>
        <DialogContent>
          {createError && <Typography color="error" sx={{ mb: 2 }}>{createError}</Typography>}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Company Name" value={newCompanyName} onChange={e => setNewCompanyName(e.target.value)} required sx={{ input: { color: '#fff' }, label: { color: '#8b949e' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Admin Email" type="email" value={newCompanyEmail} onChange={e => setNewCompanyEmail(e.target.value)} required sx={{ input: { color: '#fff' }, label: { color: '#8b949e' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Registration Number" value={newRegistrationNumber} onChange={e => setNewRegistrationNumber(e.target.value)} required sx={{ input: { color: '#fff' }, label: { color: '#8b949e' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Industry" value={newIndustry} onChange={e => setNewIndustry(e.target.value)} required sx={{ input: { color: '#fff' }, label: { color: '#8b949e' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Headquarters Location" value={newLocation} onChange={e => setNewLocation(e.target.value)} required sx={{ input: { color: '#fff' }, label: { color: '#8b949e' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Website (Optional)" value={newWebsite} onChange={e => setNewWebsite(e.target.value)} sx={{ input: { color: '#fff' }, label: { color: '#8b949e' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setOpenCreateModal(false)} sx={{ color: '#8b949e' }}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateCompany} disabled={createLoading} sx={{ bgcolor: '#5EEAD4', color: '#0F111A', fontWeight: 700, '&:hover': { bgcolor: '#4ADE80' } }}>
            {createLoading ? 'Creating...' : 'Register Business'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={openSuccessModal} onClose={() => setOpenSuccessModal(false)} PaperProps={{ sx: { borderRadius: 3, bgcolor: '#161B22', color: '#fff' } }}>
        <DialogTitle sx={{ fontWeight: 700, color: '#4ADE80' }}>Success!</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>The company has been registered and a temporary admin account has been created.</Typography>
          <Paper sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', position: 'relative' }}>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 1 }}><strong>Company ID:</strong> {successData?.companyId}</Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 1 }}><strong>Admin Email:</strong> {successData?.email}</Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}><strong>Temp Password:</strong> {successData?.password}</Typography>
            <IconButton onClick={handleCopyCredentials} size="small" sx={{ position: 'absolute', top: 8, right: 8, color: '#5EEAD4' }}>
              <CopyIcon fontSize="small" />
            </IconButton>
          </Paper>
          <Typography variant="caption" color="#8b949e" sx={{ display: 'block', mt: 2 }}>
            Please securely share these credentials with the company administrator. They will be forced to change their password on first login.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenSuccessModal(false)} sx={{ color: '#5EEAD4', fontWeight: 700 }}>Done</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default SystemAdmin;
