require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkUsers() {
  const { data, error } = await supabase.from('users').select('email, role, name');
  if (error) {
    console.error(error);
  } else {
    console.log(data);
  }
}
checkUsers();
