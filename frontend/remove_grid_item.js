const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.js')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('<Grid item') || content.includes('item>')) {
    content = content.replace(/<Grid\s+item(?=\s|>)/g, '<Grid');
    content = content.replace(/<Grid\s([^>]*)\sitem(?=\s|>)/g, '<Grid $1');
    fs.writeFileSync(file, content, 'utf8');
  }
});
console.log('Done replacing Grid item');
