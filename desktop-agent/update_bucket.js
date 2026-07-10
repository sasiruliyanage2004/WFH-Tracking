const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '../backend/.env'});
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function test() {
  const { data, error } = await supabase.storage.updateBucket('wfh-tracking', { fileSizeLimit: 200 * 1024 * 1024 });
  console.log(data || error);
}
test();
