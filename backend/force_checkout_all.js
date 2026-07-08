const dotenv = require('dotenv');
dotenv.config();
const supabase = require('./utils/supabase');

async function forceCheckoutAll() {
  console.log('Force checking out all currently online employees...');
  
  // Find all attendance records without a check_out_time
  const { data: activeSessions, error: fetchError } = await supabase
    .from('attendance')
    .select('id, employee_id, check_in_time')
    .is('check_out_time', null);

  if (fetchError) {
    console.error('Error fetching active sessions:', fetchError);
    return;
  }

  if (!activeSessions || activeSessions.length === 0) {
    console.log('No online employees found.');
    return;
  }

  console.log(`Found ${activeSessions.length} online employees. Processing checkouts...`);
  const now = new Date().toISOString();
  
  let successCount = 0;
  for (const session of activeSessions) {
    const { error: updateError } = await supabase
      .from('attendance')
      .update({ check_out_time: now })
      .eq('id', session.id);
      
    if (updateError) {
      console.error(`Failed to checkout employee ID ${session.employee_id}:`, updateError);
    } else {
      successCount++;
    }
  }

  console.log(`Successfully checked out ${successCount}/${activeSessions.length} employees.`);
}

forceCheckoutAll().then(() => {
  console.log('Done.');
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
