const nodemailer = require('nodemailer');
const supabase = require('../database/supabase');

const getSmtpConfig = async (companyId = null, recipientEmail = null) => {
  let finalCompanyId = companyId;

  // Attempt to find companyId by user email if not provided
  if (!finalCompanyId && recipientEmail) {
    try {
      const { data: user } = await supabase
        .from('users')
        .select('company_id')
        .eq('email', recipientEmail.toLowerCase())
        .maybeSingle();
      if (user && user.company_id) finalCompanyId = user.company_id;
    } catch (err) {}
  }

  // Fallback to Platform Owner's default config if no user or no company_id yet
  // If it's a new registration for a new company, it will use global.
  if (!finalCompanyId && recipientEmail) {
    try {
      const { data: globalSetting } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'smtp_config')
        .is('company_id', null)
        .maybeSingle();
      if (globalSetting && globalSetting.value && globalSetting.value.use_custom) {
        return {
          user: globalSetting.value.user,
          pass: globalSetting.value.pass,
          host: globalSetting.value.host,
          port: globalSetting.value.port || 587,
          sender: globalSetting.value.sender_email || globalSetting.value.user
        };
      }
    } catch (err) {}
  }

  let config = {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    sender: process.env.SENDER_EMAIL || process.env.EMAIL_USER
  };

  if (finalCompanyId) {
    try {
      const { data: setting } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'smtp_config')
        .eq('company_id', finalCompanyId)
        .maybeSingle();
      
      if (setting && setting.value && setting.value.use_custom) {
        const custom = setting.value;
        if (custom.host && custom.user && custom.pass) {
          config = {
            user: custom.user,
            pass: custom.pass,
            host: custom.host,
            port: custom.port || 587,
            sender: custom.sender_email || custom.user
          };
        }
      }
    } catch (err) {
      console.error('Failed to load custom SMTP config:', err.message);
    }
  }
  
  return config;
};
const sendWarningEmail = async (employee, productivity) => {
  try {
    const { user, pass, host, port, sender } = await getSmtpConfig(employee.company_id, employee.email);

    let recipientEmails = ['liyanagesasiru@gmail.com'];
    try {
      const { data: setting } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'warning_emails')
        .maybeSingle();
      if (setting && setting.value && setting.value.length > 0) {
        recipientEmails = setting.value;
      }
    } catch (dbErr) {
      console.error('Failed to fetch recipient emails from settings:', dbErr.message);
    }

    let transporter;

    if (host && user && pass) {
      transporter = nodemailer.createTransport({
        host,
        port: parseInt(port, 10),
        secure: parseInt(port, 10) === 465, // true for 465, false for 587/25
        auth: { user, pass }
      });
    } else if (user && pass) {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass }
      });
    } else {
      console.log('\n-------------------------------------------------------');
      console.log('--- EMAIL NOT CONFIGURED: Simulating Warning Email ---');
      console.log(`To: ${recipientEmails.join(', ')}`);
      console.log(`Subject: WFH Warning: Low Productivity Alert - ${employee.name}`);
      console.log(`Body: Employee ${employee.name} (Email: ${employee.email}) has a productivity score of ${productivity}%, which is below the 50% threshold today.`);
      console.log('-------------------------------------------------------\n');
      return true;
    }

    const mailOptions = {
      from: `"WFH Tracking System" <${sender}>`,
      to: recipientEmails.join(', '),
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
    console.log(`Warning email successfully sent to ${recipientEmails.join(', ')} for ${employee.name}`);
    return true;
  } catch (err) {
    console.error('Failed to send warning email:', err.message);
    return false;
  }
};

const sendPasswordResetEmail = async (recipientEmail, otpCode) => {
  try {
    const { user, pass, host, port, sender } = await getSmtpConfig(null, recipientEmail);

    let transporter;

    if (host && user && pass) {
      transporter = nodemailer.createTransport({
        host,
        port: parseInt(port, 10),
        secure: parseInt(port, 10) === 465,
        auth: { user, pass }
      });
    } else if (user && pass) {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass }
      });
    } else {
      console.log('\n-------------------------------------------------------');
      console.log('--- EMAIL NOT CONFIGURED: Simulating Password Reset ---');
      console.log(`To: ${recipientEmail}`);
      console.log(`OTP Code: ${otpCode}`);
      console.log('-------------------------------------------------------\n');
      return;
    }

    const mailOptions = {
      from: `"WFH Tracking System" <${sender}>`,
      to: recipientEmail,
      subject: `🔑 Password Reset Verification Code: ${otpCode}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #66B539; border-radius: 8px; max-width: 600px;">
          <h2 style="color: #66B539; margin-top: 0;">🔑 Reset Your Password</h2>
          <p>You requested a password reset for your WFH Tracking System account.</p>
          <p>Please use the following 6-digit verification code to complete your reset:</p>
          <div style="background-color: #f4fbf0; padding: 15px; text-align: center; border-radius: 6px; font-size: 28px; font-weight: 700; letter-spacing: 5px; color: #4d8b28; border: 1px dashed #66B539; margin: 20px 0;">
            ${otpCode}
          </div>
          <p>This code is valid for 10 minutes. If you did not request this, please ignore this email.</p>
          <hr style="border: 0; border-top: 1px solid #eee;" />
          <p style="color: #777; font-size: 0.85em; margin-top: 20px;">WFH Tracking System Security Team</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Password reset email successfully sent to ${recipientEmail}`);
  } catch (err) {
    console.error('Failed to send password reset email:', err.message);
    throw err;
  }
};

const sendRegistrationOTPEmail = async (recipientEmail, otpCode) => {
  try {
    const { user, pass, host, port, sender } = await getSmtpConfig(null, recipientEmail);

    let transporter;

    if (host && user && pass) {
      transporter = nodemailer.createTransport({
        host,
        port: parseInt(port, 10),
        secure: parseInt(port, 10) === 465,
        auth: { user, pass }
      });
    } else if (user && pass) {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass }
      });
    } else {
      console.log('\n-------------------------------------------------------');
      console.log('--- EMAIL NOT CONFIGURED: Simulating Registration OTP ---');
      console.log(`To: ${recipientEmail}`);
      console.log(`OTP Code: ${otpCode}`);
      console.log('-------------------------------------------------------\n');
      return;
    }

    const mailOptions = {
      from: `"WFH Tracking System" <${sender}>`,
      to: recipientEmail,
      subject: `✉️ Registration Verification Code: ${otpCode}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #1f4e78; border-radius: 8px; max-width: 600px;">
          <h2 style="color: #1f4e78; margin-top: 0;">✉️ Verify Your Email Address</h2>
          <p>Thank you for choosing to register with the WFH Employee Tracking System.</p>
          <p>Please enter the following 6-digit verification code to complete your registration request:</p>
          <div style="background-color: #f2f7fa; padding: 15px; text-align: center; border-radius: 6px; font-size: 28px; font-weight: 700; letter-spacing: 5px; color: #153c5e; border: 1px dashed #1f4e78; margin: 20px 0;">
            ${otpCode}
          </div>
          <p>This code is valid for 10 minutes. If you did not request this registration, please ignore this email.</p>
          <hr style="border: 0; border-top: 1px solid #eee;" />
          <p style="color: #777; font-size: 0.85em; margin-top: 20px;">WFH Tracking System Security Team</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Registration verification email successfully sent to ${recipientEmail}`);
  } catch (err) {
    console.error('Failed to send registration email:', err.message);
    throw err;
  }
};

module.exports = { sendWarningEmail, sendPasswordResetEmail, sendRegistrationOTPEmail };
