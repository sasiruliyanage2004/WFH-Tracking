const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
async function check() {
  try {
    const { count: totalCompanies, error: cErr } = await supabase.from('companies').select('*', { count: 'exact', head: true });
    const { count: activeCompanies, error: acErr } = await supabase.from('companies').select('*', { count: 'exact', head: true }).eq('status', 'active');
    
    // total non-systemadmin users
    const { count: totalUsers, error: uErr } = await supabase.from('users').select('*', { count: 'exact', head: true }).neq('role', 'SystemAdmin');
    
    // daily active users (last_login within 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: activeUsersToday, error: auErr } = await supabase.from('users').select('*', { count: 'exact', head: true }).gte('last_login', oneDayAgo);

    console.log({cErr, acErr, uErr, auErr});
    
    console.log({
      totalCompanies: totalCompanies || 0,
      activeCompanies: activeCompanies || 0,
      totalUsers: totalUsers || 0,
      dailyActiveUsers: activeUsersToday || 0
    });
  } catch(e) { console.error(e); }
}
check();
