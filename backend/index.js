// backend/index.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const multer = require('multer');

// Models
const User = require('./models/User');
const Attendance = require('./models/Attendance');
const Task = require('./models/Task');
const WorkReport = require('./models/WorkReport');
const Screenshot = require('./models/Screenshot');
const ActivityLog = require('./models/ActivityLog');
const Notification = require('./models/Notification');

// Middleware
const { authenticate, authorize } = require('./middleware/auth');
const connectDB = require('./config/db');

// Config
dotenv.config();
const app = express();
const server = http.createServer(app);

// CORS configuration
app.use(cors({
  origin: '*', // Allow all origins for development ease
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// Body parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Setup file upload paths
const uploadsDir = path.join(__dirname, 'uploads');
const screenshotsDir = path.join(uploadsDir, 'screenshots');
const webcamsDir = path.join(uploadsDir, 'webcams');

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir);
if (!fs.existsSync(webcamsDir)) fs.mkdirSync(webcamsDir);

// Serve uploads statically
app.use('/uploads', express.static(uploadsDir));

// Socket.io initialization
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const userSockets = new Map(); // map userId -> socketId

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('register', (userId) => {
    userSockets.set(userId, socket.id);
    console.log(`User ${userId} registered on socket ${socket.id}`);
  });

  socket.on('disconnect', () => {
    for (let [userId, socketId] of userSockets.entries()) {
      if (socketId === socket.id) {
        userSockets.delete(userId);
        console.log(`User ${userId} disconnected`);
        break;
      }
    }
  });
});

// Helper to send real-time notification
const sendNotification = async (recipientId, message, type = 'general') => {
  try {
    const notification = new Notification({
      recipient: recipientId,
      message,
      type
    });
    await notification.save();

    const socketId = userSockets.get(recipientId.toString());
    if (socketId) {
      io.to(socketId).emit('notification', {
        id: notification._id,
        message,
        type,
        isRead: false,
        timestamp: notification.timestamp
      });
    }
  } catch (err) {
    console.error('Notification creation failed:', err.message);
  }
};

// Base64 helper writer
const saveBase64Image = (base64String, folder, filename) => {
  if (!base64String) return '';
  try {
    const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const filePath = path.join(folder, filename);
    fs.writeFileSync(filePath, buffer);
    return `/uploads/${folder === webcamsDir ? 'webcams' : 'screenshots'}/${filename}`;
  } catch (err) {
    console.error('Base64 image save error:', err.message);
    return '';
  }
};

// --- API ROUTES ---

// 1. AUTH ROUTES
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, role, department } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'User already exists.' });

    user = new User({ name, email, password, role, department });
    await user.save();

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'supersecretkey123', {
      expiresIn: '7d'
    });

    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, department: user.department }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials.' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials.' });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'supersecretkey123', {
      expiresIn: '7d'
    });

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, department: user.department, profilePic: user.profilePic }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/auth/profile', authenticate, async (req, res) => {
  res.json(req.user);
});

app.put('/api/auth/profile', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.name = req.body.name || user.name;
    user.department = req.body.department || user.department;
    if (req.body.profilePic) {
      user.profilePic = req.body.profilePic;
    }
    if (req.body.password) {
      user.password = req.body.password;
    }

    await user.save();
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      profilePic: user.profilePic
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User with this email does not exist.' });
    // In production, send email reset link. For simplicity:
    res.json({ message: 'Password reset link sent to registered email address (simulation).', resetToken: 'mockToken123' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  const { email, newPassword } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found.' });

    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password has been successfully updated.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// 2. ATTENDANCE ROUTES
app.post('/api/attendance/checkin', authenticate, async (req, res) => {
  const { latitude, longitude, address, webcamImage } = req.body;
  const today = new Date().toISOString().split('T')[0];

  try {
    let attendance = await Attendance.findOne({ employee: req.user.id, date: today });
    if (attendance) {
      return res.status(400).json({ message: 'You have already checked in today.' });
    }

    let webcamUrl = '';
    if (webcamImage) {
      const filename = `webcam_${req.user.id}_${Date.now()}.jpg`;
      webcamUrl = saveBase64Image(webcamImage, webcamsDir, filename);
    }

    attendance = new Attendance({
      employee: req.user.id,
      date: today,
      checkInTime: new Date(),
      location: { latitude, longitude, address },
      webcamImage: webcamUrl,
      status: 'Present'
    });

    await attendance.save();

    // Alert Managers
    const managers = await User.find({ role: 'Manager' });
    for (let mgr of managers) {
      await sendNotification(mgr._id, `${req.user.name} has checked in from WFH.`, 'checkin');
    }

    res.status(201).json({ message: 'Checked in successfully.', attendance });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/attendance/checkout', authenticate, async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  try {
    const attendance = await Attendance.findOne({ employee: req.user.id, date: today });
    if (!attendance) {
      return res.status(400).json({ message: 'No check-in record found for today.' });
    }
    if (attendance.checkOutTime) {
      return res.status(400).json({ message: 'You have already checked out today.' });
    }

    attendance.checkOutTime = new Date();
    const checkIn = new Date(attendance.checkInTime);
    const durationMs = attendance.checkOutTime - checkIn;
    const hours = Math.round((durationMs / (1000 * 60 * 60)) * 100) / 100;
    
    attendance.durationHours = hours;
    attendance.status = 'Completed';
    await attendance.save();

    // Trigger report reminder
    await sendNotification(req.user.id, 'Remember to submit your Daily Work Report before logging off.', 'report');

    res.json({ message: 'Checked out successfully.', attendance });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/attendance/status', authenticate, async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  try {
    const attendance = await Attendance.findOne({ employee: req.user.id, date: today });
    res.json({ attendance });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/attendance/history', authenticate, async (req, res) => {
  try {
    const history = await Attendance.find({ employee: req.user.id }).sort({ checkInTime: -1 });
    res.json(history);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/attendance/all', authenticate, authorize('Manager'), async (req, res) => {
  const { date, employeeId } = req.query;
  let query = {};
  if (date) query.date = date;
  if (employeeId) query.employee = employeeId;

  try {
    const attendanceRecords = await Attendance.find(query)
      .populate('employee', 'name email department')
      .sort({ checkInTime: -1 });
    res.json(attendanceRecords);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// 3. TASK ROUTES
app.get('/api/tasks', authenticate, async (req, res) => {
  try {
    let tasks;
    if (req.user.role === 'Manager') {
      tasks = await Task.find().populate('assignedTo', 'name email department');
    } else {
      tasks = await Task.find({ assignedTo: req.user.id }).populate('assignedTo', 'name email department');
    }
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/tasks', authenticate, async (req, res) => {
  const { taskName, description, dueDate, priority, progress, status, assignedTo } = req.body;
  try {
    const targetUserId = req.user.role === 'Manager' ? (assignedTo || req.user.id) : req.user.id;
    const task = new Task({
      taskName,
      description,
      dueDate,
      priority,
      progress,
      status,
      assignedTo: targetUserId,
      assignedBy: req.user.id
    });

    await task.save();

    if (req.user.role === 'Manager' && targetUserId !== req.user.id.toString()) {
      await sendNotification(targetUserId, `Manager assigned you a new task: "${taskName}"`, 'task');
    }

    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put('/api/tasks/:id', authenticate, async (req, res) => {
  const { taskName, description, progress, priority, status, dueDate } = req.body;
  try {
    let task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    // Permissions check
    if (req.user.role !== 'Manager' && task.assignedTo.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Unauthorized task modification.' });
    }

    task.taskName = taskName !== undefined ? taskName : task.taskName;
    task.description = description !== undefined ? description : task.description;
    task.progress = progress !== undefined ? progress : task.progress;
    task.priority = priority !== undefined ? priority : task.priority;
    task.status = status !== undefined ? status : task.status;
    task.dueDate = dueDate !== undefined ? dueDate : task.dueDate;

    if (task.progress === 100) {
      task.status = 'Completed';
    }

    await task.save();

    // Alert manager if completed by employee
    if (req.user.role === 'Employee' && task.status === 'Completed') {
      const managers = await User.find({ role: 'Manager' });
      for (let mgr of managers) {
        await sendNotification(mgr._id, `${req.user.name} has completed the task: "${task.taskName}"`, 'task');
      }
    }

    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete('/api/tasks/:id', authenticate, authorize('Manager'), async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json({ message: 'Task deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// 4. DAILY WORK REPORT ROUTES
app.post('/api/reports', authenticate, async (req, res) => {
  const { tasksCompleted, tasksInProgress, challengesFaced, tomorrowPlan, totalHoursWorked } = req.body;
  const today = new Date().toISOString().split('T')[0];

  try {
    let report = await WorkReport.findOne({ employee: req.user.id, date: today });
    if (report) {
      return res.status(400).json({ message: 'You have already submitted a daily report for today.' });
    }

    report = new WorkReport({
      employee: req.user.id,
      date: today,
      tasksCompleted,
      tasksInProgress,
      challengesFaced,
      tomorrowPlan,
      totalHoursWorked
    });

    await report.save();

    // Notify managers
    const managers = await User.find({ role: 'Manager' });
    for (let mgr of managers) {
      await sendNotification(mgr._id, `New daily report submitted by ${req.user.name}`, 'report');
    }

    res.status(201).json({ message: 'Report submitted successfully.', report });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/reports', authenticate, async (req, res) => {
  try {
    let reports;
    if (req.user.role === 'Manager') {
      reports = await WorkReport.find()
        .populate('employee', 'name email department')
        .sort({ date: -1 });
    } else {
      reports = await WorkReport.find({ employee: req.user.id }).sort({ date: -1 });
    }
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put('/api/reports/:id/approve', authenticate, authorize('Manager'), async (req, res) => {
  const { status, managerFeedback } = req.body; // status = 'Approved' or 'Rejected'
  try {
    const report = await WorkReport.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found' });

    report.approvalStatus = status;
    report.managerFeedback = managerFeedback || '';
    await report.save();

    await sendNotification(
      report.employee,
      `Your work report for ${report.date} was ${status.toLowerCase()} by the manager.`,
      'report'
    );

    res.json({ message: `Report successfully ${status.toLowerCase()}.`, report });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// 5. MONITORING & ACTIVITY ROUTING
app.post('/api/monitoring/screenshot', authenticate, async (req, res) => {
  const { image } = req.body;
  if (!image) return res.status(400).json({ message: 'No image uploaded' });

  try {
    const filename = `screenshot_${req.user.id}_${Date.now()}.jpg`;
    const screenshotUrl = saveBase64Image(image, screenshotsDir, filename);

    const screenshotRecord = new Screenshot({
      employee: req.user.id,
      screenshotUrl
    });

    await screenshotRecord.save();
    res.status(201).json({ message: 'Screenshot logged.', screenshotRecord });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/monitoring/screenshots/:employeeId', authenticate, authorize('Manager'), async (req, res) => {
  try {
    const list = await Screenshot.find({ employee: req.params.employeeId })
      .sort({ timestamp: -1 })
      .limit(100);
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/monitoring/activity', authenticate, async (req, res) => {
  const { activeSeconds, idleSeconds, keyboardCount, mouseCount } = req.body;
  const today = new Date().toISOString().split('T')[0];

  try {
    let log = await ActivityLog.findOne({ employee: req.user.id, date: today });
    if (!log) {
      log = new ActivityLog({
        employee: req.user.id,
        date: today,
        activeMinutes: 0,
        idleMinutes: 0,
        keyboardCount: 0,
        mouseCount: 0
      });
    }

    // Convert added seconds to minutes
    log.activeMinutes += activeSeconds / 60;
    log.idleMinutes += idleSeconds / 60;
    log.keyboardCount += keyboardCount;
    log.mouseCount += mouseCount;

    // Calculate productivity percentage: ratio of active minutes to total minutes
    const totalMinutes = log.activeMinutes + log.idleMinutes;
    if (totalMinutes > 0) {
      log.productivityPercentage = Math.round((log.activeMinutes / totalMinutes) * 100);
    } else {
      log.productivityPercentage = 100;
    }

    await log.save();
    res.json({ message: 'Activity log updated.', log });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/monitoring/activity/:employeeId', authenticate, authorize('Manager'), async (req, res) => {
  try {
    const logs = await ActivityLog.find({ employee: req.params.employeeId }).sort({ date: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Manager dashboard summary stats
app.get('/api/monitoring/summary', authenticate, authorize('Manager'), async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  try {
    const totalEmployees = await User.countDocuments({ role: 'Employee' });
    
    // Find who checked in today
    const checkinsToday = await Attendance.find({ date: today }).populate('employee', 'name email department');
    const checkedInUserIds = checkinsToday.map(c => c.employee._id.toString());
    
    const onlineEmployees = checkinsToday.filter(c => !c.checkOutTime).length;
    const offlineEmployees = totalEmployees - onlineEmployees;

    const pendingReportsCount = await WorkReport.countDocuments({ approvalStatus: 'Pending' });

    // Compute average productivity score from today's activity logs
    const activityToday = await ActivityLog.find({ date: today });
    let avgProductivity = 100;
    if (activityToday.length > 0) {
      const sum = activityToday.reduce((acc, curr) => acc + curr.productivityPercentage, 0);
      avgProductivity = Math.round(sum / activityToday.length);
    }

    res.json({
      totalEmployees,
      onlineEmployees,
      offlineEmployees,
      pendingReportsCount,
      productivityScore: avgProductivity,
      attendanceSummary: {
        present: checkinsToday.length,
        absent: Math.max(0, totalEmployees - checkinsToday.length)
      },
      liveCheckins: checkinsToday
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// 6. NOTIFICATION ROUTING
app.get('/api/notifications', authenticate, async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user.id })
      .sort({ timestamp: -1 })
      .limit(30);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put('/api/notifications/:id/read', authenticate, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    if (notification.recipient.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    notification.isRead = true;
    await notification.save();
    res.json(notification);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// --- DATABASE SEEDING & SERVER LAUNCH ---
const PORT = process.env.PORT || 5000;

connectDB().then(async () => {
  // Database Auto-seeding
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('No users found in database. Seeding default accounts...');

      const manager = new User({
        name: 'Manager Bob',
        email: 'manager@wfh.com',
        password: 'password123', // Will be hashed pre-save
        role: 'Manager',
        department: 'Operations'
      });
      await manager.save();

      const employee1 = new User({
        name: 'Alice Green',
        email: 'employee1@wfh.com',
        password: 'password123',
        role: 'Employee',
        department: 'Engineering'
      });
      await employee1.save();

      const employee2 = new User({
        name: 'John Smith',
        email: 'employee2@wfh.com',
        password: 'password123',
        role: 'Employee',
        department: 'Design'
      });
      await employee2.save();

      console.log('Seeding complete! Logins:');
      console.log('1. Manager  : manager@wfh.com  / password123');
      console.log('2. Employee : employee1@wfh.com / password123');
      console.log('3. Employee : employee2@wfh.com / password123');
    }
  } catch (err) {
    console.error('Seeding database failed:', err.message);
  }

  // Start Server
  server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
});
