require('dotenv').config();
const supabase = require('./utils/supabase');

async function checkAtt() {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .order('check_in_time', { ascending: false })
    .limit(1);
    
  console.log(JSON.stringify(data, null, 2));
  if(error) console.error(error);
}
checkAtt();
