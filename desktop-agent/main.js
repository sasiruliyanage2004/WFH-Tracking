const { app, BrowserWindow, ipcMain, desktopCapturer, Menu, session, powerMonitor } = require('electron');
const path = require('path');
const { exec, spawn } = require('child_process');
const axios = require('axios');
const fs = require('fs');

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
    let logs = [];
    if (fs.existsSync(filePath)) {
      try {
        logs = JSON.parse(fs.readFileSync(filePath, 'utf8')) || [];
      } catch (e) {
        logs = [];
      }
    }
    logs.push(payload);
    fs.writeFileSync(filePath, JSON.stringify(logs, null, 2), 'utf8');
    console.log(`Desktop Agent: Cached offline log to ${filename}`);
  } catch (err) {
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
      let logs = [];
      try {
        logs = JSON.parse(fs.readFileSync(usagePath, 'utf8')) || [];
      } catch (e) {
        logs = [];
      }

      if (logs.length > 0) {
        console.log(`Desktop Agent: Found ${logs.length} cached offline usage logs. Attempting to flush...`);
        const remainingLogs = [];
        for (const log of logs) {
          try {
            await axios.post(
              `${BACKEND_URL}/api/monitoring/usage-log`,
              log,
              { headers: { Authorization: `Bearer ${sessionToken}` } }
            );
            console.log(`Desktop Agent: Flushed usage log for ${log.appName}`);
          } catch (err) {
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
      let logs = [];
      try {
        logs = JSON.parse(fs.readFileSync(activityPath, 'utf8')) || [];
      } catch (e) {
        logs = [];
      }

      if (logs.length > 0) {
        console.log(`Desktop Agent: Found ${logs.length} cached offline activity logs. Attempting to flush...`);
        const remainingLogs = [];
        for (const log of logs) {
          try {
            await axios.post(
              `${BACKEND_URL}/api/monitoring/activity`,
              log,
              { headers: { Authorization: `Bearer ${sessionToken}` } }
            );
            console.log(`Desktop Agent: Flushed activity log for date ${log.date}`);
          } catch (err) {
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
          } catch (err) {
            console.error(`Failed to flush cached screenshot file ${file}:`, err.message);
          }
        }
      }
    }
  } catch (err) {
    console.error('Desktop Agent: Failed to flush offline cache:', err.message);
  }
}

const BACKEND_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';

let mainWindow = null;
let sessionToken = null;

let trackingInterval = null;
let trackingActive = false;
let totalTrackedSeconds = 0;
let usageBuffer = {};
let tickCount = 0;

// Global input hook telemetry variables
let activityProcess = null;
let localKeyboardCount = 0;
let localMouseCount = 0;
let activeSecondsInTick = 0;
let idleSecondsInTick = 0;

let splashWindow = null;
let currentActiveAppType = 'Neutral';

// Idle Break detection variables
let wasIdleBefore = false;
let maxIdleTimeSecs = 0;
let idleCheckInterval = null;

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 450,
    height: 320,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  splashWindow.loadFile(path.join(__dirname, 'splash.html'));

  splashWindow.on('closed', () => {
    splashWindow = null;
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    // Native title bar restored
    show: false,  // Hide while loading
    icon: path.join(__dirname, 'icon.ico'),
    backgroundColor: '#070b14', // Premium dark background
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.removeMenu();

  // Intercept input for reload (Ctrl+R) and DevTools (Ctrl+Shift+I)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.control && input.key.toLowerCase() === 'r') {
      mainWindow.webContents.session.clearCache().then(() => {
        mainWindow.reload();
      });
      event.preventDefault();
    }
    if (input.control && input.shift && input.key.toLowerCase() === 'i') {
      mainWindow.webContents.openDevTools();
      event.preventDefault();
    }
  });

  // Log all console messages from the renderer process
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[RENDERER CONSOLE] [Level ${level}] ${message} (at ${sourceId}:${line})`);
  });

  mainWindow.loadURL(FRONTEND_URL);

  mainWindow.webContents.on('did-finish-load', () => {
    // mainWindow.webContents.openDevTools();
    // Smooth transition from splash to main window
    setTimeout(() => {
      if (splashWindow) {
        splashWindow.close();
      }
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    }, 1500); // 1.5 second duration
  });

  // Fallback to port 3002 if default port 3001 fails to load
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    if (validatedURL && (validatedURL.includes(':3001'))) {
      const newUrl = validatedURL.replace(':3001', ':3002');
      mainWindow.loadURL(newUrl);
    } else {
      // mainWindow.webContents.openDevTools();
    }
  });

  mainWindow.on('closed', () => {
    stopTracking();
    mainWindow = null;
  });

  mainWindow.on('maximize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window:maximized');
    }
  });

  mainWindow.on('unmaximize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window:unmaximized');
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
      
      // 15 minutes threshold (900 seconds)
      if (idleTimeSecs >= 900) {
        wasIdleBefore = true;
        if (idleTimeSecs > maxIdleTimeSecs) {
          maxIdleTimeSecs = idleTimeSecs;
        }
      } else {
        if (wasIdleBefore) {
          const idleMins = Math.round(maxIdleTimeSecs / 60);
          console.log(`Desktop Agent: User returned after being idle for ${idleMins} minutes. Sending prompt to frontend.`);
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('idle:prompt-break', {
              durationMinutes: idleMins
            });
          }
          wasIdleBefore = false;
          maxIdleTimeSecs = 0;
        }
      }
    } catch (err) {
      console.error('Idle detection error:', err.message);
    }
  }, 5000); // Check every 5 seconds
}

app.whenReady().then(() => {
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
  createSplashWindow();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
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
      // Return the base64 data URL representing the primary screen thumbnail
      return sources[0].thumbnail.toDataURL();
    }
  } catch (err) {
    console.error('Native screen capture failed:', err.message);
  }
  return null;
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
  } catch (err) {
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

// Window control events
ipcMain.on('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window:maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window:close', () => {
  if (mainWindow) mainWindow.close();
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

  const debugLogPath = path.join(app.getPath('userData'), 'agent_debug.log');
  try {
    fs.appendFileSync(debugLogPath, `[${new Date().toISOString()}] Desktop Agent: startTracking() called. Active window tracking started.\n`);
  } catch (e) {}

  console.log('Desktop Agent: Active window tracking started.');

  // Spawn the PowerShell activity monitor script
  try {
    const monitorSourcePath = path.join(__dirname, 'activity-monitor.ps1');
    const monitorPath = path.join(app.getPath('userData'), 'activity-monitor.ps1');

    try {
      const scriptContent = fs.readFileSync(monitorSourcePath);
      fs.writeFileSync(monitorPath, scriptContent);
      fs.appendFileSync(debugLogPath, `[${new Date().toISOString()}] Desktop Agent: Copied activity-monitor.ps1 to userData successfully.\n`);
    } catch (err) {
      fs.appendFileSync(debugLogPath, `[${new Date().toISOString()}] Desktop Agent: Failed to copy activity-monitor.ps1: ${err.message}\n`);
    }

    const pathExists = fs.existsSync(monitorPath);
    try {
      fs.appendFileSync(debugLogPath, `[${new Date().toISOString()}] Desktop Agent: Spawning background activity monitor sidecar. monitorPath="${monitorPath}" exists=${pathExists}\n`);
    } catch (e) {}
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
    } catch (e) {}

    activityProcess.stdout.on('data', (data) => {
      const rawText = data.toString('utf8');
      const cleanText = rawText.replace(/\0/g, '').replace(/\uFEFF/g, '').replace(/\uFFFE/g, '');
      
      try {
        fs.appendFileSync(debugLogPath, `[${new Date().toISOString()}] Activity Monitor Stdout - Raw length: ${rawText.length}, Clean: "${cleanText.trim()}"\n`);
      } catch (e) {}

      const outputLines = cleanText.split('\n');
      for (let line of outputLines) {
        line = line.trim();
        if (line.startsWith('KEYS:')) {
          // Parse "KEYS:X|CLICKS:Y"
          const parts = line.split('|');
          const keys = parseInt(parts[0].replace('KEYS:', '')) || 0;
          const clicks = parseInt(parts[1].replace('CLICKS:', '')) || 0;

          localKeyboardCount += keys;
          localMouseCount += clicks;

          // If there was any user input (keys or clicks) in this 10-second tick,
          // or if the current active app is classified as 'Productive',
          // it counts as active time, otherwise idle.
          if (keys > 0 || clicks > 0 || currentActiveAppType === 'Productive') {
            activeSecondsInTick += 10;
          } else {
            idleSecondsInTick += 10;
          }
          
          try {
            fs.appendFileSync(debugLogPath, `[${new Date().toISOString()}] Parsed Activity - Keys: ${keys}, Clicks: ${clicks}. Cumulative Active in tick: ${activeSecondsInTick}s, Idle: ${idleSecondsInTick}s\n`);
          } catch (e) {}
        }
      }
    });

    activityProcess.stderr.on('data', (data) => {
      const debugLogPath = path.join(app.getPath('userData'), 'agent_debug.log');
      const errText = data.toString();
      console.error('Activity monitor stderr:', errText);
      try {
        fs.appendFileSync(debugLogPath, `[${new Date().toISOString()}] Activity Monitor STDERR: "${errText.trim()}"\n`);
      } catch (e) {}
    });

    activityProcess.on('close', (code) => {
      const debugLogPath = path.join(app.getPath('userData'), 'agent_debug.log');
      console.log(`Activity monitor process exited with code ${code}`);
      try {
        fs.appendFileSync(debugLogPath, `[${new Date().toISOString()}] Activity Monitor Process EXITED with code: ${code}\n`);
      } catch (e) {}
    });

    activityProcess.on('error', (err) => {
      const debugLogPath = path.join(app.getPath('userData'), 'agent_debug.log');
      console.error('Activity monitor process error:', err.message);
      try {
        fs.appendFileSync(debugLogPath, `[${new Date().toISOString()}] Activity Monitor Process ERROR: ${err.message}\n`);
      } catch (e) {}
    });
  } catch (err) {
    const debugLogPath = path.join(app.getPath('userData'), 'agent_debug.log');
    console.error('Failed to start background activity monitor:', err.message);
    try {
      fs.appendFileSync(debugLogPath, `[${new Date().toISOString()}] Failed to start background activity monitor: ${err.message}\n`);
    } catch (e) {}
  }

  // Run tracking loop every 10 seconds
  trackingInterval = setInterval(() => {
    totalTrackedSeconds += 10;
    tickCount++;

    // Capture active window
    captureActiveWindow();

    // Flush local buffer to backend every 60 seconds (6 ticks)
    if (tickCount >= 6) {
      flushUsageBuffer();
      flushActivityTelemetry();
      flushOfflineCache();
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

  // Flush remaining buffer data before stopping
  flushUsageBuffer();
  flushActivityTelemetry();
}

async function flushActivityTelemetry() {
  if (!sessionToken) return;

  const keys = localKeyboardCount;
  const clicks = localMouseCount;
  const activeSecs = activeSecondsInTick;
  const idleSecs = idleSecondsInTick;

  // Reset local tick counters
  localKeyboardCount = 0;
  localMouseCount = 0;
  activeSecondsInTick = 0;
  idleSecondsInTick = 0;

  if (activeSecs === 0 && idleSecs === 0) return; // Nothing to sync

  console.log(`Desktop Agent: Syncing global activity (${activeSecs}s active, ${idleSecs}s idle, ${keys} keys, ${clicks} clicks)...`);

  try {
    await axios.post(
      `${BACKEND_URL}/api/monitoring/activity`,
      {
        activeSeconds: activeSecs,
        idleSeconds: idleSecs,
        keyboardCount: keys,
        mouseCount: clicks
      },
      {
        headers: { Authorization: `Bearer ${sessionToken}` }
      }
    );
  } catch (err) {
    console.error('Failed to sync global activity telemetry:', err.response?.data?.message || err.message);
    // Save to offline persistent cache
    cacheOfflineActivityLog({
      activeSeconds: activeSecs,
      idleSeconds: idleSecs,
      keyboardCount: keys,
      mouseCount: clicks
    });
  }
}

function captureActiveWindow() {
  const psScript = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class User32 {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
}
"@
try {
    $hwnd = [User32]::GetForegroundWindow()
    if ($hwnd -ne [IntPtr]::Zero) {
        $windowPid = 0
        [void][User32]::GetWindowThreadProcessId($hwnd, [ref]$windowPid)
        if ($windowPid -gt 0) {
            $process = Get-Process -Id $windowPid
            $processName = $process.ProcessName
            $windowTitle = $process.MainWindowTitle
            if ([string]::IsNullOrEmpty($processName)) { $processName = "Unknown" }
            if ([string]::IsNullOrEmpty($windowTitle)) { $windowTitle = "Active Window" }
            Write-Output "App:$processName|Title:$windowTitle"
        }
    }
} catch {
    # Fail silently
}
  `.trim();

  const buffer = Buffer.from(psScript, 'utf16le');
  const base64Script = buffer.toString('base64');
  const command = `powershell -NoProfile -EncodedCommand ${base64Script}`;

  exec(command, (error, stdout, stderr) => {
    const fs = require('fs');
    const logPath = path.join(app.getPath('userData'), 'agent_debug.log');

    if (error) {
      console.error('Active Window Capture Error:', error.message);
      try {
        fs.appendFileSync(logPath, `[${new Date().toISOString()}] ERROR: ${error.message}\n`);
      } catch (e) {}
      return;
    }

    const output = stdout.trim().replace(/^\uFEFF/, '');
    
    try {
      fs.appendFileSync(logPath, `[${new Date().toISOString()}] Captured output: "${output}" (BOM removed: ${stdout.trim() !== output})\n`);
    } catch (e) {}

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
  });
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
    } catch (err) {
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

  const productiveApps = ['code', 'idea64', 'cmd', 'powershell', 'wt', 'slack', 'teams', 'zoom', 'discord', 'git', 'github', 'sourcetree', 'postman', 'mongodbcompass', 'dbeaver', 'pgadmin4', 'node', 'npm', 'antigravity'];
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
