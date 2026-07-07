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
  
  // Find <Grid ...> tags
  content = content.replace(/<Grid(?=\s|\/|>)([^>]*?)>/g, (match, propsStr) => {
    // Check for size props
    const sizeProps = ['xs', 'sm', 'md', 'lg', 'xl'];
    let sizeObj = [];
    
    let newPropsStr = propsStr;
    
    sizeProps.forEach(bp => {
      // match bp={value}
      const regex = new RegExp(`\\b${bp}={([^}]+)}`);
      const bpMatch = newPropsStr.match(regex);
      if (bpMatch) {
        sizeObj.push(`${bp}: ${bpMatch[1]}`);
        newPropsStr = newPropsStr.replace(bpMatch[0], '');
      } else {
        // match bp="value" or bp=value
        const regex2 = new RegExp(`\\b${bp}=(["'][^"']+["']|\\d+)`);
        const bpMatch2 = newPropsStr.match(regex2);
        if (bpMatch2) {
          sizeObj.push(`${bp}: ${bpMatch2[1]}`);
          newPropsStr = newPropsStr.replace(bpMatch2[0], '');
        } else {
          // match bp (boolean)
          const regex3 = new RegExp(`\\b${bp}(?=\\s|\\/|$)`);
          const bpMatch3 = newPropsStr.match(regex3);
          if (bpMatch3) {
            sizeObj.push(`${bp}: true`);
            newPropsStr = newPropsStr.replace(bpMatch3[0], '');
          }
        }
      }
    });
    
    if (sizeObj.length > 0) {
      changed = true;
      const isSelfClosing = newPropsStr.trim().endsWith('/');
      if (isSelfClosing) {
        newPropsStr = newPropsStr.replace(/\/$/, '').trim();
        newPropsStr = newPropsStr + ` size={{ ${sizeObj.join(', ')} }} /`;
      } else {
        newPropsStr = newPropsStr.trim() + ` size={{ ${sizeObj.join(', ')} }}`;
      }
      return `<Grid ${newPropsStr.trim()}>`;
    }
    
    return match;
  });

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed', file);
  }
});
console.log('Done replacing Grid props');
