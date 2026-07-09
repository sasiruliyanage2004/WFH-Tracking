require('dotenv').config();
const supabase = require('./utils/supabase');

async function fixDuration() {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .not('check_out_time', 'is', null)
    .eq('duration_hours', 0);

  if (data) {
    for (const record of data) {
      const start = new Date(record.check_in_time);
      const end = new Date(record.check_out_time);
      const diffHrs = (end - start) / 3600000;
      await supabase
        .from('attendance')
        .update({ duration_hours: diffHrs })
        .eq('id', record.id);
      console.log(`Updated record ${record.id} with ${diffHrs} hours`);
    }
  }
}
fixDuration();
