import { saveBase64Image, toMongo, formatAttendance, formatActivityLog, formatTask, formatScreenshot, formatWorkReport, formatNotification, generateId } from '../../utils/helpers';
import { sendNotification } from '../../infrastructure/services/notification';
import express, { Request, Response } from 'express';
const router = express.Router();
import supabase from '../../infrastructure/database/supabase';
import { authenticate, authorize } from '../middlewares/auth';
import crypto from 'crypto';



// 4. DAILY WORK REPORT ROUTES
router.post('', authenticate, async (req: Request, res: Response) => {
  const { tasksCompleted, tasksInProgress, challengesFaced, tomorrowPlan, totalHoursWorked } = req.body;
  const today = new Date().toISOString().split('T')[0];

  try {
    const { data: existing } = await supabase
      .from('work_reports')
      .select('*')
      .eq('employee_id', req.user!.id)
      .eq('date', today)
      .maybeSingle();

    if (existing) {
      return res.status(400).json({ message: 'You have already submitted a daily report for today.' });
    }

    const { data: report, error } = await supabase
      .from('work_reports')
      .insert([{
        employee_id: req.user!.id,
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
        await sendNotification(mgr.id, `New daily report submitted by ${req.user!.name}`, 'report');
      }
    }

    res.status(201).json({ message: 'Report submitted successfully.', report: formatWorkReport(report) });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get('', authenticate, async (req: Request, res: Response) => {
  try {
    let builder = supabase.from('work_reports').select('*').eq('company_id', req.user!.companyId);
    
    if (req.query.myReportsOnly === 'true' || req.user!.role === 'Employee') {
      builder = builder.eq('employee_id', req.user!.id);
    } else if (req.user!.role === 'Manager') {
      const { data: deptEmps } = await supabase
        .from('users')
        .select('id')
        .eq('department', req.user!.department)
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
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/api/reports/:id/approve', authenticate, authorize(['Manager', 'SuperAdmin']), async (req: Request, res: Response) => {
  const { status, managerFeedback } = req.body;
  try {
    const { data: report, error: fetchErr } = await supabase
      .from('work_reports')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (fetchErr || !report) return res.status(404).json({ message: 'Report not found' });

    // Department isolation check for Manager
    if (req.user!.role === 'Manager') {
      const { data: employeeUser } = await supabase
        .from('users')
        .select('department')
        .eq('id', report.employee_id)
        .single();
      
      if (employeeUser && employeeUser.department !== req.user!.department) {
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
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});


export default router;

