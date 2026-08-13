"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startTracking = startTracking;
exports.stopTracking = stopTracking;
exports.sendHeartbeat = sendHeartbeat;
exports.flushActivityTelemetry = flushActivityTelemetry;
exports.handleActiveWindowOutput = handleActiveWindowOutput;
exports.captureActiveWindow = captureActiveWindow;
exports.flushUsageBuffer = flushUsageBuffer;
exports.classifyApp = classifyApp;
const electron_1 = require("electron");
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const axios_1 = __importDefault(require("axios"));
const state_1 = require("./state");
const offlineCache_1 = require("./offlineCache");
function startTracking() {
    if (state_1.GlobalState.trackingActive)
        return;
    state_1.GlobalState.trackingActive = true;
    state_1.GlobalState.totalTrackedSeconds = 0;
    state_1.GlobalState.usageBuffer = {};
    state_1.GlobalState.tickCount = 0;
    state_1.GlobalState.localKeyboardCount = 0;
    state_1.GlobalState.localMouseCount = 0;
    state_1.GlobalState.activeSecondsInTick = 0;
    state_1.GlobalState.idleSecondsInTick = 0;
    state_1.GlobalState.isSuspiciousTick = false;
    const debugLogPath = path_1.default.join(electron_1.app.getPath('userData'), 'agent_debug.log');
    try {
        fs_1.default.appendFileSync(debugLogPath, `[${new Date().toISOString()}] Desktop Agent: startTracking() called. Active window tracking started.\n`);
    }
    catch (e) { }
    console.log('Desktop Agent: Active window tracking started.');
    if (state_1.GlobalState.sleepBlockerId === null) {
        state_1.GlobalState.sleepBlockerId = electron_1.powerSaveBlocker.start('prevent-display-sleep');
        console.log(`Desktop Agent: System sleep blocked (ID: ${state_1.GlobalState.sleepBlockerId}).`);
    }
    if (process.platform === 'win32') {
        try {
            const monitorSourcePath = path_1.default.join(__dirname, '../../activity-monitor.ps1');
            const monitorPath = path_1.default.join(electron_1.app.getPath('userData'), 'activity-monitor.ps1');
            try {
                const scriptContent = fs_1.default.readFileSync(monitorSourcePath);
                fs_1.default.writeFileSync(monitorPath, scriptContent);
                fs_1.default.appendFileSync(debugLogPath, `[${new Date().toISOString()}] Desktop Agent: Copied activity-monitor.ps1 to userData successfully.\n`);
            }
            catch (err) {
                fs_1.default.appendFileSync(debugLogPath, `[${new Date().toISOString()}] Desktop Agent: Failed to copy activity-monitor.ps1: ${err.message}\n`);
            }
            console.log('Desktop Agent: Spawning background activity monitor sidecar...');
            state_1.GlobalState.activityProcess = (0, child_process_1.spawn)('powershell', [
                '-NoProfile',
                '-ExecutionPolicy',
                'Bypass',
                '-File',
                monitorPath
            ]);
            state_1.GlobalState.activityProcess.stdout.on('data', (data) => {
                const rawText = data.toString('utf8');
                const cleanText = rawText.replace(/\0/g, '').replace(/\uFEFF/g, '').replace(/\uFFFE/g, '');
                const outputLines = cleanText.split('\n');
                for (let line of outputLines) {
                    line = line.trim();
                    if (line.startsWith('KEYS:')) {
                        const parts = line.split('|');
                        const keys = parseInt(parts[0].replace('KEYS:', '')) || 0;
                        const clicks = parseInt(parts[1].replace('CLICKS:', '')) || 0;
                        const suspiciousPart = parts.find((p) => p.startsWith('Suspicious:'));
                        const suspicious = suspiciousPart ? suspiciousPart.replace('Suspicious:', '') === '1' : false;
                        if (suspicious) {
                            state_1.GlobalState.isSuspiciousTick = true;
                        }
                        state_1.GlobalState.localKeyboardCount += keys;
                        state_1.GlobalState.localMouseCount += clicks;
                        if (keys > 0 || clicks > 0) {
                            state_1.GlobalState.lastInputTime = Date.now();
                        }
                        if (Date.now() - state_1.GlobalState.lastInputTime < 2 * 60 * 1000) {
                            state_1.GlobalState.activeSecondsInTick += 10;
                        }
                        else {
                            state_1.GlobalState.idleSecondsInTick += 10;
                        }
                        if (parts.length >= 4 && parts[2].startsWith('App:') && parts[3].startsWith('Title:')) {
                            handleActiveWindowOutput(parts[2] + '|' + parts[3]);
                        }
                    }
                }
            });
            state_1.GlobalState.activityProcess.stderr.on('data', (data) => {
                const errText = data.toString();
                console.error('Activity monitor stderr:', errText);
            });
            state_1.GlobalState.activityProcess.on('close', (code) => {
                console.log(`Activity monitor process exited with code ${code}`);
            });
            state_1.GlobalState.activityProcess.on('error', (err) => {
                console.error('Activity monitor process error:', err.message);
            });
        }
        catch (err) {
            console.error('Failed to start background activity monitor:', err.message);
        }
    }
    let lastTrackingTickTime = Date.now();
    state_1.GlobalState.trackingInterval = setInterval(() => {
        const now = Date.now();
        const elapsedSeconds = Math.round((now - lastTrackingTickTime) / 1000);
        lastTrackingTickTime = now;
        if (elapsedSeconds >= 15) {
            const suspendedSeconds = elapsedSeconds - 10;
            state_1.GlobalState.idleSecondsInTick += suspendedSeconds;
            console.log(`Desktop Agent: System was suspended for ${suspendedSeconds}s. Added to idle time.`);
        }
        state_1.GlobalState.totalTrackedSeconds += 10;
        state_1.GlobalState.tickCount++;
        if (process.platform !== 'win32') {
            try {
                const idleTime = electron_1.powerMonitor.getSystemIdleTime();
                if (idleTime < 120) {
                    state_1.GlobalState.activeSecondsInTick += 10;
                }
                else {
                    state_1.GlobalState.idleSecondsInTick += 10;
                }
            }
            catch (err) {
                console.error('Failed to get system idle time:', err.message);
                state_1.GlobalState.activeSecondsInTick += 10;
            }
        }
        captureActiveWindow();
        if (state_1.GlobalState.tickCount >= 6) {
            flushUsageBuffer();
            flushActivityTelemetry();
            (0, offlineCache_1.flushOfflineCache)();
            sendHeartbeat();
            state_1.GlobalState.tickCount = 0;
        }
    }, 10000);
    captureActiveWindow();
}
function stopTracking() {
    if (!state_1.GlobalState.trackingActive)
        return;
    state_1.GlobalState.trackingActive = false;
    if (state_1.GlobalState.trackingInterval) {
        clearInterval(state_1.GlobalState.trackingInterval);
        state_1.GlobalState.trackingInterval = null;
    }
    if (state_1.GlobalState.activityProcess) {
        console.log('Desktop Agent: Terminating global activity monitor...');
        state_1.GlobalState.activityProcess.kill();
        state_1.GlobalState.activityProcess = null;
    }
    console.log('Desktop Agent: Active window tracking stopped.');
    if (state_1.GlobalState.sleepBlockerId !== null) {
        if (electron_1.powerSaveBlocker.isStarted(state_1.GlobalState.sleepBlockerId)) {
            electron_1.powerSaveBlocker.stop(state_1.GlobalState.sleepBlockerId);
            console.log('Desktop Agent: System sleep unblocked.');
        }
        state_1.GlobalState.sleepBlockerId = null;
    }
    flushUsageBuffer();
    flushActivityTelemetry();
}
async function sendHeartbeat() {
    if (!state_1.GlobalState.sessionToken)
        return;
    try {
        const response = await axios_1.default.post(`${state_1.BACKEND_URL}/api/attendance/heartbeat`, {}, { headers: { Authorization: `Bearer ${state_1.GlobalState.sessionToken}` } });
        if (response.data && response.data.autoCheckedOut) {
            console.log('Desktop Agent: Auto-checkout detected from backend.');
            stopTracking();
            electron_1.BrowserWindow.getAllWindows().forEach(win => {
                win.webContents.send('shift-auto-checked-out');
            });
            new electron_1.Notification({
                title: 'Shift Auto-Ended',
                body: 'You were automatically checked out due to long inactivity (e.g. PC went to sleep).'
            }).show();
        }
    }
    catch (err) {
        console.error('Failed to send heartbeat:', err.message);
    }
}
async function flushActivityTelemetry() {
    if (!state_1.GlobalState.sessionToken)
        return;
    const keys = state_1.GlobalState.localKeyboardCount;
    const clicks = state_1.GlobalState.localMouseCount;
    const activeSecs = state_1.GlobalState.activeSecondsInTick;
    const idleSecs = state_1.GlobalState.idleSecondsInTick;
    const suspicious = state_1.GlobalState.isSuspiciousTick;
    state_1.GlobalState.localKeyboardCount = 0;
    state_1.GlobalState.localMouseCount = 0;
    state_1.GlobalState.activeSecondsInTick = 0;
    state_1.GlobalState.idleSecondsInTick = 0;
    state_1.GlobalState.isSuspiciousTick = false;
    if (activeSecs === 0 && idleSecs === 0)
        return;
    console.log(`Desktop Agent: Syncing global activity (${activeSecs}s active, ${idleSecs}s idle, ${keys} keys, ${clicks} clicks)...`);
    try {
        await axios_1.default.post(`${state_1.BACKEND_URL}/api/monitoring/activity`, {
            activeSeconds: activeSecs,
            idleSeconds: idleSecs,
            keyboardCount: keys,
            mouseCount: clicks,
            suspicious: suspicious
        }, {
            headers: { Authorization: `Bearer ${state_1.GlobalState.sessionToken}` }
        });
    }
    catch (err) {
        console.error('Failed to sync global activity telemetry:', err.response?.data?.message || err.message);
        (0, offlineCache_1.cacheOfflineActivityLog)({
            activeSeconds: activeSecs,
            idleSeconds: idleSecs,
            keyboardCount: keys,
            mouseCount: clicks,
            suspicious: suspicious
        });
    }
}
function handleActiveWindowOutput(stdout) {
    const logPath = path_1.default.join(electron_1.app.getPath('userData'), 'agent_debug.log');
    const output = stdout.trim().replace(/^\uFEFF/, '');
    if (output && output.startsWith('App:')) {
        const parts = output.split('|');
        const appName = parts[0] ? parts[0].replace('App:', '').trim() : 'Unknown';
        const windowTitle = parts[1] ? parts[1].replace('Title:', '').trim() : 'Active Window';
        const type = classifyApp(appName, windowTitle);
        state_1.GlobalState.currentActiveAppType = type;
        if (!state_1.GlobalState.usageBuffer[appName]) {
            state_1.GlobalState.usageBuffer[appName] = { windowTitle, type, seconds: 0 };
        }
        state_1.GlobalState.usageBuffer[appName].seconds += 10;
        state_1.GlobalState.usageBuffer[appName].windowTitle = windowTitle;
    }
}
function captureActiveWindow() {
    const platform = process.platform;
    if (platform === 'win32') {
        return;
    }
    else if (platform === 'darwin') {
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
        (0, child_process_1.exec)(command, (error, stdout, stderr) => {
            if (!error && stdout) {
                handleActiveWindowOutput(stdout);
            }
        });
    }
    else {
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
        (0, child_process_1.exec)(linuxScript, (error, stdout, stderr) => {
            if (!error && stdout) {
                handleActiveWindowOutput(stdout);
            }
        });
    }
}
async function flushUsageBuffer() {
    const keys = Object.keys(state_1.GlobalState.usageBuffer);
    if (keys.length === 0 || !state_1.GlobalState.sessionToken)
        return;
    const logsToFlush = { ...state_1.GlobalState.usageBuffer };
    state_1.GlobalState.usageBuffer = {};
    console.log(`Desktop Agent: Flushing ${keys.length} app usage logs to server...`);
    for (const appName of Object.keys(logsToFlush)) {
        const log = logsToFlush[appName];
        const durationMinutes = log.seconds / 60;
        try {
            await axios_1.default.post(`${state_1.BACKEND_URL}/api/monitoring/usage-log`, {
                appName,
                windowTitle: log.windowTitle,
                type: log.type,
                durationMinutes
            }, {
                headers: { Authorization: `Bearer ${state_1.GlobalState.sessionToken}` }
            });
        }
        catch (err) {
            console.error(`Failed to log app ${appName}:`, err.response?.data?.message || err.message);
            (0, offlineCache_1.cacheOfflineUsageLog)({
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
