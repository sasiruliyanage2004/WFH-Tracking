"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupTray = setupTray;
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const state_1 = require("./state");
function setupTray() {
    state_1.GlobalState.tray = new electron_1.Tray(path_1.default.join(__dirname, '../../win-icon.ico'));
    const contextMenu = electron_1.Menu.buildFromTemplate([
        { label: 'Open WFH Tracker', click: () => state_1.GlobalState.mainWindow && state_1.GlobalState.mainWindow.show() },
        { type: 'separator' },
        { label: 'Quit', click: () => {
                electron_1.app.isQuitting = true;
                electron_1.app.quit();
            } }
    ]);
    state_1.GlobalState.tray.setToolTip('WFH Tracker');
    state_1.GlobalState.tray.setContextMenu(contextMenu);
    state_1.GlobalState.tray.on('double-click', () => {
        if (state_1.GlobalState.mainWindow)
            state_1.GlobalState.mainWindow.show();
    });
}
