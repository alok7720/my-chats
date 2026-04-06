import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create a test account or replace with real credentials.
export const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, 
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD
  }
});

export const AUTH_MAIL_TEMPLATE = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif;">
<h2>Welcome to My Chats! 🎉</h2>
<p>Hi,</p>
<p>Thank you for creating an account with us! We're excited to have you on board.</p>
<p>To complete your registration, please verify your email address using the One-Time Password (OTP) given below:</p>
<h3 style="color: #2e86de; font-size: 24px; letter-spacing: 2px;">
    {{otp}}
</h3>
<p>This OTP is valid for 15 minutes. Please do not share it with anyone.</p>
<p>If you did not sign up for an account, you can safely ignore this email.</p>
<br/>
<p>Warm Regards,<br/>
<b>My Chats</b></p>
</body>
</html>
`

export const PASSWORD_RESET_TEMPLATE = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif;">
<h2>Password Reset Request 🔐</h2>
<p>Hi,</p>
<p>We received a request to reset your password associated with this email address.</p>
<p>Please use the following OTP to reset your password:</p>
<h3 style="color: #e74c3c; font-size: 24px; letter-spacing: 2px;">
    {{otp}}
</h3>
<p>This OTP is valid for 15 minutes. If you did not request a password reset, please ignore this message.</p>
<br/>
<p>Stay Secure,<br/>
<b>My Chats</b></p>
</body>
</html>
`