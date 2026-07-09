require('dotenv').config();
const supabase = require('./utils/supabase');

async function checkLog() {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);
    
  console.log(data);
  if(error) console.error(error);
}
checkLog();
