require('dotenv').config({ path: '.env' });
// test script
const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const SENDER_EMAIL = process.env.SENDER_EMAIL || EMAIL_USER;

console.log('Testing Platform SMTP with:');
console.log('User:', EMAIL_USER);
console.log('Pass:', EMAIL_PASS ? '***' : 'missing');

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: { user: EMAIL_USER, pass: EMAIL_PASS }
});

transporter.sendMail({
  from: `"WorkforceOS" <${SENDER_EMAIL}>`,
  to: 'sasirul@multitalenttechnology.com', // testing to arbitrary email
  subject: 'Test Email via Platform Gmail SMTP',
  html: '<p>This is a test of the platform fallback SMTP.</p>'
}).then(info => {
  console.log('SUCCESS! Email sent:', info.messageId);
}).catch(err => {
  console.error('FAILED to send email:', err.message);
});
