// @ts-nocheck
import { saveBase64Image, toMongo, formatAttendance, formatActivityLog, formatTask, formatScreenshot, formatWorkReport, formatNotification, generateId } from '../../utils/helpers';
import { sendNotification } from '../../infrastructure/services/notification';
import express, { Request, Response } from 'express';
const router = express.Router();
import supabase from '../../infrastructure/database/supabase';
import { authenticate, authorize } from '../middlewares/auth';

const formatAttendance = (data) => {
  if (!data) return null;
  if (Array.isArray(data)) {
    return data.map(item => formatAttendance(item));
  }
  return {
    id: data.id,
    employeeId: data.employee_id,
    date: data.date,
    checkInTime: data.check_in_time,
    checkOutTime: data.check_out_time,
    status: data.status,
    workHours: data.work_hours,
    breakHours: data.break_hours || 0,
    checkInLocation: data.check_in_location,
    checkInAddress: data.check_in_address,
    webcamImage: data.webcam_image,
    checkInMethod: data.check_in_method || 'manual',
    isAutoCheckIn: data.is_auto_check_in || false,
    
    onBreak: data.on_break || false,
    currentBreakType: data.current_break_type || null,
    currentBreakStartTime: data.current_break_start_time || null,
    breakHistory: data.break_history || []
  };
};

// 2. ATTENDANCE ROUTES

// Mobile Verification Store (In-Memory)
const mobileVerificationStore = new Map();

// Cleanup old tokens every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of mobileVerificationStore.entries()) {
    if (now - value.timestamp > 5 * 60 * 1000) {
      mobileVerificationStore.delete(key);
    }
  }
}, 60 * 1000);

router.post('/mobile-location', async (req: Request, res: Response) => {
  const { token, latitude, longitude, address } = req.body;
  if (!token) return res.status(400).json({ message: 'Token required' });
  
  mobileVerificationStore.set(token, {
    latitude,
    longitude,
    address,
    timestamp: Date.now()
  });
  
  res.json({ success: true });
});

router.get('/mobile-location-status', authenticate, async (req: Request, res: Response) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ message: 'Token required' });
  
  const data = mobileVerificationStore.get(token);
  if (data) {
    if (Date.now() - data.timestamp > 5 * 60 * 1000) {
      mobileVerificationStore.delete(token);
      return res.json({ status: 'expired' });
    }
    mobileVerificationStore.delete(token);
    return res.json({ status: 'success', data });
  }
  
  return res.json({ status: 'pending' });
});

router.post('/checkin', authenticate, async (req: Request, res: Response) => {
  const { latitude, longitude, address, webcamImage } = req.body;
  const today = new Date().toISOString().split('T')[0];

  try {
    const { data: existing } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', req.user!.id)
      .eq('date', today)
      .maybeSingle();

    let webcamUrl = '';
    if (webcamImage) {
      const filename = `webcam_${req.user!.id}_${Date.now()}.jpg`;
      webcamUrl = await saveBase64Image(webcamImage, 'webcams', filename);
    }

    let att;
    let error;

    if (existing) {
      // If there is an active session, they cannot check in again
      if (existing.check_out_time === null) {
        return res.status(400).json({ message: 'You are already checked in. Please check out first before checking in again.' });
      }

      // If they already checked out earlier today, update the existing record (re-opening the check-in session)
      const { data, error: updateErr } = await supabase
        .from('attendance')
        .update({
          check_in_time: new Date(),
          check_out_time: null,
          latitude: latitude || existing.latitude,
          longitude: longitude || existing.longitude,
          address: address || existing.address || '',
          webcam_image: webcamUrl || existing.webcam_image,
          status: 'Present'
        })
        .eq('id', existing.id)
        .select('*')
        .single();
      
      att = data;
      error = updateErr;
    } else {
      // First check-in of the day: insert new record
      const { data, error: insertErr } = await supabase
        .from('attendance')
        .insert([{
          employee_id: req.user!.id,
          date: today,
          check_in_time: new Date(),
          latitude,
          longitude,
          address: address || '',
          webcam_image: webcamUrl,
          status: 'Present',
          company_id: req.user!.companyId
        }])
        .select('*')
        .single();
      
      att = data;
      error = insertErr;
    }

    if (error) throw error;

    // Alert Managers
    const { data: managers } = await supabase.from('users').select('id').eq('role', 'Manager');
    if (managers) {
      for (let mgr of managers) {
        await sendNotification(mgr.id, `${req.user!.name} has checked in from WFH.`, 'checkin');
      }
    }

    res.status(201).json({ message: 'Checked in successfully.', attendance: formatAttendance(att) });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// --- Hearbeat Endpoint ---
router.post('/heartbeat', authenticate, async (req: Request, res: Response) => {
  try {
    const { data: att } = await supabase
      .from('attendance')
      .select('id')
      .eq('employee_id', req.user!.id)
      .is('check_out_time', null)
      .maybeSingle();

    if (att) {
      await supabase
        .from('attendance')
        .update({ last_heartbeat: new Date() })
        .eq('id', att.id);
      res.json({ success: true, active: true });
    } else {
      res.json({ success: true, autoCheckedOut: true });
    }
  } catch (err: any) {
    res.status(500).json({ success: false });
  }
});

router.post('/checkout', authenticate, async (req: Request, res: Response) => {
  const today = new Date().toISOString().split('T')[0];
  try {
    const { data: atts, error: fetchErr } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', req.user!.id)
      .is('check_out_time', null)
      .order('check_in_time', { ascending: false })
      .limit(1);
    
    const att = atts && atts.length > 0 ? atts[0] : null;

    if (fetchErr || !att) {
      return res.status(400).json({ message: 'No check-in record found for today.' });
    }
    if (att.check_out_time !== null) {
      return res.status(400).json({ message: 'You have already checked out today.' });
    }

    const checkOutTime = new Date();
    const checkIn = new Date(att.check_in_time);
    const sessionMs = checkOutTime - checkIn;
    const sessionHours = sessionMs / (1000 * 60 * 60);
    const totalHours = (att.duration_hours || 0) + sessionHours;
    const hours = Math.round(totalHours * 100) / 100;

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
      let minMinutes = 60;
      try {
        const { data: minMinSetting } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'warning_min_minutes')
          .maybeSingle();
        if (minMinSetting && minMinSetting.value) {
          minMinutes = parseFloat(minMinSetting.value) || 60;
        }
      } catch (e) {}

      const { data: log } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('employee_id', req.user!.id)
        .eq('date', today)
        .maybeSingle();

      if (log) {
        const totalMinutes = log.active_minutes + log.idle_minutes;
        if (totalMinutes >= minMinutes && log.productivity_percentage <= 50 && !log.warning_email_sent) {
          const emailSuccess = await sendWarningEmail(req.user, log.productivity_percentage);
          if (emailSuccess) {
            await supabase
              .from('activity_logs')
              .update({ warning_email_sent: true })
              .eq('id', log.id);
          }
        }
      }
    } catch (emailErr) {
      console.error('Failed to check/send checkout low productivity email:', emailErr.message);
    }

    // Trigger report reminder
    await sendNotification(req.user!.id, 'Remember to submit your Daily Work Report before logging off.', 'report');

    res.json({ message: 'Checked out successfully.', attendance: formatAttendance(updatedAtt) });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/break/start', authenticate, async (req: Request, res: Response) => {
  const { breakType, note } = req.body;
  const today = new Date().toISOString().split('T')[0];
  try {
    const { data: atts, error: fetchErr } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', req.user!.id)
      .is('check_out_time', null)
      .order('check_in_time', { ascending: false })
      .limit(1);
      
    const att = atts && atts.length > 0 ? atts[0] : null;

    if (fetchErr || !att) {
      return res.status(400).json({ message: 'You must check in before taking a break.' });
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
      ? `${req.user!.name} went on a ${breakType} break. Note: "${note}"`
      : `${req.user!.name} went on a ${breakType} break.`;
      
    if (managers) {
      for (let mgr of managers) {
        await sendNotification(mgr.id, notifMsg, 'break');
      }
    }

    res.json({ message: `Started ${breakType} break.`, attendance: formatAttendance(updatedAtt) });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/break/end', authenticate, async (req: Request, res: Response) => {
  const today = new Date().toISOString().split('T')[0];
  try {
    const { data: atts, error: fetchErr } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', req.user!.id)
      .is('check_out_time', null)
      .order('check_in_time', { ascending: false })
      .limit(1);
      
    const att = atts && atts.length > 0 ? atts[0] : null;

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
        await sendNotification(mgr.id, `${req.user!.name} returned from their break.`, 'break');
      }
    }

    res.json({ message: 'Break ended. Resumed work shift.', attendance: formatAttendance(updatedAtt) });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/break/retroactive', authenticate, async (req: Request, res: Response) => {
  const { breakType, durationMinutes } = req.body;
  const today = new Date().toISOString().split('T')[0];
  try {
    const { data: atts, error: fetchErr } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', req.user!.id)
      .is('check_out_time', null)
      .order('check_in_time', { ascending: false })
      .limit(1);
      
    const att = atts && atts.length > 0 ? atts[0] : null;

    if (fetchErr || !att) {
      return res.status(400).json({ message: 'Attendance record not found.' });
    }

    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - durationMinutes * 60 * 1000);

    const newBreaks = [...(att.breaks || [])];
    newBreaks.push({
      breakType,
      note: 'Auto-recorded from Inactivity Prompt',
      startTime,
      endTime,
      durationMinutes
    });

    const { data: updatedAtt, error: updateErr } = await supabase
      .from('attendance')
      .update({
        breaks: newBreaks
      })
      .eq('id', att.id)
      .select('*')
      .single();

    if (updateErr) throw updateErr;

    // Alert Managers
    const { data: managers } = await supabase.from('users').select('id').eq('role', 'Manager');
    if (managers) {
      const notifMsg = `${req.user!.name} logged an idle period of ${durationMinutes} minutes as a "${breakType}" break.`;
      for (let mgr of managers) {
        await sendNotification(mgr.id, notifMsg, 'break');
      }
    }

    res.json({ message: 'Retroactive break logged successfully.', attendance: formatAttendance(updatedAtt) });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/status', authenticate, async (req: Request, res: Response) => {
  const today = new Date().toISOString().split('T')[0];
  try {
    const { data: atts } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', req.user!.id)
      .or(`date.eq.${today},check_out_time.is.null`)
      .order('check_in_time', { ascending: false })
      .limit(1);

    const att = atts && atts.length > 0 ? atts[0] : null;

    res.json({ attendance: formatAttendance(att) });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/history', authenticate, async (req: Request, res: Response) => {
  try {
    const { data: history } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', req.user!.id)
      .order('check_in_time', { ascending: false });

    res.json(formatAttendance(history || []));
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/all', authenticate, authorize(['Manager', 'SuperAdmin']), async (req: Request, res: Response) => {
  const { date, employeeId } = req.query;
  try {
    let builder = supabase.from('attendance').select('*').eq('company_id', req.user!.companyId);
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
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});


export default router;


