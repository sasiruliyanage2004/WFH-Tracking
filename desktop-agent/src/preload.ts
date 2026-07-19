import { contextBridge, ipcRenderer, webFrame } from 'electron';

contextBridge.exposeInMainWorld('api', {
  getDeviceInfo: () => ipcRenderer.invoke('device:info'),
  toggleTracking: (active, token) => ipcRenderer.send('tracking:toggle', { active, token }),
  setBreakStatus: (isOnBreak) => ipcRenderer.send('break:status', { isOnBreak }),
  cacheOfflineScreenshot: (image) => ipcRenderer.send('screenshot:cache', { image }),
  captureScreen: () => ipcRenderer.invoke('screen:capture'),
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
  showNotification: (title: string, body: string) => ipcRenderer.send('notification:show', { title, body }),
  setZoomFactor: (factor) => {
    try {
      webFrame.setZoomFactor(factor);
    } catch (e: any) {
      console.error('Preload: Failed to set zoom factor:', e);
    }
  },
  getZoomFactor: () => {
    try {
      return webFrame.getZoomFactor();
    } catch (e: any) {
      return 1.0;
    }
  },
  onAutoCheckedOut: (callback) => {
    ipcRenderer.removeAllListeners('shift-auto-checked-out');
    ipcRenderer.on('shift-auto-checked-out', () => callback());
  },
  onIdlePrompt: (callback) => {
    ipcRenderer.removeAllListeners('idle:prompt-break');
    ipcRenderer.on('idle:prompt-break', (event, data) => callback(data));
  },
  onIdleAutoCheckout: (callback) => {
    ipcRenderer.removeAllListeners('idle:auto-checkout');
    ipcRenderer.on('idle:auto-checkout', () => callback());
  },
  onWindowMaximize: (callback) => {
    ipcRenderer.removeAllListeners('window:maximized');
    ipcRenderer.on('window:maximized', () => callback(true));
  },
  onWindowUnmaximize: (callback) => {
    ipcRenderer.removeAllListeners('window:unmaximized');
    ipcRenderer.on('window:unmaximized', () => callback(false));
  }
});
