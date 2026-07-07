require('dotenv').config();
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function reset() {
  const hash = await bcrypt.hash('password1234', 10);
  const { error } = await supabase.from('users').update({ password: hash }).eq('email', 'owner@workforceos.com');
  if (error) console.error(error);
  else console.log('Password reset successfully');
}
reset();
