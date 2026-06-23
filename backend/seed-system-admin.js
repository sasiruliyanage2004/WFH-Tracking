
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const { v4: uuidv4 } = require('uuid');

async function seed() {
  const email = 'owner@workforceos.com';
  const { data: existing } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
  if (existing) {
    console.log('System Admin already exists.');
    return;
  }

  const hashedPassword = await bcrypt.hash('password1234', 10);
  const { error } = await supabase.from('users').insert([{
    id: uuidv4(),
    name: 'Platform Owner',
    email: email,
    password: hashedPassword,
    role: 'SystemAdmin',
    department: 'Platform',
    company_id: null,
    force_password_reset: false
  }]);

  if (error) {
    console.error('Failed to create System Admin:', error);
  } else {
    console.log('System Admin created successfully!');
  }
}
seed();
