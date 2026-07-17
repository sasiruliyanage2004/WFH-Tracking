const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const supabase = require('../../infrastructure/database/supabase');
const { sendPasswordResetEmail, sendRegistrationOTPEmail } = require('../../infrastructure/services/email');
const { authenticate } = require('../middlewares/auth');
const multer = require('multer');

// Setup multer for uploads (needed for profile upload)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = './uploads/profiles';
    if (!fs.existsSync(uploadPath)){
        fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const uploadAttachment = multer({ storage: storage });

const generateId = () => {
  return crypto.randomBytes(12).toString('hex');
};

const toMongo = (user) => {
  if (!user) return null;
  return {
    _id: user.id,
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    profilePic: user.profile_pic,
    managerId: user.manager_id,
    forcePasswordReset: user.force_password_reset,
    companyId: user.company_id
  };
};

// 1. AUTH ROUTES
// Request verification OTP for registration
router.post('/register-otp', async (req, res) => {
  const { email } = req.body;
  try {
    if (!email) return res.status(400).json({ message: 'Email address is required.' });

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (existingUser) return res.status(400).json({ message: 'User already exists with this email address.' });

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

    // Send email verification containing the OTP
    await sendRegistrationOTPEmail(email.toLowerCase(), otp);

    res.json({ message: 'Verification code sent to your email.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/register', async (req, res) => {
  const { name, email, password, role, department, managerKey, superAdminKey, otp } = req.body;
  try {
    if (!otp) return res.status(400).json({ message: 'Verification code is required.' });

    // Check password complexity
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&).' });
    }

    // Verify OTP from password_resets table
    const { data: storedData, error: otpErr } = await supabase
      .from('password_resets')
      .select('*')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (otpErr || !storedData) {
      return res.status(400).json({ message: 'Verification code not found or expired. Please request a new code.' });
    }

    if (new Date() > new Date(storedData.expires_at)) {
      await supabase
        .from('password_resets')
        .delete()
        .eq('email', email.toLowerCase());
      return res.status(400).json({ message: 'Verification code has expired. Please request a new one.' });
    }

    if (storedData.otp !== otp) {
      return res.status(400).json({ message: 'Invalid verification code.' });
    }

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

    // Success - clean up OTP and register
    await supabase
      .from('password_resets')
      .delete()
      .eq('email', email.toLowerCase());

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
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*, company:companies(status)')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (error || !user) return res.status(400).json({ message: 'Invalid credentials.' });
    
    // Check if company is deactivated
    if (user.company && user.company.status === 'inactive') {
      return res.status(403).json({ message: 'Your company account has been deactivated. Please contact platform support.' });
    }

    if (user.company && user.company.status === 'pending') {
      return res.status(403).json({ message: 'Your company registration is pending approval by the Platform Owner. Please wait for an email confirmation.' });
    }

    if (user.is_active === false) return res.status(403).json({ message: 'Your account has been deactivated. Please contact an administrator.' });
    if (user.is_locked === true) return res.status(403).json({ message: 'Your account is locked due to multiple failed login attempts. Please contact an administrator.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      // Increment failed_login_attempts
      let attempts = (user.failed_login_attempts || 0) + 1;
      let locked = false;
      if (attempts >= 5) {
        locked = true;
      }
      await supabase.from('users').update({ failed_login_attempts: attempts, is_locked: locked }).eq('id', user.id);
      
      if (locked) {
        return res.status(403).json({ message: 'Your account has been locked due to 5 failed login attempts.' });
      }
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    // Successful login: reset failed attempts and update last_login
    await supabase.from('users').update({ 
      failed_login_attempts: 0, 
      last_login: new Date().toISOString() 
    }).eq('id', user.id);

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
        profilePic: user.profile_pic,
        forcePasswordReset: user.force_password_reset || false,
        companyId: user.company_id
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Force reset password (used when force_password_reset flag is true)
router.put('/force-reset-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new passwords are required.' });
    }

    const { data: user, error: fetchErr } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .maybeSingle();
    
    if (fetchErr || !user) return res.status(404).json({ message: 'User not found.' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid current password.' });

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    const { error: updateErr } = await supabase
      .from('users')
      .update({ 
        password: hashedNewPassword,
        force_password_reset: false
      })
      .eq('id', req.user.id);
    
    if (updateErr) throw updateErr;

    res.json({ message: 'Password reset successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/profile', authenticate, async (req, res) => {
  res.json(toMongo(req.user));
});

router.put('/profile', authenticate, async (req, res) => {
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

router.post('/profile/upload', authenticate, uploadAttachment.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ message: 'No file uploaded' });

    const filename = `${Date.now()}_${file.originalname}`;
    const fileBuffer = fs.readFileSync(file.path);

    const { data, error: uploadErr } = await supabase.storage
      .from('wfh-tracking')
      .upload(`profiles/${filename}`, fileBuffer, {
        contentType: file.mimetype,
        upsert: true
      });

    if (uploadErr) throw uploadErr;

    const { data: { publicUrl } } = supabase.storage
      .from('wfh-tracking')
      .getPublicUrl(`profiles/${filename}`);

    fs.unlink(file.path, () => {});

    res.json({ url: publicUrl });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Database-backed OTP store for password reset verification
router.post('/forgot-password', async (req, res) => {
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

router.post('/reset-password', async (req, res) => {
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


module.exports = router;
