const fs = require('fs');

let data = fs.readFileSync('src/main.ts', 'utf8');

// Using optional chaining or if checks
data = data.replace(/mainWindow\.removeMenu\(\)/g, 'mainWindow?.removeMenu()');
data = data.replace(/mainWindow\.webContents/g, 'mainWindow?.webContents');
data = data.replace(/mainWindow\.reload\(\)/g, 'mainWindow?.reload()');
data = data.replace(/mainWindow\.loadURL/g, 'mainWindow?.loadURL');
data = data.replace(/mainWindow\.show\(\)/g, 'mainWindow?.show()');
data = data.replace(/mainWindow\.focus\(\)/g, 'mainWindow?.focus()');
data = data.replace(/mainWindow\.hide\(\)/g, 'mainWindow?.hide()');
data = data.replace(/mainWindow\.on/g, 'mainWindow?.on');
data = data.replace(/mainWindow\.isMinimized\(\)/g, 'mainWindow?.isMinimized()');
data = data.replace(/mainWindow\.restore\(\)/g, 'mainWindow?.restore()');
data = data.replace(/mainWindow\.isMaximized\(\)/g, 'mainWindow?.isMaximized()');
data = data.replace(/mainWindow\.unmaximize\(\)/g, 'mainWindow?.unmaximize()');
data = data.replace(/mainWindow\.maximize\(\)/g, 'mainWindow?.maximize()');
data = data.replace(/mainWindow\.isDestroyed\(\)/g, 'mainWindow?.isDestroyed()');

fs.writeFileSync('src/main.ts', data);
