import { ipcMain, desktopCapturer, Notification, powerMonitor } from 'electron';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { machineIdSync } from 'node-machine-id';
import { GlobalState } from './state';
import { startTracking, stopTracking } from './tracker';
import { ensureCacheDirs, getOfflineScreenshotsDir } from './offlineCache';

export function setupIpcHandlers() {
  ipcMain.on('notification:show', (event, { title, body }) => {
    if (Notification.isSupported()) {
      new Notification({ title, body, icon: path.join(__dirname, '../../win-icon.ico') }).show();
    }
  });

  ipcMain.handle('screen:capture', async () => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1280, height: 720 }
      });
      if (sources.length > 0) {
        return sources.map(source => source.thumbnail.toDataURL());
      }
    } catch (err: any) {
      console.error('Native screen capture failed:', err.message);
    }
    return null;
  });

  ipcMain.handle('device:info', async () => {
    try {
      const id = machineIdSync();
      const hostname = os.hostname();
      const platform = os.platform();
      return { machineId: id, hostname, os: platform };
    } catch (err: any) {
      console.error('Failed to get device info:', err);
      return null;
    }
  });

  ipcMain.on('screenshot:cache', (event, { image }) => {
    try {
      ensureCacheDirs();
      const timestamp = Date.now();
      const filePath = path.join(getOfflineScreenshotsDir(), `screenshot_${timestamp}.json`);
      const payload = { image, timestamp };
      fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
      console.log(`Desktop Agent: Cached screenshot offline: screenshot_${timestamp}.json`);
    } catch (err: any) {
      console.error('Desktop Agent: Failed to cache screenshot offline:', err.message);
    }
  });

  ipcMain.on('tracking:toggle', (event, { active, token }) => {
    if (active && token) {
      GlobalState.sessionToken = token;
      startTracking();
    } else {
      stopTracking();
    }
  });

  ipcMain.on('break:status', (event, { isOnBreak }) => {
    if (isOnBreak) {
      if (!GlobalState.breakInterval) {
        GlobalState.activeMinutesOnBreak = 0;
        GlobalState.breakInterval = setInterval(() => {
          const idleTime = powerMonitor.getSystemIdleTime();
          if (idleTime < 60) {
            GlobalState.activeMinutesOnBreak += 1;
          }
          
          if (GlobalState.activeMinutesOnBreak >= 15) {
            if (Notification.isSupported()) {
              const notif = new Notification({
                title: 'WFH Tracker',
                body: 'You have been active for 15 minutes while on break! Did you forget to end your break?'
              });
              notif.on('click', () => {
                if (GlobalState.mainWindow) {
                  if (GlobalState.mainWindow.isMinimized()) GlobalState.mainWindow.restore();
                  GlobalState.mainWindow.show();
                  GlobalState.mainWindow.focus();
                }
              });
              notif.show();
            }
            GlobalState.activeMinutesOnBreak = 0;
          }
        }, 60000);
      }
    } else {
      if (GlobalState.breakInterval) {
        clearInterval(GlobalState.breakInterval);
        GlobalState.breakInterval = null;
      }
      GlobalState.activeMinutesOnBreak = 0;
    }
  });

  ipcMain.on('window:minimize', () => {
    if (GlobalState.mainWindow) GlobalState.mainWindow.minimize();
  });

  ipcMain.on('window:maximize', () => {
    if (GlobalState.mainWindow) {
      if (GlobalState.mainWindow.isMaximized()) {
        GlobalState.mainWindow.unmaximize();
      } else {
        GlobalState.mainWindow.maximize();
      }
    }
  });

  ipcMain.on('window:close', () => {
    if (GlobalState.mainWindow) GlobalState.mainWindow.hide();
  });
}
