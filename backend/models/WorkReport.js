// backend/models/WorkReport.js
const mongoose = require('mongoose');

const WorkReportSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: String, // YYYY-MM-DD
    required: true
  },
  tasksCompleted: {
    type: [String],
    default: []
  },
  tasksInProgress: {
    type: [String],
    default: []
  },
  challengesFaced: {
    type: String,
    default: ''
  },
  tomorrowPlan: {
    type: String,
    default: ''
  },
  totalHoursWorked: {
    type: Number,
    required: true
  },
  approvalStatus: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  managerFeedback: {
    type: String,
    default: ''
  }
}, { timestamps: true });

// Limit: one report per employee per day
WorkReportSchema.index({ employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('WorkReport', WorkReportSchema);
