
require('dotenv').config({ path: 'backend/.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function test() {
  const { data, error } = await supabase
    .from('users')
    .select('*, companies(status)')
    .limit(1);
  console.log('Result:', data);
  console.log('Error:', error);
}
test();
