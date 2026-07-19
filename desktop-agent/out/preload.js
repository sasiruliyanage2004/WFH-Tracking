"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('api', {
    getDeviceInfo: () => electron_1.ipcRenderer.invoke('device:info'),
    toggleTracking: (active, token) => electron_1.ipcRenderer.send('tracking:toggle', { active, token }),
    setBreakStatus: (isOnBreak) => electron_1.ipcRenderer.send('break:status', { isOnBreak }),
    cacheOfflineScreenshot: (image) => electron_1.ipcRenderer.send('screenshot:cache', { image }),
    captureScreen: () => electron_1.ipcRenderer.invoke('screen:capture'),
    minimizeWindow: () => electron_1.ipcRenderer.send('window:minimize'),
    maximizeWindow: () => electron_1.ipcRenderer.send('window:maximize'),
    closeWindow: () => electron_1.ipcRenderer.send('window:close'),
    showNotification: (title, body) => electron_1.ipcRenderer.send('notification:show', { title, body }),
    setZoomFactor: (factor) => {
        try {
            electron_1.webFrame.setZoomFactor(factor);
        }
        catch (e) {
            console.error('Preload: Failed to set zoom factor:', e);
        }
    },
    getZoomFactor: () => {
        try {
            return electron_1.webFrame.getZoomFactor();
        }
        catch (e) {
            return 1.0;
        }
    },
    onAutoCheckedOut: (callback) => {
        electron_1.ipcRenderer.removeAllListeners('shift-auto-checked-out');
        electron_1.ipcRenderer.on('shift-auto-checked-out', () => callback());
    },
    onIdlePrompt: (callback) => {
        electron_1.ipcRenderer.removeAllListeners('idle:prompt-break');
        electron_1.ipcRenderer.on('idle:prompt-break', (event, data) => callback(data));
    },
    onWindowMaximize: (callback) => {
        electron_1.ipcRenderer.removeAllListeners('window:maximized');
        electron_1.ipcRenderer.on('window:maximized', () => callback(true));
    },
    onWindowUnmaximize: (callback) => {
        electron_1.ipcRenderer.removeAllListeners('window:unmaximized');
        electron_1.ipcRenderer.on('window:unmaximized', () => callback(false));
    }
});
