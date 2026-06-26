// frontend/src/pages/AttendanceLogs.js
import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  Dialog,
  DialogContent,
  IconButton
} from '@mui/material';
import { Close as CloseIcon, Visibility as ViewIcon } from '@mui/icons-material';
import CustomLoader from '../components/CustomLoader';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function AttendanceLogs() {
  const { token } = useSelector((state) => state.auth);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_URL}/api/attendance/history`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setHistory(res.data);
      } catch (err) {
        console.error(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [token]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CustomLoader />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>Attendance Log History</Typography>
      
      {history.length === 0 ? (
        <Paper variant="outlined" sx={{ py: 6, textAlign: 'center', borderRadius: 3 }}>
          <Typography variant="body1" color="text.secondary">
            No attendance records found. Check in from the dashboard to start logging.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: '0px 4px 20px rgba(0,0,0,0.03)' }}>
          <Table>
            <TableHead sx={{ bgcolor: 'action.hover' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Check-In</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Check-Out</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Working Hours</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>GPS Location Address</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Verification Selfie</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.map((rec) => (
                <TableRow key={rec._id || rec.id}>
                  <TableCell sx={{ fontWeight: 500 }}>{rec.date}</TableCell>
                  <TableCell>{new Date(rec.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</TableCell>
                  <TableCell>
                    {rec.checkOutTime 
                      ? new Date(rec.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                      : <Chip label="In Progress" color="primary" size="small" />}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {rec.durationHours ? `${rec.durationHours} hrs` : '--'}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {rec.location?.address || 'WFH Remote Office'}
                  </TableCell>
                  <TableCell>
                    {rec.webcamImage ? (
                      <IconButton color="primary" size="small" onClick={() => setSelectedPhoto(rec.webcamImage.startsWith('/uploads') ? `${API_URL}${rec.webcamImage}` : rec.webcamImage)}>
                        <ViewIcon />
                      </IconButton>
                    ) : (
                      'N/A'
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={rec.status || 'Present'}
                      color={rec.status === 'Completed' ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Selfie Zoom Modal dialog */}
      <Dialog open={selectedPhoto !== null} onClose={() => setSelectedPhoto(null)} maxWidth="xs">
        <Box sx={{ position: 'relative', bgcolor: 'black' }}>
          <IconButton
            onClick={() => setSelectedPhoto(null)}
            sx={{ position: 'absolute', top: 8, right: 8, color: 'white', bgcolor: 'rgba(0,0,0,0.5)', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }}
          >
            <CloseIcon />
          </IconButton>
          <DialogContent sx={{ p: 0 }}>
            <Box
              component="img"
              src={selectedPhoto}
              alt="Webcam Selfie Checkin"
              sx={{ width: '100%', height: 'auto', display: 'block' }}
            />
          </DialogContent>
        </Box>
      </Dialog>
    </Box>
  );
}

export default AttendanceLogs;
