require('dotenv').config();
const supabase = require('./utils/supabase');

async function checkScreenshots() {
  const { data, error } = await supabase
    .from('screenshots')
    .select('*')
    .limit(10);
    
  console.log(JSON.stringify(data, null, 2));
  if(error) console.error(error);
}
checkScreenshots();
