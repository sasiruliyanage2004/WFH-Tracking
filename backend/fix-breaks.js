require('dotenv').config();
const supabase = require('./utils/supabase');

async function fixStuckBreaks() {
  // Find all attendance records that are checked out but still have on_break = true
  const { data, error } = await supabase
    .from('attendance')
    .update({ on_break: false })
    .not('check_out_time', 'is', null)
    .eq('on_break', true)
    .select();
    
  console.log('Fixed records:', data ? data.length : 0);
  if(error) console.error(error);
}
fixStuckBreaks();
