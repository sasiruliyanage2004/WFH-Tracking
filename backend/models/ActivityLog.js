// backend/models/ActivityLog.js
const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: String, // YYYY-MM-DD
    required: true
  },
  activeMinutes: {
    type: Number,
    default: 0
  },
  idleMinutes: {
    type: Number,
    default: 0
  },
  keyboardCount: {
    type: Number,
    default: 0
  },
  mouseCount: {
    type: Number,
    default: 0
  },
  productivityPercentage: {
    type: Number,
    default: 100
  },
  warningEmailSent: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Ensure unique log entry per employee per day
ActivityLogSchema.index({ employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('ActivityLog', ActivityLogSchema);
