import { saveBase64Image, toMongo, generateId } from '../../utils/helpers';
import { sendNotification } from '../../infrastructure/services/notification';
import express, { Request, Response } from 'express';
const router = express.Router();
import supabase from '../../infrastructure/database/supabase';
import { sendWelcomeEmail } from '../../infrastructure/services/email';
import { authenticate, authorize } from '../middlewares/auth';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';



const formatNotification = (data) => {
  if (!data) return null;
  if (Array.isArray(data)) {
    return data.map(item => formatNotification(item));
  }
  return {
    id: data.id,
    type: data.type,
    message: data.message,
    timestamp: data.timestamp,
    read: data.read
  };
};


// --- API ROUTES ---

// 0. EMPLOYEE LIST ROUTES (SuperAdmin and Manager)

router.post('/api/users/employees', authenticate, authorize(['SuperAdmin', 'Manager']), async (req: Request, res: Response) => {
  const { name, email, role, department } = req.body;
  try {
    if (!name || !email) return res.status(400).json({ message: 'Name and email are required.' });

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (existingUser) return res.status(400).json({ message: 'Email is already registered.' });

    // Temporary password (user must reset)
    const tempPassword = 'password1234';
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    const userId = generateId();

    const { data: newUser, error } = await supabase
      .from('users')
      .insert([{
        id: userId,
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: 'Employee',
        department: department || 'Engineering',
        company_id: req.user!.companyId,
        force_password_reset: true
      }])
      .select('id, name, email, role, department, force_password_reset, created_at')
      .single();

    if (error) throw error;

    // Send Welcome Email
    const appUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    sendWelcomeEmail(name, email.toLowerCase(), tempPassword, appUrl, req.user!.companyId).catch(err => console.error('Error sending welcome email:', err));

    res.status(201).json({
      message: 'Employee created successfully. Temporary password is: password1234. Welcome email sent.',
      user: newUser
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/api/users/employees', authenticate, authorize(['SuperAdmin', 'Manager']), async (req: Request, res: Response) => {
  try {
    let query = supabase
      .from('users')
      .select('id, name, email, department, role, profile_pic, created_at, is_active, last_login, is_locked, force_password_reset, failed_login_attempts')
      .eq('role', 'Employee')
      .eq('company_id', req.user!.companyId);

    if (req.user!.role === 'Manager') {
      if (req.user!.department) {
        query = query.eq('department', req.user!.department);
      } else {
        return res.json([]);
      }
    }

    const { data: employees, error } = await query.order('created_at', { ascending: false });

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
        isActive: emp.is_active !== false,
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
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Toggle Employee Active Status
router.put('/api/users/employees/:id/status', authenticate, authorize(['SuperAdmin', 'Manager']), async (req: Request, res: Response) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') return res.status(400).json({ message: 'isActive boolean is required' });

    const { data: emp, error: fetchErr } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (fetchErr || !emp) return res.status(404).json({ message: 'Employee not found.' });
    if (emp.role === 'Manager' || emp.role === 'SuperAdmin') return res.status(403).json({ message: 'Cannot modify a Manager or SuperAdmin account here.' });

    if (req.user!.role === 'Manager' && emp.department !== req.user!.department) {
      return res.status(403).json({ message: 'You are only authorized to modify employees in your own department.' });
    }

    const { error: updateErr } = await supabase
      .from('users')
      .update({ is_active: isActive })
      .eq('id', req.params.id);

    if (updateErr) throw updateErr;

    res.json({ message: `Employee successfully ${isActive ? 'activated' : 'deactivated'}` });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/api/users/employees/:id', authenticate, authorize(['SuperAdmin', 'Manager']), async (req: Request, res: Response) => {
  try {
    const { data: emp, error: fetchErr } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (fetchErr || !emp) return res.status(404).json({ message: 'Employee not found.' });
    if (emp.role === 'Manager' || emp.role === 'SuperAdmin') return res.status(403).json({ message: 'Cannot delete a Manager or SuperAdmin account.' });

    // If Manager, check if the employee belongs to the same department
    if (req.user!.role === 'Manager' && emp.department !== req.user!.department) {
      return res.status(403).json({ message: 'You are only authorized to delete employees in your own department.' });
    }

    const { error: deleteErr } = await supabase
      .from('users')
      .delete()
      .eq('id', req.params.id);

    if (deleteErr) throw deleteErr;

    res.json({ message: 'Employee deleted successfully.' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Create Admin/Manager (SuperAdmin only)
router.post('/api/users/admins', authenticate, authorize('SuperAdmin'), async (req: Request, res: Response) => {
  const { name, email, department } = req.body;
  try {
    if (!name || !email) return res.status(400).json({ message: 'Name and email are required.' });

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (existingUser) return res.status(400).json({ message: 'Email is already registered.' });

    const tempPassword = 'password1234';
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    const userId = generateId();

    const { data: newUser, error } = await supabase
      .from('users')
      .insert([{
        id: userId,
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: 'Manager',
        department: department || 'Engineering',
        company_id: req.user!.companyId,
        force_password_reset: true
      }])
      .select('id, name, email, role, department, created_at, is_active')
      .single();

    if (error) throw error;

    const mappedUser = {
      _id: newUser.id,
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      department: newUser.department,
      createdAt: newUser.created_at,
      isActive: newUser.is_active
    };

    res.status(201).json({
      message: 'Manager created successfully. Temporary password is: password1234',
      user: mappedUser
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/api/users/admins', authenticate, authorize('SuperAdmin'), async (req: Request, res: Response) => {
  try {
    const { data: admins, error } = await supabase
      .from('users')
      .select('id, name, email, department, role, profile_pic, created_at, is_active')
      .eq('company_id', req.user!.companyId)
      .eq('role', 'Manager')
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
      createdAt: adm.created_at,
      isActive: adm.is_active
    }));

    res.json(mapped);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/api/users/admins/:id', authenticate, authorize('SuperAdmin'), async (req: Request, res: Response) => {
  try {
    if (req.params.id.toString() === req.user!.id.toString()) {
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
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Toggle Admin Status
router.put('/api/users/admins/:id/status', authenticate, authorize('SuperAdmin'), async (req: Request, res: Response) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') return res.status(400).json({ message: 'isActive boolean is required' });

    if (req.params.id.toString() === req.user!.id.toString()) {
      return res.status(400).json({ message: 'You cannot deactivate your own account.' });
    }

    const { data: adm, error: fetchErr } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (fetchErr || !adm) return res.status(404).json({ message: 'Account not found.' });

    const { error: updateErr } = await supabase
      .from('users')
      .update({ is_active: isActive })
      .eq('id', req.params.id);

    if (updateErr) throw updateErr;

    res.json({ message: `Account successfully ${isActive ? 'activated' : 'deactivated'}` });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// GET SuperAdmins
router.get('/api/users/superadmins', authenticate, authorize('SuperAdmin'), async (req: Request, res: Response) => {
  try {
    const { data: admins, error } = await supabase
      .from('users')
      .select('id, name, email, department, role, profile_pic, created_at, is_active')
      .eq('company_id', req.user!.companyId)
      .eq('role', 'SuperAdmin')
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
      createdAt: adm.created_at,
      isActive: adm.is_active
    }));

    res.json(mapped);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Create SuperAdmin
router.post('/api/users/superadmins', authenticate, authorize('SuperAdmin'), async (req: Request, res: Response) => {
  try {
    const { name, email, department } = req.body;

    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (existingUser) return res.status(400).json({ message: 'User with this email already exists' });

    const hashedPassword = await bcrypt.hash('password1234', 10);
    const userId = crypto.randomBytes(12).toString('hex');

    const { data: newUser, error: userErr } = await supabase
      .from('users')
      .insert([{
        id: userId,
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: 'SuperAdmin',
        department: department || 'Management',
        company_id: req.user!.companyId,
        force_password_reset: true
      }])
      .select()
      .single();

    if (userErr) throw userErr;

    const returnUser = {
      _id: newUser.id,
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      department: newUser.department,
      profilePic: newUser.profile_pic
    };

    res.status(201).json({ message: 'SuperAdmin created successfully. Welcome email sent.', user: returnUser });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Delete SuperAdmin
router.delete('/api/users/superadmins/:id', authenticate, authorize('SuperAdmin'), async (req: Request, res: Response) => {
  try {
    if (req.params.id.toString() === req.user!.id.toString()) {
      return res.status(400).json({ message: 'You cannot delete your own account.' });
    }

    const { data: adm, error: fetchErr } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (fetchErr || !adm) return res.status(404).json({ message: 'SuperAdmin account not found.' });

    const { error: deleteErr } = await supabase
      .from('users')
      .delete()
      .eq('id', req.params.id);

    if (deleteErr) throw deleteErr;

    res.json({ message: 'SuperAdmin account deleted successfully.' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// 6. NOTIFICATION ROUTING
router.get('/api/notifications', authenticate, async (req: Request, res: Response) => {
  try {
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', req.user!.id)
      .order('timestamp', { ascending: false })
      .limit(50);

    if (error) throw error;
    res.json(formatNotification(notifications || []));
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/api/notifications/:id/read', authenticate, async (req: Request, res: Response) => {
  try {
    const { data: notification, error: fetchErr } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (fetchErr || !notification) return res.status(404).json({ message: 'Notification not found' });
    if (notification.recipient_id.toString() !== req.user!.id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const { error: updateErr } = await supabase
      .from('notifications')
      .delete()
      .eq('id', req.params.id);

    if (updateErr) throw updateErr;
    res.json({ message: 'Notification deleted' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Bulk delete all notifications for the current user
router.delete('/api/notifications/all', authenticate, async (req: Request, res: Response) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('recipient_id', req.user!.id);

    if (error) throw error;
    res.json({ message: 'All notifications cleared' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/api/settings/warning-emails', authenticate, authorize(['SuperAdmin']), async (req: Request, res: Response) => {
  try {
    let { data: setting } = await supabase
      .from('settings')
      .select('*')
      .eq('company_id', req.user!.companyId)
      .eq('key', 'warning_emails')
      .maybeSingle();

    if (!setting) {
      const { data: newSetting } = await supabase
        .from('settings')
        .insert([{
          key: 'warning_emails',
          value: ['liyanagesasiru@gmail.com'],
          company_id: req.user!.companyId
        }])
        .select('*')
        .single();
      setting = newSetting;
    }
    res.json(setting.value);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/api/settings/warning-emails', authenticate, authorize(['SuperAdmin']), async (req: Request, res: Response) => {
  const { emails } = req.body;
  if (!emails || !Array.isArray(emails)) {
    return res.status(400).json({ message: 'Invalid email list format.' });
  }
  try {
    let query = supabase.from('settings').select('*').eq('key', 'warning_emails');
    if (req.user!.companyId) {
      query = query.eq('company_id', req.user!.companyId);
    }
    const { data: setting } = await query.maybeSingle();

    let updatedSetting;
    if (!setting) {
      const { data } = await supabase
        .from('settings')
        .insert([{ key: 'warning_emails', value: emails, company_id: req.user!.companyId }])
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
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// --- Custom SMTP Settings ---
router.get('/api/settings/smtp', authenticate, authorize(['SuperAdmin']), async (req: Request, res: Response) => {
  try {
    let query = supabase.from('settings').select('value').eq('key', 'smtp_config');
    if (req.user!.companyId) {
      query = query.eq('company_id', req.user!.companyId);
    } else {
      query = query.is('company_id', null);
    }
    const { data: setting } = await query.maybeSingle();

    if (setting && setting.value) {
      // Don't send the password back to the frontend for security, or send a placeholder
      const config = { ...setting.value };
      if (config.pass) config.pass = '********';
      res.json(config);
    } else {
      res.json(null);
    }
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/api/settings/smtp', authenticate, authorize(['SuperAdmin']), async (req: Request, res: Response) => {
  const { host, port, user, pass, sender_email, use_custom } = req.body;
  try {
    let query = supabase.from('settings').select('*').eq('key', 'smtp_config');
    if (req.user!.companyId) {
      query = query.eq('company_id', req.user!.companyId);
    } else {
      query = query.is('company_id', null);
    }
    const { data: setting } = await query.maybeSingle();

    // If the frontend sends '********', we keep the old password
    let finalPass = pass;
    if (pass === '********' && setting && setting.value && setting.value.pass) {
      finalPass = setting.value.pass;
    }

    const newConfig = {
      host: host || '',
      port: port || 587,
      user: user || '',
      pass: finalPass || '',
      sender_email: sender_email || '',
      use_custom: !!use_custom
    };

    let updatedSetting;
    if (!setting) {
      const { data } = await supabase
        .from('settings')
        .insert([{ key: 'smtp_config', value: newConfig, company_id: req.user!.companyId }])
        .select('*')
        .single();
      updatedSetting = data;
    } else {
      const { data } = await supabase
        .from('settings')
        .update({ value: newConfig, updated_at: new Date() })
        .eq('id', setting.id)
        .select('*')
        .single();
      updatedSetting = data;
    }
    res.json({ message: 'SMTP settings saved successfully.' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/api/settings/smtp/test', authenticate, authorize(['SuperAdmin']), async (req: Request, res: Response) => {
  const { host, port, user, pass, sender_email } = req.body;
  try {
    let finalPass = pass;
    if (pass === '********') {
      let query = supabase.from('settings').select('value').eq('key', 'smtp_config');
      if (req.user!.companyId) query = query.eq('company_id', req.user!.companyId);
      else query = query.is('company_id', null);
      const { data: setting } = await query.maybeSingle();
      if (setting && setting.value && setting.value.pass) {
        finalPass = setting.value.pass;
      } else {
        return res.status(400).json({ message: 'Password is required for testing.' });
      }
    }

    if (!host || !port || !user || !finalPass || !sender_email) {
      return res.status(400).json({ message: 'All SMTP fields are required for a test connection.' });
    }

    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(port, 10),
      secure: parseInt(port, 10) === 465,
      auth: { user, pass: finalPass }
    });

    const mailOptions = {
      from: `"WFH Tracking System (Test)" <${sender_email}>`,
      to: req.user!.email,
      subject: '✅ SMTP Connection Test Successful',
      html: '<p>If you are reading this, your custom SMTP configuration is working correctly.</p>'
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: 'Test email sent successfully! Please check your inbox.' });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to send test email: ' + err.message });
  }
});
router.get('/api/settings/screenshot-rules', authenticate, async (req: Request, res: Response) => {
  try {
    let query = supabase.from('settings').select('*').eq('key', 'screenshot_rules');
    if (req.user!.companyId) {
      query = query.eq('company_id', req.user!.companyId);
    }
    const { data: setting } = await query.maybeSingle();

    const defaultValue = {
      threshold: 70,
      highProdInterval: 20,
      standardInterval: 5
    };

    res.json(setting ? setting.value : defaultValue);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/api/settings/screenshot-rules', authenticate, authorize(['SuperAdmin', 'Manager']), async (req: Request, res: Response) => {
  const { threshold, highProdInterval, standardInterval } = req.body;
  try {
    const rules = {
      threshold: parseInt(threshold) || 70,
      highProdInterval: parseInt(highProdInterval) || 20,
      standardInterval: parseInt(standardInterval) || 5
    };

    let query = supabase.from('settings').select('*').eq('key', 'screenshot_rules');
    if (req.user!.companyId) {
      query = query.eq('company_id', req.user!.companyId);
    }
    const { data: setting } = await query.maybeSingle();

    let updatedSetting;
    if (!setting) {
      const { data } = await supabase
        .from('settings')
        .insert([{ key: 'screenshot_rules', value: rules, company_id: req.user!.companyId }])
        .select('*')
        .single();
      updatedSetting = data;
    } else {
      const { data } = await supabase
        .from('settings')
        .update({ value: rules, updated_at: new Date() })
        .eq('id', setting.id)
        .select('*')
        .single();
      updatedSetting = data;
    }
    res.json({ message: 'Screenshot rules saved successfully.', value: updatedSetting.value });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// --- SETTINGS: PRODUCTIVITY APPS ---

router.get('/api/settings/productivity', authenticate, authorize(['SuperAdmin', 'Manager']), async (req: Request, res: Response) => {
  try {
    if (!req.user!.companyId) {
      return res.status(400).json({ message: 'User does not belong to a company.' });
    }
    const { data: company, error } = await supabase
      .from('companies')
      .select('productive_apps, unproductive_apps')
      .eq('id', req.user!.companyId)
      .maybeSingle();

    if (error) throw error;
    res.json(company || { productive_apps: [], unproductive_apps: [] });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/api/settings/productivity', authenticate, authorize(['SuperAdmin']), async (req: Request, res: Response) => {
  const { productive_apps, unproductive_apps } = req.body;
  try {
    if (!req.user!.companyId) {
      return res.status(400).json({ message: 'User does not belong to a company.' });
    }
    const { data: updatedCompany, error } = await supabase
      .from('companies')
      .update({
        productive_apps: Array.isArray(productive_apps) ? productive_apps : [],
        unproductive_apps: Array.isArray(unproductive_apps) ? unproductive_apps : []
      })
      .eq('id', req.user!.companyId)
      .select('productive_apps, unproductive_apps')
      .single();

    if (error) throw error;
    res.json({ message: 'Productivity settings updated successfully.', data: updatedCompany });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// --- DATABASE SEEDING & SERVER LAUNCH ---


// Automated webcam cleanup task (runs daily)
const cleanupOldWebcams = async () => {
  console.log('Starting automated webcam selfie cleanup task...');
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 5);
    const cutoffIso = cutoffDate.toISOString();

    const { data: logs, error } = await supabase
      .from('attendance')
      .select('id, webcam_image')
      .lt('created_at', cutoffIso)
      .not('webcam_image', 'is', null);

    if (error) throw error;

    if (!logs || logs.length === 0) {
      console.log('No old webcam selfies to clean up.');
      return;
    }

    console.log(`Found ${logs.length} old attendance records with webcam images to clean up.`);

    let deletedCount = 0;
    let dbUpdatedCount = 0;

    for (const log of logs) {
      const imgPath = log.webcam_image;
      if (!imgPath) continue;

      if (imgPath.startsWith('/uploads/webcams/')) {
        const localPath = path.join(__dirname, imgPath);
        try {
          if (fs.existsSync(localPath)) {
            fs.unlinkSync(localPath);
            deletedCount++;
          }
        } catch (fileErr) {
          console.error(`Failed to delete file ${localPath}:`, fileErr.message);
        }
      } else if (imgPath.includes('supabase.co/storage')) {
        const pathParts = imgPath.split('/wfh-tracking/');
        if (pathParts.length > 1) {
          const storagePath = pathParts[1];
          try {
            await supabase.storage.from('wfh-tracking').remove([storagePath]);
            deletedCount++;
          } catch (storageErr) {
            console.error(`Failed to delete Supabase file ${storagePath}:`, storageErr.message);
          }
        }
      }

      try {
        const { error: updateErr } = await supabase
          .from('attendance')
          .update({ webcam_image: null })
          .eq('id', log.id);

        if (updateErr) {
          console.error(`Failed to update database for attendance ID ${log.id}:`, updateErr.message);
        } else {
          dbUpdatedCount++;
        }
      } catch (dbErr) {
        console.error(`Failed to update database for attendance ID ${log.id}:`, dbErr.message);
      }
    }

    console.log(`Webcam cleanup completed: deleted ${deletedCount} files from disk, updated ${dbUpdatedCount} database rows.`);
  } catch (err: any) {
    console.error('Failed to run automated webcam cleanup:', err.message);
  }
};

// Automated screenshots cleanup task (runs daily, deletes screenshots older than 14 days to preserve disk space)
const cleanupOldScreenshots = async () => {
  console.log('Starting automated screenshots cleanup task...');
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 14); // 14 days ago
    const cutoffIso = cutoffDate.toISOString();

    const { data: list, error } = await supabase
      .from('screenshots')
      .select('id, screenshot_url')
      .lt('timestamp', cutoffIso);

    if (error) throw error;

    if (!list || list.length === 0) {
      console.log('No old screenshots to clean up.');
      return;
    }

    console.log(`Found ${list.length} old screenshot records to clean up.`);

    let deletedFilesCount = 0;
    const idsToDelete = [];

    for (const ss of list) {
      const imgPath = ss.screenshot_url;
      if (imgPath && imgPath.startsWith('/uploads/screenshots/')) {
        const localPath = path.join(__dirname, imgPath);
        try {
          if (fs.existsSync(localPath)) {
            fs.unlinkSync(localPath);
            deletedFilesCount++;
          }
        } catch (fileErr) {
          console.error(`Failed to delete screenshot file ${localPath}:`, fileErr.message);
        }
      } else if (imgPath && imgPath.includes('supabase.co/storage')) {
        const pathParts = imgPath.split('/wfh-tracking/');
        if (pathParts.length > 1) {
          const storagePath = pathParts[1];
          try {
            await supabase.storage.from('wfh-tracking').remove([storagePath]);
            deletedFilesCount++;
          } catch (storageErr) {
            console.error(`Failed to delete Supabase screenshot ${storagePath}:`, storageErr.message);
          }
        }
      }
      idsToDelete.push(ss.id);
    }

    if (idsToDelete.length > 0) {
      const { error: delError } = await supabase
        .from('screenshots')
        .delete()
        .in('id', idsToDelete);

      if (delError) {
        console.error('Failed to delete screenshot records from database:', delError.message);
      } else {
        console.log(`Screenshots cleanup completed: deleted ${deletedFilesCount} files from disk, removed ${idsToDelete.length} rows from database.`);
      }
    }
  } catch (err: any) {
    console.error('Failed to run automated screenshots cleanup:', err.message);
  }
};

// Seed database on startup
// Run cleanup tasks once on startup, then every 24 hours
cleanupOldWebcams();
cleanupOldScreenshots();
setInterval(cleanupOldWebcams, 24 * 60 * 60 * 1000);
setInterval(cleanupOldScreenshots, 24 * 60 * 60 * 1000);

// 10. SYSTEM ADMIN ROUTES

const companyDetailsPath = path.join(__dirname, 'uploads', 'company_details.json');

function getCompanyDetailsMap() {
  try {
    if (!fs.existsSync(companyDetailsPath)) {
      fs.writeFileSync(companyDetailsPath, JSON.stringify({}));
      return {};
    }
    const raw = fs.readFileSync(companyDetailsPath, 'utf8');
    return JSON.parse(raw);
  } catch (err: any) {
    console.error('Failed to read company details map:', err.message);
    return {};
  }
}

function saveCompanyDetailsMap(map) {
  try {
    fs.writeFileSync(companyDetailsPath, JSON.stringify(map, null, 2));
  } catch (err: any) {
    console.error('Failed to save company details map:', err.message);
  }
}

router.post('/api/system/companies', authenticate, authorize(['SystemAdmin']), async (req: Request, res: Response) => {
  const { companyName, email, registrationNumber, location, website } = req.body;
  try {
    if (!companyName || !email) {
      return res.status(400).json({ message: 'Company Name and Admin Email are required.' });
    }
    if (!registrationNumber || !location) {
      return res.status(400).json({ message: 'Registration Number and Headquarters Location are required.' });
    }

    const { data: existingCompany } = await supabase
      .from('companies')
      .select('id')
      .ilike('name', companyName.trim())
      .maybeSingle();

    if (existingCompany) {
      return res.status(400).json({ message: 'A company with this name already exists.' });
    }

    const adminEmail = email;

    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', adminEmail.toLowerCase())
      .maybeSingle();

    if (existingUser) {
      return res.status(400).json({ message: 'Email is already registered. Please provide a custom email.' });
    }

    const { data: company, error: companyErr } = await supabase
      .from('companies')
      .insert([{ name: companyName, status: 'active' }])
      .select('*')
      .single();
    if (companyErr) throw companyErr;

    const tempPassword = 'password1234';
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    const userId = generateId();

    const { data: newUser, error: userErr } = await supabase
      .from('users')
      .insert([{
        id: userId,
        name: `${companyName} Admin`,
        email: adminEmail.toLowerCase(),
        password: hashedPassword,
        role: 'SuperAdmin',
        department: 'Management',
        company_id: company.id,
        force_password_reset: true
      }])
      .select('id, name, email, role, department, created_at')
      .single();
    
    if (userErr) {
      // rollback company
      await supabase.from('companies').delete().eq('id', company.id);
      throw userErr;
    }

    // Save details metadata locally
    const detailsMap = getCompanyDetailsMap();
    detailsMap[company.id] = {
      registrationNumber,
      location,
      website: website || ''
    };
    saveCompanyDetailsMap(detailsMap);

    res.status(201).json({
      message: 'Company created successfully.',
      company: {
        ...company,
        registrationNumber,
        location,
        website: website || ''
      },
      admin: newUser,
      tempPassword
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/api/system/companies', authenticate, authorize(['SystemAdmin']), async (req: Request, res: Response) => {
  try {
    const { data: companies, error } = await supabase
      .from('companies')
      .select(`
        id,
        name,
        status,
        created_at,
        users (count)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const detailsMap = getCompanyDetailsMap();
    const enriched = companies.map(c => ({
      ...c,
      registrationNumber: detailsMap[c.id]?.registrationNumber || '',
      location: detailsMap[c.id]?.location || '',
      website: detailsMap[c.id]?.website || ''
    }));

    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/api/system/companies/:id/status', authenticate, authorize(['SystemAdmin']), async (req: Request, res: Response) => {
  const { status } = req.body;
  try {
    const { data, error } = await supabase
      .from('companies')
      .update({ status })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ message: 'Company status updated', company: data });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/api/system/companies/:id', authenticate, authorize(['SystemAdmin']), async (req: Request, res: Response) => {
  try {
    const companyId = req.params.id;

    // 1. Fetch all users belonging to this company
    const { data: users } = await supabase.from('users').select('id').eq('company_id', companyId);
    
    if (users && users.length > 0) {
      // Chunk user IDs in case there are many (Supabase usually handles large IN clauses, but good for safety)
      const userIds = users.map(u => u.id);
      
      // 2. Delete all related records for these users
      await Promise.all([
        supabase.from('attendance').delete().in('employee_id', userIds),
        supabase.from('usage_logs').delete().in('employee_id', userIds),
        supabase.from('activity_logs').delete().in('employee_id', userIds),
        supabase.from('offline_sync_logs').delete().in('employee_id', userIds),
        supabase.from('screenshots').delete().in('employee_id', userIds),
        supabase.from('notifications').delete().in('user_id', userIds),
        supabase.from('password_resets').delete().in('user_id', userIds)
      ]);
    }

    // 3. Delete the users themselves
    await supabase.from('users').delete().eq('company_id', companyId);

    // 4. Delete company-level settings and metadata
    await supabase.from('settings').delete().eq('company_id', companyId);
    
    try {
      // The table might be named company_storage_metadata depending on schema, ignore error if missing
      await supabase.from('company_storage_metadata').delete().eq('company_id', companyId);
    } catch (e) {}

    // 5. Finally, delete the company
    const { error } = await supabase
      .from('companies')
      .delete()
      .eq('id', companyId);

    if (error) throw error;
    res.json({ message: 'Company deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});


// --- Analytics Endpoint ---
router.get('/api/system/analytics', authenticate, authorize(['SystemAdmin']), async (req: Request, res: Response) => {
  try {
    const { count: totalCompanies, error: cErr } = await supabase.from('companies').select('*', { count: 'exact', head: true });
    const { count: activeCompanies, error: acErr } = await supabase.from('companies').select('*', { count: 'exact', head: true }).eq('status', 'active');
    
    // total non-systemadmin users
    const { count: totalUsers, error: uErr } = await supabase.from('users').select('*', { count: 'exact', head: true }).neq('role', 'SystemAdmin');
    
    // daily active users (last_login within 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: activeUsersToday, error: auErr } = await supabase.from('users').select('*', { count: 'exact', head: true }).gte('last_login', oneDayAgo);

    // total devices across all companies
    const { count: totalDevices, error: dErr } = await supabase.from('devices').select('*', { count: 'exact', head: true });

    if (cErr || acErr || uErr || auErr || dErr) throw new Error('Failed to compute analytics');

    res.json({
      totalCompanies: totalCompanies || 0,
      activeCompanies: activeCompanies || 0,
      totalUsers: totalUsers || 0,
      dailyActiveUsers: activeUsersToday || 0,
      deviceCount: totalDevices || 0
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// --- Announcements Endpoints ---
router.post('/api/system/announcements', authenticate, authorize(['SystemAdmin']), async (req: Request, res: Response) => {
  const { title, message, target_role, color } = req.body;
  if (!title || !message) return res.status(400).json({ message: 'Title and message are required' });
  
  try {
    const { data, error } = await supabase
      .from('system_announcements')
      .insert([{ title, message, target_role: target_role || 'all', created_by: req.user!.id, color: color || '#f57c00' }])
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ message: 'Announcement created', data });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/api/system/announcements/:id', authenticate, authorize(['SystemAdmin']), async (req: Request, res: Response) => {
  try {
    const { error } = await supabase
      .from('system_announcements')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Announcement deleted' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/api/system/announcements', authenticate, authorize(['SystemAdmin']), async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('system_announcements')
      .select('*, created_by_user:users!created_by(name, email)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/api/announcements/latest', authenticate, async (req: Request, res: Response) => {
  try {
    // Basic logic: get latest active announcement matching target_role = 'all' or req.user!.role
    const { data, error } = await supabase
      .from('system_announcements')
      .select('*')
      .eq('is_active', true)
      .in('target_role', ['all', req.user!.role])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    res.json(data || null);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
