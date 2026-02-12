# Gmail Email Setup Guide for Dnarai Enterprise

## Overview

The Dnarai Enterprise backend now uses Gmail with Nodemailer to send professional email notifications including:

- Welcome emails with login credentials for new passengers
- Flight booking confirmations
- Flight time updates
- Passport/document expiry alerts
- Weather updates

## Setup Instructions

### Step 1: Enable 2-Step Verification on Your Gmail Account

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Under "Signing in to Google", click on **2-Step Verification**
3. Follow the prompts to enable it (you'll need your phone)

### Step 2: Generate an App Password

1. Go to [Google App Passwords](https://myaccount.google.com/apppasswords)
   - Or navigate: Google Account → Security → 2-Step Verification → App passwords
2. In the "Select app" dropdown, choose **Mail**
3. In the "Select device" dropdown, choose **Other (Custom name)**
4. Enter a name like "Dnarai Enterprise Backend"
5. Click **Generate**
6. Google will show you a 16-character password (e.g., `abcd efgh ijkl mnop`)
7. **Copy this password** (remove spaces: `abcdefghijklmnop`)

### Step 3: Update Your .env File

Open `backend/.env` and update these lines:

```bash
GMAIL_USER=your-actual-email@gmail.com
GMAIL_APP_PASSWORD=abcdefghijklmnop
```

**Important Notes:**

- Use your full Gmail address (e.g., `john.doe@gmail.com`)
- Use the 16-character app password, NOT your regular Gmail password
- Remove all spaces from the app password
- Keep this information secure and never commit it to version control

### Step 4: Restart the Backend Server

After updating the .env file, restart your backend server:

```bash
# Stop the current server (Ctrl+C)
# Then restart it
npm run dev
```

## Testing the Email Service

### Test 1: Create a New Passenger

1. Go to the Super Admin dashboard
2. Click "New Passenger"
3. Enter passenger details with a real email address
4. Submit the form
5. Check the email inbox - you should receive a welcome email with login credentials

### Test 2: Create a Flight Booking

1. Select a passenger
2. Click "Add Flight"
3. Enter flight details
4. Submit the form
5. The passenger should receive a booking confirmation email

## Email Templates

The system includes professional HTML email templates with:

- **Branded Header**: Dnarai Enterprise logo and gradient design
- **Responsive Layout**: Works on desktop and mobile
- **Clear Call-to-Action**: Direct links to the dashboard
- **Professional Styling**: Modern, clean design

### Welcome Email Features:

- Personalized greeting
- Login credentials display
- Security warning to change password
- Direct dashboard access button
- Professional footer

### Notification Email Features:

- Clear subject lines
- Formatted message content
- Dashboard access link
- Branded design

## Troubleshooting

### "Gmail credentials not configured" Warning

- Make sure `GMAIL_USER` and `GMAIL_APP_PASSWORD` are set in `.env`
- Restart the backend server after updating `.env`

### Emails Not Sending

1. **Check App Password**: Make sure you're using the app password, not your regular password
2. **Check 2-Step Verification**: Must be enabled on your Gmail account
3. **Check Email Address**: Use your full Gmail address
4. **Check Spam Folder**: Emails might be in the recipient's spam folder
5. **Check Console**: Look for error messages in the backend terminal

### "Invalid login" Error

- The app password might be incorrect
- Try generating a new app password
- Make sure there are no spaces in the password

### Rate Limiting

Gmail has sending limits:

- **Free Gmail**: ~500 emails/day
- **Google Workspace**: ~2,000 emails/day

For production with high volume, consider:

- SendGrid
- Amazon SES
- Mailgun
- Postmark

## Security Best Practices

1. **Never commit .env to Git**: Already in `.gitignore`
2. **Use App Passwords**: Never use your actual Gmail password
3. **Rotate Passwords**: Change app passwords periodically
4. **Monitor Usage**: Check for unusual sending activity
5. **Limit Access**: Only share credentials with authorized team members

## Production Recommendations

For production deployment:

1. Use environment variables from your hosting platform (Heroku, Railway, etc.)
2. Consider a dedicated email service (SendGrid, SES) for better deliverability
3. Set up SPF, DKIM, and DMARC records for your domain
4. Monitor email delivery rates and bounces
5. Implement email queuing for high-volume scenarios

## Support

If you encounter issues:

1. Check the backend console for error messages
2. Verify all environment variables are set correctly
3. Test with a simple email first
4. Check Google's [App Password Help](https://support.google.com/accounts/answer/185833)

---

**Dnarai Enterprise** - Professional Travel Management Platform
