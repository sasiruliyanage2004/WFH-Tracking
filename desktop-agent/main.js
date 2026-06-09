const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const axios = require('axios');

const BACKEND_URL = 'http://localhost:5000';
let mainWindow = null;
let sessionToken = null;
let currentUser = null;

let trackingInterval = null;
let trackingActive = false;
let totalTrackedSeconds = 0;
let usageBuffer = {};
let tickCount = 0;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 380,
    height: 560,
    frame: false,
    transparent: true,
    resizable: false,
    maximizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadFile('index.html');

  mainWindow.on('closed', () => {
    stopTracking();
    mainWindow = null;
  });
}

app.whenReady().then(() => {
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

// App Window controls
ipcMain.on('window:close', () => {
  app.quit();
});

ipcMain.on('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

// Authentication handlers
ipcMain.on('auth:login', async (event, { email, password }) => {
  try {
    const res = await axios.post(`${BACKEND_URL}/api/auth/login`, { email, password });
    if (res.data && res.data.token) {
      sessionToken = res.data.token;
      currentUser = res.data.user;
      event.reply('auth:result', { success: true, user: currentUser });
    } else {
      event.reply('auth:result', { success: false, message: 'Invalid response from server' });
    }
  } catch (err) {
    console.error('Login Error:', err.message);
    const msg = err.response?.data?.message || 'Failed to connect to backend server';
    event.reply('auth:result', { success: false, message: msg });
  }
});

ipcMain.on('auth:logout', (event) => {
  stopTracking();
  sessionToken = null;
  currentUser = null;
  event.reply('auth:result', { success: false, loggedOut: true });
});

// Tracking control handlers
ipcMain.on('tracking:toggle', (event, active) => {
  if (active && sessionToken) {
    startTracking();
  } else {
    stopTracking();
  }
});

function startTracking() {
  if (trackingActive) return;
  trackingActive = true;
  totalTrackedSeconds = 0;
  usageBuffer = {};
  tickCount = 0;

  // Run tracking loop every 10 seconds
  trackingInterval = setInterval(() => {
    totalTrackedSeconds += 10;
    tickCount++;

    // Send stopwatch time update to renderer
    if (mainWindow) {
      mainWindow.webContents.send('tracking:tick', formatStopwatch(totalTrackedSeconds));
    }

    // Capture active window
    captureActiveWindow();

    // Flush local buffer to backend every 60 seconds (6 ticks)
    if (tickCount >= 6) {
      flushUsageBuffer();
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

  // Flush remaining buffer data before stopping
  flushUsageBuffer();

  if (mainWindow) {
    mainWindow.webContents.send('tracking:status', { appName: '', windowTitle: '', type: 'Neutral', inactive: true });
  }
}

function captureActiveWindow() {
  const scriptPath = path.join(__dirname, 'get-active-window.ps1');
  const command = `powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error('Active Window Capture Error:', error.message);
      return;
    }

    const output = stdout.trim();
    if (output && output.startsWith('App:')) {
      // Parse App:AppName|Title:WindowTitle
      const parts = output.split('|');
      const appName = parts[0] ? parts[0].replace('App:', '').trim() : 'Unknown';
      const windowTitle = parts[1] ? parts[1].replace('Title:', '').trim() : 'Active Window';
      
      const type = classifyApp(appName, windowTitle);

      // Send current state to GUI renderer
      if (mainWindow) {
        mainWindow.webContents.send('tracking:status', { appName, windowTitle, type });
      }

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
      // Put back into buffer if it failed, so we try again next time
      if (!usageBuffer[appName]) {
        usageBuffer[appName] = { windowTitle: log.windowTitle, type: log.type, seconds: 0 };
      }
      usageBuffer[appName].seconds += log.seconds;
    }
  }
}

function classifyApp(appName, windowTitle) {
  const appLower = appName.toLowerCase();
  const titleLower = windowTitle.toLowerCase();

  const productiveApps = ['code', 'idea64', 'cmd', 'powershell', 'wt', 'slack', 'teams', 'zoom', 'discord', 'git', 'github', 'sourcetree', 'postman', 'mongodbcompass', 'dbeaver', 'pgadmin4', 'node', 'npm'];
  const productiveKeywords = ['visual studio code', 'vs code', 'stack overflow', 'github', 'supabase', 'pull request', 'jira', 'trello', 'figma', 'bitbucket', 'localhost', 'document', 'sheet', 'slide', 'excel', 'word', 'powerpoint', 'wfh-tracking'];

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

function formatStopwatch(totalSeconds) {
  const hrs = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
  const mins = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
  const secs = (totalSeconds % 60).toString().padStart(2, '0');
  return `${hrs}:${mins}:${secs}`;
}
