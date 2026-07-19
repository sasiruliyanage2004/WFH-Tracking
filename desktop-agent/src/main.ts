process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
import { app, BrowserWindow, ipcMain, desktopCapturer, Menu, session, powerMonitor, Notification, Tray, powerSaveBlocker } from 'electron';
import path from 'path';
import { autoUpdater } from 'electron-updater';
import * as url from 'url';
import { exec, spawn } from 'child_process';
import axios from 'axios';
import fs from 'fs';
import os from 'os';
import * as crypto from 'crypto';
// active-win was removed

// Local persistent cache configuration
const getOfflineCacheDir = () => path.join(app.getPath('userData'), 'offline-cache');
const getOfflineScreenshotsDir = () => path.join(getOfflineCacheDir(), 'screenshots');

function ensureCacheDirs() {
  const cacheDir = getOfflineCacheDir();
  const ssDir = getOfflineScreenshotsDir();
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  if (!fs.existsSync(ssDir)) {
    fs.mkdirSync(ssDir, { recursive: true });
  }
}

function appendOfflineLog(filename, payload) {
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

function cacheOfflineUsageLog(log) {
  appendOfflineLog('usage-logs.json', {
    appName: log.appName,
    windowTitle: log.windowTitle,
    type: log.type,
    durationMinutes: log.durationMinutes,
    date: new Date().toISOString().split('T')[0]
  });
}

function cacheOfflineActivityLog(log) {
  appendOfflineLog('activity-logs.json', {
    activeSeconds: log.activeSeconds,
    idleSeconds: log.idleSeconds,
    keyboardCount: log.keyboardCount,
    mouseCount: log.mouseCount,
    date: new Date().toISOString().split('T')[0]
  });
}

async function flushOfflineCache() {
  if (!sessionToken) return;
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
              { headers: { Authorization: `Bearer ${sessionToken}` } }
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
              { headers: { Authorization: `Bearer ${sessionToken}` } }
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
              { headers: { Authorization: `Bearer ${sessionToken}` } }
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

const BACKEND_URL = process.env.REACT_APP_API_URL || 'https://wfh-tracking.onrender.com';
const isDev = !app.isPackaged;
const FRONTEND_URL = process.env.FRONTEND_URL || (isDev ? 'http://localhost:3000' : `file://${path.join(__dirname, '../react-build/index.html')}`);

let mainWindow: BrowserWindow | null = null;
let sessionToken: string | null = null;
let tray: Tray | null = null;

let trackingInterval: NodeJS.Timeout | null = null;
let trackingActive: boolean = false;
let sleepBlockerId: number | null = null;
let totalTrackedSeconds = 0;
let usageBuffer = {};
let tickCount = 0;

// Global input hook telemetry variables
let activityProcess: any = null;
let localKeyboardCount: number = 0;
let localMouseCount = 0;
let activeSecondsInTick = 0;
let idleSecondsInTick = 0;
let isSuspiciousTick = false;
let lastInputTime = Date.now();

let splashWindow: BrowserWindow | null = null;
let currentActiveAppType: string = 'Neutral';

// Idle Break detection variables
let wasIdleBefore: boolean = false;
let maxIdleTimeSecs: number = 0;
let idleCheckInterval: NodeJS.Timeout | null = null;

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 450,
    height: 320,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    icon: path.join(__dirname, '../win-icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  splashWindow.loadFile(path.join(__dirname, '../splash.html'));

  splashWindow.on('closed', () => {
    splashWindow = null;
  });
}

function createWindow(isHiddenStartup: boolean = false) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    // Native title bar restored
    show: false,  // Hide while loading
    icon: path.join(__dirname, '../win-icon.ico'),
    backgroundColor: '#070b14', // Premium dark background
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow?.removeMenu();

  // Intercept input for reload (Ctrl+R) and DevTools (Ctrl+Shift+I)
  mainWindow?.webContents.on('before-input-event', (event, input) => {
    if (input.control && input.key.toLowerCase() === 'r') {
      mainWindow?.webContents.session.clearCache().then(() => {
        mainWindow?.reload();
      });
      event.preventDefault();
    }
    if (input.control && input.shift && input.key.toLowerCase() === 'i') {
      mainWindow?.webContents.openDevTools();
      event.preventDefault();
    }
  });

  // Log all console messages from the renderer process
  mainWindow?.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[RENDERER CONSOLE] [Level ${level}] ${message} (at ${sourceId}:${line})`);
  });

const startUrl = FRONTEND_URL;
  mainWindow?.loadURL(startUrl);

  mainWindow?.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow?.webContents.on('did-finish-load', () => {
    // mainWindow?.webContents.openDevTools();
    // Smooth transition from splash to main window
    setTimeout(() => {
      if (splashWindow) {
        splashWindow.close();
      }
      if (mainWindow && !isHiddenStartup) {
        mainWindow?.show();
        mainWindow?.focus();
      }
    }, 1500); // 1.5 second duration
  });

  // Retry loading React app if the dev server takes time to start
  mainWindow?.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    if (isDev && (validatedURL.includes('localhost:3000') || validatedURL.includes('127.0.0.1:3000'))) {
      console.log('Failed to load React app on port 3000, waiting 2s and retrying...');
      setTimeout(() => {
        if (mainWindow && !mainWindow?.isDestroyed()) {
          mainWindow?.loadURL(startUrl);
        }
      }, 2000);
    }
  });

  mainWindow?.on('close', (event) => {
    if (!(app as any).isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow?.on('closed', () => {
    stopTracking();
    mainWindow = null;
  });

  mainWindow?.on('maximize', () => {
    if (mainWindow && !mainWindow?.isDestroyed()) {
      mainWindow?.webContents.send('window:maximized');
    }
  });

  mainWindow?.on('unmaximize', () => {
    if (mainWindow && !mainWindow?.isDestroyed()) {
      mainWindow?.webContents.send('window:unmaximized');
    }
  });

  startIdleDetection();
}

function startIdleDetection() {
  if (idleCheckInterval) clearInterval(idleCheckInterval);
  
  idleCheckInterval = setInterval(() => {
    try {
      if (!trackingActive) {
        // Reset state if tracking is disabled
        wasIdleBefore = false;
        maxIdleTimeSecs = 0;
        return;
      }

      const idleTimeSecs = powerMonitor.getSystemIdleTime();
      
      if (idleTimeSecs >= 900) {
        if (idleTimeSecs >= 7200) { // 2 hours
          console.log(`Desktop Agent: User idle for >= 2 hours. Auto-checkout triggered.`);
          if (mainWindow && !mainWindow?.isDestroyed()) {
             mainWindow?.webContents.send('idle:auto-checkout');
          }
          wasIdleBefore = false;
          maxIdleTimeSecs = 0;
          stopTracking();
        } else {
          wasIdleBefore = true;
          if (idleTimeSecs > maxIdleTimeSecs) {
            maxIdleTimeSecs = idleTimeSecs;
          }
        }
      } else {
        if (wasIdleBefore) {
          const idleMins = Math.round(maxIdleTimeSecs / 60);
          console.log(`Desktop Agent: User returned after being idle for ${idleMins} minutes. Sending prompt to frontend.`);
          if (mainWindow && !mainWindow?.isDestroyed()) {
            mainWindow?.webContents.send('idle:prompt-break', {
              durationMinutes: idleMins
            });
          }
          wasIdleBefore = false;
          maxIdleTimeSecs = 0;
        }
      }
    } catch (err: any) {
      console.error('Idle detection error:', err.message);
    }
  }, 5000); // Check every 5 seconds
}

app.whenReady().then(() => {
  // Auto Start on OS Boot
  app.setLoginItemSettings({
    openAtLogin: true,
    openAsHidden: true,
    args: ['--hidden']
  });

  const isHiddenStartup = process.argv.includes('--hidden');

  // --- AUTO UPDATER LOGIC ---
  autoUpdater.checkForUpdatesAndNotify();
  
  autoUpdater.on('update-available', () => {
    console.log('Update available.');
  });
  
  autoUpdater.on('update-downloaded', () => {
    console.log('Update downloaded. Quitting and installing...');
    autoUpdater.quitAndInstall();
  });
  
  autoUpdater.on('error', (err) => {
    console.error('Auto-updater error:', err);
  });
  // --------------------------

  // Automatically approve geolocation and media (webcam/mic) permission requests
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    console.log(`[DEBUG] Permission request: ${permission}`);
    if (permission === 'geolocation' || permission === 'media' || permission === 'display-capture') {
      return callback(true);
    }
    callback(false);
  });

  session.defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
    console.log(`[DEBUG] Permission check: ${permission}`);
    if (permission === 'geolocation' || permission === 'media') {
      return true;
    }
    return false;
  });

  Menu.setApplicationMenu(null);
  
  // Set up System Tray
  tray = new Tray(path.join(__dirname, '../win-icon.ico'));
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open WFH Tracker', click: () => mainWindow && mainWindow?.show() },
    { type: 'separator' },
    { label: 'Quit', click: () => {
      (app as any).isQuitting = true;
      app.quit();
    }}
  ]);
  tray.setToolTip('WFH Tracker');
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => {
    if (mainWindow) mainWindow?.show();
  });

  if (!isHiddenStartup) {
    createSplashWindow();
  }
  createWindow(isHiddenStartup);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  ipcMain.on('notification:show', (event, { title, body }) => {
    if (Notification.isSupported()) {
      new Notification({ title, body, icon: path.join(__dirname, '../win-icon.ico') }).show();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

let isCheckingOut = false;
app.on('before-quit', (event) => {
  if (sessionToken && !isCheckingOut) {
    event.preventDefault();
    isCheckingOut = true;
    console.log('App quitting/OS Shutdown detected. Attempting auto check-out...');
    axios.post(`${BACKEND_URL}/api/attendance/checkout`, {}, {
      headers: { Authorization: `Bearer ${sessionToken}` },
      timeout: 3000
    }).then(() => {
      console.log('Auto check-out on shutdown successful.');
    }).catch(err => {
      console.error('Auto check-out failed on shutdown:', err.message);
    }).finally(() => {
      (app as any).isQuitting = true;
      app.quit();
    });
  }
});


// Native Screenshot Capture IPC Handler
ipcMain.handle('screen:capture', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1280, height: 720 }
    });
    if (sources.length > 0) {
      // Return an array of base64 data URLs for all screens
      return sources.map(source => source.thumbnail.toDataURL());
    }
  } catch (err: any) {
    console.error('Native screen capture failed:', err.message);
  }
  return null;
});

// Device Info Handler
import { machineIdSync } from 'node-machine-id';
ipcMain.handle('device:info', async () => {
  try {
    const id = machineIdSync();
    const hostname = os.hostname();
    const platform = os.platform();
    return {
      machineId: id,
      hostname: hostname,
      os: platform
    };
  } catch (err: any) {
    console.error('Failed to get device info:', err);
    return null;
  }
});

// Native Screenshot Cache Handler
ipcMain.on('screenshot:cache', (event, { image }) => {
  try {
    ensureCacheDirs();
    const timestamp = Date.now();
    const filePath = path.join(getOfflineScreenshotsDir(), `screenshot_${timestamp}.json`);
    const payload = {
      image,
      timestamp
    };
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
    console.log(`Desktop Agent: Cached screenshot offline: screenshot_${timestamp}.json`);
  } catch (err: any) {
    console.error('Desktop Agent: Failed to cache screenshot offline:', err.message);
  }
});

// Auto-Tracking control from React frontend
ipcMain.on('tracking:toggle', (event, { active, token }) => {
  if (active && token) {
    sessionToken = token;
    startTracking();
  } else {
    stopTracking();
  }
});

let breakInterval: NodeJS.Timeout | null = null;
let activeMinutesOnBreak: number = 0;

ipcMain.on('break:status', (event, { isOnBreak }) => {
  if (isOnBreak) {
    if (!breakInterval) {
      activeMinutesOnBreak = 0;
      breakInterval = setInterval(() => {
        const idleTime = powerMonitor.getSystemIdleTime();
        if (idleTime < 60) {
          activeMinutesOnBreak += 1;
        }
        
        // Notification threshold is 15 minutes
        if (activeMinutesOnBreak >= 15) {
          if (Notification.isSupported()) {
            const notif = new Notification({
              title: 'WFH Tracker',
              body: 'You have been active for 15 minutes while on break! Did you forget to end your break?'
            });
            notif.on('click', () => {
              if (mainWindow) {
                if (mainWindow?.isMinimized()) mainWindow?.restore();
                mainWindow?.show();
                mainWindow?.focus();
              }
            });
            notif.show();
          }
          // Reset so it alerts again later if they ignore it
          activeMinutesOnBreak = 0;
        }
      }, 60000); // Check every minute
    }
  } else {
    if (breakInterval) {
      clearInterval(breakInterval);
      breakInterval = null;
    }
    activeMinutesOnBreak = 0;
  }
});

// Window control events
ipcMain.on('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window:maximize', () => {
  if (mainWindow) {
    if (mainWindow?.isMaximized()) {
      mainWindow?.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  }
});

ipcMain.on('window:close', () => {
  if (mainWindow) mainWindow?.hide();
});

function startTracking() {
  if (trackingActive) return;
  trackingActive = true;
  totalTrackedSeconds = 0;
  usageBuffer = {};
  tickCount = 0;

  // Reset telemetry counters
  localKeyboardCount = 0;
  localMouseCount = 0;
  activeSecondsInTick = 0;
  idleSecondsInTick = 0;
  isSuspiciousTick = false;

  const debugLogPath = path.join(app.getPath('userData'), 'agent_debug.log');
  try {
    fs.appendFileSync(debugLogPath, `[${new Date().toISOString()}] Desktop Agent: startTracking() called. Active window tracking started.\n`);
  } catch (e: any) {}

  console.log('Desktop Agent: Active window tracking started.');
  
  if (sleepBlockerId === null) {
    sleepBlockerId = powerSaveBlocker.start('prevent-display-sleep');
    console.log(`Desktop Agent: System sleep blocked (ID: ${sleepBlockerId}).`);
  }

  // Spawn the PowerShell activity monitor script (Windows only)
  if (process.platform === 'win32') {
    try {
      const monitorSourcePath = path.join(__dirname, '../activity-monitor.ps1');
      const monitorPath = path.join(app.getPath('userData'), 'activity-monitor.ps1');

      try {
        const scriptContent = fs.readFileSync(monitorSourcePath);
        fs.writeFileSync(monitorPath, scriptContent);
        fs.appendFileSync(debugLogPath, `[${new Date().toISOString()}] Desktop Agent: Copied activity-monitor.ps1 to userData successfully.\n`);
      } catch (err: any) {
        fs.appendFileSync(debugLogPath, `[${new Date().toISOString()}] Desktop Agent: Failed to copy activity-monitor.ps1: ${err.message}\n`);
      }

      const pathExists = fs.existsSync(monitorPath);
      try {
        fs.appendFileSync(debugLogPath, `[${new Date().toISOString()}] Desktop Agent: Spawning background activity monitor sidecar. monitorPath="${monitorPath}" exists=${pathExists}\n`);
      } catch (e: any) {}
      console.log('Desktop Agent: Spawning background activity monitor sidecar...');
      
      activityProcess = spawn('powershell', [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        monitorPath
      ]);

      try {
        fs.appendFileSync(debugLogPath, `[${new Date().toISOString()}] Desktop Agent: Spawned powershell. PID=${activityProcess.pid}\n`);
      } catch (e: any) {}

      activityProcess.stdout.on('data', (data) => {
        const rawText = data.toString('utf8');
        const cleanText = rawText.replace(/\0/g, '').replace(/\uFEFF/g, '').replace(/\uFFFE/g, '');
        
        try {
          fs.appendFileSync(debugLogPath, `[${new Date().toISOString()}] Activity Monitor Stdout - Raw length: ${rawText.length}, Clean: "${cleanText.trim()}"\n`);
        } catch (e: any) {}

        const outputLines = cleanText.split('\n');
        for (let line of outputLines) {
          line = line.trim();
          if (line.startsWith('KEYS:')) {
            // Parse "KEYS:X|CLICKS:Y|App:AppName|Title:WindowTitle"
            const parts = line.split('|');
            const keys = parseInt(parts[0].replace('KEYS:', '')) || 0;
            const clicks = parseInt(parts[1].replace('CLICKS:', '')) || 0;
            const suspiciousPart = parts.find((p: string) => p.startsWith('Suspicious:'));
            const suspicious = suspiciousPart ? suspiciousPart.replace('Suspicious:', '') === '1' : false;

            if (suspicious) {
              isSuspiciousTick = true;
            }

            localKeyboardCount += keys;
            localMouseCount += clicks;

            // If there was any user input (keys or clicks), update last input time
            if (keys > 0 || clicks > 0) {
              lastInputTime = Date.now();
            }
            
            // 2 minutes idle threshold (same as web ActivityTracker.js)
            if (Date.now() - lastInputTime < 2 * 60 * 1000) {
              activeSecondsInTick += 10;
            } else {
              idleSecondsInTick += 10;
            }
            
            try {
              fs.appendFileSync(debugLogPath, `[${new Date().toISOString()}] Parsed Activity - Keys: ${keys}, Clicks: ${clicks}. Cumulative Active in tick: ${activeSecondsInTick}s, Idle: ${idleSecondsInTick}s\n`);
            } catch (e: any) {}

            // Pass the active window info if available
            if (parts.length >= 4 && parts[2].startsWith('App:') && parts[3].startsWith('Title:')) {
              handleActiveWindowOutput(parts[2] + '|' + parts[3]);
            }
          }
        }
      });

      activityProcess.stderr.on('data', (data) => {
        const debugLogPath = path.join(app.getPath('userData'), 'agent_debug.log');
        const errText = data.toString();
        console.error('Activity monitor stderr:', errText);
        try {
          fs.appendFileSync(debugLogPath, `[${new Date().toISOString()}] Activity Monitor STDERR: "${errText.trim()}"\n`);
        } catch (e: any) {}
      });

      activityProcess.on('close', (code) => {
        const debugLogPath = path.join(app.getPath('userData'), 'agent_debug.log');
        console.log(`Activity monitor process exited with code ${code}`);
        try {
          fs.appendFileSync(debugLogPath, `[${new Date().toISOString()}] Activity Monitor Process EXITED with code: ${code}\n`);
        } catch (e: any) {}
      });

      activityProcess.on('error', (err) => {
        const debugLogPath = path.join(app.getPath('userData'), 'agent_debug.log');
        console.error('Activity monitor process error:', err.message);
        try {
          fs.appendFileSync(debugLogPath, `[${new Date().toISOString()}] Activity Monitor Process ERROR: ${err.message}\n`);
        } catch (e: any) {}
      });
    } catch (err: any) {
      const debugLogPath = path.join(app.getPath('userData'), 'agent_debug.log');
      console.error('Failed to start background activity monitor:', err.message);
      try {
        fs.appendFileSync(debugLogPath, `[${new Date().toISOString()}] Failed to start background activity monitor: ${err.message}\n`);
      } catch (e: any) {}
    }
  }

  let lastTrackingTickTime = Date.now();
  // Run tracking loop every 10 seconds
  trackingInterval = setInterval(() => {
    const now = Date.now();
    const elapsedSeconds = Math.round((now - lastTrackingTickTime) / 1000);
    lastTrackingTickTime = now;

    // If elapsed time is significantly more than the 10s interval (e.g., > 15s),
    // the system was likely asleep/suspended. We count that suspended time as idle time.
    if (elapsedSeconds >= 15) {
      const suspendedSeconds = elapsedSeconds - 10;
      idleSecondsInTick += suspendedSeconds;
      console.log(`Desktop Agent: System was suspended for ${suspendedSeconds}s. Added to idle time.`);
    }

    totalTrackedSeconds += 10;
    tickCount++;

    // Calculate active/idle seconds on non-Windows platforms using Electron powerMonitor
    if (process.platform !== 'win32') {
      try {
        const idleTime = powerMonitor.getSystemIdleTime();
        if (idleTime < 120) {
          activeSecondsInTick += 10;
        } else {
          idleSecondsInTick += 10;
        }
      } catch (err: any) {
        console.error('Failed to get system idle time:', err.message);
        activeSecondsInTick += 10;
      }
    }

    // Capture active window
    captureActiveWindow();

    // Flush local buffer to backend every 60 seconds (6 ticks)
    if (tickCount >= 6) {
      flushUsageBuffer();
      flushActivityTelemetry();
      flushOfflineCache();
      sendHeartbeat();
      tickCount = 0;
    }
  }, 10000);

  // Run immediate first capture
  captureActiveWindow();
}

function stopTracking() {
  if (!trackingActive) return;
  trackingActive = false;
  
  if (trackingInterval) {
    clearInterval(trackingInterval);
    trackingInterval = null;
  }

  // Terminate background activity monitor process
  if (activityProcess) {
    console.log('Desktop Agent: Terminating global activity monitor...');
    activityProcess.kill();
    activityProcess = null;
  }

  console.log('Desktop Agent: Active window tracking stopped.');

  if (sleepBlockerId !== null) {
    if (powerSaveBlocker.isStarted(sleepBlockerId)) {
      powerSaveBlocker.stop(sleepBlockerId);
      console.log('Desktop Agent: System sleep unblocked.');
    }
    sleepBlockerId = null;
  }

  // Flush remaining buffer data before stopping
  flushUsageBuffer();
  flushActivityTelemetry();
}

async function sendHeartbeat() {
  if (!sessionToken) return;
  try {
    const response = await axios.post(
      `${BACKEND_URL}/api/attendance/heartbeat`,
      {},
      { headers: { Authorization: `Bearer ${sessionToken}` } }
    );
    
    if (response.data && response.data.autoCheckedOut) {
      console.log('Desktop Agent: Auto-checkout detected from backend.');
      
      // Stop tracking
      stopTracking();
      
      // Notify all renderer windows
      BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('shift-auto-checked-out');
      });
      
      // Show notification to user
      new Notification({
        title: 'Shift Auto-Ended',
        body: 'You were automatically checked out due to long inactivity (e.g. PC went to sleep).'
      }).show();
    }
  } catch (err: any) {
    console.error('Failed to send heartbeat:', err.message);
  }
}

async function flushActivityTelemetry() {
  if (!sessionToken) return;

  const keys = localKeyboardCount;
  const clicks = localMouseCount;
  const activeSecs = activeSecondsInTick;
  const idleSecs = idleSecondsInTick;
  const suspicious = isSuspiciousTick;

  // Reset local tick counters
  localKeyboardCount = 0;
  localMouseCount = 0;
  activeSecondsInTick = 0;
  idleSecondsInTick = 0;
  isSuspiciousTick = false;

  if (activeSecs === 0 && idleSecs === 0) return; // Nothing to sync

  console.log(`Desktop Agent: Syncing global activity (${activeSecs}s active, ${idleSecs}s idle, ${keys} keys, ${clicks} clicks)...`);

  try {
    await axios.post(
      `${BACKEND_URL}/api/monitoring/activity`,
      {
        activeSeconds: activeSecs,
        idleSeconds: idleSecs,
        keyboardCount: keys,
        mouseCount: clicks,
        suspicious: suspicious
      },
      {
        headers: { Authorization: `Bearer ${sessionToken}` }
      }
    );
  } catch (err: any) {
    console.error('Failed to sync global activity telemetry:', err.response?.data?.message || err.message);
    // Save to offline persistent cache
    cacheOfflineActivityLog({
      activeSeconds: activeSecs,
      idleSeconds: idleSecs,
      keyboardCount: keys,
      mouseCount: clicks,
      suspicious: suspicious
    });
  }
}

function handleActiveWindowOutput(stdout) {
  // fs is already imported at top
  const logPath = path.join(app.getPath('userData'), 'agent_debug.log');
  const output = stdout.trim().replace(/^\uFEFF/, '');
  
  try {
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] Captured output: "${output}"\n`);
  } catch (e: any) {}

  if (output && output.startsWith('App:')) {
    // Parse App:AppName|Title:WindowTitle
    const parts = output.split('|');
    const appName = parts[0] ? parts[0].replace('App:', '').trim() : 'Unknown';
    const windowTitle = parts[1] ? parts[1].replace('Title:', '').trim() : 'Active Window';
    
    const type = classifyApp(appName, windowTitle);
    currentActiveAppType = type;

    // Add to local buffer
    if (!usageBuffer[appName]) {
      usageBuffer[appName] = { windowTitle, type, seconds: 0 };
    }
    usageBuffer[appName].seconds += 10;
    usageBuffer[appName].windowTitle = windowTitle; // Update with latest title
  }
}

function captureActiveWindow() {
  const platform = process.platform;

  if (platform === 'win32') {
    // Handled natively by the continuous activity-monitor.ps1 background process to save battery/CPU
    return;
  } else if (platform === 'darwin') {
    const appleScript = `
tell application "System Events"
    set frontmostProcess to first process whose frontmost is true
    set processName to name of frontmostProcess
    tell frontmostProcess
        try
            set windowTitle to name of first window
        on error
            set windowTitle to "Active Window"
        end try
    end tell
    return "App:" & processName & "|Title:" & windowTitle
end tell
    `.trim();

    const escapedScript = appleScript.replace(/'/g, "'\\''");
    const command = `osascript -e '${escapedScript}'`;

    exec(command, (error, stdout, stderr) => {
      if (!error && stdout) {
        handleActiveWindowOutput(stdout);
      }
    });
  } else {
    // Linux
    const linuxScript = `
if command -v xdotool >/dev/null 2>&1; then
    active_win_id=$(xdotool getactivewindow 2>/dev/null)
    if [ ! -z "$active_win_id" ]; then
        pid=$(xdotool getwindowpid $active_win_id 2>/dev/null)
        if [ ! -z "$pid" ]; then
            appName=$(ps -p $pid -o comm= 2>/dev/null)
        fi
        windowTitle=$(xdotool getwindowname $active_win_id 2>/dev/null)
        echo "App:\${appName:-Unknown}|Title:\${windowTitle:-Active Window}"
    fi
else
    active_win_id=$(xprop -root _NET_ACTIVE_WINDOW 2>/dev/null | awk '{print $5}')
    if [ ! -z "$active_win_id" ] && [ "$active_win_id" != "0x0" ]; then
        appName=$(xprop -id $active_win_id WM_CLASS 2>/dev/null | awk -F '"' '{print $4}')
        windowTitle=$(xprop -id $active_win_id _NET_WM_NAME 2>/dev/null | awk -F '"' '{print $2}')
        echo "App:\${appName:-Unknown}|Title:\${windowTitle:-Active Window}"
    fi
fi
    `.trim();

    exec(linuxScript, (error, stdout, stderr) => {
      if (!error && stdout) {
        handleActiveWindowOutput(stdout);
      }
    });
  }
}



async function flushUsageBuffer() {
  const keys = Object.keys(usageBuffer);
  if (keys.length === 0 || !sessionToken) return;

  const logsToFlush = { ...usageBuffer };
  usageBuffer = {}; // Clear immediately to prevent double logging on slow requests

  console.log(`Desktop Agent: Flushing ${keys.length} app usage logs to server...`);

  for (const appName of Object.keys(logsToFlush)) {
    const log = logsToFlush[appName];
    const durationMinutes = log.seconds / 60;

    try {
      await axios.post(
        `${BACKEND_URL}/api/monitoring/usage-log`,
        {
          appName,
          windowTitle: log.windowTitle,
          type: log.type,
          durationMinutes
        },
        {
          headers: { Authorization: `Bearer ${sessionToken}` }
        }
      );
    } catch (err: any) {
      console.error(`Failed to log app ${appName}:`, err.response?.data?.message || err.message);
      // Save to offline persistent cache
      cacheOfflineUsageLog({
        appName,
        windowTitle: log.windowTitle,
        type: log.type,
        durationMinutes
      });
    }
  }
}

function classifyApp(appName, windowTitle) {
  const appLower = appName.toLowerCase();
  const titleLower = windowTitle.toLowerCase();

  const productiveApps = ['code', 'idea64', 'cmd', 'powershell', 'wt', 'terminal', 'iterm', 'iterm2', 'gnome-terminal', 'konsole', 'xfce4-terminal', 'slack', 'teams', 'zoom', 'discord', 'git', 'github', 'sourcetree', 'postman', 'mongodbcompass', 'dbeaver', 'pgadmin4', 'node', 'npm', 'antigravity'];
  const productiveKeywords = ['visual studio code', 'vs code', 'stack overflow', 'github', 'supabase', 'pull request', 'jira', 'trello', 'figma', 'bitbucket', 'localhost', 'document', 'sheet', 'slide', 'excel', 'word', 'powerpoint', 'wfh-tracking', 'antigravity'];

  const unproductiveApps = ['spotify', 'steam', 'epicgames', 'netflix', 'league of legends', 'valheim', 'minecraft', 'game'];
  const unproductiveKeywords = ['youtube', 'facebook', 'instagram', 'twitter', 'reddit', 'netflix', 'twitch', 'tiktok', 'pinterest', 'roblox'];

  if (unproductiveApps.some(app => appLower.includes(app)) || unproductiveKeywords.some(kw => titleLower.includes(kw))) {
    return 'Unproductive';
  }

  if (productiveApps.some(app => appLower.includes(app)) || productiveKeywords.some(kw => titleLower.includes(kw))) {
    return 'Productive';
  }

  return 'Neutral';
}

app.on('will-quit', () => {
  stopTracking();
});
