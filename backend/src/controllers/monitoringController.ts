// @ts-nocheck
import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import supabase from '../../infrastructure/database/supabase';
import { saveBase64Image, toMongo, formatAttendance, formatActivityLog, formatScreenshot } from '../../utils/helpers';
import { sendNotification } from '../../infrastructure/services/notification';
import { sendWarningEmail, sendSuspiciousActivityEmail } from '../../infrastructure/services/email';

// In-memory cache for rolling 1-hour activity details to prevent warning email spam
const rollingActivityCache: any = {};
const suspiciousAlertCache: any = {};

async function checkRollingWarning(employee, activeSeconds, idleSeconds, minMinutesSetting) {
  const employeeId = employee.id;
  const now = Date.now();

  if (!rollingActivityCache[employeeId]) {
    rollingActivityCache[employeeId] = {
      logs: [],
      lastWarningSentAt: 0
    };
  }

  const cache = rollingActivityCache[employeeId];

  // 1. Add current activity chunk
  const oneHourAgo = now - (60 * 60 * 1000);

  cache.logs.push({ activeSeconds, idleSeconds, timestamp: now });
  cache.logs = cache.logs.filter(log => log.timestamp >= oneHourAgo);

  let totalActive = 0;
  let totalIdle = 0;
  for (const log of cache.logs) {
    totalActive += log.activeSeconds;
    totalIdle += log.idleSeconds;
  }

  const totalSeconds = totalActive + totalIdle;
  const totalMinutes = totalSeconds / 60;
  const productivityPercentage = totalSeconds > 0 ? Math.round((totalActive / totalSeconds) * 100) : 100;

  const minMinutesForRolling = Math.min(10, minMinutesSetting || 60);
  const cooldownPeriod = 60 * 60 * 1000; // 1 hour
  const hasMinData = totalMinutes >= minMinutesForRolling;
  const isBelowThreshold = productivityPercentage <= 50;
  const isCooldownOver = (now - cache.lastWarningSentAt) >= cooldownPeriod;

  if (hasMinData && isBelowThreshold && isCooldownOver) {
    // Await email warning asynchronously
    const emailSuccess = await sendWarningEmail(employee, productivityPercentage);
    if (emailSuccess) {
      cache.lastWarningSentAt = now;
      return { send: true, productivityPercentage };
    }
  }

  return { send: false, productivityPercentage };
}

export const logScreenshot = async (req: Request, res: Response) => {
  const { image, timestamp } = req.body;
  if (!image) return res.status(400).json({ message: 'No image uploaded' });

  try {
    const timeVal = timestamp || Date.now();
    const filename = `screenshot_${req.user!.id}_${timeVal}.jpg`;
    const screenshotUrl = await saveBase64Image(image, 'screenshots', filename);

    if (!screenshotUrl) {
      return res.status(400).json({ message: 'Failed to process image data: image is empty or invalid' });
    }

    const { data: ssRecord, error } = await supabase
      .from('screenshots')
      .insert([{
        employee_id: req.user!.id,
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
      .eq('employee_id', req.user!.id)
      .eq('date', today)
      .maybeSingle();

    let deletedCount = 0;
    let autoDeleted = false;

    if (log && log.productivity_percentage >= 50) {
      autoDeleted = true;
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      const { data: oldScreenshots } = await supabase
        .from('screenshots')
        .select('*')
        .eq('employee_id', req.user!.id)
        .lt('timestamp', oneHourAgo);

      if (oldScreenshots && oldScreenshots.length > 0) {
        for (let ss of oldScreenshots) {
          if (ss.screenshot_url.startsWith('/uploads/')) {
            const absolutePath = path.join(__dirname, '..', '..', ss.screenshot_url);
            if (fs.existsSync(absolutePath)) {
              try {
                fs.unlinkSync(absolutePath);
              } catch (err: any) {
                console.error('Failed to delete physical screenshot file:', err.message);
              }
            }
          } else if (ss.screenshot_url.includes('supabase.co/storage')) {
            const pathParts = ss.screenshot_url.split('/wfh-tracking/');
            if (pathParts.length > 1) {
              const storagePath = pathParts[1];
              try {
                await supabase.storage
                  .from('wfh-tracking')
                  .remove([storagePath]);
              } catch (err: any) {
                console.error('Failed to delete Supabase storage file:', err.message);
              }
            }
          }
        }

        const { error: delErr, count } = await supabase
          .from('screenshots')
          .delete({ count: 'exact' })
          .eq('employee_id', req.user!.id)
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
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getScreenshots = async (req: Request, res: Response) => {
  try {
    // Department isolation check for Manager
    if (req.user!.role === 'Manager') {
      const { data: targetUser } = await supabase
        .from('users')
        .select('department')
        .eq('id', req.params.employeeId)
        .single();
      
      if (targetUser && targetUser.department !== req.user!.department) {
        return res.status(403).json({ message: 'Access denied. You can only view screenshots for employees in your department.' });
      }
    }

    const { date } = req.query;
    let query = supabase
      .from('screenshots')
      .select('*')
      .eq('employee_id', req.params.employeeId);

    if (date) {
      const startOfDay = `${date}T00:00:00.000Z`;
      const endOfDay = `${date}T23:59:59.999Z`;
      query = query.gte('timestamp', startOfDay).lte('timestamp', endOfDay).order('timestamp', { ascending: true });
    } else {
      query = query.order('timestamp', { ascending: false }).limit(100);
    }

    const { data: list, error } = await query;

    if (error) throw error;
    res.json(formatScreenshot(list));
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteBulkScreenshots = async (req: Request, res: Response) => {
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
          const absolutePath = path.join(__dirname, '..', '..', ss.screenshot_url);
          if (fs.existsSync(absolutePath)) {
            try {
              fs.unlinkSync(absolutePath);
            } catch (err: any) {
              console.error('Failed to delete physical screenshot file:', err.message);
            }
          }
        } else if (ss.screenshot_url.includes('supabase.co/storage')) {
          const pathParts = ss.screenshot_url.split('/wfh-tracking/');
          if (pathParts.length > 1) {
            const storagePath = pathParts[1];
            try {
              await supabase.storage
                .from('wfh-tracking')
                .remove([storagePath]);
            } catch (err: any) {
              console.error('Failed to delete Supabase storage file:', err.message);
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
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const logActivity = async (req: Request, res: Response) => {
  const { activeSeconds, idleSeconds, keyboardCount, mouseCount, date, suspicious } = req.body;
  const today = date || new Date().toISOString().split('T')[0];

  if (suspicious) {
    const now = Date.now();
    const lastSent = suspiciousAlertCache[req.user!.id] || 0;
    // Rate limit to once per hour
    if (now - lastSent > 60 * 60 * 1000) {
      suspiciousAlertCache[req.user!.id] = now;
      
      // Async alert managers
      (async () => {
        try {
          const { data: managers } = await supabase
            .from('users')
            .select('email, id')
            .eq('role', 'Manager');
            
          if (managers) {
            for (const mgr of managers) {
              await sendNotification(mgr.id, `${req.user!.name} has exhibited suspicious mouse activity (Anti-Cheat).`, 'warning');
              await sendSuspiciousActivityEmail(req.user!.name, mgr.email, req.user!.companyId);
            }
          }
        } catch (err) {
          console.error('Failed to send suspicious alert:', err);
        }
      })();
    }
  }

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

  try {
    const { data: log, error: fetchErr } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('employee_id', req.user!.id)
      .eq('date', today)
      .maybeSingle();

    let updatedLog;
    const rollingWarning = await checkRollingWarning(req.user, activeSeconds, idleSeconds, minMinutes);

    if (log) {
      // Calculate minutes and percentages
      const activeMinutes = log.active_minutes + (activeSeconds / 60);
      const idleMinutes = log.idle_minutes + (idleSeconds / 60);
      const totalMinutes = activeMinutes + idleMinutes;
      const productivityPercentage = totalMinutes > 0 ? Math.round((activeMinutes / totalMinutes) * 100) : 100;
      
      let warningEmailSent = log.warning_email_sent || rollingWarning.send;

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

      let warningEmailSent = rollingWarning.send;

      const { data, error } = await supabase
        .from('activity_logs')
        .insert([{
          employee_id: req.user!.id,
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
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getMyActivity = async (req: Request, res: Response) => {
  const today = new Date().toISOString().split('T')[0];
  try {
    const { data: log } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('employee_id', req.user!.id)
      .eq('date', today)
      .maybeSingle();

    res.json(formatActivityLog(log) || { activeMinutes: 0, idleMinutes: 0, keyboardCount: 0, mouseCount: 0, productivityPercentage: 100 });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getActivity = async (req: Request, res: Response) => {
  try {
    // Department isolation check for Manager
    if (req.user!.role === 'Manager') {
      const { data: targetUser } = await supabase
        .from('users')
        .select('department')
        .eq('id', req.params.employeeId)
        .single();
      
      if (targetUser && targetUser.department !== req.user!.department) {
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
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const registerDevice = async (req: Request, res: Response) => {
  const { machine_id, hostname } = req.body;
  if (!machine_id) return res.status(400).json({ message: 'Machine ID is required' });

  try {
    const { error } = await supabase
      .from('devices')
      .upsert({
        machine_id,
        employee_id: req.user!.id,
        company_id: req.user!.companyId,
        hostname,
        last_active: new Date().toISOString()
      }, { onConflict: 'machine_id' });

    if (error) throw error;
    res.json({ message: 'Device registered successfully' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getDeviceCount = async (req: Request, res: Response) => {
  try {
    const { count, error } = await supabase
      .from('devices')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', req.user!.companyId);

    if (error) throw error;
    res.json({ count: count || 0 });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const logUsage = async (req: Request, res: Response) => {
  const { appName, windowTitle, type, durationMinutes, date } = req.body;
  const today = date || new Date().toISOString().split('T')[0];

  if (!appName || !type || typeof durationMinutes !== 'number') {
    return res.status(400).json({ message: 'Invalid usage payload' });
  }

  try {
    // Dynamically classify Productivity based on Company Settings
    let finalType = type; // fallback to agent's classification
    if (req.user!.companyId) {
      const { data: companyData } = await supabase
        .from('companies')
        .select('productive_apps, unproductive_apps')
        .eq('id', req.user!.companyId)
        .maybeSingle();

      if (companyData) {
        const prodApps = companyData.productive_apps || [];
        const unprodApps = companyData.unproductive_apps || [];
        
        const appLower = appName.toLowerCase();
        const titleLower = (windowTitle || '').toLowerCase();

        const isUnproductive = unprodApps.some(app => appLower.includes(app.toLowerCase()) || titleLower.includes(app.toLowerCase()));
        const isProductive = prodApps.some(app => appLower.includes(app.toLowerCase()) || titleLower.includes(app.toLowerCase()));

        if (isUnproductive) {
          finalType = 'Unproductive';
        } else if (isProductive) {
          finalType = 'Productive';
        } else {
          finalType = 'Neutral';
        }
      }
    }

    const { data: existingRecord, error: selectError } = await supabase
      .from('app_usage')
      .select('*')
      .eq('employee_id', req.user!.id.toString())
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
          employee_id: req.user!.id.toString(),
          date: today,
          app_name: appName,
          window_title: windowTitle || '',
          type: finalType,
          duration_minutes: durationMinutes
        }]);

      if (insertError) throw insertError;
    }

    res.json({ success: true, message: 'Usage logged successfully.' });
  } catch (err: any) {
    console.error('Supabase DB Error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

export const getUsage = async (req: Request, res: Response) => {
  const { date } = req.query;

  try {
    // Department isolation check for Manager
    if (req.user!.role === 'Manager') {
      const { data: targetUser } = await supabase
        .from('users')
        .select('department')
        .eq('id', req.params.employeeId)
        .single();
      
      if (targetUser && targetUser.department !== req.user!.department) {
        return res.status(403).json({ message: 'Access denied. You can only view usage for employees in your department.' });
      }
    }

    let targetDate = date;
    if (!targetDate) {
      // Find the most recent date with usage data
      const { data: latestLog } = await supabase
        .from('app_usage')
        .select('date')
        .eq('employee_id', req.params.employeeId)
        .order('date', { ascending: false })
        .limit(1);
      
      if (latestLog && latestLog.length > 0) {
        targetDate = latestLog[0].date;
      } else {
        targetDate = new Date().toISOString().split('T')[0];
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
  } catch (err: any) {
    console.error('Supabase Fetch Error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

export const getLeaderboard = async (req: Request, res: Response) => {
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
      .eq('role', 'Employee')
      .eq('company_id', req.user!.companyId);
      
    if (req.user!.role === 'Manager') {
      userQuery = userQuery.eq('department', req.user!.department);
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
  } catch (err: any) {
    console.error('Leaderboard Fetch Error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

export const getSummary = async (req: Request, res: Response) => {
  const today = new Date().toISOString().split('T')[0];
  const isManager = req.user!.role === 'Manager';
  const dept = req.user!.department;
  
  try {
    let employeeIds = [];
    if (isManager) {
      const { data: deptEmps } = await supabase
        .from('users')
        .select('id')
        .eq('department', dept)
        .eq('company_id', req.user!.companyId)
        .eq('role', 'Employee');
      employeeIds = deptEmps ? deptEmps.map(u => u.id) : [];
    }

    let employeesQuery = supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', req.user!.companyId)
      .eq('role', 'Employee');
      
    if (isManager) {
      employeesQuery = employeesQuery.eq('department', dept);
    }
    const { count: totalEmployees } = await employeesQuery;

    let checkinsQuery = supabase
      .from('attendance')
      .select('*')
      .eq('company_id', req.user!.companyId)
      .or(`date.eq.${today},check_out_time.is.null`);
      
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
      // Keep only the latest check-in record per employee to prevent duplicates on the dashboard
      const latestMap = new Map();
      for (const c of checkinsToday) {
        const existing = latestMap.get(c.employee_id);
        if (!existing || new Date(c.check_in_time) > new Date(existing.check_in_time)) {
          latestMap.set(c.employee_id, c);
        }
      }
      const uniqueCheckinsToday = Array.from(latestMap.values());
      const userIds = [...new Set(uniqueCheckinsToday.map(c => c.employee_id))];
      const { data: users } = await supabase.from('users').select('id, name, email, department').in('id', userIds);
      const userMap = new Map(users ? users.map(u => [u.id, u]) : []);

      onlineEmployees = uniqueCheckinsToday.filter(c => !c.check_out_time).length;

      enrichedCheckins = uniqueCheckinsToday.map(c => ({
        ...formatAttendance(c),
        employee: toMongo(userMap.get(c.employee_id))
      }));
    }

    let reportsQuery = supabase
      .from('work_reports')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', req.user!.companyId)
      .eq('approval_status', 'Pending');
      
    if (isManager) {
      reportsQuery = reportsQuery.in('employee_id', employeeIds);
    }
    const { count: pendingReportsCount } = await reportsQuery;

    let activityQuery = supabase
      .from('activity_logs')
      .select('*')
      .eq('company_id', req.user!.companyId)
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
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
