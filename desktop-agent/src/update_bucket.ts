import { createClient } from '@supabase/supabase-js';
import path from 'path';
require('dotenv').config({path: path.join(__dirname, '../../backend/.env')});
const supabase = createClient(process.env.SUPABASE_URL as string, process.env.SUPABASE_KEY as string);

async function test() {
  const { data, error } = await supabase.storage.updateBucket('wfh-tracking', { public: true, fileSizeLimit: 200 * 1024 * 1024 });
  console.log(data || error);
}
test();
