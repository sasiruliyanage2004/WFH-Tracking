"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const supabase_js_1 = require("@supabase/supabase-js");
// Load environment variables from the parent directory if not present
require('dotenv').config({ path: path_1.default.join(__dirname, '../../backend/.env') });
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase URL or Key in environment variables.");
    process.exit(1);
}
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
async function uploadRelease() {
    const exePath = path_1.default.join(__dirname, '../dist', 'WorkforceOS-Agent-Setup.exe');
    if (!fs_1.default.existsSync(exePath)) {
        console.error("Release executable not found at:", exePath);
        process.exit(1);
    }
    console.log("Reading executable file...");
    const fileBuffer = fs_1.default.readFileSync(exePath);
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
