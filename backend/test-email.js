require('dotenv').config();
const { sendWarningEmail } = require('./utils/email');

async function testEmail() {
  const employee = {
    name: 'Sasiru Liyanage',
    email: 'liyanagesasiru@gmail.com',
    company_id: '054f5072-ef41-4412-b87e-cd431a642b2f'
  };
  
  console.log('Sending test warning email...');
  const result = await sendWarningEmail(employee, 45);
  console.log('Result:', result);
}

testEmail();
