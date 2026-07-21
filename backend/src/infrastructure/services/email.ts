import axios from 'axios';
import nodemailer from 'nodemailer';
import supabase from '../database/supabase';

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const SENDER_EMAIL = process.env.SENDER_EMAIL || EMAIL_USER;
const PLATFORM_SENDER_NAME = 'WorkforceOS';

// ─────────────────────────────────────────────
// Core: Send via Platform SMTP (default fallback)
// ─────────────────────────────────────────────
const sendViaPlatformSmtp = async (to: string | string[], subject: string, htmlContent: string): Promise<boolean> => {
  if (!EMAIL_USER || !EMAIL_PASS) {
    console.error('[Platform SMTP] Missing EMAIL_USER or EMAIL_PASS in .env');
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    });

    const toList = Array.isArray(to) ? to : [to];
    await transporter.sendMail({
      from: `"${PLATFORM_SENDER_NAME}" <${SENDER_EMAIL}>`,
      to: toList.join(', '),
      subject,
      html: htmlContent,
    });
    
    console.log(`[Platform SMTP] Email sent to ${toList.join(', ')} | Subject: ${subject}`);
    return true;
  } catch (err: any) {
    console.error('[Platform SMTP] Failed to send email:', err.message);
    return false;
  }
};

// ─────────────────────────────────────────────
// Fallback: Send via company's custom SMTP if configured
// ─────────────────────────────────────────────
const sendViaCustomSmtp = async (
  companyId: string,
  to: string | string[],
  subject: string,
  html: string
): Promise<boolean> => {
  try {
    const { data: setting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'smtp_config')
      .eq('company_id', companyId)
      .maybeSingle();

    if (!setting?.value?.use_custom) return false;
    const { host, user, pass, port, sender_email } = setting.value;
    if (!host || !user || !pass) return false;

    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(port, 10) || 587,
      secure: parseInt(port, 10) === 465,
      auth: { user, pass },
    });

    const toList = Array.isArray(to) ? to : [to];
    await transporter.sendMail({
      from: `"${PLATFORM_SENDER_NAME}" <${sender_email || user}>`,
      to: toList.join(', '),
      subject,
      html,
    });
    console.log(`[Custom SMTP] Email sent to ${toList.join(', ')} | Subject: ${subject}`);
    return true;
  } catch (err: any) {
    console.error('[Custom SMTP] Failed to send:', err.message);
    return false;
  }
};

// ─────────────────────────────────────────────
// Smart send: Try company SMTP → fallback Platform SMTP
// ─────────────────────────────────────────────
const smartSend = async (
  companyId: string | null,
  to: string | string[],
  subject: string,
  html: string
): Promise<boolean> => {
  if (companyId) {
    const sent = await sendViaCustomSmtp(companyId, to, subject, html);
    if (sent) return true;
  }
  return sendViaPlatformSmtp(to, subject, html);
};

// ─────────────────────────────────────────────
// Get per-company warning email recipients
// ─────────────────────────────────────────────
const getWarningRecipients = async (companyId: string): Promise<string[]> => {
  try {
    // 1. Try company-specific warning_emails setting
    const { data: companySetting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'warning_emails')
      .eq('company_id', companyId)
      .maybeSingle();

    if (companySetting?.value && Array.isArray(companySetting.value) && companySetting.value.length > 0) {
      return companySetting.value;
    }

    // 2. Fallback: get all Manager/Admin emails for this company
    const { data: managers } = await supabase
      .from('users')
      .select('email')
      .eq('company_id', companyId)
      .in('role', ['Manager', 'SuperAdmin', 'Admin']);

    if (managers && managers.length > 0) {
      return managers.map(m => m.email);
    }
  } catch (err: any) {
    console.error('[getWarningRecipients] Error:', err.message);
  }

  return [];
};

// ─────────────────────────────────────────────
// EMAIL FUNCTIONS
// ─────────────────────────────────────────────

const sendWarningEmail = async (employee: any, productivity: number): Promise<boolean> => {
  try {
    const companyId = employee.company_id;
    const recipients = await getWarningRecipients(companyId);

    if (recipients.length === 0) {
      console.warn(`[Warning Email] No recipients found for company ${companyId}. Skipping.`);
      return false;
    }

    const subject = `⚠️ Low Productivity Alert: ${employee.name}`;
    const html = `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #ef4444; border-radius: 8px; max-width: 600px;">
        <h2 style="color: #ef4444; margin-top: 0;">⚠️ Low Productivity Alert</h2>
        <p>This is an automated warning alert from the WorkforceOS System.</p>
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
    `;

    return smartSend(companyId, recipients, subject, html);
  } catch (err: any) {
    console.error('[sendWarningEmail] Error:', err.message);
    return false;
  }
};

const sendPasswordResetEmail = async (recipientEmail: string, otpCode: string): Promise<void> => {
  const subject = `🔑 Password Reset Verification Code: ${otpCode}`;
  const html = `
    <div style="font-family: sans-serif; padding: 20px; border: 1px solid #66B539; border-radius: 8px; max-width: 600px;">
      <h2 style="color: #66B539; margin-top: 0;">🔑 Reset Your Password</h2>
      <p>You requested a password reset for your WorkforceOS account.</p>
      <p>Please use the following 6-digit verification code to complete your reset:</p>
      <div style="background-color: #f4fbf0; padding: 15px; text-align: center; border-radius: 6px; font-size: 28px; font-weight: 700; letter-spacing: 5px; color: #4d8b28; border: 1px dashed #66B539; margin: 20px 0;">
        ${otpCode}
      </div>
      <p>This code is valid for 10 minutes. If you did not request this, please ignore this email.</p>
      <hr style="border: 0; border-top: 1px solid #eee;" />
      <p style="color: #777; font-size: 0.85em; margin-top: 20px;">WorkforceOS Security Team</p>
    </div>
  `;

  // Get user's company to try custom SMTP first
  let companyId: string | null = null;
  try {
    const { data: user } = await supabase
      .from('users')
      .select('company_id')
      .eq('email', recipientEmail.toLowerCase())
      .maybeSingle();
    companyId = user?.company_id || null;
  } catch {}

  const sent = await smartSend(companyId, recipientEmail, subject, html);
  if (!sent) throw new Error('Failed to send password reset email');
};

const sendRegistrationOTPEmail = async (recipientEmail: string, otpCode: string): Promise<void> => {
  const subject = `✉️ Registration Verification Code: ${otpCode}`;
  const html = `
    <div style="font-family: sans-serif; padding: 20px; border: 1px solid #1f4e78; border-radius: 8px; max-width: 600px;">
      <h2 style="color: #1f4e78; margin-top: 0;">✉️ Verify Your Email Address</h2>
      <p>Thank you for choosing to register with the WorkforceOS System.</p>
      <p>Please enter the following 6-digit verification code to complete your registration request:</p>
      <div style="background-color: #f2f7fa; padding: 15px; text-align: center; border-radius: 6px; font-size: 28px; font-weight: 700; letter-spacing: 5px; color: #153c5e; border: 1px dashed #1f4e78; margin: 20px 0;">
        ${otpCode}
      </div>
      <p>This code is valid for 10 minutes. If you did not request this registration, please ignore this email.</p>
      <hr style="border: 0; border-top: 1px solid #eee;" />
      <p style="color: #777; font-size: 0.85em; margin-top: 20px;">WorkforceOS Security Team</p>
    </div>
  `;

  const sent = await sendViaPlatformSmtp(recipientEmail, subject, html);
  if (!sent) throw new Error('Failed to send registration OTP email');
};

const sendSuspiciousActivityEmail = async (employeeName: string, managerEmail: string, companyId?: string): Promise<boolean> => {
  const subject = '⚠️ Security Alert: Suspicious Activity Detected';
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; border-left: 5px solid #dc2626; background: #fef2f2;">
      <h2>Suspicious Activity Detected</h2>
      <p>Our Anti-Cheat system has detected suspicious, artificial mouse movements (e.g. Mouse Jiggler) from <strong>${employeeName}</strong>.</p>
      <p>Please review their activity logs and screenshots in the dashboard.</p>
    </div>
  `;
  return smartSend(companyId || null, managerEmail, subject, html);
};

const sendWelcomeEmail = async (userName: string, userEmail: string, tempPassword: string, appUrl: string, companyId?: string): Promise<boolean> => {
  const subject = 'Welcome to WorkforceOS - Your Account is Ready';
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; border-left: 5px solid #2563eb; background: #eff6ff;">
      <h2>Welcome to WorkforceOS!</h2>
      <p>Hi <strong>${userName}</strong>,</p>
      <p>An administrator has created a new account for you. To get started with tracking your work, please follow the steps below:</p>
      <ol style="line-height: 1.6;">
        <li><strong>Open the WorkforceOS Desktop App</strong> on your computer.</li>
        <li>Log in using your email address and the temporary password provided below.</li>
        <li><strong>Change your password</strong> immediately after your first login when prompted.</li>
        <li>Click on <strong>Check In</strong> to start your shift!</li>
      </ol>
      <div style="background: #ffffff; padding: 15px; border-radius: 5px; margin: 20px 0; border: 1px solid #d1d5db;">
        <p style="margin: 0 0 10px 0;"><strong>Your Login Credentials:</strong></p>
        <p style="margin: 0 0 5px 0;"><strong>Email:</strong> ${userEmail}</p>
        <p style="margin: 0;"><strong>Temporary Password:</strong> <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px;">${tempPassword}</code></p>
      </div>
      <p>If you don't have the Desktop App installed yet, please contact your administrator for the installation file.</p>
    </div>
  `;
  return smartSend(companyId || null, userEmail, subject, html);
};

export { sendWarningEmail, sendPasswordResetEmail, sendRegistrationOTPEmail, sendSuspiciousActivityEmail, sendWelcomeEmail };
