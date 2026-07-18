const fs = require('fs');

function convertImports(file) {
  let data = fs.readFileSync(file, 'utf8');
  // convert const { ... } = require(...)
  data = data.replace(/const\s+(\{[^}]+\})\s*=\s*require\(['"]([^'"]+)['"]\);/g, "import $1 from '$2';");
  // convert const name = require(...)
  data = data.replace(/const\s+([a-zA-Z0-9_]+)\s*=\s*require\(['"]([^'"]+)['"]\);/g, "import * as $1 from '$2';");
  
  // replace some generic requires that should be default imports or specific:
  data = data.replace(/import \* as path from 'path';/g, "import path from 'path';");
  data = data.replace(/import \* as fs from 'fs';/g, "import fs from 'fs';");
  data = data.replace(/import \* as os from 'os';/g, "import os from 'os';");
  
  // add any types to catch clauses to satisfy typescript
  data = data.replace(/catch\s*\((err|e)\)\s*\{/g, "catch ($1: any) {");

  fs.writeFileSync(file, data);
}

convertImports('src/main.ts');
convertImports('src/preload.ts');
convertImports('src/upload_release.ts');
convertImports('src/update_bucket.ts');
