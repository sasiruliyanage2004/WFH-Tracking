import { app, Menu, Tray } from 'electron';
import path from 'path';
import { GlobalState } from './state';

export function setupTray() {
  GlobalState.tray = new Tray(path.join(__dirname, '../../win-icon.ico'));
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open WFH Tracker', click: () => GlobalState.mainWindow && GlobalState.mainWindow.show() },
    { type: 'separator' },
    { label: 'Quit', click: () => {
      (app as any).isQuitting = true;
      app.quit();
    }}
  ]);
  GlobalState.tray.setToolTip('WFH Tracker');
  GlobalState.tray.setContextMenu(contextMenu);
  GlobalState.tray.on('double-click', () => {
    if (GlobalState.mainWindow) GlobalState.mainWindow.show();
  });
}
