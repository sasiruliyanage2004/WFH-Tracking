"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupIpcHandlers = setupIpcHandlers;
const electron_1 = require("electron");
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const node_machine_id_1 = require("node-machine-id");
const state_1 = require("./state");
const tracker_1 = require("./tracker");
const offlineCache_1 = require("./offlineCache");
function setupIpcHandlers() {
    electron_1.ipcMain.on('notification:show', (event, { title, body }) => {
        if (electron_1.Notification.isSupported()) {
            new electron_1.Notification({ title, body, icon: path_1.default.join(__dirname, '../../win-icon.ico') }).show();
        }
    });
    electron_1.ipcMain.handle('screen:capture', async () => {
        try {
            const sources = await electron_1.desktopCapturer.getSources({
                types: ['screen'],
                thumbnailSize: { width: 1280, height: 720 }
            });
            if (sources.length > 0) {
                return sources.map(source => source.thumbnail.toDataURL());
            }
        }
        catch (err) {
            console.error('Native screen capture failed:', err.message);
        }
        return null;
    });
    electron_1.ipcMain.handle('device:info', async () => {
        try {
            const id = (0, node_machine_id_1.machineIdSync)();
            const hostname = os_1.default.hostname();
            const platform = os_1.default.platform();
            return { machineId: id, hostname, os: platform };
        }
        catch (err) {
            console.error('Failed to get device info:', err);
            return null;
        }
    });
    electron_1.ipcMain.on('screenshot:cache', (event, { image }) => {
        try {
            (0, offlineCache_1.ensureCacheDirs)();
            const timestamp = Date.now();
            const filePath = path_1.default.join((0, offlineCache_1.getOfflineScreenshotsDir)(), `screenshot_${timestamp}.json`);
            const payload = { image, timestamp };
            fs_1.default.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
            console.log(`Desktop Agent: Cached screenshot offline: screenshot_${timestamp}.json`);
        }
        catch (err) {
            console.error('Desktop Agent: Failed to cache screenshot offline:', err.message);
        }
    });
    electron_1.ipcMain.on('tracking:toggle', (event, { active, token }) => {
        if (active && token) {
            state_1.GlobalState.sessionToken = token;
            (0, tracker_1.startTracking)();
        }
        else {
            (0, tracker_1.stopTracking)();
        }
    });
    electron_1.ipcMain.on('break:status', (event, { isOnBreak }) => {
        if (isOnBreak) {
            if (!state_1.GlobalState.breakInterval) {
                state_1.GlobalState.activeMinutesOnBreak = 0;
                state_1.GlobalState.breakInterval = setInterval(() => {
                    const idleTime = electron_1.powerMonitor.getSystemIdleTime();
                    if (idleTime < 60) {
                        state_1.GlobalState.activeMinutesOnBreak += 1;
                    }
                    if (state_1.GlobalState.activeMinutesOnBreak >= 15) {
                        if (electron_1.Notification.isSupported()) {
                            const notif = new electron_1.Notification({
                                title: 'WFH Tracker',
                                body: 'You have been active for 15 minutes while on break! Did you forget to end your break?'
                            });
                            notif.on('click', () => {
                                if (state_1.GlobalState.mainWindow) {
                                    if (state_1.GlobalState.mainWindow.isMinimized())
                                        state_1.GlobalState.mainWindow.restore();
                                    state_1.GlobalState.mainWindow.show();
                                    state_1.GlobalState.mainWindow.focus();
                                }
                            });
                            notif.show();
                        }
                        state_1.GlobalState.activeMinutesOnBreak = 0;
                    }
                }, 60000);
            }
        }
        else {
            if (state_1.GlobalState.breakInterval) {
                clearInterval(state_1.GlobalState.breakInterval);
                state_1.GlobalState.breakInterval = null;
            }
            state_1.GlobalState.activeMinutesOnBreak = 0;
        }
    });
    electron_1.ipcMain.on('window:minimize', () => {
        if (state_1.GlobalState.mainWindow)
            state_1.GlobalState.mainWindow.minimize();
    });
    electron_1.ipcMain.on('window:maximize', () => {
        if (state_1.GlobalState.mainWindow) {
            if (state_1.GlobalState.mainWindow.isMaximized()) {
                state_1.GlobalState.mainWindow.unmaximize();
            }
            else {
                state_1.GlobalState.mainWindow.maximize();
            }
        }
    });
    electron_1.ipcMain.on('window:close', () => {
        if (state_1.GlobalState.mainWindow)
            state_1.GlobalState.mainWindow.hide();
    });
}
