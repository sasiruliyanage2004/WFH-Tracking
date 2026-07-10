const https = require('https');
https.get('https://wfh-tracking-system-backend.vercel.app/api/settings/screenshot-rules', (resp) => {
  let data = '';
  resp.on('data', (chunk) => { data += chunk; });
  resp.on('end', () => { console.log(data); });
}).on('error', (err) => { console.log('Error: ' + err.message); });
