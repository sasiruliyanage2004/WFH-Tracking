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
  IconButton
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  MyLocation as MapIcon,
  Schedule as TimeIcon,
  Close as CloseIcon
} from '@mui/icons-material';

function EmployeeMonitoring() {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const { token } = useSelector((state) => state.auth);

  // States
  const [employeeInfo, setEmployeeInfo] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [screenshots, setScreenshots] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

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
        <CircularProgress />
      </Box>
    );
  }

  // Get most recent check-in location coords
  const latestCheckin = attendance.length > 0 ? attendance[0] : null;
  const latitude = latestCheckin?.location?.latitude || 40.7128;
  const longitude = latestCheckin?.location?.longitude || -74.0060;
  const mapAddress = latestCheckin?.location?.address || 'No location logged';

  // Embeddable Google Map URL without API Key
  const googleMapEmbedUrl = `https://maps.google.com/maps?q=${latitude},${longitude}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

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
                      src={`${API_URL}${latestCheckin.webcamImage}`}
                      alt="check-in selfie verification"
                      onClick={() => setSelectedImage(`${API_URL}${latestCheckin.webcamImage}`)}
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

        {/* Screenshot monitoring logs viewer */}
        <Grid item xs={12}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                Screen Capture Logs (Every 15 mins)
              </Typography>
              <Divider sx={{ mb: 3 }} />

              {screenshots.length === 0 ? (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                  No screen capture history logged.
                </Typography>
              ) : (
                <Grid container spacing={2}>
                  {screenshots.map((ss) => (
                    <Grid item xs={6} sm={4} md={3} key={ss._id || ss.id}>
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 1,
                          cursor: 'pointer',
                          '&:hover': { borderColor: 'primary.main', transform: 'scale(1.02)' },
                          transition: 'all 0.2s ease-in-out',
                          borderRadius: 2
                        }}
                        onClick={() => setSelectedImage(ss.screenshotUrl.startsWith('/uploads') ? `${API_URL}${ss.screenshotUrl}` : ss.screenshotUrl)}
                      >
                        <Box
                          component="img"
                          src={ss.screenshotUrl.startsWith('/uploads') ? `${API_URL}${ss.screenshotUrl}` : ss.screenshotUrl}
                          alt="screen capture log"
                          sx={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 1 }}
                        />
                        <Typography variant="caption" display="block" align="center" sx={{ mt: 1, fontWeight: 500 }}>
                          {new Date(ss.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
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
    </Box>
  );
}

export default EmployeeMonitoring;
