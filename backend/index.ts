import { initNotificationService } from './src/infrastructure/services/notification';
// backend/index.js
import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
const socketIo = require('socket.io');
import cors from 'cors';
const dotenv = require('dotenv');
import helmet from 'helmet';
const rateLimit = require('express-rate-limit');

// Load environment variables immediately
dotenv.config();

import path from 'path';
import fs from 'fs';
const jwt = require('jsonwebtoken');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

import supabase from './src/infrastructure/database/supabase';
const { sendWarningEmail, sendPasswordResetEmail, sendRegistrationOTPEmail } = require('./src/infrastructure/services/email');
const { v4: uuidv4 } = require('uuid');
import { authenticate, authorize } from './src/interfaces/middlewares/auth';
import logger from './src/infrastructure/services/logger';


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
initNotificationService(io as any, userSockets);
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


// --- API ROUTES ---
import authRoutes from './src/interfaces/routes/authRoutes';
app.use('/api/auth', authRoutes);

import attendanceRoutes from './src/interfaces/routes/attendanceRoutes';
app.use('/api/attendance', attendanceRoutes);

import taskRoutes from './src/interfaces/routes/taskRoutes';
app.use('/api/tasks', taskRoutes);

import reportRoutes from './src/interfaces/routes/reportRoutes';
app.use('/api/reports', reportRoutes);

import monitoringRoutes from './src/interfaces/routes/monitoringRoutes';
app.use('/api', monitoringRoutes);

import adminRoutes from './src/interfaces/routes/adminRoutes';
app.use('', adminRoutes);

// ─── Serve React frontend ────────────────────────────────────────
const frontendBuild = path.join(__dirname, '..', 'frontend', 'build');
if (fs.existsSync(frontendBuild)) {
  app.use(express.static(frontendBuild));
  // All non-API routes return index.html (React HashRouter handles the rest)
  app.get(/^(?!\/api|\/uploads).*$/, (req: Request, res: Response) => {
    res.sendFile(path.join(frontendBuild, 'index.html'));
  });
  console.log('✅ Serving React frontend from:', frontendBuild);
} else {
  console.warn('⚠️  Frontend build not found at:', frontendBuild);
}

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
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
        const diffHrs = (end.getTime() - start.getTime()) / 3600000;
        
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


const PORT = Number(process.env.PORT) || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

