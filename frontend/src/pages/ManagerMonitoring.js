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
  Divider,
  Grid,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip
} from '@mui/material';
import { Visibility as ViewIcon, Monitor as MonitoringIcon } from '@mui/icons-material';

function ManagerMonitoring() {
  const navigate = useNavigate();
  const { token } = useSelector((state) => state.auth);
  
  const [summary, setSummary] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setLoading(true);
        setError('');
        const authHeader = { headers: { Authorization: `Bearer ${token}` } };
        const res = await axios.get(`${API_URL}/api/monitoring/summary`, authHeader);
        setSummary(res.data);

        // Fetch user records to list all employees
        try {
          const reportsRes = await axios.get(`${API_URL}/api/reports`, authHeader);
          const employeeMap = new Map();
          reportsRes.data.forEach(r => {
            if (r.employee) employeeMap.set(r.employee._id || r.employee.id, r.employee);
          });
          res.data.liveCheckins?.forEach(c => {
            if (c.employee) employeeMap.set(c.employee._id || c.employee.id, c.employee);
          });
          const list = Array.from(employeeMap.values());
          setEmployees(list);
        } catch (reportsErr) {
          // Reports fetch failed - still show page with empty list
          const employeeMap = new Map();
          res.data.liveCheckins?.forEach(c => {
            if (c.employee) employeeMap.set(c.employee._id || c.employee.id, c.employee);
          });
          setEmployees(Array.from(employeeMap.values()));
        }
      } catch (err) {
        console.error('Monitoring load error:', err.message);
        setError(err.response?.data?.message || 'Failed to load monitoring data.');
        setSummary({ onlineEmployees: 0, offlineEmployees: 0, productivityScore: 0, liveCheckins: [] });
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [token]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Employee Monitoring Directory</Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ borderRadius: 3, textAlign: 'center' }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary">ACTIVE WFH STAFF</Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: 'success.main' }}>
                {summary.onlineEmployees}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ borderRadius: 3, textAlign: 'center' }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary">OFFLINE STAFF</Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: 'text.disabled' }}>
                {summary.offlineEmployees}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ borderRadius: 3, textAlign: 'center' }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary">TEAM PRODUCTIVITY SCORE</Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: 'primary.main' }}>
                {summary.productivityScore}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <TableContainer component={Paper} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: '0px 4px 20px rgba(0,0,0,0.03)' }}>
        <Table>
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Employee Name</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Department</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Check-in Location</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Hours Today</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="center">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {employees.map((emp) => {
              const checkinRec = summary.liveCheckins.find(c => (c.employee?._id === emp._id || c.employee?.id === emp._id));
              const isOnline = checkinRec && !checkinRec.checkOutTime;
              
              return (
                <TableRow key={emp._id || emp.id}>
                  <TableCell sx={{ fontWeight: 600 }}>{emp.name}</TableCell>
                  <TableCell>{emp.department || 'Operations'}</TableCell>
                  <TableCell>
                    <Chip
                      label={isOnline ? 'Online' : 'Offline'}
                      color={isOnline ? 'success' : 'default'}
                      size="small"
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
                      variant="outlined"
                      size="small"
                      startIcon={<ViewIcon />}
                      onClick={() => navigate(`/manager/monitoring/${emp._id || emp.id}`)}
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
    </Box>
  );
}

export default ManagerMonitoring;
