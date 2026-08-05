import crypto from 'crypto';

export const toMongo = (obj: any): any => {
  if (!obj) return null;
  if (Array.isArray(obj)) return obj.map(toMongo);
  
  if (obj.created_at) {
    obj.createdAt = obj.created_at;
    delete obj.created_at;
  }
  if (obj.updated_at) {
    obj.updatedAt = obj.updated_at;
    delete obj.updated_at;
  }
  return obj;
};

export const formatAttendance = (att: any): any => {
  if (!att) return null;
  if (Array.isArray(att)) return att.map(formatAttendance);
  return {
    ...toMongo(att)
  };
};

export const formatActivityLog = (log: any): any => {
  if (!log) return null;
  if (Array.isArray(log)) return log.map(formatActivityLog);
  return {
    ...toMongo(log)
  };
};

export const formatTask = (task: any): any => {
  if (!task) return null;
  if (Array.isArray(task)) return task.map(formatTask);
  return {
    ...toMongo(task)
  };
};

export const formatScreenshot = (ss: any): any => {
  if (!ss) return null;
  if (Array.isArray(ss)) return ss.map(formatScreenshot);
  return {
    ...toMongo(ss)
  };
};

export const formatWorkReport = (r: any): any => {
  if (!r) return null;
  if (Array.isArray(r)) return r.map(formatWorkReport);
  const mapped = { ...toMongo(r) };
  if (mapped.tasks_completed) { mapped.tasksCompleted = mapped.tasks_completed; delete mapped.tasks_completed; }
  if (mapped.tasks_in_progress) { mapped.tasksInProgress = mapped.tasks_in_progress; delete mapped.tasks_in_progress; }
  if (mapped.challenges_faced) { mapped.challengesFaced = mapped.challenges_faced; delete mapped.challenges_faced; }
  if (mapped.tomorrow_plan) { mapped.tomorrowPlan = mapped.tomorrow_plan; delete mapped.tomorrow_plan; }
  if (mapped.total_hours_worked !== undefined) { mapped.totalHoursWorked = mapped.total_hours_worked; delete mapped.total_hours_worked; }
  if (mapped.approval_status) { mapped.approvalStatus = mapped.approval_status; delete mapped.approval_status; }
  if (mapped.manager_feedback) { mapped.managerFeedback = mapped.manager_feedback; delete mapped.manager_feedback; }
  return mapped;
};

export const formatNotification = (n: any): any => {
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

export const generateId = () => crypto.randomBytes(12).toString('hex');

import fs from 'fs';
import path from 'path';
import supabase from '../infrastructure/database/supabase';

export const saveBase64Image = async (base64String: string, folder: string, filename: string): Promise<string> => {
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

    const folderName = folder.includes('webcams') ? 'webcams' : 'screenshots';
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
  } catch (err: any) {
    console.error('Base64 image upload error:', err.message);
    
    // Fallback to local saving if Supabase fails
    try {
      const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const filePath = path.join(folder, filename);
      fs.writeFileSync(filePath, buffer);
      return `/uploads/${folder.includes('webcams') ? 'webcams' : 'screenshots'}/${filename}`;
    } catch (fsErr) {
      return '';
    }
  }
};
