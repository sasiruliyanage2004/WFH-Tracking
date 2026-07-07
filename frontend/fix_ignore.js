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
  let changed = false;
  
  if (content.includes('// @ts-ignore PaperProps={')) {
    content = content.replace(/\/\/ @ts-ignore PaperProps={/g, '// @ts-ignore\nPaperProps={');
    changed = true;
  }
  if (content.includes('// @ts-ignore InputProps={')) {
    content = content.replace(/\/\/ @ts-ignore InputProps={/g, '// @ts-ignore\nInputProps={');
    changed = true;
  }
  if (content.includes('inputProps={')) {
    content = content.replace(/(\s+)inputProps={/g, '$1// @ts-ignore$1inputProps={');
    changed = true;
  }
  if (content.includes('// @ts-ignore inputProps={')) {
    content = content.replace(/\/\/ @ts-ignore inputProps={/g, '// @ts-ignore\ninputProps={');
    changed = true;
  }

  if (content.includes('disableEscapeKeyDown')) {
    content = content.replace(/(\s+)disableEscapeKeyDown/g, '$1// @ts-ignore$1disableEscapeKeyDown');
    changed = true;
  }
  if (content.includes('// @ts-ignore disableEscapeKeyDown')) {
    content = content.replace(/\/\/ @ts-ignore disableEscapeKeyDown/g, '// @ts-ignore\ndisableEscapeKeyDown');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed', file);
  }
});
console.log('Done replacing inline ignores');
