import { saveBase64Image, toMongo, formatAttendance, formatActivityLog, formatTask, formatScreenshot, formatWorkReport, formatNotification, generateId } from '../../utils/helpers';
import { sendNotification } from '../../infrastructure/services/notification';
import express, { Request, Response } from 'express';
const router = express.Router();
import supabase from '../../infrastructure/database/supabase';
import { authenticate, authorize } from '../middlewares/auth';
import crypto from 'crypto';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = './uploads/attachments';
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



// 3. TASK ROUTES
router.get('', authenticate, async (req: Request, res: Response) => {
  try {
    let builder = supabase.from('tasks').select('*').eq('company_id', req.user!.companyId);
    
    if (req.query.myTasksOnly === 'true' || req.user!.role === 'Employee') {
      builder = builder.eq('assigned_to', req.user!.id);
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
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('', authenticate, async (req: Request, res: Response) => {
  const { taskName, description, dueDate, priority, progress, status, assignedTo } = req.body;
  try {
    const targetUserId = (req.user!.role === 'Manager' || req.user!.role === 'SuperAdmin') ? (assignedTo || req.user!.id) : req.user!.id;

    // Check if Manager tries to assign task to employee of a different department
    if (req.user!.role === 'Manager' && targetUserId !== req.user!.id.toString()) {
      const { data: targetUser } = await supabase
        .from('users')
        .select('department')
        .eq('id', targetUserId)
        .single();
      
      if (targetUser && targetUser.department !== req.user!.department) {
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
        assigned_by: req.user!.id,
        company_id: req.user!.companyId
      }])
      .select('*')
      .single();

    if (error) throw error;

    if ((req.user!.role === 'Manager' || req.user!.role === 'SuperAdmin') && targetUserId !== req.user!.id.toString()) {
      await sendNotification(targetUserId, `Manager assigned you a new task: "${taskName}"`, 'task');
    }

    res.status(201).json(formatTask(task));
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', authenticate, async (req: Request, res: Response) => {
  const { taskName, description, progress, priority, status, dueDate } = req.body;
  try {
    const { data: task, error: fetchErr } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (fetchErr || !task) return res.status(404).json({ message: 'Task not found' });

    // Permissions check
    if (req.user!.role !== 'Manager' && req.user!.role !== 'SuperAdmin' && task.assigned_to.toString() !== req.user!.id.toString()) {
      return res.status(403).json({ message: 'Unauthorized task modification.' });
    }

    // Department isolation check for Manager
    if (req.user!.role === 'Manager') {
      const { data: targetUser } = await supabase
        .from('users')
        .select('department')
        .eq('id', task.assigned_to)
        .single();
      
      if (targetUser && targetUser.department !== req.user!.department) {
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
    } else if (updates.status === 'Completed') {
      updates.progress = 100;
    } else if (updates.status === 'Pending') {
      updates.progress = 0;
    }

    const { data: updatedTask, error: updateErr } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (updateErr) throw updateErr;

    // Alert manager if completed by employee
    if (req.user!.role === 'Employee' && updatedTask.status === 'Completed') {
      const { data: managers } = await supabase.from('users').select('id').in('role', ['Manager', 'SuperAdmin']);
      if (managers) {
        for (let mgr of managers) {
          await sendNotification(mgr.id, `${req.user!.name} has completed the task: "${updatedTask.task_name}"`, 'task');
        }
      }
    }

    res.json(formatTask(updatedTask));
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', authenticate, authorize(['Manager', 'SuperAdmin']), async (req: Request, res: Response) => {
  try {
    const { data: task, error: fetchErr } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (fetchErr || !task) return res.status(404).json({ message: 'Task not found' });

    // Department isolation check for Manager
    if (req.user!.role === 'Manager') {
      const { data: targetUser } = await supabase
        .from('users')
        .select('department')
        .eq('id', task.assigned_to)
        .single();
      
      if (targetUser && targetUser.department !== req.user!.department) {
        return res.status(403).json({ message: 'Access denied. You cannot delete tasks of employees in other departments.' });
      }
    }

    const { error: deleteErr } = await supabase
      .from('tasks')
      .delete()
      .eq('id', req.params.id);

    if (deleteErr) throw deleteErr;

    res.json({ message: 'Task deleted successfully.' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/submit', authenticate, uploadAttachment.array('files', 10), async (req: Request, res: Response) => {
  try {
    const { data: task, error: fetchErr } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (fetchErr || !task) return res.status(404).json({ message: 'Task not found' });

    // Enforce permission: only assigned employee or manager/admin can submit proof
    if (task.assigned_to.toString() !== req.user!.id.toString() && req.user!.role !== 'Manager' && req.user!.role !== 'SuperAdmin') {
      return res.status(403).json({ message: 'Unauthorized to submit proof for this task.' });
    }

    let proofLinks = [];
    if (req.body.proofLinks) {
      try {
        proofLinks = JSON.parse(req.body.proofLinks);
      } catch (e) {
        if (typeof req.body.proofLinks === 'string') {
          proofLinks = req.body.proofLinks.split(',').map(s => s.trim()).filter(Boolean);
        } else if (Array.isArray(req.body.proofLinks)) {
          proofLinks = req.body.proofLinks;
        }
      }
    }

    const proofFiles = [];
    if (req.files && ((req.files as any[]).length) > 0) {
      for (const file of req.files as any[]) {
        try {
          const fileBuffer = fs.readFileSync(file.path);
          const cleanName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
          const filename = `attachment_${Date.now()}_${cleanName}`;
          
          const { data, error: uploadErr } = await supabase.storage
            .from('wfh-tracking')
            .upload(`attachments/${filename}`, fileBuffer, {
              contentType: file.mimetype,
              upsert: true
            });
            
          if (uploadErr) throw uploadErr;
          
          const { data: publicUrlData } = supabase.storage
            .from('wfh-tracking')
            .getPublicUrl(`attachments/${filename}`);
            
          proofFiles.push(publicUrlData.publicUrl);
          
          // Clean up local temp file from multer diskStorage
          try {
            fs.unlinkSync(file.path);
          } catch (unlinkErr) {
            console.error('Failed to clean up temp task upload:', unlinkErr.message);
          }
        } catch (uploadFailErr) {
          console.error('Failed uploading attachment to Supabase:', uploadFailErr.message);
          // Fallback to local
          proofFiles.push(`/uploads/attachments/${file.filename}`);
        }
      }
    }

    let currentComments = Array.isArray(task.comments) ? task.comments : [];
    if (req.body.comment && req.body.comment.trim()) {
      const initialComment = {
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
        userId: req.user!.id,
        userName: req.user!.name,
        userRole: req.user!.role,
        text: req.body.comment.trim(),
        createdAt: new Date().toISOString()
      };
      currentComments.push(initialComment);
    }

    const finalProofLinks = proofLinks;
    const finalProofFiles = [...(Array.isArray(task.proof_files) ? task.proof_files : []), ...proofFiles];

    const updates = {
      status: 'Completed',
      progress: 100,
      submitted_at: new Date().toISOString(),
      proof_links: finalProofLinks,
      proof_files: finalProofFiles,
      comments: currentComments
    };

    const { data: updatedTask, error: updateErr } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (updateErr) throw updateErr;

    // Send notifications to manager or admins
    const managerId = task.assigned_by;
    if (managerId && managerId.toString() !== req.user!.id.toString()) {
      await sendNotification(managerId, `${req.user!.name} has submitted proof of work for task: "${task.task_name}"`, 'task');
    } else {
      const { data: managers } = await supabase.from('users').select('id').in('role', ['Manager', 'SuperAdmin']);
      if (managers) {
        for (let mgr of managers) {
          if (mgr.id.toString() !== req.user!.id.toString()) {
            await sendNotification(mgr.id, `${req.user!.name} has submitted proof of work for task: "${task.task_name}"`, 'task');
          }
        }
      }
    }

    res.json(formatTask(updatedTask));
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/comments', authenticate, async (req: Request, res: Response) => {
  const { text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ message: 'Comment text is required.' });
  }

  try {
    const { data: task, error: fetchErr } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (fetchErr || !task) return res.status(404).json({ message: 'Task not found' });

    // Check permissions: assigned user, manager of same dept, or superadmin
    const isAssigned = task.assigned_to.toString() === req.user!.id.toString();
    const isSuperAdmin = req.user!.role === 'SuperAdmin';
    let isManagerOfDept = false;

    if (req.user!.role === 'Manager') {
      const { data: targetUser } = await supabase
        .from('users')
        .select('department')
        .eq('id', task.assigned_to)
        .single();
      
      if (targetUser && targetUser.department === req.user!.department) {
        isManagerOfDept = true;
      }
    }

    if (!isAssigned && !isSuperAdmin && !isManagerOfDept) {
      return res.status(403).json({ message: 'Unauthorized to add comments to this task.' });
    }

    const newComment = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
      userId: req.user!.id,
      userName: req.user!.name,
      userRole: req.user!.role,
      text: text.trim(),
      createdAt: new Date().toISOString()
    };

    let currentComments = Array.isArray(task.comments) ? task.comments : [];
    currentComments.push(newComment);

    const { data: updatedTask, error: updateErr } = await supabase
      .from('tasks')
      .update({ comments: currentComments })
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (updateErr) throw updateErr;

    // Notify appropriate party
    if (req.user!.id.toString() === task.assigned_to.toString()) {
      // Notify the manager/assigner
      const managerId = task.assigned_by;
      if (managerId && managerId.toString() !== req.user!.id.toString()) {
        await sendNotification(managerId, `${req.user!.name} commented on task: "${task.task_name}"`, 'task');
      }
    } else {
      // Manager/Admin commented, notify the employee
      const employeeId = task.assigned_to;
      if (employeeId && employeeId.toString() !== req.user!.id.toString()) {
        await sendNotification(employeeId, `${req.user!.name} commented on task: "${task.task_name}"`, 'task');
      }
    }

    res.json(formatTask(updatedTask));
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});


export default router;

