require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function alterTasks() {
  const query = `
    ALTER TABLE tasks 
    ADD COLUMN IF NOT EXISTS proof_links JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS proof_files JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS comments JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
  `;
  
  // Actually, we can use RPC or raw query, but Supabase JS doesn't support raw queries directly
  // unless we use postgres connection string, but we have `admin_query` RPC maybe?
  // Let's check if we can run it via `admin_query`.
  const { data, error } = await supabase.rpc('admin_query', { query_text: query });
  if (error) {
    console.error('Error with RPC, we might need a direct pg connection:', error);
  } else {
    console.log('Success:', data);
  }
}
alterTasks();
