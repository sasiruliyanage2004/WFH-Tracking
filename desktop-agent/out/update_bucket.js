"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_js_1 = require("@supabase/supabase-js");
require('dotenv').config({ path: '../backend/.env' });
const supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
async function test() {
    const { data, error } = await supabase.storage.updateBucket('wfh-tracking', { public: true, fileSizeLimit: 200 * 1024 * 1024 });
    console.log(data || error);
}
test();
