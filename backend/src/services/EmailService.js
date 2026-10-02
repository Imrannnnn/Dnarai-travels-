import nodemailer from 'nodemailer';
import fs from 'fs';

let _transporter = null;

// Direct Brevo HTTP API integration to bypass SMTP IP restrictions
const sendMailViaBrevoAPI = async ({ from, to, subject, html, text, attachments = [] }) => {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error("BREVO_API_KEY is not defined");
  }

  // Parse from address
  let senderEmail = process.env.EMAIL;
  if (!senderEmail) {
    throw new Error("process.env.EMAIL is not defined");
  }
  let senderName = "Dnarai Travel";
  const fromMatch = from ? from.match(/(?:"?([^"]*)"?\s)?<([^>]+)>/) : null;
  if (fromMatch) {
    senderName = fromMatch[1] || "Dnarai Travel";
    senderEmail = fromMatch[2];
  }

  const formattedAttachments = [];
  for (const att of attachments) {
    const fileName = att.filename || att.name || "attachment";

    // Brevo API strictly rejects .svg files with 400 Unsupported file format
    if (fileName.toLowerCase().endsWith('.svg')) {
      console.warn(`⚠️ [EmailService] Skipping unsupported SVG attachment for Brevo API: ${fileName}`);
      continue;
    }

    let contentBase64 = "";
    if (att.content) {
      contentBase64 = Buffer.isBuffer(att.content) ? att.content.toString("base64") : Buffer.from(att.content).toString("base64");
    } else if (att.path) {
      contentBase64 = fs.readFileSync(att.path).toString("base64");
    }

    formattedAttachments.push({
      name: fileName,
      content: contentBase64
    });
  }

  const payload = {
    sender: { name: senderName, email: senderEmail },
    to: [{ email: to }],
    subject,
    htmlContent: html,
    textContent: text || subject || "Dnarai Travel Notification",
  };

  if (formattedAttachments.length > 0) {
    payload.attachment = formattedAttachments;
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "accept": "application/json",
      "api-key": apiKey,
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Brevo API error (${response.status}): ${errorText}`);
  }

  return await response.json();
};

export const getTransporter = () => {
  // If the user provided the actual HTTP API key (starts with xkeysib-), use direct HTTP API
  if (process.env.BREVO_API_KEY) {
    return {
      sendMail: async (mailOptions) => {
        console.log("[EmailService] Sending email via Brevo HTTP API");
        return sendMailViaBrevoAPI(mailOptions);
      },
      verify: (callback) => {
        console.log("✅ Brevo HTTP API active (SMTP bypassed)");
        if (callback) callback(null, true);
      }
    };
  }

  if (_transporter) return _transporter;

  const useBrevoSMTP = !!process.env.BREVO_SMTP_USER;
  const user = useBrevoSMTP ? process.env.BREVO_SMTP_USER : (process.env.SMTP_USER || process.env.GMAIL_USER);
  const pass = useBrevoSMTP ? process.env.BREVO_SMTP_KEY : (process.env.SMTP_PASSWORD || process.env.GMAIL_APP_PASSWORD);

  if (!user || !pass) {
    console.warn('⚠️ SMTP not configured');
    return null;
  }

  const host = useBrevoSMTP ? 'smtp-relay.brevo.com' : (process.env.SMTP_HOST || 'smtp.gmail.com');
  const port = useBrevoSMTP ? 587 : (Number(process.env.SMTP_PORT) || 587);
  const secure = useBrevoSMTP ? false : (process.env.SMTP_SECURE === 'true');

  console.log(`[EmailService] Initializing transporter... HOST=${host} PORT=${port} SECURE=${secure}`);

  _transporter = nodemailer.createTransport({
    host,
    port,
    secure, // false for STARTTLS
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  _transporter.verify((error, _success) => {
    if (error) {
      console.error('❌ SMTP connection error:', error);
    } else {
      console.log('✅ SMTP server ready');
    }
  });

  return _transporter;
};

// Branding Constants
const COLORS = {
  NAVY: '#0f172a',
  GOLD: '#eab308',
  SLATE: '#64748b',
  WHITE: '#ffffff',
  BG: '#f8fafc'
};



const getEmailWrapper = (content, previewText = '') => `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dnarai Travel</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: ${COLORS.BG}; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: ${COLORS.NAVY};">
    <div style="display: none; font-size: 1px; color: #fff; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">${previewText}</div>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td align="center" style="padding: 40px 0 20px 0; text-align: center;">
          <center>
            <a href="${process.env.CORS_ORIGIN || '#'}" style="text-decoration: none; display: inline-block;">
              <img src="https://dnaraitravels.com/D-NARAI_Logo-04.png" alt="DNARAI TRAVEL" width="200" style="display: block; border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 24px; font-weight: 900; color: ${COLORS.NAVY}; letter-spacing: -1px; width: 200px; max-width: 200px;">
              <div style="margin-top: -5px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 11px; font-weight: 800; color: ${COLORS.GOLD}; letter-spacing: 4px; text-transform: uppercase;">Executive Travel</div>
            </a>
          </center>
        </td>
      </tr>
      <tr>
        <td align="center">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto;">
            <tr>
              <td align="center">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${COLORS.WHITE}; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05); border: 1px solid #e2e8f0;">
            ${content}
            <tr>
              <td style="padding: 40px; background-color: ${COLORS.NAVY}; color: ${COLORS.WHITE}; text-align: center;">
                <p style="margin: 0; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: ${COLORS.GOLD};">Dnarai Travel Enterprise</p>
                <p style="margin: 10px 0 0 0; font-size: 12px; opacity: 0.7;">Modern Solutions for Global Travel Management</p>
                <div style="margin-top: 20px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px; font-size: 11px; opacity: 0.5;">
                  &copy; 2026 Dnarai Travel. All rights reserved.
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
`;

const getAttachments = () => {
  return [];
};

export const EmailService = {
  async sendWelcomeEmail({ email, fullName, password, loginUrl }) {
    const transporter = getTransporter();
    if (!transporter) return { ok: false, error: 'Transporter not configured' };

    const content = `
      <tr>
        <td style="padding: 60px 40px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 800; color: ${COLORS.NAVY};">Welcome to Dnarai Travel</h1>
          <p style="margin: 20px 0 0 0; font-size: 16px; color: ${COLORS.SLATE}; line-height: 1.6;">Hello ${fullName}, your executive travel account has been successfully provisioned.</p>
          <div style="margin: 40px 0; padding: 30px; background-color: #f1f5f9; border-radius: 20px; text-align: left;">
            <p style="margin: 0 0 15px 0; font-size: 14px; font-weight: 800; color: ${COLORS.NAVY};">Your Login Details</p>
            <p style="margin: 0; font-size: 14px;"><strong>Username:</strong> ${email}</p>
            <p style="margin: 10px 0 0 0; font-size: 14px;"><strong>Temp Password:</strong> <span style="color: ${COLORS.GOLD}; font-family: monospace;">${password}</span></p>
          </div>
          <a href="${loginUrl}" style="display: inline-block; padding: 18px 40px; background-color: ${COLORS.NAVY}; color: white; text-decoration: none; border-radius: 12px; font-weight: 700;">Access Your Portal</a>
        </td>
      </tr>
    `;

    try {
      await transporter.sendMail({
        from: `"Dnarai Travel" <${process.env.EMAIL}>`,
        to: email,
        subject: 'Welcome to Dnarai Travel - Account Activation',
        html: getEmailWrapper(content, 'Your account is ready.'),
        attachments: getAttachments()
      });
      console.log(`✉️ Welcome email sent to ${email}`);
      return { ok: true };
    } catch (error) {
      console.error('Email failed:', error);
      return { ok: false, error: error.message };
    }
  },

  async sendStaffCredentialsEmail({ email, fullName, role, password, loginUrl }) {
    const transporter = getTransporter();
    if (!transporter) return { ok: false, error: 'Transporter not configured' };

    const roleName = role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Staff';
    const content = `
      <tr>
        <td style="padding: 60px 40px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 800; color: ${COLORS.NAVY};">Welcome to Dnarai Travel</h1>
          <p style="margin: 20px 0 0 0; font-size: 16px; color: ${COLORS.SLATE}; line-height: 1.6;">Hello ${fullName || 'Team Member'}, your Dnarai Travel staff account (<strong>${roleName}</strong>) has been successfully created.</p>
          <div style="margin: 30px 0; padding: 25px; background-color: #f1f5f9; border-radius: 20px; text-align: left;">
            <p style="margin: 0 0 15px 0; font-size: 14px; font-weight: 800; color: ${COLORS.NAVY};">Your Login Credentials</p>
            <p style="margin: 0; font-size: 14px; color: ${COLORS.SLATE};"><strong>Portal URL:</strong> <a href="${loginUrl}" style="color: ${COLORS.NAVY}; font-weight: bold; text-decoration: underline;">${loginUrl}</a></p>
            <p style="margin: 10px 0 0 0; font-size: 14px; color: ${COLORS.SLATE};"><strong>Email / Username:</strong> ${email}</p>
            <p style="margin: 10px 0 0 0; font-size: 14px; color: ${COLORS.SLATE};"><strong>Assigned Role:</strong> ${roleName}</p>
            <p style="margin: 14px 0 0 0; font-size: 14px; color: ${COLORS.SLATE};"><strong>Temporary Password:</strong> <span style="display: inline-block; color: ${COLORS.GOLD}; font-family: monospace; font-size: 16px; font-weight: 800; background: #ffffff; padding: 4px 12px; border-radius: 6px; border: 1px solid #cbd5e1; margin-top: 4px;">${password}</span></p>
          </div>
          <p style="margin: 0 0 25px 0; font-size: 13px; color: #64748b;">Please log in using the button below and change your password upon your first access.</p>
          <a href="${loginUrl}" style="display: inline-block; padding: 18px 40px; background-color: ${COLORS.NAVY}; color: white; text-decoration: none; border-radius: 12px; font-weight: 700;">Access Staff Portal</a>
        </td>
      </tr>
    `;

    try {
      await transporter.sendMail({
        from: `"Dnarai Travel" <${process.env.EMAIL}>`,
        to: email,
        subject: `Welcome to Dnarai Travel - Your Staff Account Credentials (${roleName})`,
        html: getEmailWrapper(content, 'Your staff account credentials.'),
        attachments: getAttachments()
      });
      console.log(`✉️ Staff credentials email sent to ${email}`);
      return { ok: true };
    } catch (error) {
      console.error('Staff credentials email failed:', error);
      return { ok: false, error: error.message };
    }
  },

  async sendRegistrationWelcomeEmail({ email, fullName, loginUrl }) {
    const transporter = getTransporter();
    if (!transporter) return { ok: false, error: 'Transporter not configured' };

    const content = `
      <tr>
        <td style="padding: 60px 40px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 800; color: ${COLORS.NAVY};">Welcome to Dnarai Travel</h1>
          <p style="margin: 20px 0 0 0; font-size: 16px; color: ${COLORS.SLATE}; line-height: 1.6;">Hello ${fullName || 'Traveler'}, your account has been successfully created.</p>
          <div style="margin: 40px 0; padding: 30px; background-color: #f1f5f9; border-radius: 20px; text-align: left;">
            <p style="margin: 0 0 15px 0; font-size: 14px; font-weight: 800; color: ${COLORS.NAVY};">Your Login Details</p>
            <p style="margin: 0; font-size: 14px;"><strong>Username:</strong> ${email}</p>
          </div>
          <a href="${loginUrl}" style="display: inline-block; padding: 18px 40px; background-color: ${COLORS.NAVY}; color: white; text-decoration: none; border-radius: 12px; font-weight: 700;">Login to Your Account</a>
        </td>
      </tr>
    `;

    try {
      await transporter.sendMail({
        from: `"Dnarai Travel" <${process.env.EMAIL}>`,
        to: email,
        subject: 'Welcome to Dnarai Travel',
        html: getEmailWrapper(content, 'Your account has been created.'),
        attachments: getAttachments()
      });
      console.log(`✉️ Registration welcome email sent to ${email}`);
      return { ok: true };
    } catch (error) {
      console.error('Email failed:', error);
      return { ok: false, error: error.message };
    }
  },

  async sendBookingRequestNotification({ adminEmail, passengerName, requestDetails, passengerEmail, passengerPhone }) {
    const transporter = getTransporter();
    if (!transporter) return { ok: false, error: 'Transporter not configured' };

    const content = `
      <tr>
        <td style="padding: 40px;">
          <h2 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 800; color: ${COLORS.NAVY}; text-transform: uppercase; letter-spacing: -0.5px;">New Journey Requested</h2>
          
          <div style="background-color: #f8fafc; border-radius: 16px; padding: 24px; border: 1px solid #e2e8f0; margin-bottom: 30px;">
            <p style="margin: 0 0 10px 0; font-size: 13px; font-weight: 700; color: ${COLORS.SLATE}; text-transform: uppercase; letter-spacing: 1px;">Itinerary Details</p>
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
              ${requestDetails.tripType === 'multicity' && Array.isArray(requestDetails.legs) ? `
                <tr><td style="padding: 4px 0 12px 0; font-size: 14px; color: ${COLORS.NAVY};"><strong>Trip Type:</strong> Multi-city (${requestDetails.legs.length} legs)</td></tr>
                ${requestDetails.legs.map((leg, idx) => `
                  <tr>
                    <td style="padding: 10px 0; font-size: 14px; color: ${COLORS.NAVY}; border-top: 1px dashed #e2e8f0;">
                      <span style="font-weight: 800; color: ${COLORS.GOLD}; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Flight ${idx + 1}</span><br/>
                      <strong>From:</strong> ${leg.departureCity} ${leg.departureIata ? `(${leg.departureIata})` : ''}<br/>
                      <strong>To:</strong> ${leg.destination} ${leg.destinationIata ? `(${leg.destinationIata})` : ''}<br/>
                      <strong>Date:</strong> ${leg.date}
                    </td>
                  </tr>
                `).join('')}
              ` : `
                <tr><td style="padding: 4px 0 8px 0; font-size: 14px; color: ${COLORS.NAVY};"><strong>Trip Type:</strong> ${requestDetails.tripType === 'return' || requestDetails.isReturn ? 'Return Journey' : 'One Way'}</td></tr>
                <tr><td style="padding: 8px 0; font-size: 14px; color: ${COLORS.NAVY};"><strong>From:</strong> ${requestDetails.departureCity}</td></tr>
                <tr><td style="padding: 8px 0; font-size: 14px; color: ${COLORS.NAVY};"><strong>To:</strong> ${requestDetails.destination}</td></tr>
                <tr><td style="padding: 8px 0; font-size: 14px; color: ${COLORS.NAVY};"><strong>Date:</strong> ${requestDetails.date}</td></tr>
                ${(requestDetails.tripType === 'return' || requestDetails.isReturn) && requestDetails.returnDate ? `<tr><td style="padding: 8px 0; font-size: 14px; color: ${COLORS.NAVY};"><strong>Return Date:</strong> ${requestDetails.returnDate}</td></tr>` : ''}
              `}
              <tr><td style="padding: 12px 0 8px 0; font-size: 14px; color: ${COLORS.NAVY}; border-top: 1px solid #e2e8f0;"><strong>Passengers:</strong> 
                ${requestDetails.passengers?.adults || 1} Adults
                ${requestDetails.passengers?.children ? `, ${requestDetails.passengers.children} Children` : ''}
                ${requestDetails.passengers?.infants ? `, ${requestDetails.passengers.infants} Infants` : ''}
              </td></tr>
              <tr><td style="padding: 8px 0; font-size: 14px; color: ${COLORS.NAVY}; font-style: italic;"><strong>Special Notes:</strong> ${requestDetails.notes || 'No specific notes provided.'}</td></tr>
            </table>
          </div>

          <div style="background-color: ${COLORS.NAVY}; border-radius: 16px; padding: 24px; color: white;">
            <p style="margin: 0 0 10px 0; font-size: 13px; font-weight: 700; color: ${COLORS.GOLD}; text-transform: uppercase; letter-spacing: 1px;">Passenger Identity</p>
            <p style="margin: 0 0 20px 0; font-size: 22px; font-weight: 800;">${passengerName}</p>
            
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr><td style="padding: 5px 0; font-size: 14px; opacity: 0.9;"><strong>Email:</strong> ${passengerEmail}</td></tr>
              <tr><td style="padding: 5px 0; font-size: 14px; opacity: 0.9;"><strong>Phone:</strong> ${passengerPhone}</td></tr>
            </table>

            <div style="margin-top: 25px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 25px;">
              <a href="https://wa.me/${(passengerPhone || '').replace(/[^0-9]/g, '').replace(/^0/, '234')}?text=Hello%20This%20is%20a%20representative%20from%20Dnarai%20Enterprise%2C%20we%20got%20your%20request%20and%20we%20will%20get%20back%20to%20you%20shortly%2C" style="display: inline-block; padding: 12px 24px; background-color: #25D366; color: white; text-decoration: none; border-radius: 8px; font-size: 13px; font-weight: 800; text-transform: uppercase;">Connect via WhatsApp</a>
              <a href="mailto:${passengerEmail}" style="display: inline-block; margin-left: 10px; padding: 12px 24px; background-color: rgba(255,255,255,0.1); color: white; text-decoration: none; border-radius: 8px; font-size: 13px; font-weight: 800; text-transform: uppercase; border: 1px solid rgba(255,255,255,0.2);">Send Email</a>
            </div>
          </div>
        </td>
      </tr>
    `;

    try {
      await transporter.sendMail({
        from: `"Dnarai System" <${process.env.EMAIL}>`,
        to: adminEmail,
        subject: `New Request: ${passengerName}`,
        html: getEmailWrapper(content, 'New booking request.'),
        attachments: getAttachments()
      });
      return { ok: true };
    } catch (error) {
      console.error('Email failed:', error);
      return { ok: false, error: error.message };
    }
  },

  async sendBookingConfirmation({ booking, passenger }) {
    const transporter = getTransporter();
    if (!transporter) return { ok: false, error: 'Transporter not configured' };

    // Fetch destination weather for the flight date
    const { WeatherService } = await import('./WeatherService.js');
    const weather = await WeatherService.getCityForecast({
      city: booking.destination?.city || 'the destination',
      date: booking.departureDateTimeUtc
    });

    // Check if passenger has user account
    let hasAccount = false;
    try {
      const { User } = await import('../models/User.js');
      const conditions = [];
      const passId = passenger.id || passenger._id;
      if (passId) conditions.push({ passengerId: passId });
      if (passenger.email) conditions.push({ email: passenger.email.toLowerCase() });

      if (conditions.length > 0) {
        const user = await User.findOne({ $or: conditions });
        hasAccount = !!user;
      }
    } catch (err) {
      console.error('Failed to check if user has account in sendBookingConfirmation:', err);
    }
    const signupUrl = `${process.env.CORS_ORIGIN || 'http://localhost:5173'}/register`;

    // Format departure date & time
    const departureDate = booking.departureDateTimeUtc
      ? new Date(booking.departureDateTimeUtc).toLocaleDateString('en-GB', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
      })
      : 'TBC';

    const departureTime = booking.departureTime24
      ? booking.departureTime24
      : (booking.departureDateTimeUtc
        ? new Date(booking.departureDateTimeUtc).toLocaleTimeString('en-GB', {
          hour: '2-digit', minute: '2-digit', timeZone: 'UTC', hour12: false
        })
        : 'TBC');

    // Weather icon mapping (text-based for email clients)
    const weatherIcon = { sun: '☀️', cloudSun: '⛅', cloud: '☁️', rain: '🌧️', snow: '❄️', storm: '⛈️' }[weather.type] || '🌤️';

    const content = `
      <tr>
        <td style="background: linear-gradient(135deg, ${COLORS.NAVY} 0%, #1e3a5f 100%); padding: 50px 40px; text-align: center; color: white;">
          <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 800; color: ${COLORS.GOLD}; text-transform: uppercase; letter-spacing: 3px;">Dnarai Travel</p>
          <h1 style="margin: 0; font-size: 32px; font-weight: 900; letter-spacing: -1px;">Ticket Confirmed ✅</h1>
          <p style="margin: 12px 0 0 0; font-size: 15px; opacity: 0.8;">Your itinerary is locked in. Have a great journey!</p>
        </td>
      </tr>
      <tr>
        <td style="padding: 40px;">

          <!-- Greeting -->
          <p style="margin: 0 0 30px 0; font-size: 16px; color: ${COLORS.SLATE}; line-height: 1.6;">
            Hello <strong style="color: ${COLORS.NAVY};">${passenger.fullName}</strong>, your flight ticket has been successfully issued. Here are your travel details:
          </p>

          <!-- Flight Card -->
          <div style="border: 2px solid #e2e8f0; border-radius: 20px; overflow: hidden; margin-bottom: 30px;">
            <!-- Route Header -->
            <div style="background-color: #f8fafc; padding: 24px 28px; border-bottom: 1px solid #e2e8f0;">
              <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 700; color: ${COLORS.SLATE}; text-transform: uppercase; letter-spacing: 1.5px;">Flight Route</p>
              <div style="display: flex; align-items: center; font-size: 28px; font-weight: 900; color: ${COLORS.NAVY};">
                <span>${booking.origin?.iata || 'DEP'}</span>
                <span style="margin: 0 16px; font-size: 22px;">✈️</span>
                <span>${booking.destination?.iata || 'ARR'}</span>
              </div>
              <p style="margin: 4px 0 0 0; font-size: 14px; color: ${COLORS.SLATE};">
                ${booking.origin?.city || ''} → ${booking.destination?.city || ''}
              </p>
            </div>

            <!-- Details Grid -->
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td style="padding: 20px 28px; border-bottom: 1px solid #f1f5f9; width: 50%;">
                  <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 700; color: ${COLORS.SLATE}; text-transform: uppercase; letter-spacing: 1px;">Airline</p>
                  <p style="margin: 0; font-size: 15px; font-weight: 700; color: ${COLORS.NAVY};">${booking.airlineName}</p>
                </td>
                <td style="padding: 20px 28px; border-bottom: 1px solid #f1f5f9; border-left: 1px solid #f1f5f9;">
                  <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 700; color: ${COLORS.SLATE}; text-transform: uppercase; letter-spacing: 1px;">Flight No.</p>
                  <p style="margin: 0; font-size: 15px; font-weight: 700; color: ${COLORS.NAVY};">${booking.flightNumber}</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 20px 28px; border-bottom: 1px solid #f1f5f9;">
                  <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 700; color: ${COLORS.SLATE}; text-transform: uppercase; letter-spacing: 1px;">📅 Departure Date</p>
                  <p style="margin: 0; font-size: 15px; font-weight: 700; color: ${COLORS.NAVY};">${departureDate}</p>
                </td>
                <td style="padding: 20px 28px; border-bottom: 1px solid #f1f5f9; border-left: 1px solid #f1f5f9;">
                  <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 700; color: ${COLORS.SLATE}; text-transform: uppercase; letter-spacing: 1px;">🕐 Departure Time</p>
                  <p style="margin: 0; font-size: 15px; font-weight: 700; color: ${COLORS.NAVY};">${departureTime}</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 20px 28px;" colspan="2">
                  <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 700; color: ${COLORS.SLATE}; text-transform: uppercase; letter-spacing: 1px;">Passenger</p>
                  <p style="margin: 0; font-size: 15px; font-weight: 700; color: ${COLORS.NAVY};">${passenger.fullName}</p>
                </td>
              </tr>
              ${booking.bookingReference ? `
              <tr>
                <td style="padding: 0 28px 20px;" colspan="2">
                  <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 700; color: ${COLORS.SLATE}; text-transform: uppercase; letter-spacing: 1px;">Booking Reference (PNR)</p>
                  <p style="margin: 0; font-size: 15px; font-weight: 700; color: ${COLORS.NAVY}; font-family: monospace;">${booking.bookingReference}</p>
                </td>
              </tr>` : ''}
              ${booking.ticketNumber ? `
              <tr>
                <td style="padding: 0 28px 20px;" colspan="2">
                  <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 700; color: ${COLORS.SLATE}; text-transform: uppercase; letter-spacing: 1px;">Ticket Number</p>
                  <p style="margin: 0; font-size: 15px; font-weight: 700; color: ${COLORS.NAVY}; font-family: monospace;">${booking.ticketNumber}</p>
                </td>
              </tr>` : ''}
            </table>
          </div>

          <!-- Destination Weather -->
          <div style="margin-bottom: 30px; padding: 28px; background-color: ${COLORS.NAVY}; border-radius: 20px; color: white;">
            <p style="margin: 0 0 12px 0; font-size: 11px; font-weight: 800; color: ${COLORS.GOLD}; text-transform: uppercase; letter-spacing: 2px;">🌍 Destination Weather — ${booking.destination?.city || 'Destination'}</p>
            <div style="font-size: 30px; font-weight: 900; margin-bottom: 6px;">${weatherIcon} ${weather.tempC}°C &nbsp;<span style="font-size: 18px; font-weight: 400; opacity: 0.85;">${weather.desc}</span></div>
            <p style="margin: 14px 0 0 0; font-size: 14px; opacity: 0.9; line-height: 1.6; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 14px;"><strong>Packing Tip:</strong> ${weather.advice}</p>
          </div>

          ${!hasAccount ? `
          <!-- Signup CTA -->
          <div style="margin: 30px 0; padding: 25px; border: 1px solid #e2e8f0; border-radius: 20px; background-color: #f8fafc; text-align: center;">
            <p style="margin: 0 0 10px 0; font-size: 11px; font-weight: 800; color: ${COLORS.GOLD}; text-transform: uppercase; letter-spacing: 2px;">Exclusive Member Access</p>
            <h3 style="margin: 0 0 10px 0; font-size: 18px; font-weight: 900; color: ${COLORS.NAVY};">Create Your D.narai Enterprise Account</h3>
            <p style="margin: 0 0 20px 0; font-size: 14px; color: ${COLORS.SLATE}; line-height: 1.6;">Register now to easily manage your itineraries, view real-time updates, download invoices, and access premium services.</p>
            <a href="${signupUrl}" style="display: inline-block; padding: 14px 30px; background-color: ${COLORS.NAVY}; color: white; text-decoration: none; border-radius: 12px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">Create Account</a>
          </div>
          ` : ''}

          <!-- Footer Note -->
          <p style="margin: 0; font-size: 13px; color: ${COLORS.SLATE}; line-height: 1.6; font-style: italic; text-align: center;">
            "Our Service End when you successfully arrive your destination."<br>Safe travels from the Dnarai Travel team. ✈️
          </p>

        </td>
      </tr>
    `;

    try {
      await transporter.sendMail({
        from: `"Dnarai Travel" <${process.env.EMAIL}>`,
        to: passenger.email,
        subject: `✈️ Ticket Confirmed: ${booking.flightNumber} — ${booking.origin?.city || booking.origin?.iata || 'DEP'} to ${booking.destination?.city || booking.destination?.iata || 'ARR'} on ${departureDate}`,
        html: getEmailWrapper(content, `Your ticket for ${booking.flightNumber} is confirmed. Departing ${departureDate} at ${departureTime}.`),
        attachments: getAttachments()
      });
      return { ok: true };
    } catch (error) {
      console.error('Email failed:', error);
      return { ok: false, error: error.message };
    }
  },

  async sendNotification({ passengerId, _type, message, _bookingId }) {
    const transporter = getTransporter();
    if (!transporter) return { ok: false, error: 'Transporter not configured' };

    const { Passenger } = await import('../models/Passenger.js');
    const passenger = await Passenger.findById(passengerId);
    if (!passenger?.email) return null;

    const content = `
      <tr>
        <td style="padding: 40px;">
          <h2 style="color: ${COLORS.NAVY};">Travel Update</h2>
          <p>${message}</p>
        </td>
      </tr>
    `;

    try {
      await transporter.sendMail({
        from: `"Dnarai Travel" <${process.env.EMAIL}>`,
        to: passenger.email,
        subject: 'Travel Notification',
        html: getEmailWrapper(content, 'Travel update.'),
        attachments: getAttachments()
      });
      return { ok: true };
    } catch (error) {
      console.error('Email failed:', error);
      return { ok: false, error: error.message };
    }
  },

  async send24HourReminder({ booking, passenger }) {
    const transporter = getTransporter();
    if (!transporter) return { ok: false, error: 'Transporter not configured' };

    const { WeatherService } = await import('./WeatherService.js');
    const weather = await WeatherService.getCityForecast({
      city: booking.destination?.city || 'the destination',
      date: booking.departureDateTimeUtc
    });

    // Check if passenger has user account
    let hasAccount = false;
    try {
      const { User } = await import('../models/User.js');
      const conditions = [];
      const passId = passenger.id || passenger._id;
      if (passId) conditions.push({ passengerId: passId });
      if (passenger.email) conditions.push({ email: passenger.email.toLowerCase() });

      if (conditions.length > 0) {
        const user = await User.findOne({ $or: conditions });
        hasAccount = !!user;
      }
    } catch (err) {
      console.error('Failed to check if user has account in send24HourReminder:', err);
    }
    const signupUrl = `${process.env.CORS_ORIGIN || 'http://localhost:5173'}/register`;

    const content = `
      <tr>
        <td style="padding: 40px;">
          <h2 style="color: ${COLORS.NAVY}; text-transform: uppercase; letter-spacing: 1px; font-size: 18px;">24-Hour Flight Reminder</h2>
          <p style="color: ${COLORS.SLATE}; font-size: 16px;">Hello ${passenger.fullName}, your flight <strong>${booking.flightNumber}</strong> to <strong>${booking.destination?.city}</strong> is scheduled to depart in approximately 24 hours.</p>
          
          <div style="margin: 30px 0; padding: 25px; background-color: ${COLORS.NAVY}; border-radius: 20px; color: white;">
            <p style="margin: 0 0 15px 0; font-size: 13px; font-weight: 700; color: ${COLORS.GOLD}; text-transform: uppercase;">Destination Climate Brief</p>
            <div style="font-size: 24px; font-weight: 800; margin-bottom: 5px;">${weather.tempC}°C - ${weather.desc}</div>
            <p style="margin: 0; font-size: 14px; opacity: 0.9; line-height: 1.6;"><strong>Travel Advice:</strong> ${weather.advice}</p>
          </div>

          <div style="border-left: 4px solid ${COLORS.GOLD}; padding-left: 20px; font-size: 14px; color: ${COLORS.SLATE}; margin-bottom: 30px;">
            <p style="margin: 5px 0;"><strong>Departure:</strong> ${booking.origin?.city} (${booking.origin?.iata})</p>
            <p style="margin: 5px 0;"><strong>Arrival:</strong> ${booking.destination?.city} (${booking.destination?.iata})</p>
          </div>

          ${!hasAccount ? `
          <!-- Signup CTA -->
          <div style="margin: 30px 0; padding: 25px; border: 1px solid #e2e8f0; border-radius: 20px; background-color: #f8fafc; text-align: center;">
            <p style="margin: 0 0 10px 0; font-size: 11px; font-weight: 800; color: ${COLORS.GOLD}; text-transform: uppercase; letter-spacing: 2px;">Exclusive Member Access</p>
            <h3 style="margin: 0 0 10px 0; font-size: 18px; font-weight: 900; color: ${COLORS.NAVY};">Create Your D.narai Enterprise Account</h3>
            <p style="margin: 0 0 20px 0; font-size: 14px; color: ${COLORS.SLATE}; line-height: 1.6;">Register now to easily manage your itineraries, view real-time updates, download invoices, and access premium services.</p>
            <a href="${signupUrl}" style="display: inline-block; padding: 14px 30px; background-color: ${COLORS.NAVY}; color: white; text-decoration: none; border-radius: 12px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">Create Account</a>
          </div>
          ` : ''}

          <p style="font-size: 14px; color: ${COLORS.SLATE};">Please ensure you have all your travel documents ready. We look forward to your journey.</p>
        </td>
      </tr>
    `;

    try {
      await transporter.sendMail({
        from: `"Dnarai Travel" <${process.env.EMAIL}>`,
        to: passenger.email,
        subject: `24h Reminder: Journey to ${booking.destination?.city}`,
        html: getEmailWrapper(content, `Preparing for your trip to ${booking.destination?.city}`),
        attachments: getAttachments()
      });
      return { ok: true };
    } catch (error) {
      console.error('Email failed:', error);
      return { ok: false, error: error.message };
    }
  },

  async send3HourReminder({ booking, passenger }) {
    const transporter = getTransporter();
    if (!transporter) return { ok: false, error: 'Transporter not configured' };

    const { WeatherService } = await import('./WeatherService.js');
    const weather = await WeatherService.getCityForecast({
      city: booking.destination?.city || 'the destination',
      date: booking.departureDateTimeUtc
    });

    // Check if passenger has user account
    let hasAccount = false;
    try {
      const { User } = await import('../models/User.js');
      const conditions = [];
      const passId = passenger.id || passenger._id;
      if (passId) conditions.push({ passengerId: passId });
      if (passenger.email) conditions.push({ email: passenger.email.toLowerCase() });

      if (conditions.length > 0) {
        const user = await User.findOne({ $or: conditions });
        hasAccount = !!user;
      }
    } catch (err) {
      console.error('Failed to check if user has account in send3HourReminder:', err);
    }
    const signupUrl = `${process.env.CORS_ORIGIN || 'http://localhost:5173'}/register`;

    const content = `
      <tr>
        <td style="padding: 40px;">
          <h2 style="color: ${COLORS.NAVY}; text-transform: uppercase; letter-spacing: 1px; font-size: 18px;">Final Departure Reminder</h2>
          <p style="color: ${COLORS.SLATE}; font-size: 16px;">Hello ${passenger.fullName}, your flight <strong>${booking.flightNumber}</strong> is departing in approximately 3 hours. We hope you are ready for boarding!</p>
          
          <div style="margin: 30px 0; padding: 25px; border: 2px dashed ${COLORS.NAVY}; border-radius: 20px;">
            <p style="margin: 0 0 10px 0; font-size: 12px; font-weight: 800; color: ${COLORS.SLATE}; text-transform: uppercase;">At your destination right now</p>
            <div style="font-size: 20px; font-weight: 800; color: ${COLORS.NAVY};">${weather.tempC}°C - ${weather.desc}</div>
            <p style="margin: 10px 0 0 0; font-size: 14px; color: ${COLORS.SLATE};"><strong>Quick Gear Check:</strong> ${weather.advice}</p>
          </div>

          ${!hasAccount ? `
          <!-- Signup CTA -->
          <div style="margin: 30px 0; padding: 25px; border: 1px solid #e2e8f0; border-radius: 20px; background-color: #f8fafc; text-align: center;">
            <p style="margin: 0 0 10px 0; font-size: 11px; font-weight: 800; color: ${COLORS.GOLD}; text-transform: uppercase; letter-spacing: 2px;">Exclusive Member Access</p>
            <h3 style="margin: 0 0 10px 0; font-size: 18px; font-weight: 900; color: ${COLORS.NAVY};">Create Your D.narai Enterprise Account</h3>
            <p style="margin: 0 0 20px 0; font-size: 14px; color: ${COLORS.SLATE}; line-height: 1.6;">Register now to easily manage your itineraries, view real-time updates, download invoices, and access premium services.</p>
            <a href="${signupUrl}" style="display: inline-block; padding: 14px 30px; background-color: ${COLORS.NAVY}; color: white; text-decoration: none; border-radius: 12px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">Create Account</a>
          </div>
          ` : ''}

          <p style="font-size: 14px; color: ${COLORS.SLATE}; font-style: italic; text-align: center;">"Our Service End when you successfully arrive at your destination."</p>
        </td>
      </tr>
    `;

    try {
      await transporter.sendMail({
        from: `"Dnarai Travel" <${process.env.EMAIL}>`,
        to: passenger.email,
        subject: `Upcoming Boarding: ${booking.flightNumber}`,
        html: getEmailWrapper(content, `Final boarding reminder for ${booking.flightNumber}`),
        attachments: getAttachments()
      });
      return { ok: true };
    } catch (error) {
      console.error('Email failed:', error);
      return { ok: false, error: error.message };
    }
  },

  async sendCancellationEmail({ to, subject, body, previewText }) {
    const transporter = getTransporter();
    if (!transporter) return { ok: false, error: 'Transporter not configured' };

    const content = `
      <tr>
        <td style="padding: 40px;">
          <h2 style="color: ${COLORS.NAVY}; text-transform: uppercase; letter-spacing: 1px; font-size: 18px;">Booking Cancellation</h2>
          <div style="margin: 20px 0; font-size: 16px; color: ${COLORS.SLATE}; line-height: 1.6; white-space: pre-line;">
            ${body}
          </div>
          <div style="margin-top: 30px; padding: 20px; background-color: #fef2f2; border-radius: 12px; border: 1px solid #fee2e2;">
            <p style="margin: 0; font-size: 13px; color: #b91c1c; font-weight: 700;">Status: CANCELLED</p>
          </div>
        </td>
      </tr>
    `;

    try {
      await transporter.sendMail({
        from: `"Dnarai Travel" <${process.env.EMAIL}>`,
        to,
        subject,
        html: getEmailWrapper(content, previewText || 'A booking has been cancelled.'),
        attachments: getAttachments()
      });
      return { ok: true };
    } catch (error) {
      console.error('Email failed:', error);
      return { ok: false, error: error.message };
    }
  },

  async sendInvoiceEmail({ email, passengerName, invoiceNumber, pdfBuffer }) {
    const transporter = getTransporter();
    if (!transporter) return { ok: false, error: 'Transporter not configured' };

    const content = `
      <tr>
        <td style="padding: 60px 40px; text-align: center;">
          <h2 style="margin: 0; font-size: 24px; font-weight: 800; color: ${COLORS.NAVY}; text-transform: uppercase; letter-spacing: -0.5px;">Travel Invoice Issued</h2>
          <p style="margin: 20px 0 0 0; font-size: 16px; color: ${COLORS.SLATE}; line-height: 1.6;">Hello <strong>${passengerName}</strong>, your invoice for your travel arrangements with D.NARAI ENTERPRISE is now available.</p>
          
          <div style="margin: 40px 0; padding: 30px; border: 2px dashed #e2e8f0; border-radius: 20px; text-align: left;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td style="font-size: 13px; font-weight: 700; color: ${COLORS.SLATE}; text-transform: uppercase;">Invoice Number</td>
                <td style="text-align: right; font-size: 14px; font-weight: 800; color: ${COLORS.NAVY};">#${invoiceNumber}</td>
              </tr>
            </table>
          </div>

          <p style="margin: 0; font-size: 14px; color: ${COLORS.SLATE}; font-style: italic;">"Our Service End when you successfully arrive at your destination."</p>
        </td>
      </tr>
    `;

    try {
      await transporter.sendMail({
        from: `"Dnarai Travel" <${process.env.EMAIL}>`,
        to: email,
        subject: `Invoice from Dnarai Travel: #${invoiceNumber}`,
        html: getEmailWrapper(content, `This is your invoice for your current travel.`),
        attachments: [
          ...getAttachments(),
          {
            filename: `Invoice_${invoiceNumber}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      });
      return { ok: true };
    } catch (error) {
      console.error('Email failed:', error);
      return { ok: false, error: error.message };
    }
  },

  /**
   * Send duty assignment notification email to staff member
   */
  async sendDutyAssignedEmail({ email, staffName, dutyTitle, dutyDescription, dueDate, dueTime, priority, loginUrl }) {
    const transporter = getTransporter();
    if (!transporter) return { ok: false, error: 'Transporter not configured' };

    const priorityColor = priority === 'urgent' ? '#EF4444' : priority === 'high' ? '#F97316' : '#2563EB';

    const content = `
      <tr>
        <td style="padding: 40px 30px; background-color: #ffffff; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="display: inline-block; padding: 6px 16px; background-color: #EFF6FF; color: #1D4ED8; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">
              Operational Duty Notice
            </span>
            <h2 style="margin: 16px 0 8px 0; font-size: 24px; font-weight: 800; color: ${COLORS.NAVY}; letter-spacing: -0.5px;">New Duty Assigned</h2>
            <p style="margin: 0; font-size: 15px; color: ${COLORS.SLATE};">Hello <strong>${staffName || 'Team Member'}</strong>, you have been assigned an operational task.</p>
          </div>

          <div style="margin: 25px 0; padding: 24px; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 16px;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td style="padding-bottom: 12px; font-size: 12px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px;">Task Title</td>
                <td style="padding-bottom: 12px; font-size: 15px; font-weight: 800; color: #0F172A; text-align: right;">${dutyTitle}</td>
              </tr>
              ${dutyDescription ? `
              <tr>
                <td colspan="2" style="padding-bottom: 16px; font-size: 13px; color: #475569; line-height: 1.5; border-bottom: 1px dashed #CBD5E1;">
                  ${dutyDescription}
                </td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 12px 0 6px 0; font-size: 12px; font-weight: 700; color: #64748B; text-transform: uppercase;">Due Date & Time</td>
                <td style="padding: 12px 0 6px 0; font-size: 14px; font-weight: 800; color: #0F172A; text-align: right;">${dueDate} ${dueTime ? `at ${dueTime}` : ''}</td>
              </tr>
              <tr>
                <td style="padding-top: 6px; font-size: 12px; font-weight: 700; color: #64748B; text-transform: uppercase;">Priority</td>
                <td style="padding-top: 6px; font-size: 12px; font-weight: 800; color: ${priorityColor}; text-align: right; text-transform: uppercase;">${priority || 'MEDIUM'}</td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin: 30px 0 20px 0;">
            <a href="${loginUrl || 'https://dnaraitravels.com/login'}" style="display: inline-block; padding: 14px 32px; background-color: ${COLORS.NAVY}; color: #ffffff; text-decoration: none; border-radius: 12px; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);">
              View & Complete Duty
            </a>
          </div>

          <p style="margin: 20px 0 0 0; font-size: 12px; color: #94A3B8; text-align: center; line-height: 1.5;">
            Please log into the portal to review the checklist and mark this duty completed when done.
          </p>
        </td>
      </tr>
    `;

    try {
      await transporter.sendMail({
        from: `"Dnarai Operations" <${process.env.EMAIL}>`,
        to: email,
        subject: `📋 New Duty Assigned: ${dutyTitle}`,
        html: getEmailWrapper(content, `You have been assigned: ${dutyTitle}. Due ${dueDate}.`),
        attachments: getAttachments()
      });
      return { ok: true };
    } catch (error) {
      console.error('[EmailService] Duty assigned email failed:', error);
      return { ok: false, error: error.message };
    }
  },

  /**
   * Send duty completion alert email to Admin / Super Admin
   */
  async sendDutyCompletedAdminEmail({ adminEmail, staffName, dutyTitle, completedAt, notes, dashboardUrl }) {
    const transporter = getTransporter();
    if (!transporter) return { ok: false, error: 'Transporter not configured' };

    const formattedTime = completedAt ? new Date(completedAt).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }) : new Date().toLocaleString();

    const actionUrl = dashboardUrl || `${process.env.CORS_ORIGIN || 'https://dnaraitravels.com'}/super-admin?tab=duties`;

    const content = `
      <tr>
        <td style="padding: 40px 30px; background-color: #ffffff; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="display: inline-block; padding: 6px 16px; background-color: #ECFDF5; color: #059669; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">
              ✓ Duty Completed
            </span>
            <h2 style="margin: 16px 0 8px 0; font-size: 22px; font-weight: 800; color: ${COLORS.NAVY}; letter-spacing: -0.5px;">Staff Duty Completed</h2>
            <p style="margin: 0; font-size: 15px; color: ${COLORS.SLATE};"><strong>${staffName}</strong> has completed their assigned duty.</p>
          </div>

          <div style="margin: 25px 0; padding: 20px; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 14px;">
            <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px;">Duty</p>
            <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 800; color: #0F172A;">${dutyTitle}</p>
            
            <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px;">Completed At</p>
            <p style="margin: 0 0 ${notes ? '14px' : '0'}; font-size: 14px; font-weight: 700; color: #059669;">${formattedTime}</p>

            ${notes ? `
            <div style="margin-top: 14px; padding: 14px; background-color: #ffffff; border-left: 4px solid #0284C7; border-radius: 8px;">
              <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 800; color: #0284C7; text-transform: uppercase;">Staff Completion / Handover Note:</p>
              <p style="margin: 0; font-size: 14px; color: #1E293B; line-height: 1.5; font-style: italic;">“${notes}”</p>
            </div>
            ` : ''}
          </div>

          <div style="text-align: center; margin: 30px 0 10px 0;">
            <a href="${actionUrl}" style="display: inline-block; padding: 14px 32px; background-color: ${COLORS.NAVY}; color: #ffffff; text-decoration: none; border-radius: 12px; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);">
              View Operations & Assigned Tasks
            </a>
          </div>
        </td>
      </tr>
    `;

    try {
      await transporter.sendMail({
        from: `"Dnarai Operations" <${process.env.EMAIL}>`,
        to: adminEmail,
        subject: `✅ Completed: ${staffName} finished "${dutyTitle}"`,
        html: getEmailWrapper(content, `${staffName} completed ${dutyTitle}.`),
        attachments: getAttachments()
      });
      return { ok: true };
    } catch (error) {
      console.error('[EmailService] Duty completed alert email failed:', error);
      return { ok: false, error: error.message };
    }
  },

  /**
   * Send staff task note update alert email to Admin / Super Admin
   */
  async sendDutyNoteUpdatedAdminEmail({ adminEmail, staffName, dutyTitle, notes, updatedAt, dashboardUrl }) {
    const transporter = getTransporter();
    if (!transporter) return { ok: false, error: 'Transporter not configured' };

    const formattedTime = updatedAt ? new Date(updatedAt).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }) : new Date().toLocaleString();

    const actionUrl = dashboardUrl || `${process.env.CORS_ORIGIN || 'https://dnaraitravels.com'}/super-admin?tab=duties`;

    const content = `
      <tr>
        <td style="padding: 40px 30px; background-color: #ffffff; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="display: inline-block; padding: 6px 16px; background-color: #E0F2FE; color: #0284C7; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">
              📝 Task Note Update
            </span>
            <h2 style="margin: 16px 0 8px 0; font-size: 22px; font-weight: 800; color: ${COLORS.NAVY}; letter-spacing: -0.5px;">Staff Updated Task Note</h2>
            <p style="margin: 0; font-size: 15px; color: ${COLORS.SLATE};"><strong>${staffName}</strong> updated notes on their assigned duty.</p>
          </div>

          <div style="margin: 25px 0; padding: 20px; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 14px;">
            <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px;">Duty</p>
            <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 800; color: #0F172A;">${dutyTitle}</p>
            
            <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px;">Updated At</p>
            <p style="margin: 0 0 14px 0; font-size: 14px; font-weight: 700; color: #475569;">${formattedTime}</p>

            <div style="padding: 14px; background-color: #ffffff; border-left: 4px solid #0284C7; border-radius: 8px;">
              <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 800; color: #0284C7; text-transform: uppercase;">Staff Note:</p>
              <p style="margin: 0; font-size: 14px; color: #1E293B; line-height: 1.5; font-style: italic;">“${notes || 'No note text provided'}”</p>
            </div>
          </div>

          <div style="text-align: center; margin: 30px 0 10px 0;">
            <a href="${actionUrl}" style="display: inline-block; padding: 14px 32px; background-color: ${COLORS.NAVY}; color: #ffffff; text-decoration: none; border-radius: 12px; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);">
              View Operations & Assigned Tasks
            </a>
          </div>
        </td>
      </tr>
    `;

    try {
      await transporter.sendMail({
        from: `"Dnarai Operations" <${process.env.EMAIL}>`,
        to: adminEmail,
        subject: `📝 Staff Note Updated: ${staffName} on "${dutyTitle}"`,
        html: getEmailWrapper(content, `${staffName} updated note on ${dutyTitle}.`),
        attachments: getAttachments()
      });
      return { ok: true };
    } catch (error) {
      console.error('[EmailService] Duty note update alert email failed:', error);
      return { ok: false, error: error.message };
    }
  },

  /**
   * Send daily duty briefing email to on-duty staff
   * Includes: "You are on duty today, stay active please", shift info, travels today, assigned tasks
   */
  async sendDailyStaffDutyBriefingEmail({
    email,
    staffName,
    shiftTitle = 'Active Duty Shift',
    shiftHours = '08:00 - 17:00',
    dateStr,
    slotName = 'Daily Briefing',
    travels = [],
    tasks = [],
    portalUrl
  }) {
    const transporter = getTransporter();
    if (!transporter) return { ok: false, error: 'Transporter not configured' };

    const actionUrl = portalUrl || `${process.env.CORS_ORIGIN || 'https://dnaraitravels.com'}/staff-duties`;

    const travelsRows = travels.length > 0 ? travels.map((t) => `
      <tr style="border-bottom: 1px solid #E2E8F0;">
        <td style="padding: 10px 8px; font-size: 13px; font-weight: 800; color: #0F172A;">${t.flightNumber || 'FLT'}</td>
        <td style="padding: 10px 8px; font-size: 13px; color: #334155;">${t.route || 'Departure'}</td>
        <td style="padding: 10px 8px; font-size: 13px; font-weight: 700; color: #0284C7; text-align: center;">${t.departureTime || '--:--'}</td>
        <td style="padding: 10px 8px; font-size: 13px; color: #475569;">${t.passengerName || 'Passenger'}</td>
      </tr>
    `).join('') : `
      <tr>
        <td colspan="4" style="padding: 16px 8px; text-align: center; color: #94A3B8; font-size: 13px; font-style: italic;">
          No passenger flight departures scheduled for today.
        </td>
      </tr>
    `;

    const tasksRows = tasks.length > 0 ? tasks.map((task) => {
      const isDone = task.status === 'completed';
      const statusBadge = isDone
        ? '<span style="display: inline-block; padding: 2px 8px; background: #ECFDF5; color: #059669; border-radius: 9999px; font-size: 10px; font-weight: 800; text-transform: uppercase;">Done</span>'
        : '<span style="display: inline-block; padding: 2px 8px; background: #FEF3C7; color: #D97706; border-radius: 9999px; font-size: 10px; font-weight: 800; text-transform: uppercase;">Pending</span>';
      return `
        <div style="margin-bottom: 10px; padding: 12px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <strong style="font-size: 14px; color: #0F172A;">${task.title}</strong>
            <span style="font-size: 11px; font-weight: 700; color: #64748B;">Due: ${task.dueTime || '17:00'}</span>
          </div>
          <div style="font-size: 12px; color: #64748B; margin-top: 4px;">
            Priority: <strong style="text-transform: uppercase; color: ${task.priority === 'urgent' ? '#DC2626' : '#0284C7'};">${task.priority || 'Medium'}</strong> &nbsp;|&nbsp; Status: ${statusBadge}
          </div>
          ${task.notes ? `<div style="margin-top: 6px; font-size: 12px; color: #475569; font-style: italic;">Note: ${task.notes}</div>` : ''}
        </div>
      `;
    }).join('') : `
      <p style="margin: 0; padding: 12px; text-align: center; color: #94A3B8; font-size: 13px; font-style: italic;">
        No specific tasks assigned yet for today. Stay ready for incoming instructions.
      </p>
    `;

    const content = `
      <tr>
        <td style="padding: 40px 30px; background-color: #ffffff; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="display: inline-block; padding: 6px 16px; background-color: #ECFDF5; color: #059669; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">
              🟢 On-Duty Briefing • ${slotName}
            </span>
            <h2 style="margin: 16px 0 8px 0; font-size: 24px; font-weight: 800; color: ${COLORS.NAVY}; letter-spacing: -0.5px;">
              You are on duty today, stay active please
            </h2>
            <p style="margin: 0; font-size: 15px; color: ${COLORS.SLATE};">
              Hello <strong>${staffName}</strong>, you are scheduled on duty today (${dateStr}).
            </p>
          </div>

          <!-- Shift Window Card -->
          <div style="margin: 20px 0; padding: 18px 24px; background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); border-radius: 14px; color: #FFFFFF;">
            <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #F59E0B; margin-bottom: 4px;">
              Shift Schedule
            </div>
            <div style="font-size: 20px; font-weight: 900; color: #FFFFFF;">
              ${shiftHours}
            </div>
            <div style="font-size: 12px; opacity: 0.8; margin-top: 4px;">
              ${shiftTitle} • Keep your web push notifications & portal session active.
            </div>
          </div>

          <!-- Travels Today Section -->
          <div style="margin: 25px 0;">
            <h3 style="margin: 0 0 12px 0; font-size: 15px; font-weight: 800; color: ${COLORS.NAVY}; text-transform: uppercase; letter-spacing: 0.5px;">
              ✈️ Today's Travels & Departures (${travels.length})
            </h3>
            <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <thead>
                  <tr style="background-color: #F1F5F9; border-bottom: 1px solid #E2E8F0;">
                    <th style="padding: 10px 8px; font-size: 11px; font-weight: 800; color: #64748B; text-align: left; text-transform: uppercase;">Flight</th>
                    <th style="padding: 10px 8px; font-size: 11px; font-weight: 800; color: #64748B; text-align: left; text-transform: uppercase;">Route</th>
                    <th style="padding: 10px 8px; font-size: 11px; font-weight: 800; color: #64748B; text-align: center; text-transform: uppercase;">Time</th>
                    <th style="padding: 10px 8px; font-size: 11px; font-weight: 800; color: #64748B; text-align: left; text-transform: uppercase;">Passenger</th>
                  </tr>
                </thead>
                <tbody>
                  ${travelsRows}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Tasks Assigned Section -->
          <div style="margin: 25px 0;">
            <h3 style="margin: 0 0 12px 0; font-size: 15px; font-weight: 800; color: ${COLORS.NAVY}; text-transform: uppercase; letter-spacing: 0.5px;">
              📋 Your Assigned Tasks (${tasks.length})
            </h3>
            <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px;">
              ${tasksRows}
            </div>
          </div>

          <!-- Direct Action Button -->
          <div style="text-align: center; margin: 30px 0 15px 0;">
            <a href="${actionUrl}" style="display: inline-block; padding: 16px 36px; background-color: #0284C7; color: #ffffff; text-decoration: none; border-radius: 14px; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 4px 14px rgba(2, 132, 199, 0.3);">
              Open My Duties & Complete Tasks
            </a>
          </div>

          <p style="margin: 15px 0 0 0; font-size: 12px; color: #94A3B8; text-align: center; line-height: 1.5;">
            Click above to mark assigned tasks complete or add progress notes directly from your duty dashboard.
          </p>
        </td>
      </tr>
    `;

    try {
      await transporter.sendMail({
        from: `"Dnarai Operations" <${process.env.EMAIL}>`,
        to: email,
        subject: `✈️ You are on duty today, stay active please | Dnarai Briefing (${dateStr})`,
        html: getEmailWrapper(content, `You are on duty today (${shiftHours}). ${travels.length} flight(s) today. Stay active please.`),
        attachments: getAttachments()
      });
      return { ok: true };
    } catch (error) {
      console.error('[EmailService] Daily staff briefing email failed:', error);
      return { ok: false, error: error.message };
    }
  },

  /**
   * Send daily operations briefing email to Admins
   * Includes: Who is on duty today, travels summary, pending tasks, direct link to duties
   */
  async sendDailyAdminOperationsBriefingEmail({
    adminEmail,
    adminName,
    dateStr,
    slotName = 'Daily Briefing',
    onDutyStaff = [],
    travels = [],
    pendingTasks = [],
    dashboardUrl
  }) {
    const transporter = getTransporter();
    if (!transporter) return { ok: false, error: 'Transporter not configured' };

    const actionUrl = dashboardUrl || `${process.env.CORS_ORIGIN || 'https://dnaraitravels.com'}/super-admin?tab=duties`;

    const staffRows = onDutyStaff.length > 0 ? onDutyStaff.map((s) => `
      <tr style="border-bottom: 1px solid #E2E8F0;">
        <td style="padding: 10px 8px; font-size: 13px; font-weight: 800; color: #0F172A;">${s.name}</td>
        <td style="padding: 10px 8px; font-size: 12px; color: #64748B;">${s.email}</td>
        <td style="padding: 10px 8px; font-size: 13px; font-weight: 700; color: #059669; text-align: center;">${s.hours}</td>
        <td style="padding: 10px 8px; font-size: 12px; color: #334155; text-transform: capitalize;">${s.type}</td>
      </tr>
    `).join('') : `
      <tr>
        <td colspan="4" style="padding: 16px 8px; text-align: center; color: #EF4444; font-size: 13px; font-weight: 700;">
          ⚠️ No staff scheduled on duty for today!
        </td>
      </tr>
    `;

    const content = `
      <tr>
        <td style="padding: 40px 30px; background-color: #ffffff; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="display: inline-block; padding: 6px 16px; background-color: #E0F2FE; color: #0284C7; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">
              Admin Operations Roster • ${slotName}
            </span>
            <h2 style="margin: 16px 0 8px 0; font-size: 24px; font-weight: 800; color: ${COLORS.NAVY}; letter-spacing: -0.5px;">
              Daily Operations Briefing (${dateStr})
            </h2>
            <p style="margin: 0; font-size: 15px; color: ${COLORS.SLATE};">
              Hello <strong>${adminName || 'Admin'}</strong>, here is today's active staff duty roster and operational overview.
            </p>
          </div>

          <!-- Staff On Duty Today -->
          <div style="margin: 25px 0;">
            <h3 style="margin: 0 0 12px 0; font-size: 15px; font-weight: 800; color: ${COLORS.NAVY}; text-transform: uppercase; letter-spacing: 0.5px;">
              👥 Staff On Duty Today (${onDutyStaff.length})
            </h3>
            <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <thead>
                  <tr style="background-color: #F1F5F9; border-bottom: 1px solid #E2E8F0;">
                    <th style="padding: 10px 8px; font-size: 11px; font-weight: 800; color: #64748B; text-align: left; text-transform: uppercase;">Staff Name</th>
                    <th style="padding: 10px 8px; font-size: 11px; font-weight: 800; color: #64748B; text-align: left; text-transform: uppercase;">Email</th>
                    <th style="padding: 10px 8px; font-size: 11px; font-weight: 800; color: #64748B; text-align: center; text-transform: uppercase;">Duty Hours</th>
                    <th style="padding: 10px 8px; font-size: 11px; font-weight: 800; color: #64748B; text-align: left; text-transform: uppercase;">Type</th>
                  </tr>
                </thead>
                <tbody>
                  ${staffRows}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Direct Action Button -->
          <div style="text-align: center; margin: 30px 0 15px 0;">
            <a href="${actionUrl}" style="display: inline-block; padding: 16px 36px; background-color: ${COLORS.NAVY}; color: #ffffff; text-decoration: none; border-radius: 14px; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 4px 14px rgba(15, 23, 42, 0.25);">
              Manage Assigned Tasks & Operations
            </a>
          </div>

          <p style="margin: 15px 0 0 0; font-size: 12px; color: #94A3B8; text-align: center; line-height: 1.5;">
            You will also receive instant push and email alerts as soon as any staff completes a task or updates their notes.
          </p>
        </td>
      </tr>
    `;

    try {
      await transporter.sendMail({
        from: `"Dnarai Operations" <${process.env.EMAIL}>`,
        to: adminEmail,
        subject: `📋 Daily Duty Briefing: ${onDutyStaff.length} Staff on Duty | Dnarai Travel (${dateStr})`,
        html: getEmailWrapper(content, `${onDutyStaff.length} staff on duty today. ${travels.length} flight(s) today. ${pendingTasks.length} pending task(s).`),
        attachments: getAttachments()
      });
      return { ok: true };
    } catch (error) {
      console.error('[EmailService] Daily admin briefing email failed:', error);
      return { ok: false, error: error.message };
    }
  },

  /**
   * Send duty schedule assignment or reassignment notification email to staff member
   */
  async sendScheduleAssignedEmail({
    email,
    staffName,
    scheduleType,
    daysOfWeek,
    specificDate,
    startDate,
    endDate,
    startTime = '08:00',
    endTime = '17:00',
    notes,
    isReassigned = false,
    loginUrl,
  }) {
    const transporter = getTransporter();
    if (!transporter) return { ok: false, error: 'Transporter not configured' };

    const typeTitle = scheduleType === 'recurring'
      ? 'Recurring Weekly Shift'
      : scheduleType === 'part_time'
      ? 'Part-Time Shift Schedule'
      : 'Specific Date Assignment';

    const formattedDays = daysOfWeek && daysOfWeek.length > 0
      ? daysOfWeek.map((d) => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')
      : null;

    const subject = isReassigned
      ? `🔄 Duty Schedule Reassigned: ${typeTitle} (${startTime} - ${endTime})`
      : `📅 New Duty Schedule Assigned: ${typeTitle} (${startTime} - ${endTime})`;

    const headline = isReassigned ? 'Duty Schedule Reassigned' : 'Duty Schedule Assigned';
    const subtext = isReassigned
      ? `Your operational shift schedule has been updated or reassigned by management.`
      : `You have been assigned a new operational duty shift schedule.`;

    const badgeColor = isReassigned ? '#D97706' : '#0284C7';
    const badgeBg = isReassigned ? '#FEF3C7' : '#E0F2FE';

    const content = `
      <tr>
        <td style="padding: 40px 30px; background-color: #ffffff; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="display: inline-block; padding: 6px 16px; background-color: ${badgeBg}; color: ${badgeColor}; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">
              ${isReassigned ? '🔄 Schedule Update' : '📅 Duty Roster Notice'}
            </span>
            <h2 style="margin: 16px 0 8px 0; font-size: 24px; font-weight: 800; color: ${COLORS.NAVY}; letter-spacing: -0.5px;">${headline}</h2>
            <p style="margin: 0; font-size: 15px; color: ${COLORS.SLATE};">Hello <strong>${staffName || 'Team Member'}</strong>, ${subtext}</p>
          </div>

          <div style="margin: 25px 0; padding: 24px; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 16px;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td style="padding-bottom: 12px; font-size: 12px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px;">Schedule Type</td>
                <td style="padding-bottom: 12px; font-size: 15px; font-weight: 800; color: #0F172A; text-align: right;">${typeTitle}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-size: 12px; font-weight: 700; color: #64748B; text-transform: uppercase;">Duty Hours</td>
                <td style="padding: 10px 0; font-size: 14px; font-weight: 800; color: #0284C7; text-align: right;">${startTime} – ${endTime}</td>
              </tr>
              ${specificDate ? `
              <tr>
                <td style="padding: 10px 0; font-size: 12px; font-weight: 700; color: #64748B; text-transform: uppercase;">Assigned Date</td>
                <td style="padding: 10px 0; font-size: 14px; font-weight: 800; color: #0F172A; text-align: right;">${specificDate}</td>
              </tr>
              ` : ''}
              ${formattedDays ? `
              <tr>
                <td style="padding: 10px 0; font-size: 12px; font-weight: 700; color: #64748B; text-transform: uppercase;">Assigned Days</td>
                <td style="padding: 10px 0; font-size: 14px; font-weight: 800; color: #0F172A; text-align: right;">${formattedDays}</td>
              </tr>
              ` : ''}
              ${(startDate || endDate) ? `
              <tr>
                <td style="padding: 10px 0; font-size: 12px; font-weight: 700; color: #64748B; text-transform: uppercase;">Validity Period</td>
                <td style="padding: 10px 0; font-size: 13px; font-weight: 700; color: #475569; text-align: right;">${startDate || 'Immediate'} to ${endDate || 'Ongoing'}</td>
              </tr>
              ` : ''}
              ${notes ? `
              <tr>
                <td colspan="2" style="padding-top: 14px; font-size: 13px; color: #475569; line-height: 1.5; border-top: 1px dashed #CBD5E1;">
                  <strong>Notes:</strong> ${notes}
                </td>
              </tr>
              ` : ''}
            </table>
          </div>

          <div style="text-align: center; margin: 30px 0 20px 0;">
            <a href="${loginUrl || 'https://dnaraitravels.com/login'}" style="display: inline-block; padding: 14px 32px; background-color: ${COLORS.NAVY}; color: #ffffff; text-decoration: none; border-radius: 12px; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);">
              View Duty Roster
            </a>
          </div>

          <p style="margin: 20px 0 0 0; font-size: 12px; color: #94A3B8; text-align: center; line-height: 1.5;">
            Please log into the agency portal to review your shifts. Contact Super Admin if you need adjustments or shift swapping.
          </p>
        </td>
      </tr>
    `;

    try {
      await transporter.sendMail({
        from: `"Dnarai Operations" <${process.env.EMAIL}>`,
        to: email,
        subject,
        html: getEmailWrapper(content, `${headline}: ${typeTitle} (${startTime} - ${endTime}).`),
        attachments: getAttachments()
      });
      return { ok: true };
    } catch (error) {
      console.error('[EmailService] Duty schedule email failed:', error);
      return { ok: false, error: error.message };
    }
  },

  /**
   * Send unassigned notification email when a shift is transferred to someone else
   */
  async sendScheduleUnassignedEmail({ email, staffName, daysOfWeek, specificDate, startTime, endTime }) {
    const transporter = getTransporter();
    if (!transporter) return { ok: false, error: 'Transporter not configured' };

    const formattedDays = daysOfWeek && daysOfWeek.length > 0
      ? daysOfWeek.map((d) => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')
      : specificDate || 'Upcoming shift';

    const content = `
      <tr>
        <td style="padding: 40px 30px; background-color: #ffffff; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="display: inline-block; padding: 6px 16px; background-color: #F1F5F9; color: #475569; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">
              Roster Reassignment
            </span>
            <h2 style="margin: 16px 0 8px 0; font-size: 22px; font-weight: 800; color: ${COLORS.NAVY}; letter-spacing: -0.5px;">Duty Shift Reassigned</h2>
            <p style="margin: 0; font-size: 15px; color: ${COLORS.SLATE};">Hello <strong>${staffName || 'Team Member'}</strong>, your previously scheduled shift (${formattedDays}, ${startTime} - ${endTime}) has been reassigned to another staff member.</p>
          </div>
          <p style="margin: 15px 0 0 0; font-size: 13px; color: #64748B; text-align: center;">
            No action is required from you for this shift. Please review your active duty roster in the portal.
          </p>
        </td>
      </tr>
    `;

    try {
      await transporter.sendMail({
        from: `"Dnarai Operations" <${process.env.EMAIL}>`,
        to: email,
        subject: `ℹ️ Duty Shift Reassigned: ${formattedDays}`,
        html: getEmailWrapper(content, `Duty shift reassigned: ${formattedDays}.`),
        attachments: getAttachments()
      });
      return { ok: true };
    } catch (error) {
      console.error('[EmailService] Schedule unassigned email failed:', error);
      return { ok: false, error: error.message };
    }
  }
};
