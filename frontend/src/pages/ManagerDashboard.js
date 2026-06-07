// frontend/src/pages/ManagerDashboard.js
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
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Chip,
  Paper,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  IconButton,
  List
} from '@mui/material';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import {
  People as TeamIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Assignment as TaskIcon,
  GetApp as ExportIcon,
  Visibility as ViewIcon,
  Search as SearchIcon
} from '@mui/icons-material';

const COLORS = ['#0038a8', '#818cf8', '#34d399', '#fbbf24'];

function ManagerDashboard() {
  const navigate = useNavigate();
  const { token, user } = useSelector((state) => state.auth);

  // States
  const [summary, setSummary] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [reports, setReports] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters for Export
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterDate, setFilterDate] = useState('');

  // Dialog States
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [reportFeedback, setReportFeedback] = useState('');
  const [activeReportId, setActiveReportId] = useState(null);
  const [reportActionType, setReportActionType] = useState(''); // 'Approved' or 'Rejected'

  // Task Form
  const [taskName, setTaskName] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskAssignedTo, setTaskAssignedTo] = useState('');
  const [taskPriority, setTaskPriority] = useState('Medium');

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const fetchData = async () => {
    try {
      setLoading(true);
      const authHeader = { headers: { Authorization: `Bearer ${token}` } };
      
      const summaryRes = await axios.get(`${API_URL}/api/monitoring/summary`, authHeader);
      setSummary(summaryRes.data);

      const reportsRes = await axios.get(`${API_URL}/api/reports`, authHeader);
      setReports(reportsRes.data);

      const tasksRes = await axios.get(`${API_URL}/api/tasks`, authHeader);
      setTasks(tasksRes.data);

      // Get list of employees
      // For simplicity, we get users from reports and checkins, or query a mock list
      // Let's query reports populate users to extract employee directory
      const employeeMap = new Map();
      reportsRes.data.forEach(r => {
        if (r.employee) employeeMap.set(r.employee._id || r.employee.id, r.employee);
      });
      summaryRes.data.liveCheckins.forEach(c => {
        if (c.employee) employeeMap.set(c.employee._id || c.employee.id, c.employee);
      });
      
      // Fallback: If map empty, insert seeded users
      let employeeList = Array.from(employeeMap.values());
      if (employeeList.length === 0) {
        employeeList = [
          { _id: 'e1', name: 'Alice Green', email: 'employee1@wfh.com', department: 'Engineering' },
          { _id: 'e2', name: 'John Smith', email: 'employee2@wfh.com', department: 'Design' }
        ];
      }
      setEmployees(employeeList);

    } catch (err) {
      console.error('Fetch manager details error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  // Report Approvals
  const handleOpenReportDialog = (reportId, type) => {
    setActiveReportId(reportId);
    setReportActionType(type);
    setReportFeedback('');
  };

  const handleReportAction = async () => {
    try {
      await axios.put(
        `${API_URL}/api/reports/${activeReportId}/approve`,
        { status: reportActionType, managerFeedback: reportFeedback },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setReports((prev) =>
        prev.map((r) => (r._id === activeReportId ? { ...r, approvalStatus: reportActionType, managerFeedback: reportFeedback } : r))
      );
      setActiveReportId(null);
      fetchData();
    } catch (err) {
      console.error(err.message);
    }
  };

  // Assign Task
  const handleAssignTask = async () => {
    if (!taskName || !taskAssignedTo) return;
    try {
      await axios.post(
        `${API_URL}/api/tasks`,
        {
          taskName,
          description: taskDesc,
          priority: taskPriority,
          assignedTo: taskAssignedTo
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTaskDialogOpen(false);
      setTaskName('');
      setTaskDesc('');
      setTaskPriority('Medium');
      fetchData();
    } catch (err) {
      console.error(err.message);
    }
  };

  // CSV Report Generator Export
  const exportToCSV = () => {
    const today = new Date().toISOString().split('T')[0];
    let records = summary?.liveCheckins || [];
    
    // Apply filters
    if (filterEmployee) {
      records = records.filter(r => r.employee?._id === filterEmployee || r.employee?.id === filterEmployee);
    }
    if (filterDate) {
      records = records.filter(r => r.date === filterDate);
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Employee,Department,Check-In Time,Check-Out Time,Hours Worked,GPS Location\n";

    records.forEach(r => {
      const name = r.employee?.name || 'N/A';
      const dept = r.employee?.department || 'N/A';
      const checkin = r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString() : 'N/A';
      const checkout = r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString() : 'N/A';
      const hours = r.durationHours || 0;
      const addr = (r.location?.address || 'N/A').replace(/,/g, ' ');

      csvContent += `"${name}","${dept}","${checkin}","${checkout}",${hours},"${addr}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `WFH_Attendance_Report_${filterDate || today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Styled PDF Print
  const exportToPDF = () => {
    window.print();
  };

  if (loading || !summary) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Visual chart datasets
  const pieData = [
    { name: 'Online', value: summary.onlineEmployees },
    { name: 'Offline', value: summary.offlineEmployees }
  ];

  const productivityTrendData = [
    { day: 'Mon', score: 85 },
    { day: 'Tue', score: 92 },
    { day: 'Wed', score: 88 },
    { day: 'Thu', score: 94 },
    { day: 'Fri', score: summary.productivityScore || 90 }
  ];

  const taskCompletionData = [
    { status: 'Pending', count: tasks.filter(t => t.status === 'Pending').length },
    { status: 'In Progress', count: tasks.filter(t => t.status === 'In Progress').length },
    { status: 'Completed', count: tasks.filter(t => t.status === 'Completed').length },
    { status: 'Blocked', count: tasks.filter(t => t.status === 'Blocked').length }
  ];

  return (
    <Box sx={{ pb: 5 }}>
      {/* Visual Analytics top summary cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, borderLeft: '5px solid', borderLeftColor: 'primary.main' }}>
            <CardContent sx={{ py: 2.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>TOTAL EMPLOYEES</Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5 }}>{summary.totalEmployees}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, borderLeft: '5px solid', borderLeftColor: 'success.main' }}>
            <CardContent sx={{ py: 2.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>ONLINE NOW</Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: 'success.main' }}>{summary.onlineEmployees}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, borderLeft: '5px solid', borderLeftColor: 'info.main' }}>
            <CardContent sx={{ py: 2.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>AVG PRODUCTIVITY</Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5 }}>{summary.productivityScore}%</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, borderLeft: '5px solid', borderLeftColor: 'warning.main' }}>
            <CardContent sx={{ py: 2.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>PENDING REPORTS</Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: 'warning.main' }}>{summary.pendingReportsCount}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Row 2: Analytics Charts */}
      <Grid container spacing={3} sx={{ mb: 4 }} className="no-print">
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 3, height: 320 }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Live Shift Status</Typography>
              <Box sx={{ height: 240, display: 'flex', justifyContent: 'center' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 3, height: 320 }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Weekly Productivity Trend</Typography>
              <Box sx={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={productivityTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis domain={[50, 100]} />
                    <RechartsTooltip />
                    <Line type="monotone" dataKey="score" stroke="#38bdf8" strokeWidth={3} activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 3, height: 320 }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Task Completion Distribution</Typography>
              <Box sx={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart data={taskCompletionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="status" />
                    <YAxis allowDecimals={false} />
                    <RechartsTooltip />
                    <Bar dataKey="count" fill="#34d399">
                      {taskCompletionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </RechartsBarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Row 3: Team Status & Actions Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }} className="no-print">
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Active Attendance Check-Ins</Typography>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Filter Employee</InputLabel>
                    <Select
                      value={filterEmployee}
                      label="Filter Employee"
                      onChange={(e) => setFilterEmployee(e.target.value)}
                    >
                      <MenuItem value="">All Staff</MenuItem>
                      {employees.map(e => (
                        <MenuItem key={e._id} value={e._id}>{e.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <TextField
                    type="date"
                    size="small"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    label="Filter Date"
                  />

                  <Button variant="contained" size="small" startIcon={<ExportIcon />} onClick={exportToCSV}>
                    Export CSV
                  </Button>
                  <Button variant="outlined" size="small" onClick={exportToPDF}>
                    Print PDF
                  </Button>
                </Box>
              </Box>

              {summary.liveCheckins.length === 0 ? (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
                  No employees checked in today.
                </Typography>
              ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ border: 'none' }}>
                  <Table>
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Employee</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Department</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Check-In Time</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Check-Out Time</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Hours Worked</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>GPS Location</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="center" className="no-print">Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {summary.liveCheckins.map((rec) => (
                        <TableRow key={rec._id || rec.id}>
                          <TableCell sx={{ fontWeight: 500 }}>{rec.employee?.name}</TableCell>
                          <TableCell>{rec.employee?.department}</TableCell>
                          <TableCell>{new Date(rec.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</TableCell>
                          <TableCell>
                            {rec.checkOutTime ? (
                              new Date(rec.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            ) : rec.onBreak ? (
                              <Chip label={`On Break (${rec.currentBreakType})`} color="warning" size="small" />
                            ) : (
                              <Chip label="Working" color="success" size="small" />
                            )}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{rec.durationHours || '--'} hrs</TableCell>
                          <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {rec.location?.address || 'N/A'}
                          </TableCell>
                          <TableCell align="center" className="no-print">
                            <IconButton 
                              color="primary" 
                              onClick={() => navigate(`/manager/monitoring/${rec.employee?._id || rec.employee?.id}`)}
                            >
                              <ViewIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Row 4: Tasks Panel & Daily Reports approvals */}
      <Grid container spacing={3} className="no-print">
        {/* Task assign widget */}
        <Grid item xs={12} md={5}>
          <Card sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Task Distribution</Typography>
                <Button variant="outlined" size="small" startIcon={<TaskIcon />} onClick={() => setTaskDialogOpen(true)}>
                  Assign Task
                </Button>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              <List sx={{ maxHeight: 300, overflowY: 'auto' }}>
                {tasks.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
                    No tasks assigned yet.
                  </Typography>
                ) : (
                  tasks.slice(0, 5).map((task) => (
                    <Paper key={task._id} variant="outlined" sx={{ p: 1.5, mb: 1.5, borderRadius: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{task.taskName}</Typography>
                        <Chip label={task.status} size="small" color={task.status === 'Completed' ? 'success' : 'default'} />
                      </Box>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                        Assigned to: {task.assignedTo?.name || 'N/A'}
                      </Typography>
                    </Paper>
                  ))
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Pending daily report review section */}
        <Grid item xs={12} md={7}>
          <Card sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Pending Daily Work Reports
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Box sx={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {reports.filter(r => r.approvalStatus === 'Pending').length === 0 ? (
                  <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                    No pending report reviews. All caught up!
                  </Typography>
                ) : (
                  reports.filter(r => r.approvalStatus === 'Pending').map((rep) => (
                    <Paper key={rep._id || rep.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, alignItems: 'center' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          {rep.employee?.name} - Report for {rep.date}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            variant="contained"
                            color="success"
                            size="small"
                            startIcon={<ApproveIcon />}
                            onClick={() => handleOpenReportDialog(rep._id || rep.id, 'Approved')}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="contained"
                            color="error"
                            size="small"
                            startIcon={<RejectIcon />}
                            onClick={() => handleOpenReportDialog(rep._id || rep.id, 'Rejected')}
                          >
                            Reject
                          </Button>
                        </Box>
                      </Box>
                      <Typography variant="caption" display="block" color="text.secondary">
                        Completed: {rep.tasksCompleted?.join(', ')}
                      </Typography>
                      <Typography variant="caption" display="block" color="text.secondary">
                        Hours Worked: {rep.totalHoursWorked} hrs
                      </Typography>
                    </Paper>
                  ))
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Task Assignment Dialog Modal */}
      <Dialog open={taskDialogOpen} onClose={() => setTaskDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Assign Team Task</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          <TextField
            label="Task Name"
            fullWidth
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            required
          />
          <TextField
            label="Description"
            multiline
            rows={3}
            fullWidth
            value={taskDesc}
            onChange={(e) => setTaskDesc(e.target.value)}
          />
          
          <FormControl fullWidth>
            <InputLabel>Assign To Employee</InputLabel>
            <Select
              value={taskAssignedTo}
              label="Assign To Employee"
              onChange={(e) => setTaskAssignedTo(e.target.value)}
            >
              {employees.map(e => (
                <MenuItem key={e._id || e.id} value={e._id || e.id}>{e.name} ({e.department})</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Priority</InputLabel>
            <Select
              value={taskPriority}
              label="Priority"
              onChange={(e) => setTaskPriority(e.target.value)}
            >
              <MenuItem value="Low">Low</MenuItem>
              <MenuItem value="Medium">Medium</MenuItem>
              <MenuItem value="High">High</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setTaskDialogOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={handleAssignTask} variant="contained" color="primary">Assign Task</Button>
        </DialogActions>
      </Dialog>

      {/* Report Review Feedback Dialog */}
      <Dialog open={activeReportId !== null} onClose={() => setActiveReportId(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Report Decision Feedback</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Provide comments or action details to explain why this report is {reportActionType?.toLowerCase()}:
          </Typography>
          <TextField
            label="Manager Comments"
            multiline
            rows={3}
            fullWidth
            value={reportFeedback}
            onChange={(e) => setReportFeedback(e.target.value)}
            placeholder="Add review suggestions..."
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setActiveReportId(null)} color="inherit">Cancel</Button>
          <Button onClick={handleReportAction} variant="contained" color={reportActionType === 'Approved' ? 'success' : 'error'}>
            Confirm {reportActionType}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ManagerDashboard;
