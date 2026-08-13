"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOfflineScreenshotsDir = exports.getOfflineCacheDir = void 0;
exports.ensureCacheDirs = ensureCacheDirs;
exports.appendOfflineLog = appendOfflineLog;
exports.cacheOfflineUsageLog = cacheOfflineUsageLog;
exports.cacheOfflineActivityLog = cacheOfflineActivityLog;
exports.flushOfflineCache = flushOfflineCache;
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const axios_1 = __importDefault(require("axios"));
const state_1 = require("./state");
const getOfflineCacheDir = () => path_1.default.join(electron_1.app.getPath('userData'), 'offline-cache');
exports.getOfflineCacheDir = getOfflineCacheDir;
const getOfflineScreenshotsDir = () => path_1.default.join((0, exports.getOfflineCacheDir)(), 'screenshots');
exports.getOfflineScreenshotsDir = getOfflineScreenshotsDir;
function ensureCacheDirs() {
    const cacheDir = (0, exports.getOfflineCacheDir)();
    const ssDir = (0, exports.getOfflineScreenshotsDir)();
    if (!fs_1.default.existsSync(cacheDir)) {
        fs_1.default.mkdirSync(cacheDir, { recursive: true });
    }
    if (!fs_1.default.existsSync(ssDir)) {
        fs_1.default.mkdirSync(ssDir, { recursive: true });
    }
}
function appendOfflineLog(filename, payload) {
    try {
        ensureCacheDirs();
        const filePath = path_1.default.join((0, exports.getOfflineCacheDir)(), filename);
        let logs = [];
        if (fs_1.default.existsSync(filePath)) {
            try {
                logs = JSON.parse(fs_1.default.readFileSync(filePath, 'utf8')) || [];
            }
            catch (e) {
                logs = [];
            }
        }
        logs.push(payload);
        fs_1.default.writeFileSync(filePath, JSON.stringify(logs, null, 2), 'utf8');
        console.log(`Desktop Agent: Cached offline log to ${filename}`);
    }
    catch (err) {
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
    if (!state_1.GlobalState.sessionToken)
        return;
    try {
        ensureCacheDirs();
        // 1. Flush cached usage logs
        const usagePath = path_1.default.join((0, exports.getOfflineCacheDir)(), 'usage-logs.json');
        if (fs_1.default.existsSync(usagePath)) {
            let logs = [];
            try {
                logs = JSON.parse(fs_1.default.readFileSync(usagePath, 'utf8')) || [];
            }
            catch (e) {
                logs = [];
            }
            if (logs.length > 0) {
                console.log(`Desktop Agent: Found ${logs.length} cached offline usage logs. Attempting to flush...`);
                const remainingLogs = [];
                for (const log of logs) {
                    try {
                        await axios_1.default.post(`${state_1.BACKEND_URL}/api/monitoring/usage-log`, log, { headers: { Authorization: `Bearer ${state_1.GlobalState.sessionToken}` } });
                        console.log(`Desktop Agent: Flushed usage log for ${log.appName}`);
                    }
                    catch (err) {
                        console.error(`Failed to flush cached usage log for ${log.appName}:`, err.message);
                        remainingLogs.push(log);
                    }
                }
                if (remainingLogs.length === 0) {
                    fs_1.default.unlinkSync(usagePath);
                    console.log('Desktop Agent: All cached usage logs successfully flushed.');
                }
                else {
                    fs_1.default.writeFileSync(usagePath, JSON.stringify(remainingLogs, null, 2), 'utf8');
                }
            }
        }
        // 2. Flush cached activity logs
        const activityPath = path_1.default.join((0, exports.getOfflineCacheDir)(), 'activity-logs.json');
        if (fs_1.default.existsSync(activityPath)) {
            let logs = [];
            try {
                logs = JSON.parse(fs_1.default.readFileSync(activityPath, 'utf8')) || [];
            }
            catch (e) {
                logs = [];
            }
            if (logs.length > 0) {
                console.log(`Desktop Agent: Found ${logs.length} cached offline activity logs. Attempting to flush...`);
                const remainingLogs = [];
                for (const log of logs) {
                    try {
                        await axios_1.default.post(`${state_1.BACKEND_URL}/api/monitoring/activity`, log, { headers: { Authorization: `Bearer ${state_1.GlobalState.sessionToken}` } });
                        console.log(`Desktop Agent: Flushed activity log for date ${log.date}`);
                    }
                    catch (err) {
                        console.error(`Failed to flush cached activity telemetry:`, err.message);
                        remainingLogs.push(log);
                    }
                }
                if (remainingLogs.length === 0) {
                    fs_1.default.unlinkSync(activityPath);
                    console.log('Desktop Agent: All cached activity logs successfully flushed.');
                }
                else {
                    fs_1.default.writeFileSync(activityPath, JSON.stringify(remainingLogs, null, 2), 'utf8');
                }
            }
        }
        // 3. Flush cached screenshots
        const ssDir = (0, exports.getOfflineScreenshotsDir)();
        if (fs_1.default.existsSync(ssDir)) {
            const files = fs_1.default.readdirSync(ssDir);
            const ssFiles = files.filter(f => f.startsWith('screenshot_') && f.endsWith('.json'));
            if (ssFiles.length > 0) {
                console.log(`Desktop Agent: Found ${ssFiles.length} cached offline screenshots. Attempting to flush...`);
                for (const file of ssFiles) {
                    const filePath = path_1.default.join(ssDir, file);
                    try {
                        const content = JSON.parse(fs_1.default.readFileSync(filePath, 'utf8'));
                        await axios_1.default.post(`${state_1.BACKEND_URL}/api/monitoring/screenshot`, {
                            image: content.image,
                            timestamp: content.timestamp
                        }, { headers: { Authorization: `Bearer ${state_1.GlobalState.sessionToken}` } });
                        fs_1.default.unlinkSync(filePath);
                        console.log(`Desktop Agent: Flushed offline screenshot file: ${file}`);
                    }
                    catch (err) {
                        console.error(`Failed to flush cached screenshot file ${file}:`, err.message);
                    }
                }
            }
        }
    }
    catch (err) {
        console.error('Desktop Agent: Failed to flush offline cache:', err.message);
    }
}
