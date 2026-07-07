const fs = require('fs');
const path = require('path');

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Fix useSelector
      content = content.replace(/useSelector\(\(state\)\s*=>/g, 'useSelector((state: any) =>');
      content = content.replace(/useSelector\(state\s*=>/g, 'useSelector((state: any) =>');
      
      // Fix event types if they are failing (though strict:false might allow them if they implicitly have 'any')
      
      fs.writeFileSync(fullPath, content, 'utf8');
    }
  }
}

walkDir(path.join(__dirname, 'src'));
console.log('Fixed types in src');
