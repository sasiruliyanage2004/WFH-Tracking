const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  toggleTracking: (active, token) => ipcRenderer.send('tracking:toggle', { active, token }),
  captureScreen: () => ipcRenderer.invoke('screen:capture')
});
