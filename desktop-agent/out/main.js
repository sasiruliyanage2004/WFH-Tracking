"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const electron_updater_1 = require("electron-updater");
const axios_1 = __importDefault(require("axios"));
const state_1 = require("./state");
const windowManager_1 = require("./windowManager");
const trayManager_1 = require("./trayManager");
const ipcHandlers_1 = require("./ipcHandlers");
const tracker_1 = require("./tracker");
if (process.defaultApp) {
    if (process.argv.length >= 2) {
        electron_1.app.setAsDefaultProtocolClient('workforceos', process.execPath, [path_1.default.resolve(process.argv[1])]);
    }
}
else {
    electron_1.app.setAsDefaultProtocolClient('workforceos');
}
const gotTheLock = electron_1.app.requestSingleInstanceLock();
if (!gotTheLock) {
    electron_1.app.quit();
}
else {
    electron_1.app.on('second-instance', (event, commandLine, workingDirectory) => {
        if (state_1.GlobalState.mainWindow) {
            if (state_1.GlobalState.mainWindow.isMinimized())
                state_1.GlobalState.mainWindow.restore();
            state_1.GlobalState.mainWindow.focus();
        }
    });
    electron_1.app.whenReady().then(() => {
        electron_1.app.setLoginItemSettings({
            openAtLogin: true,
            openAsHidden: true,
            args: ['--hidden']
        });
        const isHiddenStartup = process.argv.includes('--hidden');
        electron_updater_1.autoUpdater.checkForUpdatesAndNotify();
        electron_updater_1.autoUpdater.on('update-available', () => {
            console.log('Update available.');
        });
        electron_updater_1.autoUpdater.on('update-downloaded', () => {
            console.log('Update downloaded. Quitting and installing...');
            electron_updater_1.autoUpdater.quitAndInstall();
        });
        electron_updater_1.autoUpdater.on('error', (err) => {
            console.error('Auto-updater error:', err);
        });
        electron_1.session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
            if (permission === 'geolocation' || permission === 'media' || permission === 'display-capture') {
                return callback(true);
            }
            callback(false);
        });
        electron_1.session.defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
            if (permission === 'geolocation' || permission === 'media') {
                return true;
            }
            return false;
        });
        electron_1.Menu.setApplicationMenu(null);
        (0, trayManager_1.setupTray)();
        (0, ipcHandlers_1.setupIpcHandlers)();
        if (!isHiddenStartup) {
            (0, windowManager_1.createSplashWindow)();
        }
        (0, windowManager_1.createWindow)(isHiddenStartup);
        electron_1.app.on('activate', () => {
            if (electron_1.BrowserWindow.getAllWindows().length === 0) {
                (0, windowManager_1.createWindow)();
            }
        });
    });
    electron_1.app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            // We don't quit on window close, it runs in the tray!
        }
    });
}
electron_1.app.on('before-quit', (event) => {
    if (state_1.GlobalState.sessionToken && !state_1.GlobalState.isCheckingOut) {
        event.preventDefault();
        state_1.GlobalState.isCheckingOut = true;
        console.log('App quitting/OS Shutdown detected. Attempting auto check-out...');
        axios_1.default.post(`${state_1.BACKEND_URL}/api/attendance/checkout`, {}, {
            headers: { Authorization: `Bearer ${state_1.GlobalState.sessionToken}` },
            timeout: 3000
        }).then(() => {
            console.log('Auto check-out on shutdown successful.');
        }).catch(err => {
            console.error('Auto check-out failed on shutdown:', err.message);
        }).finally(() => {
            electron_1.app.isQuitting = true;
            electron_1.app.quit();
        });
    }
});
electron_1.app.on('will-quit', () => {
    (0, tracker_1.stopTracking)();
});
