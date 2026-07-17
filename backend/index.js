// backend/index.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Load environment variables immediately
dotenv.config();

const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const supabase = require('./src/infrastructure/database/supabase');
const { sendWarningEmail, sendPasswordResetEmail, sendRegistrationOTPEmail } = require('./src/infrastructure/services/email');
const { v4: uuidv4 } = require('uuid');
const { authenticate, authorize } = require('./src/interfaces/middlewares/auth');
const logger = require('./src/infrastructure/services/logger');


const app = express();
const server = http.createServer(app);

// Security Headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "http://localhost:*", "ws://localhost:*", "wss://localhost:*", "https:"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    }
  }
}));

// CORS configuration - secure for production
const isProduction = process.env.NODE_ENV === 'production';
const corsOrigin = isProduction && process.env.FRONTEND_URL 
  ? process.env.FRONTEND_URL.split(',') 
  : '*';

app.use(cors({
  origin: corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// Rate limiting configurations
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests from this IP, please try again after 15 minutes.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 login/register requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts from this IP, please try again after 15 minutes.' }
});

const otpSpamLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 OTP requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many OTP requests from this IP, please try again after 15 minutes.' }
});

// Apply rate limiters
app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/forgot-password', otpSpamLimiter);
app.use('/api/auth/register-otp', otpSpamLimiter);
app.use('/api/auth/register', authLimiter);

// Body parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Setup file upload paths
const uploadsDir = path.join(__dirname, 'uploads');
const screenshotsDir = path.join(uploadsDir, 'screenshots');
const webcamsDir = path.join(uploadsDir, 'webcams');
const attachmentsDir = path.join(uploadsDir, 'attachments');

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir);
if (!fs.existsSync(webcamsDir)) fs.mkdirSync(webcamsDir);
if (!fs.existsSync(attachmentsDir)) fs.mkdirSync(attachmentsDir);

// Ensure Supabase Storage bucket 'wfh-tracking' exists
const ensureBucketExists = async (bucketName) => {
  try {
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) {
      console.error('Failed to list Supabase buckets:', listError.message);
      return;
    }
    const exists = buckets.some(b => b.name === bucketName);
    if (!exists) {
      console.log(`Supabase bucket '${bucketName}' does not exist. Creating...`);
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true
      });
      if (createError) {
        console.error(`Failed to create Supabase bucket '${bucketName}':`, createError.message);
      } else {
        console.log(`Supabase bucket '${bucketName}' created successfully!`);
      }
    }
  } catch (err) {
    console.error('Error checking/creating Supabase bucket:', err.message);
  }
};
ensureBucketExists('wfh-tracking');


// Multer storage for task attachments
const attachmentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, attachmentsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'task-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const uploadAttachment = multer({ storage: attachmentStorage });

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
const mobileLocationStore = new Map(); // map verificationToken -> { lat, lng, address, timestamp }

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

// Helper to map Supabase 'id' to Mongo '_id' for frontend compatibility
const toMongo = (obj) => {
  if (!obj) return null;
  if (Array.isArray(obj)) return obj.map(toMongo);
  const { id, ...rest } = obj;
  return { _id: id, id, ...rest };
};

// Formatting helpers to map database snake_case fields to frontend camelCase expectations
const formatAttendance = (att) => {
  if (!att) return null;
  if (Array.isArray(att)) return att.map(formatAttendance);
  const mapped = {
    ...toMongo(att),
    checkInTime: att.check_in_time,
    checkOutTime: att.check_out_time,
    durationHours: att.duration_hours,
    webcamImage: att.webcam_image,
    onBreak: att.on_break,
    currentBreakType: att.current_break_type,
    currentBreakNote: att.current_break_note,
    location: {
      latitude: att.latitude,
      longitude: att.longitude,
      address: att.address || ''
    }
  };
  delete mapped.check_in_time;
  delete mapped.check_out_time;
  delete mapped.duration_hours;
  delete mapped.webcam_image;
  delete mapped.on_break;
  delete mapped.current_break_type;
  delete mapped.current_break_note;
  delete mapped.latitude;
  delete mapped.longitude;
  delete mapped.address;
  return mapped;
};

const formatActivityLog = (log) => {
  if (!log) return null;
  if (Array.isArray(log)) return log.map(formatActivityLog);
  const mapped = {
    ...toMongo(log),
    activeMinutes: log.active_minutes,
    idleMinutes: log.idle_minutes,
    keyboardCount: log.keyboard_count,
    mouseCount: log.mouse_count,
    productivityPercentage: log.productivity_percentage,
    warningEmailSent: log.warning_email_sent
  };
  delete mapped.active_minutes;
  delete mapped.idle_minutes;
  delete mapped.keyboard_count;
  delete mapped.mouse_count;
  delete mapped.productivity_percentage;
  delete mapped.warning_email_sent;
  return mapped;
};

const formatTask = (task) => {
  if (!task) return null;
  if (Array.isArray(task)) return task.map(formatTask);
  const mapped = {
    ...toMongo(task),
    taskName: task.task_name,
    dueDate: task.due_date,
    startDate: task.start_date,
    assignedTo: task.assignedTo || task.assigned_to,
    assignedBy: task.assigned_by,
    proofLinks: task.proof_links || [],
    proofFiles: task.proof_files || [],
    comments: task.comments || [],
    submittedAt: task.submitted_at
  };
  delete mapped.task_name;
  delete mapped.due_date;
  delete mapped.start_date;
  delete mapped.assigned_to;
  delete mapped.assigned_by;
  delete mapped.proof_links;
  delete mapped.proof_files;
  delete mapped.submitted_at;
  return mapped;
};

const formatScreenshot = (ss) => {
  if (!ss) return null;
  if (Array.isArray(ss)) return ss.map(formatScreenshot);
  const mapped = {
    ...toMongo(ss),
    screenshotUrl: ss.screenshot_url,
    employee: ss.employee_id
  };
  delete mapped.screenshot_url;
  delete mapped.employee_id;
  return mapped;
};

const formatWorkReport = (r) => {
  if (!r) return null;
  if (Array.isArray(r)) return r.map(formatWorkReport);
  const mapped = {
    ...toMongo(r),
    tasksCompleted: r.tasks_completed,
    tasksInProgress: r.tasks_in_progress,
    totalHoursWorked: r.total_hours_worked,
    approvalStatus: r.approval_status,
    managerFeedback: r.manager_feedback,
    employee: r.employee
  };
  delete mapped.tasks_completed;
  delete mapped.tasks_in_progress;
  delete mapped.total_hours_worked;
  delete mapped.approval_status;
  delete mapped.manager_feedback;
  return mapped;
};

const formatNotification = (n) => {
  if (!n) return null;
  if (Array.isArray(n)) return n.map(formatNotification);
  const mapped = {
    ...toMongo(n),
    recipient: n.recipient_id,
    isRead: n.is_read
  };
  delete mapped.recipient_id;
  delete mapped.is_read;
  return mapped;
};

// Helper to generate ObjectID-like hex strings for new IDs
const generateId = () => crypto.randomBytes(12).toString('hex');

// Helper to send real-time notification
const sendNotification = async (recipientId, message, type = 'general') => {
  try {
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert([{
        recipient_id: recipientId.toString(),
        message,
        type,
        is_read: false
      }])
      .select('*')
      .single();

    if (error) throw error;

    const socketId = userSockets.get(recipientId.toString());
    if (socketId) {
      io.to(socketId).emit('notification', formatNotification(notification));
    }
  } catch (err) {
    console.error('Notification creation failed:', err.message);
  }
};

// Base64 helper writer
// Base64 helper writer - Uploads to Supabase Storage
const saveBase64Image = async (base64String, folder, filename) => {
  if (!base64String) return '';
  try {
    const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
    if (!base64Data || base64Data.trim().length < 50) {
      console.error('Base64 image upload error: empty or invalid image payload.');
      return '';
    }
    const buffer = Buffer.from(base64Data, 'base64');
    if (buffer.length < 50) {
      console.error('Base64 image upload error: decoded buffer is too small.');
      return '';
    }

    const folderName = folder === webcamsDir ? 'webcams' : 'screenshots';
    const storagePath = `${folderName}/${filename}`;

    const { data, error } = await supabase.storage
      .from('wfh-tracking')
      .upload(storagePath, buffer, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
      .from('wfh-tracking')
      .getPublicUrl(storagePath);

    return publicUrlData.publicUrl;
  } catch (err) {
    console.error('Base64 image upload error:', err.message);
    
    // Fallback to local saving if Supabase fails
    try {
      const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const filePath = path.join(folder, filename);
      fs.writeFileSync(filePath, buffer);
      return `/uploads/${folder === webcamsDir ? 'webcams' : 'screenshots'}/${filename}`;
    } catch (localErr) {
      console.error('Fallback local image save error:', localErr.message);
      return '';
    }
  }
};

// --- API ROUTES ---
const authRoutes = require('./src/interfaces/routes/authRoutes');
app.use('/api/auth', authRoutes);

const attendanceRoutes = require('./src/interfaces/routes/attendanceRoutes');
app.use('/api/attendance', attendanceRoutes);

const taskRoutes = require('./src/interfaces/routes/taskRoutes');
app.use('/api/tasks', taskRoutes);

const reportRoutes = require('./src/interfaces/routes/reportRoutes');
app.use('/api/reports', reportRoutes);

const monitoringRoutes = require('./src/interfaces/routes/monitoringRoutes');
app.use('/api', monitoringRoutes);

const adminRoutes = require('./src/interfaces/routes/adminRoutes');
app.use('', adminRoutes);

// ─── Serve React frontend ────────────────────────────────────────
const frontendBuild = path.join(__dirname, '..', 'frontend', 'build');
if (fs.existsSync(frontendBuild)) {
  app.use(express.static(frontendBuild));
  // All non-API routes return index.html (React HashRouter handles the rest)
  app.get(/^(?!\/api|\/uploads).*$/, (req, res) => {
    res.sendFile(path.join(frontendBuild, 'index.html'));
  });
  console.log('✅ Serving React frontend from:', frontendBuild);
} else {
  console.warn('⚠️  Frontend build not found at:', frontendBuild);
}

app.use((err, req, res, next) => {
  logger.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  res.status(err.status || 500).json({ message: 'Internal Server Error' });
});

process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`, err);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// --- Auto-Checkout Background Task ---
setInterval(async () => {
  try {
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    
    // Find all attendance records without checkout where last_heartbeat is older than 15 mins AND not on break
    const { data: abandonedSessions, error } = await supabase
      .from('attendance')
      .select('id, employee_id, last_heartbeat, check_in_time')
      .is('check_out_time', null)
      .eq('on_break', false)
      .not('last_heartbeat', 'is', null)
      .lt('last_heartbeat', fifteenMinsAgo);

    if (error) {
      console.error('Auto-checkout fetch error:', error);
      return;
    }

    if (abandonedSessions && abandonedSessions.length > 0) {
      for (const session of abandonedSessions) {
        const start = new Date(session.check_in_time);
        const end = new Date(session.last_heartbeat);
        const diffHrs = (end - start) / 3600000;
        
        // Update attendance
        await supabase
          .from('attendance')
          .update({ 
            check_out_time: session.last_heartbeat, 
            duration_hours: diffHrs,
            is_auto_checkout: true 
          })
          .eq('id', session.id);

        // Alert user
        await supabase.from('notifications').insert([{
          user_id: session.employee_id,
          message: 'Your session was automatically checked out due to 15 minutes of app inactivity/shutdown.',
          type: 'auto_checkout'
        }]);

        // Alert admins/managers for this employee's company
        const { data: emp } = await supabase.from('users').select('name, company_id').eq('id', session.employee_id).single();
        if (emp) {
          const { data: admins } = await supabase.from('users').select('id').in('role', ['Manager', 'SuperAdmin']).eq('company_id', emp.company_id);
          if (admins) {
            for (let admin of admins) {
              await supabase.from('notifications').insert([{
                user_id: admin.id,
                message: `${emp.name} was automatically checked out due to disconnection/shutdown.`,
                type: 'auto_checkout_admin'
              }]);
            }
          }
        }
      }
      console.log(`Auto-checked out ${abandonedSessions.length} abandoned sessions.`);
    }
  } catch (err) {
    console.error('Auto-checkout interval error:', err);
  }
}, 10 * 60 * 1000); // Run every 10 minutes


const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
