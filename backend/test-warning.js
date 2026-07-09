require('dotenv').config();
const supabase = require('./utils/supabase');

async function test() {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('key', 'warning_emails');
  
  console.log('Data:', data);
  console.log('Error:', error);
}

test();
