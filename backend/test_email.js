require('dotenv').config();
const { sendPasswordResetEmail } = require('./utils/email');

async function testEmails() {
  const emailsToTest = ['liyanagesasiru@gmail.com', 'nethvidusasiru@gmail.com'];
  
  for (const email of emailsToTest) {
    try {
      console.log(`Sending test email to ${email}...`);
      await sendPasswordResetEmail(email, '123456');
      console.log(`Success: Sent to ${email}`);
    } catch (err) {
      console.error(`Error sending to ${email}:`, err.message);
    }
  }
}

testEmails();
