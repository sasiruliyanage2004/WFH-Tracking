const { contextBridge, ipcRenderer, webFrame } = require('electron');

contextBridge.exposeInMainWorld('api', {
  toggleTracking: (active, token) => ipcRenderer.send('tracking:toggle', { active, token }),
  cacheOfflineScreenshot: (image) => ipcRenderer.send('screenshot:cache', { image }),
  captureScreen: () => ipcRenderer.invoke('screen:capture'),
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
  setZoomFactor: (factor) => {
    try {
      webFrame.setZoomFactor(factor);
    } catch (e) {
      console.error('Preload: Failed to set zoom factor:', e);
    }
  },
  getZoomFactor: () => {
    try {
      return webFrame.getZoomFactor();
    } catch (e) {
      return 1.0;
    }
  }
});
