require('dotenv').config();
const supabase = require('./utils/supabase');

async function checkMultipleRows() {
  const keys = ['warning_min_minutes', 'warning_emails'];
  
  for (const key of keys) {
    const { data, error } = await supabase.from('settings').select('*').eq('key', key);
    console.log(`Key: ${key}`);
    console.log(`Rows: ${data ? data.length : 0}`);
    if (error) console.error(error);
  }
}

checkMultipleRows();
