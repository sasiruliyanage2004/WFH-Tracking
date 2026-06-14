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

const supabase = require('./utils/supabase');
const { sendWarningEmail, sendPasswordResetEmail } = require('./utils/email');
const { authenticate, authorize } = require('./middleware/auth');

const app = express();
const server = http.createServer(app);

// Security Headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
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

// Apply rate limiters
app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

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
    assignedBy: task.assigned_by
  };
  delete mapped.task_name;
  delete mapped.due_date;
  delete mapped.start_date;
  delete mapped.assigned_to;
  delete mapped.assigned_by;
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

// 0. EMPLOYEE LIST ROUTES (SuperAdmin only)
app.get('/api/users/employees', authenticate, authorize('SuperAdmin'), async (req, res) => {
  try {
    const { data: employees, error } = await supabase
      .from('users')
      .select('id, name, email, department, role, profile_pic, created_at')
      .eq('role', 'Employee')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const today = new Date().toISOString().split('T')[0];

    // Fetch all attendance for today to merge in memory
    const { data: attendances } = await supabase
      .from('attendance')
      .select('*')
      .eq('date', today);

    const attMap = new Map(attendances ? attendances.map(a => [a.employee_id, a]) : []);

    const enriched = employees.map(emp => {
      const att = attMap.get(emp.id);
      return {
        _id: emp.id,
        id: emp.id,
        name: emp.name,
        email: emp.email,
        department: emp.department,
        role: emp.role,
        profilePic: emp.profile_pic,
        createdAt: emp.created_at,
        todayStatus: att
          ? att.check_out_time
            ? 'Checked Out'
            : att.on_break
              ? `On Break (${att.current_break_type})`
              : 'Active'
          : 'Absent'
      };
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete('/api/users/employees/:id', authenticate, authorize('SuperAdmin'), async (req, res) => {
  try {
    const { data: emp, error: fetchErr } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (fetchErr || !emp) return res.status(404).json({ message: 'Employee not found.' });
    if (emp.role === 'Manager' || emp.role === 'SuperAdmin') return res.status(403).json({ message: 'Cannot delete a Manager or SuperAdmin account.' });

    const { error: deleteErr } = await supabase
      .from('users')
      .delete()
      .eq('id', req.params.id);

    if (deleteErr) throw deleteErr;

    res.json({ message: 'Employee deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/users/admins', authenticate, authorize('SuperAdmin'), async (req, res) => {
  try {
    const { data: admins, error } = await supabase
      .from('users')
      .select('id, name, email, department, role, profile_pic, created_at')
      .in('role', ['Manager', 'SuperAdmin'])
      .order('created_at', { ascending: false });

    if (error) throw error;

    const mapped = admins.map(adm => ({
      _id: adm.id,
      id: adm.id,
      name: adm.name,
      email: adm.email,
      department: adm.department,
      role: adm.role,
      profilePic: adm.profile_pic,
      createdAt: adm.created_at
    }));

    res.json(mapped);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete('/api/users/admins/:id', authenticate, authorize('SuperAdmin'), async (req, res) => {
  try {
    if (req.params.id.toString() === req.user.id.toString()) {
      return res.status(400).json({ message: 'You cannot delete your own HR Head account.' });
    }

    const { data: adm, error: fetchErr } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (fetchErr || !adm) return res.status(404).json({ message: 'Admin account not found.' });

    const { error: deleteErr } = await supabase
      .from('users')
      .delete()
      .eq('id', req.params.id);

    if (deleteErr) throw deleteErr;

    res.json({ message: 'Admin account deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 1. AUTH ROUTES
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, role, department, managerKey, superAdminKey } = req.body;
  try {
    if (role === 'Manager') {
      const systemManagerKey = process.env.MANAGER_REGISTRATION_KEY || 'workforce-manager-sec';
      if (managerKey !== systemManagerKey) {
        return res.status(403).json({ message: 'Invalid Manager Secret Key. You cannot register as a Manager/Admin.' });
      }
    } else if (role === 'SuperAdmin') {
      const systemSuperAdminKey = process.env.SUPER_ADMIN_REGISTRATION_KEY || 'workforce-super-sec';
      if (superAdminKey !== systemSuperAdminKey) {
        return res.status(403).json({ message: 'Invalid Super Admin Secret Key. You cannot register as a Super Admin.' });
      }
    }

    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (existingUser) return res.status(400).json({ message: 'User already exists.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = generateId();

    const finalDept = role === 'SuperAdmin' ? 'HR' : (department || 'Engineering');

    const { data: newUser, error } = await supabase
      .from('users')
      .insert([{
        id: userId,
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: role || 'Employee',
        department: finalDept
      }])
      .select('*')
      .single();

    if (error) throw error;

    const token = jwt.sign({ id: newUser.id, role: newUser.role }, process.env.JWT_SECRET || 'supersecretkey123', {
      expiresIn: '7d'
    });

    res.status(201).json({
      token,
      user: toMongo(newUser)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (error || !user) return res.status(400).json({ message: 'Invalid credentials.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials.' });

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'supersecretkey123', {
      expiresIn: '7d'
    });

    res.json({
      token,
      user: {
        id: user.id,
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        profilePic: user.profile_pic
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/auth/profile', authenticate, async (req, res) => {
  res.json(toMongo(req.user));
});

app.put('/api/auth/profile', authenticate, async (req, res) => {
  try {
    const { data: user, error: fetchErr } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .maybeSingle();

    if (fetchErr || !user) return res.status(404).json({ message: 'User not found' });

    const updates = {
      name: req.body.name || user.name,
      department: req.body.department || user.department,
      profile_pic: req.body.profilePic !== undefined ? req.body.profilePic : user.profile_pic
    };

    if (req.body.password) {
      updates.password = await bcrypt.hash(req.body.password, 10);
    }

    const { data: updatedUser, error: updateErr } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.user.id)
      .select('*')
      .single();

    if (updateErr) throw updateErr;

    res.json({
      id: updatedUser.id,
      _id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      department: updatedUser.department,
      profilePic: updatedUser.profile_pic
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Database-backed OTP store for password reset verification
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (!user) return res.status(404).json({ message: 'User with this email does not exist.' });

    // Clean up any expired OTP codes from database first
    await supabase
      .from('password_resets')
      .delete()
      .lt('expires_at', new Date().toISOString());

    // Generate a 6-digit random OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store in Supabase password_resets table with 10-minute expiration
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const { error: dbErr } = await supabase
      .from('password_resets')
      .upsert({
        email: email.toLowerCase(),
        otp,
        expires_at: expiresAt
      });

    if (dbErr) throw dbErr;

    // Send the actual email containing the OTP
    await sendPasswordResetEmail(email.toLowerCase(), otp);

    res.json({ message: 'Verification code sent to your registered email address.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;
  try {
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (!user) return res.status(404).json({ message: 'User not found.' });

    // Verify OTP code from database
    const { data: storedData, error: dbErr } = await supabase
      .from('password_resets')
      .select('*')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (dbErr) throw dbErr;

    if (!storedData) {
      return res.status(400).json({ message: 'No reset session found. Please request a new code.' });
    }

    if (new Date() > new Date(storedData.expires_at)) {
      await supabase
        .from('password_resets')
        .delete()
        .eq('email', email.toLowerCase());
      return res.status(400).json({ message: 'Verification code has expired. Please request a new one.' });
    }

    if (storedData.otp !== code) {
      return res.status(400).json({ message: 'Invalid verification code.' });
    }

    // Success - clean up OTP and update password
    await supabase
      .from('password_resets')
      .delete()
      .eq('email', email.toLowerCase());

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const { error } = await supabase
      .from('users')
      .update({ password: hashedPassword })
      .eq('id', user.id);

    if (error) throw error;
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
    const { data: existing } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', req.user.id)
      .eq('date', today)
      .maybeSingle();

    if (existing) {
      return res.status(400).json({ message: 'You have already checked in today.' });
    }

    let webcamUrl = '';
    if (webcamImage) {
      const filename = `webcam_${req.user.id}_${Date.now()}.jpg`;
      webcamUrl = saveBase64Image(webcamImage, webcamsDir, filename);
    }

    const { data: att, error } = await supabase
      .from('attendance')
      .insert([{
        employee_id: req.user.id,
        date: today,
        check_in_time: new Date(),
        latitude,
        longitude,
        address: address || '',
        webcam_image: webcamUrl,
        status: 'Present'
      }])
      .select('*')
      .single();

    if (error) throw error;

    // Alert Managers
    const { data: managers } = await supabase.from('users').select('id').eq('role', 'Manager');
    if (managers) {
      for (let mgr of managers) {
        await sendNotification(mgr.id, `${req.user.name} has checked in from WFH.`, 'checkin');
      }
    }

    res.status(201).json({ message: 'Checked in successfully.', attendance: formatAttendance(att) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/attendance/checkout', authenticate, async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  try {
    const { data: att, error: fetchErr } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', req.user.id)
      .eq('date', today)
      .maybeSingle();

    if (fetchErr || !att) {
      return res.status(400).json({ message: 'No check-in record found for today.' });
    }
    if (att.check_out_time) {
      return res.status(400).json({ message: 'You have already checked out today.' });
    }

    const checkOutTime = new Date();
    const checkIn = new Date(att.check_in_time);
    const durationMs = checkOutTime - checkIn;
    const hours = Math.round((durationMs / (1000 * 60 * 60)) * 100) / 100;

    const { data: updatedAtt, error: updateErr } = await supabase
      .from('attendance')
      .update({
        check_out_time: checkOutTime,
        duration_hours: hours,
        status: 'Completed'
      })
      .eq('id', att.id)
      .select('*')
      .single();

    if (updateErr) throw updateErr;

    // Check productivity score for today at checkout and send warning email if <= 50%
    try {
      const { data: log } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('employee_id', req.user.id)
        .eq('date', today)
        .maybeSingle();

      if (log) {
        const totalMinutes = log.active_minutes + log.idle_minutes;
        if (totalMinutes >= 60 && log.productivity_percentage <= 50 && !log.warning_email_sent) {
          sendWarningEmail(req.user, log.productivity_percentage);
          await supabase
            .from('activity_logs')
            .update({ warning_email_sent: true })
            .eq('id', log.id);
        }
      }
    } catch (emailErr) {
      console.error('Failed to check/send checkout low productivity email:', emailErr.message);
    }

    // Trigger report reminder
    await sendNotification(req.user.id, 'Remember to submit your Daily Work Report before logging off.', 'report');

    res.json({ message: 'Checked out successfully.', attendance: formatAttendance(updatedAtt) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/attendance/break/start', authenticate, async (req, res) => {
  const { breakType, note } = req.body;
  const today = new Date().toISOString().split('T')[0];
  try {
    const { data: att, error: fetchErr } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', req.user.id)
      .eq('date', today)
      .maybeSingle();

    if (fetchErr || !att) {
      return res.status(400).json({ message: 'You must check in before taking a break.' });
    }
    if (att.check_out_time) {
      return res.status(400).json({ message: 'You have already checked out.' });
    }
    if (att.on_break) {
      return res.status(400).json({ message: 'You are already on a break.' });
    }

    const newBreaks = [...(att.breaks || [])];
    newBreaks.push({
      breakType,
      note: note || '',
      startTime: new Date()
    });

    const { data: updatedAtt, error: updateErr } = await supabase
      .from('attendance')
      .update({
        on_break: true,
        current_break_type: breakType,
        current_break_note: note || '',
        breaks: newBreaks
      })
      .eq('id', att.id)
      .select('*')
      .single();

    if (updateErr) throw updateErr;

    // Alert Managers
    const { data: managers } = await supabase.from('users').select('id').eq('role', 'Manager');
    const notifMsg = note
      ? `${req.user.name} went on a ${breakType} break. Note: "${note}"`
      : `${req.user.name} went on a ${breakType} break.`;
      
    if (managers) {
      for (let mgr of managers) {
        await sendNotification(mgr.id, notifMsg, 'break');
      }
    }

    res.json({ message: `Started ${breakType} break.`, attendance: formatAttendance(updatedAtt) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/attendance/break/end', authenticate, async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  try {
    const { data: att, error: fetchErr } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', req.user.id)
      .eq('date', today)
      .maybeSingle();

    if (fetchErr || !att) {
      return res.status(400).json({ message: 'Attendance record not found.' });
    }
    if (!att.on_break) {
      return res.status(400).json({ message: 'You are not currently on a break.' });
    }

    const newBreaks = [...(att.breaks || [])];
    const lastBreak = newBreaks[newBreaks.length - 1];
    if (lastBreak && !lastBreak.endTime) {
      lastBreak.endTime = new Date();
      const diffMs = new Date(lastBreak.endTime) - new Date(lastBreak.startTime);
      lastBreak.durationMinutes = Math.round((diffMs / 60000) * 10) / 10;
    }

    const { data: updatedAtt, error: updateErr } = await supabase
      .from('attendance')
      .update({
        on_break: false,
        current_break_type: null,
        breaks: newBreaks
      })
      .eq('id', att.id)
      .select('*')
      .single();

    if (updateErr) throw updateErr;

    // Alert Managers
    const { data: managers } = await supabase.from('users').select('id').eq('role', 'Manager');
    if (managers) {
      for (let mgr of managers) {
        await sendNotification(mgr.id, `${req.user.name} returned from their break.`, 'break');
      }
    }

    res.json({ message: 'Break ended. Resumed work shift.', attendance: formatAttendance(updatedAtt) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/attendance/status', authenticate, async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  try {
    const { data: att } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', req.user.id)
      .eq('date', today)
      .maybeSingle();

    res.json({ attendance: formatAttendance(att) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/attendance/history', authenticate, async (req, res) => {
  try {
    const { data: history } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', req.user.id)
      .order('check_in_time', { ascending: false });

    res.json(formatAttendance(history || []));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/attendance/all', authenticate, authorize(['Manager', 'SuperAdmin']), async (req, res) => {
  const { date, employeeId } = req.query;
  try {
    let builder = supabase.from('attendance').select('*');
    if (date) builder = builder.eq('date', date);
    if (employeeId) builder = builder.eq('employee_id', employeeId);

    const { data: attendanceRecords, error } = await builder.order('check_in_time', { ascending: false });
    if (error) throw error;

    if (attendanceRecords && attendanceRecords.length > 0) {
      const userIds = [...new Set(attendanceRecords.map(r => r.employee_id))];
      const { data: users } = await supabase.from('users').select('id, name, email, department').in('id', userIds);
      const userMap = new Map(users ? users.map(u => [u.id, u]) : []);

      const mapped = attendanceRecords.map(att => ({
        ...formatAttendance(att),
        employee: toMongo(userMap.get(att.employee_id))
      }));
      return res.json(mapped);
    }

    res.json([]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 3. TASK ROUTES
app.get('/api/tasks', authenticate, async (req, res) => {
  try {
    let builder = supabase.from('tasks').select('*');
    if (req.user.role === 'Employee') {
      builder = builder.eq('assigned_to', req.user.id);
    } else if (req.user.role === 'Manager') {
      const { data: deptEmps } = await supabase
        .from('users')
        .select('id')
        .eq('department', req.user.department)
        .eq('role', 'Employee');
      const employeeIds = deptEmps ? deptEmps.map(u => u.id) : [];
      if (employeeIds.length === 0) {
        return res.json([]);
      }
      builder = builder.in('assigned_to', employeeIds);
    }

    const { data: tasks, error } = await builder.order('created_at', { ascending: false });
    if (error) throw error;

    if (tasks && tasks.length > 0) {
      const userIds = [...new Set(tasks.map(t => t.assigned_to))];
      const { data: users } = await supabase.from('users').select('id, name, email, department').in('id', userIds);
      const userMap = new Map(users ? users.map(u => [u.id, u]) : []);

      const mapped = tasks.map(t => ({
        ...formatTask(t),
        assignedTo: toMongo(userMap.get(t.assigned_to))
      }));
      return res.json(mapped);
    }

    res.json([]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/tasks', authenticate, async (req, res) => {
  const { taskName, description, dueDate, priority, progress, status, assignedTo } = req.body;
  try {
    const targetUserId = (req.user.role === 'Manager' || req.user.role === 'SuperAdmin') ? (assignedTo || req.user.id) : req.user.id;

    // Check if Manager tries to assign task to employee of a different department
    if (req.user.role === 'Manager' && targetUserId !== req.user.id.toString()) {
      const { data: targetUser } = await supabase
        .from('users')
        .select('department')
        .eq('id', targetUserId)
        .single();
      
      if (targetUser && targetUser.department !== req.user.department) {
        return res.status(403).json({ message: 'Access denied. You can only assign tasks to employees in your department.' });
      }
    }

    const { data: task, error } = await supabase
      .from('tasks')
      .insert([{
        task_name: taskName,
        description,
        due_date: dueDate,
        priority: priority || 'Medium',
        progress: progress || 0,
        status: status || 'Pending',
        assigned_to: targetUserId,
        assigned_by: req.user.id
      }])
      .select('*')
      .single();

    if (error) throw error;

    if ((req.user.role === 'Manager' || req.user.role === 'SuperAdmin') && targetUserId !== req.user.id.toString()) {
      await sendNotification(targetUserId, `Manager assigned you a new task: "${taskName}"`, 'task');
    }

    res.status(201).json(formatTask(task));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put('/api/tasks/:id', authenticate, async (req, res) => {
  const { taskName, description, progress, priority, status, dueDate } = req.body;
  try {
    const { data: task, error: fetchErr } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (fetchErr || !task) return res.status(404).json({ message: 'Task not found' });

    // Permissions check
    if (req.user.role !== 'Manager' && req.user.role !== 'SuperAdmin' && task.assigned_to.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Unauthorized task modification.' });
    }

    // Department isolation check for Manager
    if (req.user.role === 'Manager') {
      const { data: targetUser } = await supabase
        .from('users')
        .select('department')
        .eq('id', task.assigned_to)
        .single();
      
      if (targetUser && targetUser.department !== req.user.department) {
        return res.status(403).json({ message: 'Access denied. You cannot modify tasks of employees in other departments.' });
      }
    }

    const updates = {
      task_name: taskName !== undefined ? taskName : task.task_name,
      description: description !== undefined ? description : task.description,
      progress: progress !== undefined ? progress : task.progress,
      priority: priority !== undefined ? priority : task.priority,
      status: status !== undefined ? status : task.status,
      due_date: dueDate !== undefined ? dueDate : task.due_date
    };

    if (updates.progress === 100) {
      updates.status = 'Completed';
    }

    const { data: updatedTask, error: updateErr } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (updateErr) throw updateErr;

    // Alert manager if completed by employee
    if (req.user.role === 'Employee' && updatedTask.status === 'Completed') {
      const { data: managers } = await supabase.from('users').select('id').in('role', ['Manager', 'SuperAdmin']);
      if (managers) {
        for (let mgr of managers) {
          await sendNotification(mgr.id, `${req.user.name} has completed the task: "${updatedTask.task_name}"`, 'task');
        }
      }
    }

    res.json(formatTask(updatedTask));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete('/api/tasks/:id', authenticate, authorize(['Manager', 'SuperAdmin']), async (req, res) => {
  try {
    const { data: task, error: fetchErr } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (fetchErr || !task) return res.status(404).json({ message: 'Task not found' });

    // Department isolation check for Manager
    if (req.user.role === 'Manager') {
      const { data: targetUser } = await supabase
        .from('users')
        .select('department')
        .eq('id', task.assigned_to)
        .single();
      
      if (targetUser && targetUser.department !== req.user.department) {
        return res.status(403).json({ message: 'Access denied. You cannot delete tasks of employees in other departments.' });
      }
    }

    const { error: deleteErr } = await supabase
      .from('tasks')
      .delete()
      .eq('id', req.params.id);

    if (deleteErr) throw deleteErr;

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
    const { data: existing } = await supabase
      .from('work_reports')
      .select('*')
      .eq('employee_id', req.user.id)
      .eq('date', today)
      .maybeSingle();

    if (existing) {
      return res.status(400).json({ message: 'You have already submitted a daily report for today.' });
    }

    const { data: report, error } = await supabase
      .from('work_reports')
      .insert([{
        employee_id: req.user.id,
        date: today,
        tasks_completed: tasksCompleted || [],
        tasks_in_progress: tasksInProgress || [],
        challenges_faced: challengesFaced || '',
        tomorrow_plan: tomorrowPlan || '',
        total_hours_worked: totalHoursWorked
      }])
      .select('*')
      .single();

    if (error) throw error;

    // Notify managers
    const { data: managers } = await supabase.from('users').select('id').eq('role', 'Manager');
    if (managers) {
      for (let mgr of managers) {
        await sendNotification(mgr.id, `New daily report submitted by ${req.user.name}`, 'report');
      }
    }

    res.status(201).json({ message: 'Report submitted successfully.', report: formatWorkReport(report) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/reports', authenticate, async (req, res) => {
  try {
    let builder = supabase.from('work_reports').select('*');
    if (req.user.role === 'Employee') {
      builder = builder.eq('employee_id', req.user.id);
    } else if (req.user.role === 'Manager') {
      const { data: deptEmps } = await supabase
        .from('users')
        .select('id')
        .eq('department', req.user.department)
        .eq('role', 'Employee');
      const employeeIds = deptEmps ? deptEmps.map(u => u.id) : [];
      if (employeeIds.length === 0) {
        return res.json([]);
      }
      builder = builder.in('employee_id', employeeIds);
    }

    const { data: reports, error } = await builder.order('date', { ascending: false });
    if (error) throw error;

    if (reports && reports.length > 0) {
      const userIds = [...new Set(reports.map(r => r.employee_id))];
      const { data: users } = await supabase.from('users').select('id, name, email, department').in('id', userIds);
      const userMap = new Map(users ? users.map(u => [u.id, u]) : []);

      const mapped = reports.map(r => ({
        ...formatWorkReport(r),
        employee: toMongo(userMap.get(r.employee_id))
      }));
      return res.json(mapped);
    }

    res.json([]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put('/api/reports/:id/approve', authenticate, authorize(['Manager', 'SuperAdmin']), async (req, res) => {
  const { status, managerFeedback } = req.body;
  try {
    const { data: report, error: fetchErr } = await supabase
      .from('work_reports')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (fetchErr || !report) return res.status(404).json({ message: 'Report not found' });

    // Department isolation check for Manager
    if (req.user.role === 'Manager') {
      const { data: employeeUser } = await supabase
        .from('users')
        .select('department')
        .eq('id', report.employee_id)
        .single();
      
      if (employeeUser && employeeUser.department !== req.user.department) {
        return res.status(403).json({ message: 'Access denied. You can only review reports for employees in your department.' });
      }
    }

    const { data: updatedReport, error: updateErr } = await supabase
      .from('work_reports')
      .update({
        approval_status: status,
        manager_feedback: managerFeedback || ''
      })
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (updateErr) throw updateErr;

    await sendNotification(
      updatedReport.employee_id,
      `Your work report for ${updatedReport.date} was ${status.toLowerCase()} by the manager.`,
      'report'
    );

    res.json({ message: `Report successfully ${status.toLowerCase()}.`, report: formatWorkReport(updatedReport) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 5. MONITORING & ACTIVITY ROUTING
app.post('/api/monitoring/screenshot', authenticate, async (req, res) => {
  const { image, timestamp } = req.body;
  if (!image) return res.status(400).json({ message: 'No image uploaded' });

  try {
    const timeVal = timestamp || Date.now();
    const filename = `screenshot_${req.user.id}_${timeVal}.jpg`;
    const screenshotUrl = saveBase64Image(image, screenshotsDir, filename);

    const { data: ssRecord, error } = await supabase
      .from('screenshots')
      .insert([{
        employee_id: req.user.id,
        screenshot_url: screenshotUrl,
        timestamp: timestamp ? new Date(timestamp).toISOString() : new Date().toISOString()
      }])
      .select('*')
      .single();

    if (error) throw error;

    // Auto-delete logic: Check today's productivity score
    const today = new Date().toISOString().split('T')[0];
    const { data: log } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('employee_id', req.user.id)
      .eq('date', today)
      .maybeSingle();

    let deletedCount = 0;
    let autoDeleted = false;

    if (log && log.productivity_percentage >= 70) {
      autoDeleted = true;
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      const { data: oldScreenshots } = await supabase
        .from('screenshots')
        .select('*')
        .eq('employee_id', req.user.id)
        .lt('timestamp', oneHourAgo);

      if (oldScreenshots && oldScreenshots.length > 0) {
        for (let ss of oldScreenshots) {
          if (ss.screenshot_url.startsWith('/uploads/')) {
            const absolutePath = path.join(__dirname, ss.screenshot_url);
            if (fs.existsSync(absolutePath)) {
              try {
                fs.unlinkSync(absolutePath);
              } catch (err) {
                console.error('Failed to delete physical screenshot file:', err.message);
              }
            }
          }
        }

        const { error: delErr, count } = await supabase
          .from('screenshots')
          .delete({ count: 'exact' })
          .eq('employee_id', req.user.id)
          .lt('timestamp', oneHourAgo);

        if (!delErr) deletedCount = count || oldScreenshots.length;
      }
    }

    res.status(201).json({ 
      message: 'Screenshot logged.', 
      screenshotRecord: formatScreenshot(ssRecord), 
      retentionStatus: autoDeleted ? 'High Productivity: 1h auto-delete active' : 'Standard Audit: All retained',
      deletedCount
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/monitoring/screenshots/:employeeId', authenticate, authorize(['Manager', 'SuperAdmin']), async (req, res) => {
  try {
    // Department isolation check for Manager
    if (req.user.role === 'Manager') {
      const { data: targetUser } = await supabase
        .from('users')
        .select('department')
        .eq('id', req.params.employeeId)
        .single();
      
      if (targetUser && targetUser.department !== req.user.department) {
        return res.status(403).json({ message: 'Access denied. You can only view screenshots for employees in your department.' });
      }
    }

    const { data: list, error } = await supabase
      .from('screenshots')
      .select('*')
      .eq('employee_id', req.params.employeeId)
      .order('timestamp', { ascending: false })
      .limit(100);

    if (error) throw error;
    res.json(formatScreenshot(list));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/monitoring/screenshots/delete-bulk', authenticate, authorize(['Manager', 'SuperAdmin']), async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: 'No screenshot IDs provided.' });
  }

  try {
    const { data: screenshots } = await supabase
      .from('screenshots')
      .select('*')
      .in('id', ids);

    if (screenshots) {
      for (let ss of screenshots) {
        if (ss.screenshot_url.startsWith('/uploads/')) {
          const absolutePath = path.join(__dirname, ss.screenshot_url);
          if (fs.existsSync(absolutePath)) {
            try {
              fs.unlinkSync(absolutePath);
            } catch (err) {
              console.error('Failed to delete physical screenshot file:', err.message);
            }
          }
        }
      }
    }

    const { error: delErr } = await supabase
      .from('screenshots')
      .delete()
      .in('id', ids);

    if (delErr) throw delErr;

    res.json({ 
      message: 'Screenshots deleted successfully.', 
      deletedCount: ids.length 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/monitoring/activity', authenticate, async (req, res) => {
  const { activeSeconds, idleSeconds, keyboardCount, mouseCount, date } = req.body;
  const today = date || new Date().toISOString().split('T')[0];

  try {
    const { data: log, error: fetchErr } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('employee_id', req.user.id)
      .eq('date', today)
      .maybeSingle();

    let updatedLog;

    if (log) {
      // Calculate minutes and percentages
      const activeMinutes = log.active_minutes + (activeSeconds / 60);
      const idleMinutes = log.idle_minutes + (idleSeconds / 60);
      const totalMinutes = activeMinutes + idleMinutes;
      const productivityPercentage = totalMinutes > 0 ? Math.round((activeMinutes / totalMinutes) * 100) : 100;
      
      let warningEmailSent = log.warning_email_sent;
      if (totalMinutes >= 60 && productivityPercentage <= 50 && !warningEmailSent) {
        warningEmailSent = true;
        sendWarningEmail(req.user, productivityPercentage);
      }

      const { data, error } = await supabase
        .from('activity_logs')
        .update({
          active_minutes: activeMinutes,
          idle_minutes: idleMinutes,
          keyboard_count: log.keyboard_count + keyboardCount,
          mouse_count: log.mouse_count + mouseCount,
          productivity_percentage: productivityPercentage,
          warning_email_sent: warningEmailSent
        })
        .eq('id', log.id)
        .select('*')
        .single();

      if (error) throw error;
      updatedLog = data;
    } else {
      const activeMinutes = activeSeconds / 60;
      const idleMinutes = idleSeconds / 60;
      const totalMinutes = activeMinutes + idleMinutes;
      const productivityPercentage = totalMinutes > 0 ? Math.round((activeMinutes / totalMinutes) * 100) : 100;

      let warningEmailSent = false;
      if (totalMinutes >= 60 && productivityPercentage <= 50) {
        warningEmailSent = true;
        sendWarningEmail(req.user, productivityPercentage);
      }

      const { data, error } = await supabase
        .from('activity_logs')
        .insert([{
          employee_id: req.user.id,
          date: today,
          active_minutes: activeMinutes,
          idle_minutes: idleMinutes,
          keyboard_count: keyboardCount,
          mouse_count: mouseCount,
          productivity_percentage: productivityPercentage,
          warning_email_sent: warningEmailSent
        }])
        .select('*')
        .single();

      if (error) throw error;
      updatedLog = data;
    }

    res.json({ message: 'Activity log updated.', log: formatActivityLog(updatedLog) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/monitoring/my-activity', authenticate, async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  try {
    const { data: log } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('employee_id', req.user.id)
      .eq('date', today)
      .maybeSingle();

    res.json(formatActivityLog(log) || { activeMinutes: 0, idleMinutes: 0, keyboardCount: 0, mouseCount: 0, productivityPercentage: 100 });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/monitoring/activity/:employeeId', authenticate, authorize(['Manager', 'SuperAdmin']), async (req, res) => {
  try {
    // Department isolation check for Manager
    if (req.user.role === 'Manager') {
      const { data: targetUser } = await supabase
        .from('users')
        .select('department')
        .eq('id', req.params.employeeId)
        .single();
      
      if (targetUser && targetUser.department !== req.user.department) {
        return res.status(403).json({ message: 'Access denied. You can only view activity for employees in your department.' });
      }
    }

    const { data: logs, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('employee_id', req.params.employeeId)
      .order('date', { ascending: false });

    if (error) throw error;
    res.json(formatActivityLog(logs || []));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// App & Website Usage Tracking - log application usage from agent
app.post('/api/monitoring/usage-log', authenticate, async (req, res) => {
  const { appName, windowTitle, type, durationMinutes, date } = req.body;
  const today = date || new Date().toISOString().split('T')[0];

  if (!appName || !type || typeof durationMinutes !== 'number') {
    return res.status(400).json({ message: 'Invalid usage payload' });
  }

  try {
    const { data: existingRecord, error: selectError } = await supabase
      .from('app_usage')
      .select('*')
      .eq('employee_id', req.user.id.toString())
      .eq('date', today)
      .eq('app_name', appName)
      .maybeSingle();

    if (selectError) throw selectError;

    if (existingRecord) {
      const { error: updateError } = await supabase
        .from('app_usage')
        .update({
          duration_minutes: existingRecord.duration_minutes + durationMinutes,
          window_title: windowTitle || existingRecord.window_title
        })
        .eq('id', existingRecord.id);

      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from('app_usage')
        .insert([{
          employee_id: req.user.id.toString(),
          date: today,
          app_name: appName,
          window_title: windowTitle || '',
          type: type,
          duration_minutes: durationMinutes
        }]);

      if (insertError) throw insertError;
    }

    res.json({ success: true, message: 'Usage logged successfully.' });
  } catch (err) {
    console.error('Supabase DB Error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// App & Website Usage Tracking - fetch logs for manager dashboard
app.get('/api/monitoring/usage/:employeeId', authenticate, authorize(['Manager', 'SuperAdmin']), async (req, res) => {
  const { date } = req.query;
  const targetDate = date || new Date().toISOString().split('T')[0];

  try {
    // Department isolation check for Manager
    if (req.user.role === 'Manager') {
      const { data: targetUser } = await supabase
        .from('users')
        .select('department')
        .eq('id', req.params.employeeId)
        .single();
      
      if (targetUser && targetUser.department !== req.user.department) {
        return res.status(403).json({ message: 'Access denied. You can only view usage for employees in your department.' });
      }
    }

    const { data, error } = await supabase
      .from('app_usage')
      .select('*')
      .eq('employee_id', req.params.employeeId)
      .eq('date', targetDate)
      .order('duration_minutes', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('Supabase Fetch Error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/monitoring/leaderboard - Get aggregated employee metrics
app.get('/api/monitoring/leaderboard', authenticate, authorize(['Manager', 'SuperAdmin']), async (req, res) => {
  const { dateRange, department } = req.query;
  
  let startDate, endDate;
  const today = new Date();
  
  const formatDate = (d) => {
    return d.toISOString().split('T')[0];
  };

  const todayStr = formatDate(today);
  
  if (dateRange === 'yesterday') {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    startDate = formatDate(yesterday);
    endDate = startDate;
  } else if (dateRange === '7days') {
    const start = new Date();
    start.setDate(start.getDate() - 7);
    startDate = formatDate(start);
    endDate = todayStr;
  } else if (dateRange === '30days') {
    const start = new Date();
    start.setDate(start.getDate() - 30);
    startDate = formatDate(start);
    endDate = todayStr;
  } else {
    // Default to 'today'
    startDate = todayStr;
    endDate = todayStr;
  }
  
  try {
    // Fetch employees
    let userQuery = supabase
      .from('users')
      .select('id, name, email, department, profile_pic')
      .eq('role', 'Employee');
      
    if (req.user.role === 'Manager') {
      userQuery = userQuery.eq('department', req.user.department);
    } else if (department && department !== 'All') {
      userQuery = userQuery.eq('department', department);
    }
    
    const { data: employees, error: empError } = await userQuery;
    if (empError) throw empError;
    
    if (!employees || employees.length === 0) {
      return res.json([]);
    }
    
    const employeeIds = employees.map(e => e.id);
    
    // Fetch attendance records
    const { data: attendanceData, error: attError } = await supabase
      .from('attendance')
      .select('*')
      .in('employee_id', employeeIds)
      .gte('date', startDate)
      .lte('date', endDate);
    if (attError) throw attError;
    
    // Fetch activity logs
    const { data: activityData, error: actError } = await supabase
      .from('activity_logs')
      .select('*')
      .in('employee_id', employeeIds)
      .gte('date', startDate)
      .lte('date', endDate);
    if (actError) throw actError;
    
    // Fetch app usage
    const { data: usageData, error: usageError } = await supabase
      .from('app_usage')
      .select('*')
      .in('employee_id', employeeIds)
      .gte('date', startDate)
      .lte('date', endDate);
    if (usageError) throw usageError;
    
    // Map & Aggregate
    const leaderboard = employees.map(emp => {
      const empIdStr = emp.id.toString();
      
      const empAttendance = attendanceData?.filter(a => a.employee_id.toString() === empIdStr) || [];
      const empActivity = activityData?.filter(a => a.employee_id.toString() === empIdStr) || [];
      const empUsage = usageData?.filter(a => a.employee_id.toString() === empIdStr) || [];
      
      // Calculate total work hours
      let totalHours = 0;
      empAttendance.forEach(att => {
        if (att.check_out_time) {
          totalHours += att.duration_hours || 0;
        } else {
          const elapsed = new Date() - new Date(att.check_in_time);
          const hrs = Math.max(0, elapsed / (1000 * 60 * 60));
          totalHours += hrs;
        }
      });
      
      // Calculate active hours & idle hours from activity_logs
      const activeMinutes = empActivity.reduce((sum, act) => sum + (act.active_minutes || 0), 0);
      const idleMinutes = empActivity.reduce((sum, act) => sum + (act.idle_minutes || 0), 0);
      
      // Calculate break/offline meeting minutes
      let breakMinutes = 0;
      empAttendance.forEach(att => {
        if (att.breaks) {
          att.breaks.forEach(b => {
            if (b.durationMinutes) {
              breakMinutes += b.durationMinutes;
            } else if (b.startTime) {
              const breakEnd = b.endTime ? new Date(b.endTime) : new Date();
              const diffMins = (breakEnd - new Date(b.startTime)) / (1000 * 60);
              breakMinutes += Math.max(0, diffMins);
            }
          });
        }
      });
      
      // Calculate app usage category breakdowns
      let productiveMins = 0;
      let unproductiveMins = 0;
      let neutralMins = 0;
      
      empUsage.forEach(u => {
        const mins = u.duration_minutes || 0;
        if (u.type === 'Productive') {
          productiveMins += mins;
        } else if (u.type === 'Unproductive') {
          unproductiveMins += mins;
        } else {
          neutralMins += mins;
        }
      });
      
      // Fallback if no app usage details, use active/idle logs
      if (productiveMins === 0 && unproductiveMins === 0 && (activeMinutes > 0 || idleMinutes > 0)) {
        productiveMins = activeMinutes;
        unproductiveMins = idleMinutes;
      }
      
      const totalTrackedMins = productiveMins + unproductiveMins + neutralMins;
      const productivityRatio = totalTrackedMins > 0 
        ? Math.round((productiveMins / totalTrackedMins) * 100) 
        : 100;
        
      return {
        id: emp.id,
        name: emp.name,
        department: emp.department || 'Operations',
        avatarUrl: emp.profile_pic || '',
        productivityRatio,
        productiveMins: Math.round(productiveMins),
        unproductiveMins: Math.round(unproductiveMins),
        neutralMins: Math.round(neutralMins),
        totalHours: Math.round(totalHours * 100) / 100,
        activeHours: Math.round((activeMinutes / 60) * 100) / 100,
        offlineMeetingMins: Math.round(breakMinutes)
      };
    });
    
    // Sort by productivityRatio descending
    leaderboard.sort((a, b) => b.productivityRatio - a.productivityRatio);
    
    res.json(leaderboard);
  } catch (err) {
    console.error('Leaderboard Fetch Error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// Manager dashboard summary stats
app.get('/api/monitoring/summary', authenticate, authorize(['Manager', 'SuperAdmin']), async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const isManager = req.user.role === 'Manager';
  const dept = req.user.department;
  
  try {
    let employeeIds = [];
    if (isManager) {
      const { data: deptEmps } = await supabase
        .from('users')
        .select('id')
        .eq('department', dept)
        .eq('role', 'Employee');
      employeeIds = deptEmps ? deptEmps.map(u => u.id) : [];
    }

    let employeesQuery = supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'Employee');
      
    if (isManager) {
      employeesQuery = employeesQuery.eq('department', dept);
    }
    const { count: totalEmployees } = await employeesQuery;

    let checkinsQuery = supabase
      .from('attendance')
      .select('*')
      .eq('date', today);
      
    if (isManager) {
      if (employeeIds.length === 0) {
        return res.json({
          totalEmployees: 0,
          onlineEmployees: 0,
          offlineEmployees: 0,
          pendingReportsCount: 0,
          productivityScore: 100,
          attendanceSummary: { present: 0, absent: 0 },
          liveCheckins: [],
          weeklyTrend: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(name => ({ day: name, score: 0 }))
        });
      }
      checkinsQuery = checkinsQuery.in('employee_id', employeeIds);
    }
    const { data: checkinsToday } = await checkinsQuery;

    let onlineEmployees = 0;
    let enrichedCheckins = [];

    if (checkinsToday && checkinsToday.length > 0) {
      const userIds = [...new Set(checkinsToday.map(c => c.employee_id))];
      const { data: users } = await supabase.from('users').select('id, name, email, department').in('id', userIds);
      const userMap = new Map(users ? users.map(u => [u.id, u]) : []);

      onlineEmployees = checkinsToday.filter(c => !c.check_out_time).length;

      enrichedCheckins = checkinsToday.map(c => ({
        ...formatAttendance(c),
        employee: toMongo(userMap.get(c.employee_id))
      }));
    }

    let reportsQuery = supabase
      .from('work_reports')
      .select('*', { count: 'exact', head: true })
      .eq('approval_status', 'Pending');
      
    if (isManager) {
      reportsQuery = reportsQuery.in('employee_id', employeeIds);
    }
    const { count: pendingReportsCount } = await reportsQuery;

    let activityQuery = supabase
      .from('activity_logs')
      .select('*')
      .eq('date', today);
      
    if (isManager) {
      activityQuery = activityQuery.in('employee_id', employeeIds);
    }
    const { data: activityToday } = await activityQuery;

    let avgProductivity = 100;
    if (activityToday && activityToday.length > 0) {
      const sum = activityToday.reduce((acc, curr) => acc + curr.productivity_percentage, 0);
      avgProductivity = Math.round(sum / activityToday.length);
    }

    // Calculate weekly productivity trend (Monday - Friday of current week in UTC)
    const now = new Date();
    const currentDay = now.getUTCDay();
    const diff = currentDay === 0 ? 6 : currentDay - 1;
    const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diff));

    const weekDates = [];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    for (let i = 0; i < 5; i++) {
      const d = new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + i));
      weekDates.push(d.toISOString().split('T')[0]);
    }

    let weeklyActivityQuery = supabase
      .from('activity_logs')
      .select('date, productivity_percentage')
      .in('date', weekDates);

    if (isManager) {
      weeklyActivityQuery = weeklyActivityQuery.in('employee_id', employeeIds);
    }
    const { data: weeklyActivity } = await weeklyActivityQuery;

    const weeklyTrend = dayNames.map((name, index) => {
      const dateStr = weekDates[index];
      const logsForDay = weeklyActivity ? weeklyActivity.filter(log => log.date === dateStr) : [];
      if (logsForDay.length > 0) {
        const sum = logsForDay.reduce((acc, curr) => acc + curr.productivity_percentage, 0);
        return {
          day: name,
          score: Math.round(sum / logsForDay.length)
        };
      } else {
        return {
          day: name,
          score: 0
        };
      }
    });

    res.json({
      totalEmployees: totalEmployees || 0,
      onlineEmployees,
      offlineEmployees: Math.max(0, (totalEmployees || 0) - onlineEmployees),
      pendingReportsCount: pendingReportsCount || 0,
      productivityScore: avgProductivity,
      attendanceSummary: {
        present: checkinsToday ? checkinsToday.length : 0,
        absent: Math.max(0, (totalEmployees || 0) - (checkinsToday ? checkinsToday.length : 0))
      },
      liveCheckins: enrichedCheckins,
      weeklyTrend
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 6. NOTIFICATION ROUTING
app.get('/api/notifications', authenticate, async (req, res) => {
  try {
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', req.user.id)
      .order('timestamp', { ascending: false })
      .limit(30);

    if (error) throw error;
    res.json(formatNotification(notifications || []));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put('/api/notifications/:id/read', authenticate, async (req, res) => {
  try {
    const { data: notification, error: fetchErr } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (fetchErr || !notification) return res.status(404).json({ message: 'Notification not found' });
    if (notification.recipient_id.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const { data: updated, error: updateErr } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (updateErr) throw updateErr;
    res.json(formatNotification(updated));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/settings/warning-emails', authenticate, authorize(['Manager', 'SuperAdmin']), async (req, res) => {
  try {
    let { data: setting } = await supabase
      .from('settings')
      .select('*')
      .eq('key', 'warning_emails')
      .maybeSingle();

    if (!setting) {
      const { data: newSetting } = await supabase
        .from('settings')
        .insert([{
          key: 'warning_emails',
          value: ['liyanagesasiru@gmail.com']
        }])
        .select('*')
        .single();
      setting = newSetting;
    }
    res.json(setting.value);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/settings/warning-emails', authenticate, authorize(['Manager', 'SuperAdmin']), async (req, res) => {
  const { emails } = req.body;
  if (!emails || !Array.isArray(emails)) {
    return res.status(400).json({ message: 'Invalid email list format.' });
  }
  try {
    const { data: setting } = await supabase
      .from('settings')
      .select('*')
      .eq('key', 'warning_emails')
      .maybeSingle();

    let updatedSetting;
    if (!setting) {
      const { data } = await supabase
        .from('settings')
        .insert([{ key: 'warning_emails', value: emails }])
        .select('*')
        .single();
      updatedSetting = data;
    } else {
      const { data } = await supabase
        .from('settings')
        .update({ value: emails, updated_at: new Date() })
        .eq('id', setting.id)
        .select('*')
        .single();
      updatedSetting = data;
    }
    res.json({ message: 'Settings saved successfully.', value: updatedSetting.value });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- DATABASE SEEDING & SERVER LAUNCH ---
const PORT = process.env.PORT || 5000;

const seedDatabase = async () => {
  try {
    // Check if users exist in Supabase
    const { data: users, error } = await supabase
      .from('users')
      .select('id');

    if (error) {
      console.error('Error checking users for seeding:', error.message);
      return;
    }

    if (!users || users.length === 0) {
      console.log('No users found in Supabase. Seeding default accounts...');

      const passHash = await bcrypt.hash('password123', 10);

      const defaultUsers = [
        {
          id: '60c72b2f9b1d8e1f88c1a111', // StaticObjectID Manager Bob
          name: 'Manager Bob',
          email: 'manager@wfh.com',
          password: passHash,
          role: 'Manager',
          department: 'Operations'
        },
        {
          id: '60c72b2f9b1d8e1f88c1a222', // StaticObjectID Alice Green
          name: 'Alice Green',
          email: 'employee1@wfh.com',
          password: passHash,
          role: 'Employee',
          department: 'Engineering'
        },
        {
          id: '60c72b2f9b1d8e1f88c1a333', // StaticObjectID John Smith
          name: 'John Smith',
          email: 'employee2@wfh.com',
          password: passHash,
          role: 'Employee',
          department: 'Design'
        }
      ];

      const { error: seedErr } = await supabase
        .from('users')
        .insert(defaultUsers);

      if (seedErr) {
        console.error('Failed to seed default users:', seedErr.message);
      } else {
        console.log('Seeding complete! Logins:');
        console.log('1. Manager  : manager@wfh.com  / password123');
        console.log('2. Employee : employee1@wfh.com / password123');
        console.log('3. Employee : employee2@wfh.com / password123');
      }
    } else {
      console.log('Users already exist in Supabase. Skipping seeding.');
    }
  } catch (err) {
    console.error('Seeding database failed:', err.message);
  }
};

// Seed database on startup
seedDatabase().then(() => {
  server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
});
