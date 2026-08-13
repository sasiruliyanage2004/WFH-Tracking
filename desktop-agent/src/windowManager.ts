import { app, BrowserWindow } from 'electron';
import path from 'path';
import { GlobalState } from './state';
import { stopTracking } from './tracker';
import { startIdleDetection } from './idleDetector';

const isDev = !app.isPackaged;
const FRONTEND_URL = process.env.FRONTEND_URL || (isDev ? 'http://localhost:3000' : `file://${path.join(__dirname, '../../react-build/index.html')}`);

export function createSplashWindow() {
  GlobalState.splashWindow = new BrowserWindow({
    width: 450,
    height: 320,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    icon: path.join(__dirname, '../../win-icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  GlobalState.splashWindow.loadFile(path.join(__dirname, '../../splash.html'));

  GlobalState.splashWindow.on('closed', () => {
    GlobalState.splashWindow = null;
  });
}

export function createWindow(isHiddenStartup: boolean = false) {
  GlobalState.mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    icon: path.join(__dirname, '../../win-icon.ico'),
    backgroundColor: '#070b14',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload.js'), // preload is usually in dist/ or build/
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  GlobalState.mainWindow?.removeMenu();

  GlobalState.mainWindow?.webContents.on('before-input-event', (event, input) => {
    if (input.control && input.key.toLowerCase() === 'r') {
      GlobalState.mainWindow?.webContents.session.clearCache().then(() => {
        GlobalState.mainWindow?.reload();
      });
      event.preventDefault();
    }
    if (input.control && input.shift && input.key.toLowerCase() === 'i') {
      GlobalState.mainWindow?.webContents.openDevTools();
      event.preventDefault();
    }
  });

  GlobalState.mainWindow?.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[RENDERER CONSOLE] [Level ${level}] ${message} (at ${sourceId}:${line})`);
  });

  const startUrl = FRONTEND_URL;
  GlobalState.mainWindow?.loadURL(startUrl);

  GlobalState.mainWindow?.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });

  GlobalState.mainWindow?.webContents.on('did-finish-load', () => {
    setTimeout(() => {
      if (GlobalState.splashWindow) {
        GlobalState.splashWindow.close();
      }
      if (GlobalState.mainWindow && !isHiddenStartup) {
        GlobalState.mainWindow?.show();
        GlobalState.mainWindow?.focus();
      }
    }, 1500);
  });

  GlobalState.mainWindow?.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    if (isDev && (validatedURL.includes('localhost:3000') || validatedURL.includes('127.0.0.1:3000'))) {
      console.log('Failed to load React app on port 3000, waiting 2s and retrying...');
      setTimeout(() => {
        if (GlobalState.mainWindow && !GlobalState.mainWindow?.isDestroyed()) {
          GlobalState.mainWindow?.loadURL(startUrl);
        }
      }, 2000);
    }
  });

  GlobalState.mainWindow?.on('close', (event) => {
    if (!(app as any).isQuitting) {
      event.preventDefault();
      GlobalState.mainWindow?.hide();
    }
  });

  GlobalState.mainWindow?.on('closed', () => {
    stopTracking();
    GlobalState.mainWindow = null;
  });

  GlobalState.mainWindow?.on('maximize', () => {
    if (GlobalState.mainWindow && !GlobalState.mainWindow?.isDestroyed()) {
      GlobalState.mainWindow?.webContents.send('window:maximized');
    }
  });

  GlobalState.mainWindow?.on('unmaximize', () => {
    if (GlobalState.mainWindow && !GlobalState.mainWindow?.isDestroyed()) {
      GlobalState.mainWindow?.webContents.send('window:unmaximized');
    }
  });

  startIdleDetection();
}
