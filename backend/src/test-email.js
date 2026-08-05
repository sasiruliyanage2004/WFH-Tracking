require('dotenv').config({ path: '.env' });
const axios = require('axios');

console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'found' : 'MISSING');

axios.post('https://api.resend.com/emails', {
  from: 'WorkforceOS <onboarding@resend.dev>',
  to: ['liyanagesasiru@gmail.com'],
  subject: 'Welcome to WorkforceOS - Your Account is Ready [TEST]',
  html: '<div style="font-family:Arial;padding:20px;border-left:5px solid #2563eb;background:#eff6ff"><h2>Welcome to WorkforceOS!</h2><p>Hi <strong>Test User</strong>,</p><p>Your account has been created successfully!</p><p><strong>Temp Password:</strong> <code>password1234</code></p></div>'
}, {
  headers: {
    'Authorization': 'Bearer ' + process.env.RESEND_API_KEY,
    'Content-Type': 'application/json'
  }
}).then(function(r) {
  console.log('SUCCESS! Email sent! ID:', r.data.id);
}).catch(function(e) {
  var msg = (e.response && e.response.data) ? JSON.stringify(e.response.data) : e.message;
  console.error('FAILED:', msg);
});
