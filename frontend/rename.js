const fs = require('fs');
const path = require('path');

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.js')) {
      fs.renameSync(fullPath, fullPath.replace(/\.js$/, '.tsx'));
    }
  }
}

walkDir(path.join(__dirname, 'src'));
console.log('Renamed all .js to .tsx in src');
