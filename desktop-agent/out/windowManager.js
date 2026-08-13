"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSplashWindow = createSplashWindow;
exports.createWindow = createWindow;
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const state_1 = require("./state");
const tracker_1 = require("./tracker");
const idleDetector_1 = require("./idleDetector");
const isDev = !electron_1.app.isPackaged;
const FRONTEND_URL = process.env.FRONTEND_URL || (isDev ? 'http://localhost:3000' : `file://${path_1.default.join(__dirname, '../../react-build/index.html')}`);
function createSplashWindow() {
    state_1.GlobalState.splashWindow = new electron_1.BrowserWindow({
        width: 450,
        height: 320,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        resizable: false,
        icon: path_1.default.join(__dirname, '../../win-icon.ico'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });
    state_1.GlobalState.splashWindow.loadFile(path_1.default.join(__dirname, '../../splash.html'));
    state_1.GlobalState.splashWindow.on('closed', () => {
        state_1.GlobalState.splashWindow = null;
    });
}
function createWindow(isHiddenStartup = false) {
    state_1.GlobalState.mainWindow = new electron_1.BrowserWindow({
        width: 1280,
        height: 800,
        show: false,
        icon: path_1.default.join(__dirname, '../../win-icon.ico'),
        backgroundColor: '#070b14',
        autoHideMenuBar: true,
        webPreferences: {
            preload: path_1.default.join(__dirname, '../preload.js'), // preload is usually in dist/ or build/
            nodeIntegration: false,
            contextIsolation: true
        }
    });
    state_1.GlobalState.mainWindow?.removeMenu();
    state_1.GlobalState.mainWindow?.webContents.on('before-input-event', (event, input) => {
        if (input.control && input.key.toLowerCase() === 'r') {
            state_1.GlobalState.mainWindow?.webContents.session.clearCache().then(() => {
                state_1.GlobalState.mainWindow?.reload();
            });
            event.preventDefault();
        }
        if (input.control && input.shift && input.key.toLowerCase() === 'i') {
            state_1.GlobalState.mainWindow?.webContents.openDevTools();
            event.preventDefault();
        }
    });
    state_1.GlobalState.mainWindow?.webContents.on('console-message', (event, level, message, line, sourceId) => {
        console.log(`[RENDERER CONSOLE] [Level ${level}] ${message} (at ${sourceId}:${line})`);
    });
    const startUrl = FRONTEND_URL;
    state_1.GlobalState.mainWindow?.loadURL(startUrl);
    state_1.GlobalState.mainWindow?.webContents.setWindowOpenHandler(({ url }) => {
        require('electron').shell.openExternal(url);
        return { action: 'deny' };
    });
    state_1.GlobalState.mainWindow?.webContents.on('did-finish-load', () => {
        setTimeout(() => {
            if (state_1.GlobalState.splashWindow) {
                state_1.GlobalState.splashWindow.close();
            }
            if (state_1.GlobalState.mainWindow && !isHiddenStartup) {
                state_1.GlobalState.mainWindow?.show();
                state_1.GlobalState.mainWindow?.focus();
            }
        }, 1500);
    });
    state_1.GlobalState.mainWindow?.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
        if (isDev && (validatedURL.includes('localhost:3000') || validatedURL.includes('127.0.0.1:3000'))) {
            console.log('Failed to load React app on port 3000, waiting 2s and retrying...');
            setTimeout(() => {
                if (state_1.GlobalState.mainWindow && !state_1.GlobalState.mainWindow?.isDestroyed()) {
                    state_1.GlobalState.mainWindow?.loadURL(startUrl);
                }
            }, 2000);
        }
    });
    state_1.GlobalState.mainWindow?.on('close', (event) => {
        if (!electron_1.app.isQuitting) {
            event.preventDefault();
            state_1.GlobalState.mainWindow?.hide();
        }
    });
    state_1.GlobalState.mainWindow?.on('closed', () => {
        (0, tracker_1.stopTracking)();
        state_1.GlobalState.mainWindow = null;
    });
    state_1.GlobalState.mainWindow?.on('maximize', () => {
        if (state_1.GlobalState.mainWindow && !state_1.GlobalState.mainWindow?.isDestroyed()) {
            state_1.GlobalState.mainWindow?.webContents.send('window:maximized');
        }
    });
    state_1.GlobalState.mainWindow?.on('unmaximize', () => {
        if (state_1.GlobalState.mainWindow && !state_1.GlobalState.mainWindow?.isDestroyed()) {
            state_1.GlobalState.mainWindow?.webContents.send('window:unmaximized');
        }
    });
    (0, idleDetector_1.startIdleDetection)();
}
