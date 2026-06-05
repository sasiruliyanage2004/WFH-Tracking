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

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setLoading(true);
        const authHeader = { headers: { Authorization: `Bearer ${token}` } };
        const res = await axios.get(`${API_URL}/api/monitoring/summary`, authHeader);
        setSummary(res.data);

        // Fetch user records to list all employees
        const reportsRes = await axios.get(`${API_URL}/api/reports`, authHeader);
        
        const employeeMap = new Map();
        reportsRes.data.forEach(r => {
          if (r.employee) employeeMap.set(r.employee._id || r.employee.id, r.employee);
        });
        res.data.liveCheckins.forEach(c => {
          if (c.employee) employeeMap.set(c.employee._id || c.employee.id, c.employee);
        });
        
        let list = Array.from(employeeMap.values());
        if (list.length === 0) {
          list = [
            { _id: 'e1', name: 'Alice Green', email: 'employee1@wfh.com', department: 'Engineering' },
            { _id: 'e2', name: 'John Smith', email: 'employee2@wfh.com', department: 'Design' }
          ];
        }
        setEmployees(list);
      } catch (err) {
        console.error(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [token]);

  if (loading || !summary) {
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
