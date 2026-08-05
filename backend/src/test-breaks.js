const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function main() {
  const { data, error } = await supabase.from('attendance').select('*, users(name)').eq('date', '2026-07-19');
  if (error) console.error(error);
  else {
    data.filter(a => a.users?.name === 'Nethvidu').forEach(att => {
      console.log(`User: ${att.users?.name}, Date: ${att.date}, ID: ${att.id}, Breaks: ${JSON.stringify(att.breaks)}`);
    });
  }
}
main();
