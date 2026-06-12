const { app, BrowserWindow, ipcMain, desktopCapturer, Menu } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const axios = require('axios');

const BACKEND_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';

let mainWindow = null;
let sessionToken = null;

let trackingInterval = null;
let trackingActive = false;
let totalTrackedSeconds = 0;
let usageBuffer = {};
let tickCount = 0;

let splashWindow = null;

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
    frame: false, // Make window frameless
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
  mainWindow.loadURL(FRONTEND_URL);

  mainWindow.webContents.on('did-finish-load', () => {
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
    if (validatedURL && (validatedURL.includes('localhost:3001') || validatedURL.includes('127.0.0.1:3001'))) {
      mainWindow.loadURL('http://localhost:3002');
    }
  });

  mainWindow.on('closed', () => {
    stopTracking();
    mainWindow = null;
  });
}

app.whenReady().then(() => {
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

  console.log('Desktop Agent: Active window tracking started.');

  // Run tracking loop every 10 seconds
  trackingInterval = setInterval(() => {
    totalTrackedSeconds += 10;
    tickCount++;

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

  console.log('Desktop Agent: Active window tracking stopped.');

  // Flush remaining buffer data before stopping
  flushUsageBuffer();
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
