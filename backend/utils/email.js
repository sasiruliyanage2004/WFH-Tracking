const nodemailer = require('nodemailer');

const sendWarningEmail = async (employee, productivity) => {
  try {
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;

    let transporter;

    if (user && pass) {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass }
      });
    } else {
      console.log('\n-------------------------------------------------------');
      console.log('--- EMAIL NOT CONFIGURED: Simulating Warning Email ---');
      console.log(`To: liyanagesasiru@gmail.com`);
      console.log(`Subject: WFH Warning: Low Productivity Alert - ${employee.name}`);
      console.log(`Body: Employee ${employee.name} (Email: ${employee.email}) has a productivity score of ${productivity}%, which is below the 50% threshold today.`);
      console.log('-------------------------------------------------------\n');
      return;
    }

    const mailOptions = {
      from: `"WFH Tracking System" <${user}>`,
      to: 'liyanagesasiru@gmail.com',
      subject: `⚠️ Low Productivity Alert: ${employee.name}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #ef4444; border-radius: 8px; max-width: 600px;">
          <h2 style="color: #ef4444; margin-top: 0;">⚠️ Low Productivity Alert</h2>
          <p>This is an automated warning alert from the Work From Home Tracking System.</p>
          <hr style="border: 0; border-top: 1px solid #eee;" />
          <p><strong>Employee Details:</strong></p>
          <ul>
            <li><strong>Name:</strong> ${employee.name}</li>
            <li><strong>Email:</strong> ${employee.email}</li>
            <li><strong>Role:</strong> ${employee.role}</li>
            <li><strong>Department:</strong> ${employee.department || 'N/A'}</li>
          </ul>
          <p><strong>Incident Details:</strong></p>
          <p>The employee's productivity score has dropped to <strong style="color: #ef4444; font-size: 1.1em;">${productivity}%</strong> today, which is below the minimum required threshold of 50%.</p>
          <p style="color: #777; font-size: 0.9em; margin-top: 20px;">Please check the manager dashboard for detailed activity logs.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Warning email successfully sent to liyanagesasiru@gmail.com for ${employee.name}`);
  } catch (err) {
    console.error('Failed to send warning email:', err.message);
  }
};

module.exports = { sendWarningEmail };
