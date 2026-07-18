const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'src', 'interfaces', 'routes');
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));

files.forEach(file => {
  const filePath = path.join(routesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace common requires
  content = content.replace(/const express = require\('express'\);/g, "import express, { Request, Response } from 'express';");
  content = content.replace(/const router = express\.Router\(\);/g, "const router = express.Router();");
  content = content.replace(/const supabase = require\('([^']+)'\);/g, "import supabase from '$1';");
  content = content.replace(/const bcrypt = require\('bcryptjs'\);/g, "import bcrypt from 'bcryptjs';");
  content = content.replace(/const jwt = require\('jsonwebtoken'\);/g, "import jwt from 'jsonwebtoken';");
  content = content.replace(/const crypto = require\('crypto'\);/g, "import crypto from 'crypto';");
  content = content.replace(/const fs = require\('fs'\);/g, "import fs from 'fs';");
  content = content.replace(/const path = require\('path'\);/g, "import path from 'path';");
  content = content.replace(/const multer = require\('multer'\);/g, "import multer from 'multer';");
  
  // Replace auth import (handling { authenticate, authorize } = ...)
  content = content.replace(/const {([^}]+)} = require\('([^']+auth)'\);/g, "import {$1} from '$2';");
  // Replace email import
  content = content.replace(/const {([^}]+)} = require\('([^']+email)'\);/g, "import {$1} from '$2';");

  // Add types to req, res
  content = content.replace(/async \(req, res\)/g, "async (req: Request, res: Response)");
  content = content.replace(/async \(req, res, next\)/g, "async (req: Request, res: Response, next: any)");
  
  // Export default
  content = content.replace(/module\.exports = router;/g, "export default router;");

  const tsFilePath = path.join(routesDir, file.replace('.js', '.ts'));
  fs.writeFileSync(tsFilePath, content);
  fs.unlinkSync(filePath); // delete original js
  console.log(`Migrated ${file} to ${path.basename(tsFilePath)}`);
});

// Now migrate index.js to index.ts
let indexContent = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');
indexContent = indexContent.replace(/const express = require\('express'\);/g, "import express from 'express';");
indexContent = indexContent.replace(/const cors = require\('cors'\);/g, "import cors from 'cors';");
indexContent = indexContent.replace(/const helmet = require\('helmet'\);/g, "import helmet from 'helmet';");
indexContent = indexContent.replace(/const http = require\('http'\);/g, "import http from 'http';");
indexContent = indexContent.replace(/const { Server } = require\('socket\.io'\);/g, "import { Server } from 'socket.io';");
indexContent = indexContent.replace(/const path = require\('path'\);/g, "import path from 'path';");
indexContent = indexContent.replace(/const fs = require\('fs'\);/g, "import fs from 'fs';");

// Routes
indexContent = indexContent.replace(/const ([a-zA-Z]+Routes) = require\('\.\/src\/interfaces\/routes\/([a-zA-Z]+)'\);/g, "import $1 from './src/interfaces/routes/$2';");

// Services
indexContent = indexContent.replace(/const logger = require\('\.\/src\/infrastructure\/services\/logger'\);/g, "import logger from './src/infrastructure/services/logger';");

// Middlewares
indexContent = indexContent.replace(/const { ([^}]+) } = require\('\.\/src\/interfaces\/middlewares\/([^']+)'\);/g, "import { $1 } from './src/interfaces/middlewares/$2';");

// DB
indexContent = indexContent.replace(/const supabase = require\('\.\/src\/infrastructure\/database\/supabase'\);/g, "import supabase from './src/infrastructure/database/supabase';");

// Add Request, Response
indexContent = indexContent.replace(/import express from 'express';/, "import express, { Request, Response, NextFunction } from 'express';");

// Error handler
indexContent = indexContent.replace(/\(err, req, res, next\)/g, "(err: any, req: Request, res: Response, next: NextFunction)");
indexContent = indexContent.replace(/\(req, res\)/g, "(req: Request, res: Response)");
indexContent = indexContent.replace(/\(req, res, next\)/g, "(req: Request, res: Response, next: NextFunction)");

fs.writeFileSync(path.join(__dirname, 'index.ts'), indexContent);
fs.unlinkSync(path.join(__dirname, 'index.js'));
console.log('Migrated index.js to index.ts');
