const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

// Configure AWS SES Client
const sesClient = new SESClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * Send email using AWS SES
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.htmlBody - HTML email body
 * @param {string} options.textBody - Plain text email body (optional)
 * @returns {Promise} - AWS SES response
 */
const sendEmail = async ({ to, subject, htmlBody, textBody }) => {
  const params = {
    Source: process.env.FROM_EMAIL,
    Destination: {
      ToAddresses: Array.isArray(to) ? to : [to],
    },
    Message: {
      Subject: {
        Data: subject,
        Charset: 'UTF-8',
      },
      Body: {
        Html: {
          Data: htmlBody,
          Charset: 'UTF-8',
        },
        ...(textBody && {
          Text: {
            Data: textBody,
            Charset: 'UTF-8',
          },
        }),
      },
    },
  };

  try {
    const command = new SendEmailCommand(params);
    const response = await sesClient.send(command);
    console.log('✅ Email sent successfully:', response.MessageId);
    return { success: true, messageId: response.MessageId };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw error;
  }
};

/**
 * Send welcome email to new users
 * @param {string} email - User email
 * @param {string} name - User name
 */
const sendWelcomeEmail = async (email, name) => {
  const subject = 'Welcome to FYZO!';
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #1E3A8A 0%, #1877f2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; padding: 12px 30px; background: #F59E0B; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to FYZO!</h1>
        </div>
        <div class="content">
          <h2>Hi ${name}! 👋</h2>
          <p>Welcome to the FYZO community! We're excited to have you on board.</p>
          <p>FYZO is your one-stop platform to learn, create, and grow. Here's what you can do:</p>
          <ul>
            <li>🎓 Discover amazing courses and workshops</li>
            <li>👥 Connect with expert creators and coaches</li>
            <li>📈 Track your learning progress</li>
            <li>🎯 Achieve your goals with personalized guidance</li>
          </ul>
          <a href="${process.env.CLIENT_URL}" class="button">Get Started</a>
          <p>If you have any questions, feel free to reach out to our support team.</p>
          <p>Happy learning!</p>
          <p><strong>The FYZO Team</strong></p>
        </div>
        <div class="footer">
          <p>© 2025 FYZO. All rights reserved.</p>
          <p>info@10xdrink.com</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const textBody = `
    Welcome to FYZO, ${name}!
    
    We're excited to have you on board. FYZO is your one-stop platform to learn, create, and grow.
    
    Get started: ${process.env.CLIENT_URL}
    
    If you have any questions, reach out to our support team.
    
    Happy learning!
    The FYZO Team
  `;

  return sendEmail({ to: email, subject, htmlBody, textBody });
};

/**
 * Send OTP verification email
 * @param {string} email - User email
 * @param {string} otp - One-time password
 */
const sendOTPEmail = async (email, otp) => {
  const subject = 'Your FYZO Verification Code';
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #1E3A8A 0%, #1877f2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; text-align: center; border-radius: 0 0 8px 8px; }
        .otp-code { font-size: 36px; font-weight: bold; color: #1877f2; letter-spacing: 8px; margin: 30px 0; padding: 20px; background: white; border-radius: 8px; border: 2px dashed #F59E0B; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Email Verification</h1>
        </div>
        <div class="content">
          <h2>Your Verification Code</h2>
          <p>Enter this code to verify your email address:</p>
          <div class="otp-code">${otp}</div>
          <p>This code will expire in 10 minutes.</p>
          <p style="color: #666; font-size: 14px;">If you didn't request this code, please ignore this email.</p>
        </div>
        <div class="footer">
          <p>© 2025 FYZO. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textBody = `
    Your FYZO Verification Code
    
    Enter this code to verify your email address:
    ${otp}
    
    This code will expire in 10 minutes.
    
    If you didn't request this code, please ignore this email.
  `;

  return sendEmail({ to: email, subject, htmlBody, textBody });
};

/**
 * Send password reset email
 * @param {string} email - User email
 * @param {string} resetLink - Password reset link
 */
const sendPasswordResetEmail = async (email, resetLink) => {
  const subject = 'Reset Your FYZO Password';
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #1E3A8A 0%, #1877f2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; padding: 12px 30px; background: #F59E0B; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Reset Request</h1>
        </div>
        <div class="content">
          <h2>Reset Your Password</h2>
          <p>We received a request to reset your FYZO account password.</p>
          <p>Click the button below to reset your password:</p>
          <a href="${resetLink}" class="button">Reset Password</a>
          <p>This link will expire in 1 hour.</p>
          <p style="color: #666; font-size: 14px;">If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
        </div>
        <div class="footer">
          <p>© 2025 FYZO. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textBody = `
    Reset Your FYZO Password
    
    We received a request to reset your account password.
    
    Click this link to reset your password:
    ${resetLink}
    
    This link will expire in 1 hour.
    
    If you didn't request a password reset, please ignore this email.
  `;

  return sendEmail({ to: email, subject, htmlBody, textBody });
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendOTPEmail,
  sendPasswordResetEmail,
};
