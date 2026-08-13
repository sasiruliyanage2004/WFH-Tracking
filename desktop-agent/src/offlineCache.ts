import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import { GlobalState, BACKEND_URL } from './state';

export const getOfflineCacheDir = () => path.join(app.getPath('userData'), 'offline-cache');
export const getOfflineScreenshotsDir = () => path.join(getOfflineCacheDir(), 'screenshots');

export function ensureCacheDirs() {
  const cacheDir = getOfflineCacheDir();
  const ssDir = getOfflineScreenshotsDir();
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  if (!fs.existsSync(ssDir)) {
    fs.mkdirSync(ssDir, { recursive: true });
  }
}

export function appendOfflineLog(filename: string, payload: any) {
  try {
    ensureCacheDirs();
    const filePath = path.join(getOfflineCacheDir(), filename);
    let logs: any[] = [];
    if (fs.existsSync(filePath)) {
      try {
        logs = JSON.parse(fs.readFileSync(filePath, 'utf8')) || [];
      } catch (e: any) {
        logs = [];
      }
    }
    logs.push(payload);
    fs.writeFileSync(filePath, JSON.stringify(logs, null, 2), 'utf8');
    console.log(`Desktop Agent: Cached offline log to ${filename}`);
  } catch (err: any) {
    console.error(`Desktop Agent: Failed to cache offline log to ${filename}:`, err.message);
  }
}

export function cacheOfflineUsageLog(log: any) {
  appendOfflineLog('usage-logs.json', {
    appName: log.appName,
    windowTitle: log.windowTitle,
    type: log.type,
    durationMinutes: log.durationMinutes,
    date: new Date().toISOString().split('T')[0]
  });
}

export function cacheOfflineActivityLog(log: any) {
  appendOfflineLog('activity-logs.json', {
    activeSeconds: log.activeSeconds,
    idleSeconds: log.idleSeconds,
    keyboardCount: log.keyboardCount,
    mouseCount: log.mouseCount,
    date: new Date().toISOString().split('T')[0]
  });
}

export async function flushOfflineCache() {
  if (!GlobalState.sessionToken) return;
  try {
    ensureCacheDirs();
    
    // 1. Flush cached usage logs
    const usagePath = path.join(getOfflineCacheDir(), 'usage-logs.json');
    if (fs.existsSync(usagePath)) {
      let logs: any[] = [];
      try {
        logs = JSON.parse(fs.readFileSync(usagePath, 'utf8')) || [];
      } catch (e: any) {
        logs = [];
      }

      if (logs.length > 0) {
        console.log(`Desktop Agent: Found ${logs.length} cached offline usage logs. Attempting to flush...`);
        const remainingLogs: any[] = [];
        for (const log of logs) {
          try {
            await axios.post(
              `${BACKEND_URL}/api/monitoring/usage-log`,
              log,
              { headers: { Authorization: `Bearer ${GlobalState.sessionToken}` } }
            );
            console.log(`Desktop Agent: Flushed usage log for ${log.appName}`);
          } catch (err: any) {
            console.error(`Failed to flush cached usage log for ${log.appName}:`, err.message);
            remainingLogs.push(log);
          }
        }

        if (remainingLogs.length === 0) {
          fs.unlinkSync(usagePath);
          console.log('Desktop Agent: All cached usage logs successfully flushed.');
        } else {
          fs.writeFileSync(usagePath, JSON.stringify(remainingLogs, null, 2), 'utf8');
        }
      }
    }

    // 2. Flush cached activity logs
    const activityPath = path.join(getOfflineCacheDir(), 'activity-logs.json');
    if (fs.existsSync(activityPath)) {
      let logs: any[] = [];
      try {
        logs = JSON.parse(fs.readFileSync(activityPath, 'utf8')) || [];
      } catch (e: any) {
        logs = [];
      }

      if (logs.length > 0) {
        console.log(`Desktop Agent: Found ${logs.length} cached offline activity logs. Attempting to flush...`);
        const remainingLogs: any[] = [];
        for (const log of logs) {
          try {
            await axios.post(
              `${BACKEND_URL}/api/monitoring/activity`,
              log,
              { headers: { Authorization: `Bearer ${GlobalState.sessionToken}` } }
            );
            console.log(`Desktop Agent: Flushed activity log for date ${log.date}`);
          } catch (err: any) {
            console.error(`Failed to flush cached activity telemetry:`, err.message);
            remainingLogs.push(log);
          }
        }

        if (remainingLogs.length === 0) {
          fs.unlinkSync(activityPath);
          console.log('Desktop Agent: All cached activity logs successfully flushed.');
        } else {
          fs.writeFileSync(activityPath, JSON.stringify(remainingLogs, null, 2), 'utf8');
        }
      }
    }

    // 3. Flush cached screenshots
    const ssDir = getOfflineScreenshotsDir();
    if (fs.existsSync(ssDir)) {
      const files = fs.readdirSync(ssDir);
      const ssFiles = files.filter(f => f.startsWith('screenshot_') && f.endsWith('.json'));
      
      if (ssFiles.length > 0) {
        console.log(`Desktop Agent: Found ${ssFiles.length} cached offline screenshots. Attempting to flush...`);
        for (const file of ssFiles) {
          const filePath = path.join(ssDir, file);
          try {
            const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            await axios.post(
              `${BACKEND_URL}/api/monitoring/screenshot`,
              {
                image: content.image,
                timestamp: content.timestamp
              },
              { headers: { Authorization: `Bearer ${GlobalState.sessionToken}` } }
            );
            fs.unlinkSync(filePath);
            console.log(`Desktop Agent: Flushed offline screenshot file: ${file}`);
          } catch (err: any) {
            console.error(`Failed to flush cached screenshot file ${file}:`, err.message);
          }
        }
      }
    }
  } catch (err: any) {
    console.error('Desktop Agent: Failed to flush offline cache:', err.message);
  }
}
