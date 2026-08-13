process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
import { app, BrowserWindow, Menu, session } from 'electron';
import path from 'path';
import { autoUpdater } from 'electron-updater';
import axios from 'axios';
import { GlobalState, BACKEND_URL } from './state';
import { createSplashWindow, createWindow } from './windowManager';
import { setupTray } from './trayManager';
import { setupIpcHandlers } from './ipcHandlers';
import { stopTracking } from './tracker';

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('workforceos', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('workforceos');
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (GlobalState.mainWindow) {
      if (GlobalState.mainWindow.isMinimized()) GlobalState.mainWindow.restore();
      GlobalState.mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    app.setLoginItemSettings({
      openAtLogin: true,
      openAsHidden: true,
      args: ['--hidden']
    });

    const isHiddenStartup = process.argv.includes('--hidden');

    autoUpdater.checkForUpdatesAndNotify();
    
    autoUpdater.on('update-available', () => {
      console.log('Update available.');
    });
    
    autoUpdater.on('update-downloaded', () => {
      console.log('Update downloaded. Quitting and installing...');
      autoUpdater.quitAndInstall();
    });
    
    autoUpdater.on('error', (err) => {
      console.error('Auto-updater error:', err);
    });

    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
      if (permission === 'geolocation' || permission === 'media' || permission === 'display-capture') {
        return callback(true);
      }
      callback(false);
    });

    session.defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
      if (permission === 'geolocation' || permission === 'media') {
        return true;
      }
      return false;
    });

    Menu.setApplicationMenu(null);
    
    setupTray();
    setupIpcHandlers();

    if (!isHiddenStartup) {
      createSplashWindow();
    }
    createWindow(isHiddenStartup);

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      // We don't quit on window close, it runs in the tray!
    }
  });
}

app.on('before-quit', (event) => {
  if (GlobalState.sessionToken && !GlobalState.isCheckingOut) {
    event.preventDefault();
    GlobalState.isCheckingOut = true;
    console.log('App quitting/OS Shutdown detected. Attempting auto check-out...');
    axios.post(`${BACKEND_URL}/api/attendance/checkout`, {}, {
      headers: { Authorization: `Bearer ${GlobalState.sessionToken}` },
      timeout: 3000
    }).then(() => {
      console.log('Auto check-out on shutdown successful.');
    }).catch(err => {
      console.error('Auto check-out failed on shutdown:', err.message);
    }).finally(() => {
      (app as any).isQuitting = true;
      app.quit();
    });
  }
});

app.on('will-quit', () => {
  stopTracking();
});
