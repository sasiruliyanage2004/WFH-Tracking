// frontend/src/pages/EmployeeMonitoring.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  IconButton,
  Chip,
  Checkbox
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  MyLocation as MapIcon,
  Schedule as TimeIcon,
  Close as CloseIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import CustomLoader from '../components/CustomLoader';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function EmployeeMonitoring() {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const { token } = useSelector((state) => state.auth);

  // States
  const [employeeInfo, setEmployeeInfo] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [screenshots, setScreenshots] = useState([]);
  const [activity, setActivity] = useState([]);
  const [appUsage, setAppUsage] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);

  // Deletion selection states
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === screenshots.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(screenshots.map((ss) => ss._id || ss.id));
    }
  };

  const handleDeleteSelected = async () => {
    try {
      setDeleteLoading(true);
      const authHeader = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post(`${API_URL}/api/monitoring/screenshots/delete-bulk`, { ids: selectedIds }, authHeader);
      
      // Update local screenshots list
      setScreenshots((prev) => prev.filter((ss) => !selectedIds.includes(ss._id || ss.id)));
      
      // Reset state
      setSelectedIds([]);
      setIsSelectMode(false);
      setDeleteConfirmOpen(false);
    } catch (err) {
      console.error('Failed to delete screenshots:', err.message);
    } finally {
      setDeleteLoading(false);
    }
  };



  useEffect(() => {
    const fetchEmployeeDetails = async () => {
      try {
        setLoading(true);
        const authHeader = { headers: { Authorization: `Bearer ${token}` } };

        // Get attendance history
        const attRes = await axios.get(`${API_URL}/api/attendance/all?employeeId=${employeeId}`, authHeader);
        setAttendance(attRes.data);

        if (attRes.data.length > 0) {
          setEmployeeInfo(attRes.data[0].employee);
        }

        // Get screenshots
        const ssRes = await axios.get(`${API_URL}/api/monitoring/screenshots/${employeeId}`, authHeader);
        setScreenshots(ssRes.data);

        // Get activity logs
        const actRes = await axios.get(`${API_URL}/api/monitoring/activity/${employeeId}`, authHeader);
        setActivity(actRes.data);

        // Get app usage logs
        const usageRes = await axios.get(`${API_URL}/api/monitoring/usage/${employeeId}`, authHeader);
        setAppUsage(usageRes.data);

      } catch (err) {
        console.error('Failed to load employee details:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployeeDetails();
  }, [employeeId, token]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CustomLoader />
      </Box>
    );
  }

  // Get most recent check-in location coords
  const latestCheckin = attendance.length > 0 ? attendance[0] : null;
  const latitude = latestCheckin?.location?.latitude || 40.7128;
  const longitude = latestCheckin?.location?.longitude || -74.0060;
  const mapAddress = latestCheckin?.location?.address || 'No location logged';

  // Get productivity score for today
  const todayActivity = activity.length > 0 ? activity[0] : null;
  const prodScore = todayActivity ? todayActivity.productivityPercentage : 100;

  // Embeddable Google Map URL without API Key
  const googleMapEmbedUrl = `https://maps.google.com/maps?q=${latitude},${longitude}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

  // App usage stats calculations
  const totalUsageMins = appUsage.reduce((sum, item) => sum + Number(item.duration_minutes || 0), 0);
  const productiveMins = appUsage.filter(item => item.type === 'Productive').reduce((sum, item) => sum + Number(item.duration_minutes || 0), 0);
  const unproductiveMins = appUsage.filter(item => item.type === 'Unproductive').reduce((sum, item) => sum + Number(item.duration_minutes || 0), 0);
  const neutralMins = appUsage.filter(item => item.type === 'Neutral').reduce((sum, item) => sum + Number(item.duration_minutes || 0), 0);

  const productivePct = totalUsageMins > 0 ? (productiveMins / totalUsageMins) * 100 : 0;
  const unproductivePct = totalUsageMins > 0 ? (unproductiveMins / totalUsageMins) * 100 : 0;
  const neutralPct = totalUsageMins > 0 ? (neutralMins / totalUsageMins) * 100 : 0;

  const formatDuration = (mins) => {
    if (mins < 1) {
      const secs = Math.round(mins * 60);
      return `${secs} sec${secs !== 1 ? 's' : ''}`;
    }
    if (mins >= 60) {
      const hrs = mins / 60;
      return `${hrs.toFixed(1)} hr${hrs !== 1 ? 's' : ''}`;
    }
    return `${Math.round(mins)} min${Math.round(mins) !== 1 ? 's' : ''}`;
  };

  return (
    <Box sx={{ pb: 5 }}>
      {/* Back Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button variant="outlined" startIcon={<BackIcon />} onClick={() => navigate('/manager/dashboard')}>
          Back to Dashboard
        </Button>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Monitoring: {employeeInfo?.name || 'Employee Profile'}
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* GPS Verification Map and webcam selfie validation */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <MapIcon color="primary" /> Latest Check-in Location
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Address: {mapAddress}
              </Typography>
              
              {/* Google Map iframe container */}
              <Box sx={{ width: '100%', height: 320, borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                <iframe
                  title="Employee CheckIn GPS Map"
                  src={googleMapEmbedUrl}
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  aria-hidden="false"
                  tabIndex="0"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Webcam Verification check-in selfie */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                  Verification Selfie
                </Typography>
                {latestCheckin?.webcamImage ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <Box
                      component="img"
                      src={latestCheckin.webcamImage.startsWith('/uploads') ? `${API_URL}${latestCheckin.webcamImage}` : latestCheckin.webcamImage}
                      alt="check-in selfie verification"
                      onClick={() => setSelectedImage(latestCheckin.webcamImage.startsWith('/uploads') ? `${API_URL}${latestCheckin.webcamImage}` : latestCheckin.webcamImage)}
                      sx={{
                        width: '100%',
                        maxHeight: 280,
                        objectFit: 'contain',
                        borderRadius: 2,
                        cursor: 'zoom-in',
                        border: '1px solid',
                        borderColor: 'divider'
                      }}
                    />
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 5 }}>
                    No identity verification selfie captured for this check-in.
                  </Typography>
                )}
              </Box>
              
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Logged Time: {latestCheckin?.checkInTime ? new Date(latestCheckin.checkInTime).toLocaleString() : '--'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Today's Breaks Card */}
        <Grid item xs={12}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <TimeIcon color="primary" /> Today's Breaks & Pauses
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {latestCheckin?.breaks && latestCheckin.breaks.length > 0 ? (
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {latestCheckin.breaks.map((b, i) => {
                    const start = new Date(b.startTime);
                    const end = b.endTime ? new Date(b.endTime) : new Date();
                    const diffMins = Math.round((end - start) / 60000);
                    return (
                      <Chip 
                        key={i} 
                        label={`${b.breakType}: ${diffMins}m ${b.note ? `"${b.note}"` : ''}`} 
                        variant="outlined"
                        color="secondary"
                      />
                    );
                  })}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No breaks taken today.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Screenshot monitoring logs viewer */}
        <Grid item xs={12}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Screen Capture Logs (Every 5 mins)
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                  {prodScore >= 70 ? (
                    <Chip
                      label={`🛡️ Privacy Enabled: 1h Auto-Delete Active (${prodScore}% Productivity)`}
                      color="success"
                      variant="outlined"
                      sx={{ fontWeight: 600 }}
                    />
                  ) : (
                    <Chip
                      label={`🔍 Full Audit: All Retained (${prodScore}% Productivity)`}
                      color="warning"
                      variant="outlined"
                      sx={{ fontWeight: 600 }}
                    />
                  )}

                  {screenshots.length > 0 && (
                    <>
                      {!isSelectMode ? (
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          startIcon={<DeleteIcon />}
                          onClick={() => {
                            setIsSelectMode(true);
                            setSelectedIds([]);
                          }}
                          sx={{ borderRadius: 2, fontWeight: 700 }}
                        >
                          Delete Captures
                        </Button>
                      ) : (
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={handleSelectAll}
                            sx={{ borderRadius: 2, fontWeight: 600 }}
                          >
                            {selectedIds.length === screenshots.length ? 'Deselect All' : 'Select All'}
                          </Button>
                          <Button
                            variant="contained"
                            color="error"
                            size="small"
                            startIcon={<DeleteIcon />}
                            onClick={() => setDeleteConfirmOpen(true)}
                            disabled={selectedIds.length === 0}
                            sx={{ borderRadius: 2, fontWeight: 700 }}
                          >
                            Delete Selected ({selectedIds.length})
                          </Button>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => {
                              setIsSelectMode(false);
                              setSelectedIds([]);
                            }}
                            sx={{ borderRadius: 2, color: 'text.secondary', borderColor: 'divider' }}
                          >
                            Cancel
                          </Button>
                        </Box>
                      )}
                    </>
                  )}
                </Box>
              </Box>
              <Divider sx={{ mb: 3 }} />

              {screenshots.length === 0 ? (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                  No screen capture history logged.
                </Typography>
              ) : (
                <Grid container spacing={2}>
                  {screenshots.map((ss) => {
                    const isSelected = selectedIds.includes(ss._id || ss.id);
                    return (
                      <Grid item xs={12} sm={6} md={4} key={ss._id || ss.id}>
                        <Paper
                          variant="outlined"
                          sx={{
                            p: 1,
                            cursor: 'pointer',
                            position: 'relative',
                            borderColor: isSelected ? 'error.main' : 'divider',
                            borderWidth: isSelected ? '2px' : '1px',
                            boxShadow: isSelected ? '0 0 10px rgba(239, 68, 68, 0.25)' : 'none',
                            '&:hover': { 
                              borderColor: isSelectMode ? (isSelected ? 'error.dark' : 'primary.main') : 'primary.main', 
                              transform: 'scale(1.02)' 
                            },
                            transition: 'all 0.2s ease-in-out',
                            borderRadius: 2
                          }}
                          onClick={() => {
                            if (isSelectMode) {
                              toggleSelect(ss._id || ss.id);
                            } else {
                              setSelectedImage(ss.screenshotUrl.startsWith('/uploads') ? `${API_URL}${ss.screenshotUrl}` : ss.screenshotUrl);
                            }
                          }}
                        >
                          {isSelectMode && (
                            <Box sx={{ position: 'absolute', top: 4, left: 4, zIndex: 10 }}>
                              <Checkbox
                                size="small"
                                color="error"
                                checked={isSelected}
                                onChange={() => toggleSelect(ss._id || ss.id)}
                                onClick={(e) => e.stopPropagation()}
                                sx={{
                                  p: 0.5,
                                  color: 'rgba(255,255,255,0.7)',
                                  bgcolor: 'rgba(0,0,0,0.5)',
                                  borderRadius: 1,
                                  '&.Mui-checked': {
                                    color: 'error.main',
                                    bgcolor: 'rgba(0,0,0,0.7)',
                                  },
                                  '&:hover': {
                                    bgcolor: 'rgba(0,0,0,0.8)',
                                  }
                                }}
                              />
                            </Box>
                          )}
                          <Box
                            component="img"
                            src={ss.screenshotUrl.startsWith('/uploads') ? `${API_URL}${ss.screenshotUrl}` : ss.screenshotUrl}
                            alt="screen capture log"
                            sx={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 1 }}
                          />
                          <Typography variant="caption" display="block" align="center" sx={{ mt: 1, fontWeight: 500 }}>
                            {new Date(ss.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Typography>
                        </Paper>
                      </Grid>
                    );
                  })}
                </Grid>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Application & Website Usage Telemetry Logs */}
        <Grid item xs={12}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
                Application & Website Usage Logs (Active Window)
              </Typography>
              <Divider sx={{ mb: 3 }} />

              {appUsage.length === 0 ? (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                  No application usage telemetry logged from the desktop agent.
                </Typography>
              ) : (
                <Box>
                  {/* Segmented Progress bar */}
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                    Productivity Breakdown
                  </Typography>
                  <Box sx={{ display: 'flex', height: 16, borderRadius: 8, overflow: 'hidden', mb: 2, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}>
                    {productiveMins > 0 && (
                      <Box 
                        sx={{ width: `${productivePct}%`, bgcolor: 'success.main', transition: 'width 0.3s ease' }} 
                        title={`Productive: ${productivePct.toFixed(1)}%`} 
                      />
                    )}
                    {neutralMins > 0 && (
                      <Box 
                        sx={{ width: `${neutralPct}%`, bgcolor: 'action.disabledBackground', transition: 'width 0.3s ease' }} 
                        title={`Neutral: ${neutralPct.toFixed(1)}%`} 
                      />
                    )}
                    {unproductiveMins > 0 && (
                      <Box 
                        sx={{ width: `${unproductivePct}%`, bgcolor: 'error.main', transition: 'width 0.3s ease' }} 
                        title={`Unproductive: ${unproductivePct.toFixed(1)}%`} 
                      />
                    )}
                  </Box>

                  {/* Legend row */}
                  <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mb: 4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'success.main' }} />
                      <Typography variant="caption" sx={{ fontWeight: 500 }}>
                        Productive: <strong>{formatDuration(productiveMins)}</strong> ({productivePct.toFixed(0)}%)
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'action.disabled' }} />
                      <Typography variant="caption" sx={{ fontWeight: 500 }}>
                        Neutral: <strong>{formatDuration(neutralMins)}</strong> ({neutralPct.toFixed(0)}%)
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'error.main' }} />
                      <Typography variant="caption" sx={{ fontWeight: 500 }}>
                        Unproductive: <strong>{formatDuration(unproductiveMins)}</strong> ({unproductivePct.toFixed(0)}%)
                      </Typography>
                    </Box>
                  </Box>

                  {/* App logs table */}
                  <TableContainer component={Paper} variant="outlined" sx={{ border: 'none' }}>
                    <Table>
                      <TableHead sx={{ bgcolor: 'action.hover' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600 }}>Application</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Focused Window Title</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                          <TableCell sx={{ fontWeight: 600 }} align="right">Time Spent</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {appUsage.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell sx={{ fontWeight: 500 }}>{item.app_name}</TableCell>
                            <TableCell sx={{ color: 'text.secondary', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.window_title || '--'}
                            </TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={item.type}
                                color={item.type === 'Productive' ? 'success' : item.type === 'Unproductive' ? 'error' : 'default'}
                                variant="outlined"
                                sx={{ fontWeight: 600 }}
                              />
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600 }}>
                              {formatDuration(item.duration_minutes)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Activity & Productivity Logs */}
        <Grid item xs={12}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <TimeIcon color="primary" /> Keyboard & Mouse Interaction Logs
              </Typography>
              <Divider sx={{ mb: 3 }} />

              {activity.length === 0 ? (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
                  No activity logs synchronized.
                </Typography>
              ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ border: 'none' }}>
                  <Table>
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Active Duration (Mins)</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Idle Duration (Mins)</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Keyboard Keypresses</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Mouse Clicks/Events</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Productivity Score</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {activity.map((act) => (
                        <TableRow key={act._id}>
                          <TableCell sx={{ fontWeight: 500 }}>{act.date}</TableCell>
                          <TableCell>{Math.round(act.activeMinutes * 10) / 10} min</TableCell>
                          <TableCell>{Math.round(act.idleMinutes * 10) / 10} min</TableCell>
                          <TableCell>{act.keyboardCount}</TableCell>
                          <TableCell>{act.mouseCount}</TableCell>
                          <TableCell sx={{ fontWeight: 700, color: act.productivityPercentage > 80 ? 'success.main' : act.productivityPercentage > 50 ? 'warning.main' : 'error.main' }}>
                            {act.productivityPercentage}%
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

      {/* Image zoom modal Dialog */}
      <Dialog open={selectedImage !== null} onClose={() => setSelectedImage(null)} maxWidth="lg">
        <Box sx={{ position: 'relative', bgcolor: 'black' }}>
          <IconButton
            onClick={() => setSelectedImage(null)}
            sx={{ position: 'absolute', top: 8, right: 8, color: 'white', bgcolor: 'rgba(0,0,0,0.5)', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }}
          >
            <CloseIcon />
          </IconButton>
          <DialogContent sx={{ p: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Box
              component="img"
              src={selectedImage}
              alt="Zoomed Capture Details"
              sx={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain' }}
            />
          </DialogContent>
        </Box>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: 'error.main' }}>⚠️ Delete Screenshots</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Are you sure you want to delete the <strong>{selectedIds.length}</strong> selected screen capture{selectedIds.length > 1 ? 's' : ''}?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This action cannot be undone. The selected screenshots will be permanently deleted from the system and server storage.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setDeleteConfirmOpen(false)} color="inherit" disabled={deleteLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteSelected}
            variant="contained"
            color="error"
            disabled={deleteLoading}
            startIcon={deleteLoading ? <CircularProgress size={20} color="inherit" /> : <DeleteIcon />}
          >
            {deleteLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default EmployeeMonitoring;
