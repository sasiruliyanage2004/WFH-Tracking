import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
// Load environment variables from the parent directory if not present
require('dotenv').config({ path: path.join(__dirname, '../../backend/.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase URL or Key in environment variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadRelease() {
  const exePath = path.join(__dirname, '../dist', 'WorkforceOS-Agent-Setup.exe');
  if (!fs.existsSync(exePath)) {
    console.error("Release executable not found at:", exePath);
    process.exit(1);
  }

  console.log("Reading executable file...");
  const fileBuffer = fs.readFileSync(exePath);
  const fileName = 'releases/WorkforceOS-Agent-Setup.exe';

  console.log("Uploading to Supabase Storage (wfh-tracking bucket)...");
  
  const { data, error } = await supabase.storage
    .from('wfh-tracking')
    .upload(fileName, fileBuffer, {
      contentType: 'application/x-msdownload',
      upsert: true
    });

  if (error) {
    console.error("Error uploading release:", error.message);
    process.exit(1);
  }

  console.log("Upload successful!");
  console.log("Public URL:", `${supabaseUrl}/storage/v1/object/public/wfh-tracking/${fileName}`);
}

uploadRelease();
