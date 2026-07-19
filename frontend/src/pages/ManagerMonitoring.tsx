// frontend/src/pages/ManagerMonitoring.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  LinearProgress,
  TextField,
  Select,
  MenuItem,
  FormControl,
  Tabs,
  Tab,
  InputAdornment,
  Tooltip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Divider
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Refresh as RefreshIcon,
  GetApp as ExportIcon,
  Search as SearchIcon,
  Circle as CircleIcon,
  Groups as GroupsIcon,
  Close as CloseIcon,
  MyLocation as MapIcon,
  Face as FaceIcon
} from '@mui/icons-material';
import CustomLoader from '../components/CustomLoader';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function ManagerMonitoring() {
  const navigate = useNavigate();
  const { token, user } = useSelector((state: any) => state.auth);
  
  // Navigation tabs: 0 = Productivity Leaderboard (Top Users), 1 = Live Status Directory
  const [viewTab, setViewTab] = useState(0); // Default to Leaderboard as requested

  // State for the map+selfie popup dialog
  const [selectedEmpDialog, setSelectedEmpDialog] = useState<any>(null);

  const calculateTotalHours = (rec) => {
    if (!rec) return '--';
    let base = rec.durationHours || 0;
    if (!rec.checkOutTime && rec.checkInTime) {
      const ms = Date.now() - new Date(rec.checkInTime).getTime();
      base += ms / 3600000;
    }
    return base > 0 ? base.toFixed(2) : '--';
  };

  // Summary states (Live Directory)
  const [summary, setSummary] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [summaryError, setSummaryError] = useState('');

  // Leaderboard states
  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);
  const [leaderboardError, setLeaderboardError] = useState('');
  const [dateRange, setDateRange] = useState('yesterday'); // default to 'Yesterday' like screenshot
  const [department, setDepartment] = useState(user?.role === 'Manager' ? (user?.department || 'Engineering') : 'All');
  const [userSearch, setUserSearch] = useState('');
  const [leaderboardTab, setLeaderboardTab] = useState('USERS'); // USERS or GROUPS


  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  // Fetch Live Directory Summary
  const fetchSummary = async () => {
    try {
      setLoadingSummary(true);
      setSummaryError('');
      const res = await axios.get(`${API_URL}/api/monitoring/summary`, authHeader);
      setSummary(res.data);

      try {
        const reportsRes = await axios.get(`${API_URL}/api/reports`, authHeader);
        const employeeMap = new Map();
        reportsRes.data.forEach(r => {
          if (r.employee) employeeMap.set(r.employee._id || r.employee.id, r.employee);
        });
        res.data.liveCheckins?.forEach(c => {
          if (c.employee) employeeMap.set(c.employee._id || c.employee.id, c.employee);
        });
        setEmployees(Array.from(employeeMap.values()));
      } catch (reportsErr) {
        const employeeMap = new Map();
        res.data.liveCheckins?.forEach(c => {
          if (c.employee) employeeMap.set(c.employee._id || c.employee.id, c.employee);
        });
        setEmployees(Array.from(employeeMap.values()));
      }
    } catch (err) {
      console.error('Monitoring load error:', err.message);
      setSummaryError(err.response?.data?.message || 'Failed to load monitoring data.');
      setSummary({ onlineEmployees: 0, offlineEmployees: 0, productivityScore: 0, liveCheckins: [] });
    } finally {
      setLoadingSummary(false);
    }
  };

  // Fetch Productivity Leaderboard
  const fetchLeaderboard = async () => {
    try {
      setLoadingLeaderboard(true);
      setLeaderboardError('');
      const res = await axios.get(
        `${API_URL}/api/monitoring/leaderboard?dateRange=${dateRange}&department=${department}`,
        authHeader
      );
      setLeaderboard(res.data || []);
    } catch (err) {
      console.error('Leaderboard load error:', err.message);
      setLeaderboardError(err.response?.data?.message || 'Failed to load productivity leaderboard.');
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchSummary();
      fetchLeaderboard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, dateRange, department]);

  useEffect(() => {
    if (user?.role === 'Manager' && user?.department) {
      setDepartment(user.department);
    }
  }, [user]);

  // Duration Formatter Helpers
  const formatMins = (mins) => {
    if (!mins || mins <= 0) return '0s';
    const hrs = Math.floor(mins / 60);
    const remainingMins = Math.floor(mins % 60);
    const secs = Math.round((mins * 60) % 60);
    
    let result = '';
    if (hrs > 0) result += `${hrs}h `;
    if (remainingMins > 0) result += `${remainingMins}m `;
    if (secs > 0 || result === '') result += `${secs}s`;
    return result.trim();
  };

  const formatHoursObj = (hours) => {
    if (!hours || hours <= 0) return '0s';
    const mins = hours * 60;
    return formatMins(mins);
  };

  // Export Leaderboard to CSV
  const handleExportCSV = () => {
    const dataToExport = leaderboardTab === 'USERS' ? leaderboard : getGroupsLeaderboard();
    if (dataToExport.length === 0) return;

    const headers = leaderboardTab === 'USERS'
      ? ['User', 'Department', 'Productive Time', 'Unproductive Time', 'Undefined Time', 'Total Work Time', 'Active Time', 'Offline Meetings']
      : ['Group/Department', 'Active Employees', 'Productive Time', 'Unproductive Time', 'Undefined Time', 'Total Work Time', 'Active Time', 'Offline Meetings'];

    const rows = dataToExport.map((row: any) => [
      row.name,
      leaderboardTab === 'USERS' ? row.department : `${row.employeeCount} active employee(s)`,
      formatMins(row.productiveMins),
      formatMins(row.unproductiveMins),
      formatMins(row.neutralMins),
      formatHoursObj(row.totalHours),
      formatHoursObj(row.activeHours),
      formatMins(row.offlineMeetingMins)
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${leaderboardTab === 'USERS' ? 'user' : 'group'}_productivity_leaderboard_${dateRange}_${department}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Group aggregation logic
  const getGroupsLeaderboard = () => {
    const groupsMap: any = {};

    leaderboard.forEach(row => {
      const dept = row.department || 'Operations';
      if (!groupsMap[dept]) {
        groupsMap[dept] = {
          id: dept,
          name: dept,
          productiveMins: 0,
          unproductiveMins: 0,
          neutralMins: 0,
          totalHours: 0,
          activeHours: 0,
          offlineMeetingMins: 0,
          employeeCount: 0
        };
      }

      groupsMap[dept].productiveMins += row.productiveMins || 0;
      groupsMap[dept].unproductiveMins += row.unproductiveMins || 0;
      groupsMap[dept].neutralMins += row.neutralMins || 0;
      groupsMap[dept].totalHours += row.totalHours || 0;
      groupsMap[dept].activeHours += row.activeHours || 0;
      groupsMap[dept].offlineMeetingMins += row.offlineMeetingMins || 0;
      groupsMap[dept].employeeCount += 1;
    });

    return Object.values(groupsMap).map((group: any) => {
      const totalMins = group.productiveMins + group.unproductiveMins + group.neutralMins;
      const productivityRatio = totalMins > 0
        ? Math.round((group.productiveMins / totalMins) * 100)
        : 100;

      return {
        ...group,
        totalMins,
        productivityRatio
      };
    }).sort((a, b) => {
      if (b.totalMins !== a.totalMins) return b.totalMins - a.totalMins;
      return b.productivityRatio - a.productivityRatio;
    });
  };

  const getUsersLeaderboard = () => {
    return [...leaderboard].map((user: any) => {
      const totalMins = (user.productiveMins || 0) + (user.unproductiveMins || 0) + (user.neutralMins || 0);
      const productivityRatio = totalMins > 0
        ? Math.round((user.productiveMins / totalMins) * 100)
        : 100;
      return {
        ...user,
        totalMins,
        productivityRatio
      };
    }).sort((a, b) => {
      if (b.totalMins !== a.totalMins) return b.totalMins - a.totalMins;
      return b.productivityRatio - a.productivityRatio;
    });
  };

  // Client-side search filtering
  const displayedLeaderboard = leaderboardTab === 'USERS'
    ? getUsersLeaderboard().filter(item => item.name.toLowerCase().includes(userSearch.toLowerCase()))
    : getGroupsLeaderboard().filter(item => item.name.toLowerCase().includes(userSearch.toLowerCase()));

  return (
    <>
    <Box sx={{ pb: 5 }}>
      {/* Top Section View Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={viewTab} onChange={(e, val) => setViewTab(val)} color="primary">
          <Tab label="Productivity Leaderboard" sx={{ fontWeight: 700, fontSize: '0.95rem' }} />
          <Tab label="Live status Directory" sx={{ fontWeight: 700, fontSize: '0.95rem' }} />
        </Tabs>
      </Box>

      {/* VIEW 1: PRODUCTIVITY LEADERBOARD */}
      {viewTab === 0 && (
        <Box>
          {/* Header Row */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.5px' }}>
              TOP USERS AND GROUPS
            </Typography>
            
            {/* Filters bar */}
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Date Filter Dropdown */}
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <Select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  sx={{ borderRadius: 2, bgcolor: 'background.paper', fontWeight: 600 }}
                >
                  <MenuItem value="today">Today</MenuItem>
                  <MenuItem value="yesterday">Yesterday</MenuItem>
                  <MenuItem value="7days">Last 7 Days</MenuItem>
                  <MenuItem value="30days">Last 30 Days</MenuItem>
                </Select>
              </FormControl>

              {/* Department Filter Dropdown */}
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <Select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  disabled={user?.role === 'Manager'}
                  sx={{ borderRadius: 2, bgcolor: 'background.paper', fontWeight: 600 }}
                >
                  {user?.role === 'Manager' ? (
                    <MenuItem value={user.department || 'Engineering'}>{user.department || 'Engineering'}</MenuItem>
                  ) : [
                    <MenuItem key="All" value="All">All Departments</MenuItem>,
                    <MenuItem key="Product" value="Product">Product</MenuItem>,
                    <MenuItem key="Operations" value="Operations">Operations</MenuItem>,
                    <MenuItem key="Engineering" value="Engineering">Engineering</MenuItem>,
                    <MenuItem key="Marketing" value="Marketing">Marketing</MenuItem>,
                    <MenuItem key="HR" value="HR">HR</MenuItem>
                  ]}
                </Select>
              </FormControl>

              {/* Action Buttons */}
              <Button
                variant="outlined"
                size="medium"
                startIcon={<RefreshIcon />}
                onClick={fetchLeaderboard}
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
              >
                Refresh
              </Button>

              <Button
                variant="outlined"
                size="medium"
                startIcon={<ExportIcon />}
                onClick={handleExportCSV}
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
              >
                Export
              </Button>
            </Box>
          </Box>

          {/* Sub Header Segment Filter: USERS vs GROUPS and SUMMARY vs DETAILED */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            {/* USERS/GROUPS tab switchers */}
            <Box sx={{ display: 'flex', bgcolor: 'action.selected', p: 0.5, borderRadius: 2 }}>
              <Button
                variant={leaderboardTab === 'USERS' ? 'contained' : 'text'}
                color={leaderboardTab === 'USERS' ? 'primary' : 'inherit'}
                size="small"
                onClick={() => setLeaderboardTab('USERS')}
                sx={{ borderRadius: 1.5, px: 3, fontWeight: 700, textTransform: 'none', boxShadow: leaderboardTab === 'USERS' ? 1 : 0 }}
              >
                USERS
              </Button>
              <Button
                variant={leaderboardTab === 'GROUPS' ? 'contained' : 'text'}
                color={leaderboardTab === 'GROUPS' ? 'primary' : 'inherit'}
                size="small"
                onClick={() => setLeaderboardTab('GROUPS')}
                sx={{ borderRadius: 1.5, px: 3, fontWeight: 700, textTransform: 'none', boxShadow: leaderboardTab === 'GROUPS' ? 1 : 0 }}
              >
                GROUPS
              </Button>
            </Box>
          </Box>

          {/* Leaderboard Table */}
          {loadingLeaderboard ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CustomLoader />
            </Box>
          ) : leaderboardError ? (
            <Paper sx={{ py: 6, textAlign: 'center', borderRadius: 3, px: 3 }}>
              <Typography color="error" sx={{ fontWeight: 600 }}>{leaderboardError}</Typography>
            </Paper>
          ) : displayedLeaderboard.length === 0 ? (
            <Paper sx={{ py: 6, textAlign: 'center', borderRadius: 3, px: 3 }}>
              <Typography color="text.secondary">No records found matching the criteria.</Typography>
            </Paper>
          ) : (
            <TableContainer component={Paper} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
              <Table>
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, py: 1.5 }}>{leaderboardTab === 'USERS' ? 'User' : 'Department/Group'}</TableCell>
                    <TableCell sx={{ fontWeight: 700, py: 1.5, width: 220 }}>Productivity Ratio</TableCell>
                    <TableCell sx={{ fontWeight: 700, py: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CircleIcon sx={{ fontSize: 10, color: '#34d399' }} /> Productive
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, py: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CircleIcon sx={{ fontSize: 10, color: '#8b5cf6' }} /> Unproductive
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, py: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CircleIcon sx={{ fontSize: 10, color: '#64748b' }} /> Undefined
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Total time</TableCell>
                    <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Active time</TableCell>
                    <TableCell sx={{ fontWeight: 700, py: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CircleIcon sx={{ fontSize: 10, color: '#f97316' }} /> Offline Meetings
                      </Box>
                    </TableCell>
                  </TableRow>
                  {/* Inline Search Filter Row */}
                  <TableRow>
                    <TableCell sx={{ py: 1, px: 2 }} colSpan={8}>
                      <TextField
                        size="small"
                        placeholder={leaderboardTab === 'USERS' ? "Search user..." : "Search group..."}
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        sx={{ maxWidth: 300, bgcolor: 'background.paper', borderRadius: 1.5 }}
                        // @ts-ignore
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayedLeaderboard.map((row: any) => {
                    // Calculate stacked bar segment percentages
                    const totalMins = row.productiveMins + row.unproductiveMins + row.neutralMins;
                    const prodPct = totalMins > 0 ? (row.productiveMins / totalMins) * 100 : 100;
                    const unprodPct = totalMins > 0 ? (row.unproductiveMins / totalMins) * 100 : 0;
                    const neutPct = totalMins > 0 ? (row.neutralMins / totalMins) * 100 : 0;

                    return (
                      <TableRow key={row.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                        {/* User Profile Column */}
                        <TableCell sx={{ py: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ bgcolor: leaderboardTab === 'USERS' ? 'primary.light' : 'secondary.light', width: 34, height: 34, fontWeight: 700, fontSize: '0.85rem' }}>
                            {leaderboardTab === 'USERS' ? row.name.charAt(0) : <GroupsIcon sx={{ fontSize: 18, color: 'secondary.contrastText' }} />}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {row.name}
                            </Typography>
                            {leaderboardTab === 'GROUPS' ? (
                              <Typography variant="caption" color="text.secondary">
                                {row.employeeCount} active employee{row.employeeCount !== 1 ? 's' : ''}
                              </Typography>
                            ) : (
                              <Typography variant="caption" color="text.secondary">
                                {row.department}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>

                        {/* Stacked Productivity Ratio Bar */}
                        <TableCell sx={{ py: 2 }}>
                          <Box sx={{ display: 'flex', height: 14, borderRadius: 1.5, overflow: 'hidden', width: '100%', bgcolor: '#e2e8f0' }}>
                            {prodPct > 0 && (
                              <Tooltip title={`Productive: ${Math.round(prodPct)}%`}>
                                <Box sx={{ width: `${prodPct}%`, bgcolor: '#34d399', transition: 'width 0.4s ease' }} />
                              </Tooltip>
                            )}
                            {unprodPct > 0 && (
                              <Tooltip title={`Unproductive: ${Math.round(unprodPct)}%`}>
                                <Box sx={{ width: `${unprodPct}%`, bgcolor: '#8b5cf6', transition: 'width 0.4s ease' }} />
                              </Tooltip>
                            )}
                            {neutPct > 0 && (
                              <Tooltip title={`Undefined: ${Math.round(neutPct)}%`}>
                                <Box sx={{ width: `${neutPct}%`, bgcolor: '#64748b', transition: 'width 0.4s ease' }} />
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>

                        {/* Productive Time */}
                        <TableCell sx={{ py: 2, fontWeight: 600 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {formatMins(row.productiveMins)}
                            <CircleIcon sx={{ fontSize: 8, color: '#34d399' }} />
                          </Box>
                        </TableCell>

                        {/* Unproductive Time */}
                        <TableCell sx={{ py: 2, color: 'text.secondary' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {formatMins(row.unproductiveMins)}
                            {row.unproductiveMins > 0 && <CircleIcon sx={{ fontSize: 8, color: '#8b5cf6' }} />}
                          </Box>
                        </TableCell>

                        {/* Undefined Time */}
                        <TableCell sx={{ py: 2, color: 'text.secondary' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {formatMins(row.neutralMins)}
                            {row.neutralMins > 0 && <CircleIcon sx={{ fontSize: 8, color: '#64748b' }} />}
                          </Box>
                        </TableCell>

                        {/* Total Worked Time */}
                        <TableCell sx={{ py: 2, fontWeight: 700 }}>
                          {formatHoursObj(row.totalHours)}
                        </TableCell>

                        {/* Active Time */}
                        <TableCell sx={{ py: 2, fontWeight: 700, color: 'primary.main' }}>
                          {formatHoursObj(row.activeHours)}
                        </TableCell>

                        {/* Breaks / Offline Meetings */}
                        <TableCell sx={{ py: 2, color: 'text.secondary' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {formatMins(row.offlineMeetingMins)}
                            {row.offlineMeetingMins > 0 && <CircleIcon sx={{ fontSize: 8, color: '#f97316' }} />}
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/* VIEW 2: ORIGINAL LIVE STATUS DIRECTORY */}
      {viewTab === 1 && (
        <Box>
          {/* Header Row */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>Employee Monitoring Directory</Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={fetchSummary}
              sx={{ borderRadius: 2 }}
            >
              Refresh Live summary
            </Button>
          </Box>

          {/* Stats summary boxes */}
          {loadingSummary ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CustomLoader />
            </Box>
          ) : summaryError ? (
            <Paper sx={{ py: 4, textAlign: 'center', mb: 4, borderRadius: 3 }}>
              <Typography color="error">{summaryError}</Typography>
            </Paper>
          ) : (
            <>
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Card sx={{ borderRadius: 3, textAlign: 'center', boxShadow: 'none', border: '2px solid', borderColor: 'success.main', bgcolor: 'rgba(52, 211, 153, 0.05)' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 0.5 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'success.main', animation: 'pulse-dot 2s infinite', '@keyframes pulse-dot': { '0%': { boxShadow: '0 0 0 0 rgba(52,211,153,0.7)' }, '70%': { boxShadow: '0 0 0 8px rgba(52,211,153,0)' }, '100%': { boxShadow: '0 0 0 0 rgba(52,211,153,0)' } } }} />
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>ACTIVE WFH STAFF</Typography>
                      </Box>
                      <Typography variant="h3" sx={{ fontWeight: 800, color: 'success.main' }}>
                        {summary?.onlineEmployees || 0}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Card sx={{ borderRadius: 3, textAlign: 'center', boxShadow: 'none', border: '2px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
                    <CardContent>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>OFFLINE STAFF</Typography>
                      <Typography variant="h3" sx={{ fontWeight: 800, mt: 0.5, color: 'text.disabled' }}>
                        {summary?.offlineEmployees || 0}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Card sx={{ borderRadius: 3, textAlign: 'center', boxShadow: 'none', border: '2px solid', borderColor: 'primary.main', bgcolor: 'rgba(79,142,247,0.05)' }}>
                    <CardContent>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>TEAM PRODUCTIVITY</Typography>
                      <Typography variant="h3" sx={{ fontWeight: 800, mt: 0.5, color: 'primary.main' }}>
                        {summary?.productivityScore || 0}%
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={summary?.productivityScore || 0}
                        sx={{ mt: 1, height: 6, borderRadius: 3, bgcolor: 'action.hover', '& .MuiLinearProgress-bar': { bgcolor: (summary?.productivityScore || 0) >= 70 ? 'success.main' : (summary?.productivityScore || 0) >= 40 ? 'warning.main' : 'error.main', borderRadius: 3 } }}
                      />
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Live Status Table */}
              <TableContainer component={Paper} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
                <Table>
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Employee</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Department</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Live Status</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Productivity</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Check-in Location</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Hours Today</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="center">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {employees.map((emp) => {
                      const checkinRec = summary?.liveCheckins?.find(c => (c.employee?._id === emp._id || c.employee?.id === emp._id));
                      const isOnline = checkinRec && !checkinRec.checkOutTime;
                      const isOnBreak = checkinRec?.onBreak;
                      const prodScore = checkinRec?.productivityPercentage ?? null;
                      const initials = emp.name ? emp.name.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase() : '?';
                      
                      return (
                        <TableRow key={emp._id || emp.id} hover sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                          {/* Employee column with avatar */}
                          <TableCell sx={{ fontWeight: 700 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Avatar sx={{ width: 36, height: 36, fontSize: '0.85rem', fontWeight: 700, bgcolor: isOnline ? 'success.dark' : 'action.selected', color: isOnline ? 'success.contrastText' : 'text.secondary', border: isOnline ? '2px solid' : 'none', borderColor: 'success.main' }}>
                                {initials}
                              </Avatar>
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>{emp.name}</Typography>
                                <Typography variant="caption" color="text.secondary">{emp.email ? emp.email.split('@')[0] + '@...' : ''}</Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip label={emp.department || 'Operations'} size="small" variant="outlined" sx={{ borderRadius: 1.5, fontSize: '0.75rem' }} />
                          </TableCell>
                          {/* Live Status with pulsing dot */}
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{
                                width: 9, height: 9, borderRadius: '50%',
                                bgcolor: isOnBreak ? 'warning.main' : isOnline ? 'success.main' : 'text.disabled',
                                ...(isOnline && !isOnBreak && {
                                  animation: 'live-pulse 2s infinite',
                                  '@keyframes live-pulse': {
                                    '0%': { boxShadow: '0 0 0 0 rgba(52,211,153,0.7)' },
                                    '70%': { boxShadow: '0 0 0 7px rgba(52,211,153,0)' },
                                    '100%': { boxShadow: '0 0 0 0 rgba(52,211,153,0)' }
                                  }
                                })
                              }} />
                              <Typography variant="body2" sx={{ fontWeight: 600, color: isOnBreak ? 'warning.main' : isOnline ? 'success.main' : 'text.disabled' }}>
                                {isOnBreak ? `On Break` : isOnline ? 'Online' : 'Offline'}
                              </Typography>
                            </Box>
                          </TableCell>
                          {/* Productivity progress bar */}
                          <TableCell sx={{ minWidth: 130 }}>
                            {prodScore !== null && isOnline ? (
                              <Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                  <Typography variant="caption" sx={{ fontWeight: 700, color: prodScore >= 70 ? 'success.main' : prodScore >= 40 ? 'warning.main' : 'error.main' }}>
                                    {Math.round(prodScore)}%
                                  </Typography>
                                </Box>
                                <LinearProgress
                                  variant="determinate"
                                  value={prodScore}
                                  sx={{ height: 6, borderRadius: 3, bgcolor: 'action.selected', '& .MuiLinearProgress-bar': { bgcolor: prodScore >= 70 ? 'success.main' : prodScore >= 40 ? 'warning.main' : 'error.main', borderRadius: 3 } }}
                                />
                              </Box>
                            ) : (
                              <Typography variant="caption" color="text.disabled">—</Typography>
                            )}
                          </TableCell>
                          <TableCell sx={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'text.secondary', fontSize: '0.8rem' }}>
                            {checkinRec?.location?.address || '—'}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>
                            {calculateTotalHours(checkinRec)} {calculateTotalHours(checkinRec) !== '--' ? 'hrs' : ''}
                          </TableCell>
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                              {checkinRec && (
                                <Tooltip title="View Map & Selfie">
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<MapIcon />}
                                    onClick={() => setSelectedEmpDialog({ emp, checkinRec })}
                                    sx={{ textTransform: 'none', borderRadius: 1.5, fontSize: '0.75rem' }}
                                  >
                                    Map & Selfie
                                  </Button>
                                </Tooltip>
                              )}
                              <Button
                                variant="contained"
                                size="small"
                                startIcon={<ViewIcon />}
                                onClick={() => navigate(`/manager/monitoring/${emp._id || emp.id}`)}
                                sx={{ textTransform: 'none', borderRadius: 1.5 }}
                              >
                                Track
                              </Button>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </Box>
      )}
    </Box>

      {/* Map & Selfie Quick-View Dialog */}
      <Dialog
        open={!!selectedEmpDialog}
        onClose={() => setSelectedEmpDialog(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        {selectedEmpDialog && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar sx={{ width: 38, height: 38, bgcolor: 'primary.main', fontWeight: 700, fontSize: '0.9rem' }}>
                  {selectedEmpDialog.emp.name?.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                    {selectedEmpDialog.emp.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {selectedEmpDialog.emp.department} • Check-in Verification
                  </Typography>
                </Box>
              </Box>
              <IconButton onClick={() => setSelectedEmpDialog(null)} size="small">
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <Divider />
            <DialogContent sx={{ p: 3 }}>
              <Grid container spacing={3}>
                {/* MAP */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <MapIcon color="primary" sx={{ fontSize: 18 }} /> Check-in Location
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    {selectedEmpDialog.checkinRec?.location?.address || 'No address logged'}
                  </Typography>
                  <Box sx={{ width: '100%', height: 260, borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                    <iframe
                      title="Check-in GPS Map"
                      src={`https://maps.google.com/maps?q=${selectedEmpDialog.checkinRec?.location?.latitude || 40.7128},${selectedEmpDialog.checkinRec?.location?.longitude || -74.006}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      allowFullScreen
                      loading="lazy"
                    />
                  </Box>
                </Grid>
                {/* SELFIE */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <FaceIcon color="primary" sx={{ fontSize: 18 }} /> Verification Selfie
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    {selectedEmpDialog.checkinRec?.checkInTime
                      ? `Logged: ${new Date(selectedEmpDialog.checkinRec.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                      : 'Check-in time unknown'}
                  </Typography>
                  <Box sx={{ width: '100%', height: 260, borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider', bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {selectedEmpDialog.checkinRec?.webcamImage ? (
                      <Box
                        component="img"
                        src={selectedEmpDialog.checkinRec.webcamImage.startsWith('http') ? selectedEmpDialog.checkinRec.webcamImage : `${API_URL}${selectedEmpDialog.checkinRec.webcamImage}`}
                        alt="Verification selfie"
                        sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <Box sx={{ textAlign: 'center', color: 'text.disabled' }}>
                        <FaceIcon sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
                        <Typography variant="body2">No selfie captured for this check-in</Typography>
                      </Box>
                    )}
                  </Box>
                </Grid>
              </Grid>
            </DialogContent>
          </>
        )}
      </Dialog>
    </>
  );
}

export default ManagerMonitoring;
