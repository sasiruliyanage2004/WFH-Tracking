import { createClient } from '@supabase/supabase-js';
require('dotenv').config({path: '../backend/.env'});
const supabase = createClient(process.env.SUPABASE_URL as string, process.env.SUPABASE_KEY as string);

async function test() {
  const { data, error } = await supabase.storage.updateBucket('wfh-tracking', { public: true, fileSizeLimit: 200 * 1024 * 1024 });
  console.log(data || error);
}
test();
