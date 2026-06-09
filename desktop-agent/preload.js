const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  login: (email, password) => ipcRenderer.send('auth:login', { email, password }),
  logout: () => ipcRenderer.send('auth:logout'),
  toggleTracking: (active) => ipcRenderer.send('tracking:toggle', active),
  closeWindow: () => ipcRenderer.send('window:close'),
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  
  // Listeners from Main to Renderer
  onAuthResult: (callback) => ipcRenderer.on('auth:result', (event, data) => callback(data)),
  onStatusUpdate: (callback) => ipcRenderer.on('tracking:status', (event, data) => callback(data)),
  onTrackingTick: (callback) => ipcRenderer.on('tracking:tick', (event, data) => callback(data))
});
