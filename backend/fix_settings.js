const dotenv = require('dotenv');
dotenv.config();
const supabase = require('./utils/supabase');

async function fixSettings() {
  const { data: companies } = await supabase.from('companies').select('*');
  const sasGroup = companies.find(c => c.name.toLowerCase().includes('sas group'));
  
  if (!sasGroup) {
    console.log('Sas Group not found');
    return;
  }
  
  console.log(`Sas Group ID: ${sasGroup.id}`);

  // Fetch all warning_emails settings
  const { data: settings } = await supabase.from('settings').select('*').eq('key', 'warning_emails');
  console.log('Current warning_emails settings:', JSON.stringify(settings, null, 2));

  // See if there's one with company_id null
  const nullCompanySetting = settings.find(s => s.company_id === null);
  if (nullCompanySetting) {
    console.log('Found a global setting (null company), deleting it:', nullCompanySetting.id);
    await supabase.from('settings').delete().eq('id', nullCompanySetting.id);
  }

  // Check if Sas Group has a setting
  const sasSetting = settings.find(s => s.company_id === sasGroup.id);
  if (!sasSetting) {
    console.log('Creating setting for Sas Group');
    await supabase.from('settings').insert([{
      key: 'warning_emails',
      value: ['liyanagesasiru@gmail.com'],
      company_id: sasGroup.id
    }]);
  } else {
    console.log('Updating setting for Sas Group to original email');
    await supabase.from('settings').update({
      value: ['liyanagesasiru@gmail.com']
    }).eq('id', sasSetting.id);
  }

  console.log('Done fixing settings');
}

fixSettings();
