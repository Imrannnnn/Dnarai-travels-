import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

// Path to logo for CID attachment
const LOGO_PATH = path.resolve(__dirname, '../../../client/public/D-NARAI_Logo-04.png');

// Debug the path
if (!fs.existsSync(LOGO_PATH)) {
  console.warn(`⚠️ [EmailService] Logo not found at: ${LOGO_PATH}`);
} else {
  console.log(`✅ [EmailService] Logo found at: ${LOGO_PATH}`);
}

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
              <img src="cid:logo.png" alt="DNARAI TRAVEL" width="200" style="display: block; border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 24px; font-weight: 900; color: ${COLORS.NAVY}; letter-spacing: -1px; width: 200px; max-width: 200px;">
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
  if (fs.existsSync(LOGO_PATH)) {
    return [{
      filename: 'logo.png',
      path: LOGO_PATH,
      cid: 'logo.png',
      contentType: 'image/png'
    }];
  }
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
              <tr><td style="padding: 8px 0; font-size: 14px; color: ${COLORS.NAVY};"><strong>From:</strong> ${requestDetails.departureCity}</td></tr>
              <tr><td style="padding: 8px 0; font-size: 14px; color: ${COLORS.NAVY};"><strong>To:</strong> ${requestDetails.destination}</td></tr>
              <tr><td style="padding: 8px 0; font-size: 14px; color: ${COLORS.NAVY};"><strong>Date:</strong> ${requestDetails.date}</td></tr>
              ${requestDetails.isReturn && requestDetails.returnDate ? `<tr><td style="padding: 8px 0; font-size: 14px; color: ${COLORS.NAVY};"><strong>Return Date:</strong> ${requestDetails.returnDate}</td></tr>` : ''}
              <tr><td style="padding: 8px 0; font-size: 14px; color: ${COLORS.NAVY};"><strong>Passengers:</strong> 
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

    const content = `
      <tr>
        <td style="background-color: ${COLORS.NAVY}; padding: 40px; text-align: center; color: white;">
          <h1 style="margin: 0;">Ticket Issued</h1>
        </td>
      </tr>
      <tr>
        <td style="padding: 40px;">
          <div style="border: 2px solid ${COLORS.NAVY}; border-radius: 16px; padding: 30px; text-align: center;">
            <div style="font-size: 24px; font-weight: 900;">${booking.origin?.iata || 'DEP'} ✈️ ${booking.destination?.iata || 'ARR'}</div>
            <p>${booking.airlineName} - ${booking.flightNumber}</p>
            <p><strong>Passenger:</strong> ${passenger.fullName}</p>
          </div>
        </td>
      </tr>
    `;

    try {
      await transporter.sendMail({
        from: `"Dnarai Travel" <${process.env.EMAIL}>`,
        to: passenger.email,
        subject: `Confirmed: ${booking.flightNumber}`,
        html: getEmailWrapper(content, 'Booking confirmed.'),
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
    const weather = await WeatherService.getCityForecast({ city: booking.destination?.city || 'the destination' });

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
    const weather = await WeatherService.getCityForecast({ city: booking.destination?.city || 'the destination' });

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

          <p style="font-size: 14px; color: ${COLORS.SLATE};">Safe travels! Our service ends only when you arrive at your destination.</p>
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

          <p style="margin: 0; font-size: 14px; color: ${COLORS.SLATE}; font-style: italic;">"Our services end when you successfully arrived at your destination"</p>
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
  }
};
