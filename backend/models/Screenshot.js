// backend/models/Screenshot.js
const mongoose = require('mongoose');

const ScreenshotSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  screenshotUrl: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Screenshot', ScreenshotSchema);
