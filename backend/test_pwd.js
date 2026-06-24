require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function testPassword() {
  const { data, error } = await supabase.from('users').select('password').eq('email', 'sliit@ss.com').single();
  if (error) {
    console.error(error);
    return;
  }
  
  const hash = data.password;
  console.log("Hash from DB:", hash);

  const pwd1 = 'password@1234';
  const pwd2 = 'Password@1234';
  
  const match1 = await bcrypt.compare(pwd1, hash);
  const match2 = await bcrypt.compare(pwd2, hash);
  
  console.log('password@1234 is:', match1);
  console.log('Password@1234 is:', match2);
}
testPassword();
