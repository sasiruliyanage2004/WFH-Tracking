const fs = require('fs');
const path = require('path');

const routeFiles = ['authRoutes.js', 'adminRoutes.js'];
const dir = path.join(__dirname, 'src', 'interfaces', 'routes');

routeFiles.forEach(file => {
  const filePath = path.join(dir, file);
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');

  // Convert to ES6
  content = content.replace(/const express = require\('express'\);/g, "import express, { Request, Response } from 'express';");
  content = content.replace(/const router = express\.Router\(\);/g, "const router = express.Router();");
  content = content.replace(/const bcrypt = require\('bcryptjs'\);/g, "import bcrypt from 'bcryptjs';");
  content = content.replace(/const jwt = require\('jsonwebtoken'\);/g, "import jwt from 'jsonwebtoken';");
  content = content.replace(/const crypto = require\('crypto'\);/g, "import crypto from 'crypto';");
  content = content.replace(/const fs = require\('fs'\);/g, "import fs from 'fs';");
  content = content.replace(/const path = require\('path'\);/g, "import path from 'path';");
  content = content.replace(/const multer = require\('multer'\);/g, "import multer from 'multer';");
  content = content.replace(/const supabase = require\('\.\.\/\.\.\/infrastructure\/database\/supabase'\);/g, "import supabase from '../../infrastructure/database/supabase';");
  content = content.replace(/const \{ authenticate, authorize \} = require\('\.\.\/middlewares\/auth'\);/g, "import { authenticate, authorize } from '../middlewares/auth';");
  content = content.replace(/const \{ authenticate \} = require\('\.\.\/middlewares\/auth'\);/g, "import { authenticate } from '../middlewares/auth';");
  content = content.replace(/const \{ sendPasswordResetEmail, sendRegistrationOTPEmail \} = require\('\.\.\/\.\.\/infrastructure\/services\/email'\);/g, "import { sendPasswordResetEmail, sendRegistrationOTPEmail } from '../../infrastructure/services/email';");
  
  // Add new helpers
  const importHelpers = "import { toMongo, generateId } from '../../utils/helpers';\nimport { sendNotification } from '../../infrastructure/services/notification';\n";
  content = content.replace("import express, { Request, Response } from 'express';", importHelpers + "import express, { Request, Response } from 'express';");

  // Remove local toMongo
  content = content.replace(/const toMongo = \(user\) => \{[\s\S]*?return \{[\s\S]*?\};[\s\S]*?\};\r?\n/g, "");
  // Remove local generateId
  content = content.replace(/const generateId = \(\) => \{[\s\S]*?return crypto\.randomBytes\(12\)\.toString\('hex'\);[\s\S]*?\};\r?\n/g, "");

  // Fix types
  content = content.replace(/async \(req, res\)/g, "async (req: Request, res: Response)");
  content = content.replace(/catch \(err\)/g, "catch (err: any)");
  
  // Fix req.user assertions
  content = content.replace(/req\.user\./g, "req.user!.");
  content = content.replace(/req\.user!\.id/g, "req.user!.id"); // safety

  // Export
  content = content.replace(/module\.exports = router;/g, "export default router;");

  const tsPath = path.join(dir, file.replace('.js', '.ts'));
  fs.writeFileSync(tsPath, content);
  fs.unlinkSync(filePath);
  console.log('Fixed', tsPath);
});
