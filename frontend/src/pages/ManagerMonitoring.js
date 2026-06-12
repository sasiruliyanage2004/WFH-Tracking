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
  CircularProgress,
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
  TextField,
  Select,
  MenuItem,
  FormControl,
  Tabs,
  Tab,
  InputAdornment,
  Tooltip
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Refresh as RefreshIcon,
  GetApp as ExportIcon,
  Search as SearchIcon,
  Circle as CircleIcon
} from '@mui/icons-material';

function ManagerMonitoring() {
  const navigate = useNavigate();
  const { token } = useSelector((state) => state.auth);
  
  // Navigation tabs: 0 = Productivity Leaderboard (Top Users), 1 = Live Status Directory
  const [viewTab, setViewTab] = useState(0); // Default to Leaderboard as requested

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
  const [department, setDepartment] = useState('All');
  const [userSearch, setUserSearch] = useState('');
  const [leaderboardTab, setLeaderboardTab] = useState('USERS'); // USERS or GROUPS
  const [viewMode, setViewMode] = useState('SUMMARY'); // SUMMARY VIEW or DETAILED VIEW

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
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
    if (leaderboard.length === 0) return;
    const headers = ['User', 'Department', 'Productive Time', 'Unproductive Time', 'Undefined Time', 'Total Work Time', 'Active Time', 'Offline Meetings'];
    const rows = leaderboard.map(row => [
      row.name,
      row.department,
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
    link.setAttribute("download", `productivity_leaderboard_${dateRange}_${department}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Client-side search filtering
  const filteredLeaderboard = leaderboard.filter(item => 
    item.name.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
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
                  sx={{ borderRadius: 2, bgcolor: 'background.paper', fontWeight: 600 }}
                >
                  <MenuItem value="All">All Departments</MenuItem>
                  <MenuItem value="Product">Product</MenuItem>
                  <MenuItem value="Operations">Operations</MenuItem>
                  <MenuItem value="Engineering">Engineering</MenuItem>
                  <MenuItem value="Marketing">Marketing</MenuItem>
                  <MenuItem value="HR">HR</MenuItem>
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
              <Tooltip title="Groups feature currently unavailable">
                <span>
                  <Button
                    variant={leaderboardTab === 'GROUPS' ? 'contained' : 'text'}
                    color="inherit"
                    size="small"
                    disabled
                    sx={{ borderRadius: 1.5, px: 3, fontWeight: 700, textTransform: 'none' }}
                  >
                    GROUPS
                  </Button>
                </span>
              </Tooltip>
            </Box>

            {/* SUMMARY/DETAILED VIEW switcher */}
            <Box sx={{ display: 'flex', bgcolor: 'action.hover', p: 0.5, borderRadius: 2 }}>
              <Button
                size="small"
                onClick={() => setViewMode('SUMMARY')}
                sx={{
                  borderRadius: 1.5,
                  px: 2.5,
                  fontWeight: 700,
                  textTransform: 'none',
                  color: viewMode === 'SUMMARY' ? 'primary.main' : 'text.secondary',
                  bgcolor: viewMode === 'SUMMARY' ? 'background.paper' : 'transparent',
                  border: viewMode === 'SUMMARY' ? '1px solid' : 'none',
                  borderColor: 'divider',
                  '&:hover': { bgcolor: viewMode === 'SUMMARY' ? 'background.paper' : 'action.selected' }
                }}
              >
                SUMMARY VIEW
              </Button>
              <Button
                size="small"
                onClick={() => setViewMode('DETAILED')}
                sx={{
                  borderRadius: 1.5,
                  px: 2.5,
                  fontWeight: 700,
                  textTransform: 'none',
                  color: viewMode === 'DETAILED' ? 'primary.main' : 'text.secondary',
                  bgcolor: viewMode === 'DETAILED' ? 'background.paper' : 'transparent',
                  border: viewMode === 'DETAILED' ? '1px solid' : 'none',
                  borderColor: 'divider',
                  '&:hover': { bgcolor: viewMode === 'DETAILED' ? 'background.paper' : 'action.selected' }
                }}
              >
                DETAILED VIEW
              </Button>
            </Box>
          </Box>

          {/* Leaderboard Table */}
          {loadingLeaderboard ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : leaderboardError ? (
            <Paper sx={{ py: 6, textAlign: 'center', borderRadius: 3, px: 3 }}>
              <Typography color="error" sx={{ fontWeight: 600 }}>{leaderboardError}</Typography>
            </Paper>
          ) : filteredLeaderboard.length === 0 ? (
            <Paper sx={{ py: 6, textAlign: 'center', borderRadius: 3, px: 3 }}>
              <Typography color="text.secondary">No records found matching the criteria.</Typography>
            </Paper>
          ) : (
            <TableContainer component={Paper} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
              <Table>
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, py: 1.5 }}>User</TableCell>
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
                        placeholder="Search user..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        sx={{ maxWidth: 300, bgcolor: 'background.paper', borderRadius: 1.5 }}
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
                  {filteredLeaderboard.map((row) => {
                    // Calculate stacked bar segment percentages
                    const totalMins = row.productiveMins + row.unproductiveMins + row.neutralMins;
                    const prodPct = totalMins > 0 ? (row.productiveMins / totalMins) * 100 : 100;
                    const unprodPct = totalMins > 0 ? (row.unproductiveMins / totalMins) * 100 : 0;
                    const neutPct = totalMins > 0 ? (row.neutralMins / totalMins) * 100 : 0;

                    return (
                      <TableRow key={row.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                        {/* User Profile Column */}
                        <TableCell sx={{ py: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ bgcolor: 'primary.light', width: 34, height: 34, fontWeight: 700, fontSize: '0.85rem' }}>
                            {row.name.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {row.name}
                            </Typography>
                            {viewMode === 'DETAILED' && (
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
              <CircularProgress />
            </Box>
          ) : summaryError ? (
            <Paper sx={{ py: 4, textAlign: 'center', mb: 4, borderRadius: 3 }}>
              <Typography color="error">{summaryError}</Typography>
            </Paper>
          ) : (
            <>
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={4}>
                  <Card sx={{ borderRadius: 3, textAlign: 'center', boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
                    <CardContent>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>ACTIVE WFH STAFF</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: 'success.main' }}>
                        {summary?.onlineEmployees || 0}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Card sx={{ borderRadius: 3, textAlign: 'center', boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
                    <CardContent>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>OFFLINE STAFF</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: 'text.disabled' }}>
                        {summary?.offlineEmployees || 0}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Card sx={{ borderRadius: 3, textAlign: 'center', boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
                    <CardContent>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>TEAM PRODUCTIVITY SCORE</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: 'primary.main' }}>
                        {summary?.productivityScore || 0}%
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Live Status Table */}
              <TableContainer component={Paper} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
                <Table>
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Employee Name</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Department</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Check-in Location</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Hours Today</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="center">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {employees.map((emp) => {
                      const checkinRec = summary?.liveCheckins?.find(c => (c.employee?._id === emp._id || c.employee?.id === emp._id));
                      const isOnline = checkinRec && !checkinRec.checkOutTime;
                      
                      return (
                        <TableRow key={emp._id || emp.id} hover>
                          <TableCell sx={{ fontWeight: 700 }}>{emp.name}</TableCell>
                          <TableCell>{emp.department || 'Operations'}</TableCell>
                          <TableCell>
                            <Chip
                              label={isOnline ? 'Online' : 'Offline'}
                              color={isOnline ? 'success' : 'default'}
                              size="small"
                              sx={{ fontWeight: 600 }}
                            />
                          </TableCell>
                          <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {checkinRec?.location?.address || 'No location logged'}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>
                            {checkinRec?.durationHours ? `${checkinRec.durationHours} hrs` : '--'}
                          </TableCell>
                          <TableCell align="center">
                            <Button
                              variant="contained"
                              size="small"
                              startIcon={<ViewIcon />}
                              onClick={() => navigate(`/manager/monitoring/${emp._id || emp.id}`)}
                              sx={{ textTransform: 'none', borderRadius: 1.5 }}
                            >
                              Track Details
                            </Button>
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
  );
}

export default ManagerMonitoring;
