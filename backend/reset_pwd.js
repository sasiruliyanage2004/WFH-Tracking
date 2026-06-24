require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function resetPassword() {
  const newPassword = 'password@1234';
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(newPassword, salt);
  
  const { data, error } = await supabase.from('users').update({ password: hash }).eq('email', 'sliit@ss.com');
  if (error) {
    console.error("Error updating:", error);
  } else {
    console.log("Successfully updated password for sliit@ss.com to password@1234");
  }
}
resetPassword();
