// backend/models/Attendance.js
const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: String, // Store as YYYY-MM-DD for easy daily lookup and constraint
    required: true
  },
  checkInTime: {
    type: Date,
    required: true
  },
  checkOutTime: {
    type: Date
  },
  durationHours: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['Present', 'Completed', 'Late'],
    default: 'Present'
  },
  location: {
    latitude: { type: Number },
    longitude: { type: Number },
    address: { type: String, default: '' }
  },
  webcamImage: {
    type: String,
    default: ''
  }
}, { timestamps: true });

// Create a compound index to prevent duplicate entries for an employee on the same date
AttendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);
