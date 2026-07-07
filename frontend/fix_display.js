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
    } else if (file.endsWith('.tsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Remove `// @ts-ignore` preceding the line if it exists
  content = content.replace(/\/\/\s*@ts-ignore\s*<Typography([^>]*)display="block"/g, '<Typography$1display="block"');
  
  // Replace `display="block"` with nothing, and add display: 'block' to sx
  // This is tricky because sx might not exist, or might already exist.
  // Actually, we can just replace `<Typography(.*?)display="block"(.*?)>` with `<Box component={Typography}$1$2 display="block">`! Wait, no, just remove `display="block"` and append `component="div"`.
  // Wait, the TS error is because `display` is not a prop of `Typography`. In MUI v6, we use `sx={{ display: 'block' }}`.
  
  // Let's replace `display="block"` with `component="div"` which essentially behaves like a block!
  content = content.replace(/display="block"/g, 'component="div"');

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed', file);
  }
});
console.log('Done fixing display');
