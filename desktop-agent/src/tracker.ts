import { app, BrowserWindow, powerSaveBlocker, powerMonitor, Notification } from 'electron';
import { spawn, exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import { GlobalState, BACKEND_URL } from './state';
import { flushOfflineCache, cacheOfflineActivityLog, cacheOfflineUsageLog } from './offlineCache';

export function startTracking() {
  if (GlobalState.trackingActive) return;
  GlobalState.trackingActive = true;
  GlobalState.totalTrackedSeconds = 0;
  GlobalState.usageBuffer = {};
  GlobalState.tickCount = 0;

  GlobalState.localKeyboardCount = 0;
  GlobalState.localMouseCount = 0;
  GlobalState.activeSecondsInTick = 0;
  GlobalState.idleSecondsInTick = 0;
  GlobalState.isSuspiciousTick = false;

  const debugLogPath = path.join(app.getPath('userData'), 'agent_debug.log');
  try {
    fs.appendFileSync(debugLogPath, `[${new Date().toISOString()}] Desktop Agent: startTracking() called. Active window tracking started.\n`);
  } catch (e: any) {}

  console.log('Desktop Agent: Active window tracking started.');
  
  if (GlobalState.sleepBlockerId === null) {
    GlobalState.sleepBlockerId = powerSaveBlocker.start('prevent-display-sleep');
    console.log(`Desktop Agent: System sleep blocked (ID: ${GlobalState.sleepBlockerId}).`);
  }

  if (process.platform === 'win32') {
    try {
      const monitorSourcePath = path.join(__dirname, '../../activity-monitor.ps1');
      const monitorPath = path.join(app.getPath('userData'), 'activity-monitor.ps1');

      try {
        const scriptContent = fs.readFileSync(monitorSourcePath);
        fs.writeFileSync(monitorPath, scriptContent);
        fs.appendFileSync(debugLogPath, `[${new Date().toISOString()}] Desktop Agent: Copied activity-monitor.ps1 to userData successfully.\n`);
      } catch (err: any) {
        fs.appendFileSync(debugLogPath, `[${new Date().toISOString()}] Desktop Agent: Failed to copy activity-monitor.ps1: ${err.message}\n`);
      }

      console.log('Desktop Agent: Spawning background activity monitor sidecar...');
      
      GlobalState.activityProcess = spawn('powershell', [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        monitorPath
      ]);

      GlobalState.activityProcess.stdout.on('data', (data: Buffer) => {
        const rawText = data.toString('utf8');
        const cleanText = rawText.replace(/\0/g, '').replace(/\uFEFF/g, '').replace(/\uFFFE/g, '');
        
        const outputLines = cleanText.split('\n');
        for (let line of outputLines) {
          line = line.trim();
          if (line.startsWith('KEYS:')) {
            const parts = line.split('|');
            const keys = parseInt(parts[0].replace('KEYS:', '')) || 0;
            const clicks = parseInt(parts[1].replace('CLICKS:', '')) || 0;
            const suspiciousPart = parts.find((p: string) => p.startsWith('Suspicious:'));
            const suspicious = suspiciousPart ? suspiciousPart.replace('Suspicious:', '') === '1' : false;

            if (suspicious) {
              GlobalState.isSuspiciousTick = true;
            }

            GlobalState.localKeyboardCount += keys;
            GlobalState.localMouseCount += clicks;

            if (keys > 0 || clicks > 0) {
              GlobalState.lastInputTime = Date.now();
            }
            
            if (Date.now() - GlobalState.lastInputTime < 2 * 60 * 1000) {
              GlobalState.activeSecondsInTick += 10;
            } else {
              GlobalState.idleSecondsInTick += 10;
            }
            
            if (parts.length >= 4 && parts[2].startsWith('App:') && parts[3].startsWith('Title:')) {
              handleActiveWindowOutput(parts[2] + '|' + parts[3]);
            }
          }
        }
      });

      GlobalState.activityProcess.stderr.on('data', (data: Buffer) => {
        const errText = data.toString();
        console.error('Activity monitor stderr:', errText);
      });

      GlobalState.activityProcess.on('close', (code: number) => {
        console.log(`Activity monitor process exited with code ${code}`);
      });

      GlobalState.activityProcess.on('error', (err: Error) => {
        console.error('Activity monitor process error:', err.message);
      });
    } catch (err: any) {
      console.error('Failed to start background activity monitor:', err.message);
    }
  }

  let lastTrackingTickTime = Date.now();
  GlobalState.trackingInterval = setInterval(() => {
    const now = Date.now();
    const elapsedSeconds = Math.round((now - lastTrackingTickTime) / 1000);
    lastTrackingTickTime = now;

    if (elapsedSeconds >= 15) {
      const suspendedSeconds = elapsedSeconds - 10;
      GlobalState.idleSecondsInTick += suspendedSeconds;
      console.log(`Desktop Agent: System was suspended for ${suspendedSeconds}s. Added to idle time.`);
    }

    GlobalState.totalTrackedSeconds += 10;
    GlobalState.tickCount++;

    if (process.platform !== 'win32') {
      try {
        const idleTime = powerMonitor.getSystemIdleTime();
        if (idleTime < 120) {
          GlobalState.activeSecondsInTick += 10;
        } else {
          GlobalState.idleSecondsInTick += 10;
        }
      } catch (err: any) {
        console.error('Failed to get system idle time:', err.message);
        GlobalState.activeSecondsInTick += 10;
      }
    }

    captureActiveWindow();

    if (GlobalState.tickCount >= 6) {
      flushUsageBuffer();
      flushActivityTelemetry();
      flushOfflineCache();
      sendHeartbeat();
      GlobalState.tickCount = 0;
    }
  }, 10000);

  captureActiveWindow();
}

export function stopTracking() {
  if (!GlobalState.trackingActive) return;
  GlobalState.trackingActive = false;
  
  if (GlobalState.trackingInterval) {
    clearInterval(GlobalState.trackingInterval);
    GlobalState.trackingInterval = null;
  }

  if (GlobalState.activityProcess) {
    console.log('Desktop Agent: Terminating global activity monitor...');
    GlobalState.activityProcess.kill();
    GlobalState.activityProcess = null;
  }

  console.log('Desktop Agent: Active window tracking stopped.');

  if (GlobalState.sleepBlockerId !== null) {
    if (powerSaveBlocker.isStarted(GlobalState.sleepBlockerId)) {
      powerSaveBlocker.stop(GlobalState.sleepBlockerId);
      console.log('Desktop Agent: System sleep unblocked.');
    }
    GlobalState.sleepBlockerId = null;
  }

  flushUsageBuffer();
  flushActivityTelemetry();
}

export async function sendHeartbeat() {
  if (!GlobalState.sessionToken) return;
  try {
    const response = await axios.post(
      `${BACKEND_URL}/api/attendance/heartbeat`,
      {},
      { headers: { Authorization: `Bearer ${GlobalState.sessionToken}` } }
    );
    
    if (response.data && response.data.autoCheckedOut) {
      console.log('Desktop Agent: Auto-checkout detected from backend.');
      
      stopTracking();
      
      BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('shift-auto-checked-out');
      });
      
      new Notification({
        title: 'Shift Auto-Ended',
        body: 'You were automatically checked out due to long inactivity (e.g. PC went to sleep).'
      }).show();
    }
  } catch (err: any) {
    console.error('Failed to send heartbeat:', err.message);
  }
}

export async function flushActivityTelemetry() {
  if (!GlobalState.sessionToken) return;

  const keys = GlobalState.localKeyboardCount;
  const clicks = GlobalState.localMouseCount;
  const activeSecs = GlobalState.activeSecondsInTick;
  const idleSecs = GlobalState.idleSecondsInTick;
  const suspicious = GlobalState.isSuspiciousTick;

  GlobalState.localKeyboardCount = 0;
  GlobalState.localMouseCount = 0;
  GlobalState.activeSecondsInTick = 0;
  GlobalState.idleSecondsInTick = 0;
  GlobalState.isSuspiciousTick = false;

  if (activeSecs === 0 && idleSecs === 0) return;

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
        headers: { Authorization: `Bearer ${GlobalState.sessionToken}` }
      }
    );
  } catch (err: any) {
    console.error('Failed to sync global activity telemetry:', err.response?.data?.message || err.message);
    cacheOfflineActivityLog({
      activeSeconds: activeSecs,
      idleSeconds: idleSecs,
      keyboardCount: keys,
      mouseCount: clicks,
      suspicious: suspicious
    });
  }
}

export function handleActiveWindowOutput(stdout: string) {
  const logPath = path.join(app.getPath('userData'), 'agent_debug.log');
  const output = stdout.trim().replace(/^\uFEFF/, '');
  
  if (output && output.startsWith('App:')) {
    const parts = output.split('|');
    const appName = parts[0] ? parts[0].replace('App:', '').trim() : 'Unknown';
    const windowTitle = parts[1] ? parts[1].replace('Title:', '').trim() : 'Active Window';
    
    const type = classifyApp(appName, windowTitle);
    GlobalState.currentActiveAppType = type;

    if (!GlobalState.usageBuffer[appName]) {
      GlobalState.usageBuffer[appName] = { windowTitle, type, seconds: 0 };
    }
    GlobalState.usageBuffer[appName].seconds += 10;
    GlobalState.usageBuffer[appName].windowTitle = windowTitle;
  }
}

export function captureActiveWindow() {
  const platform = process.platform;

  if (platform === 'win32') {
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

export async function flushUsageBuffer() {
  const keys = Object.keys(GlobalState.usageBuffer);
  if (keys.length === 0 || !GlobalState.sessionToken) return;

  const logsToFlush = { ...GlobalState.usageBuffer };
  GlobalState.usageBuffer = {};

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
          headers: { Authorization: `Bearer ${GlobalState.sessionToken}` }
        }
      );
    } catch (err: any) {
      console.error(`Failed to log app ${appName}:`, err.response?.data?.message || err.message);
      cacheOfflineUsageLog({
        appName,
        windowTitle: log.windowTitle,
        type: log.type,
        durationMinutes
      });
    }
  }
}

export function classifyApp(appName: string, windowTitle: string) {
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
