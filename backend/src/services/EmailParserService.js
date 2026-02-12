import Imap from 'node-imap';
import { simpleParser } from 'mailparser';
import * as cheerio from 'cheerio';
import { createRequire } from 'module';
import { Passenger } from '../models/Passenger.js';
import { Booking } from '../models/Booking.js';
import { NotificationService } from './NotificationService.js';
import { EmailService } from './EmailService.js';

const require = createRequire(import.meta.url);
const pdfParser = require('pdf-parse');

/**
 * Hardened Production Email Parser Service
 * Extracts flight data using Regex/Patterns with confidence scoring.
 */
export const EmailParserService = {
  imap: null,
  isConnecting: false,

  init() {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.warn('⚠️ [EmailParser] Credentials missing in .env. Service disabled.');
      return;
    }
    this.connect();
  },

  connect() {
    if (this.isConnecting) return;
    this.isConnecting = true;

    if (this.imap && this.imap.state !== 'disconnected') {
      try {
        this.imap.end();
      } catch (e) {
        // Ignore disconnection errors
      }
    }

    this.imap = new Imap({
      user: process.env.GMAIL_USER,
      password: process.env.GMAIL_APP_PASSWORD,
      host: process.env.IMAP_HOST || 'imap.gmail.com',
      port: Number(process.env.IMAP_PORT || 993),
      tls: (process.env.IMAP_TLS || 'true') === 'true',
      tlsOptions: { rejectUnauthorized: false },
      connTimeout: 10000,
      authTimeout: 5000,
      keepalive: { interval: 10000, idleInterval: 30000, forceNoop: true },
    });

    this.imap.once('ready', () => {
      this.isConnecting = false;
      console.log('📬 [EmailParser] IMAP connected & monitoring for flight patterns...');
      this.openInbox();
    });

    this.imap.once('error', (err) => {
      this.isConnecting = false;
      console.error('❌ [EmailParser] Connection Error:', err.message);
      this.scheduleReconnect();
    });

    this.imap.once('end', () => {
      this.isConnecting = false;
      console.log('📭 [EmailParser] Connection ended.');
      this.scheduleReconnect();
    });

    try {
      this.imap.connect();
    } catch (e) {
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  },

  scheduleReconnect() {
    if (this._reconnectTimer) return;
    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null;
      this.connect();
    }, 15000);
  },

  openInbox() {
    this.imap.openBox('INBOX', false, (err) => {
      if (err) {
        console.error('❌ [EmailParser] Failed to open INBOX:', err.message);
        return;
      }
      this.imap.on('mail', () => this.fetchNewEmails());
    });
  },

  fetchNewEmails() {
    this.imap.search(['UNSEEN'], (err, results) => {
      if (err) {
        console.error('❌ [EmailParser] Search error:', err.message);
        return;
      }
      if (!results || results.length === 0) return;

      console.log(`📥 [EmailParser] ${results.length} new message(s) detected.`);

      // Use markSeen: true for safe fetching
      const fetcher = this.imap.fetch(results, { bodies: '', markSeen: true });

      fetcher.on('message', (msg) => {
        msg.on('body', (stream) => {
          simpleParser(stream, async (err, parsed) => {
            if (err) return;
            try {
              await this.processEmail(parsed);
            } catch (e) {
              console.warn('⚠️ [EmailParser] Processing failure:', e.message);
            }
          });
        });
      });
    });
  },

  async processEmail(parsed) {
    console.log(`🔍 [EmailParser] Analyzing: "${parsed.subject || 'No Subject'}"`);
    let combinedText = '';

    if (parsed.text) {
      combinedText += parsed.text + '\n';
    } else if (parsed.html) {
      const $ = cheerio.load(parsed.html);
      combinedText += $.text() + '\n';
    }

    if (parsed.attachments) {
      for (const att of parsed.attachments) {
        if (att.contentType === 'application/pdf') {
          // PDF Safety Guard: Skip files larger than 5MB
          if (att.size > 5 * 1024 * 1024) {
            console.warn(
              `⚠️ [EmailParser] Skipping PDF ${att.filename || 'attachment'} - size exceeds 5MB limit.`
            );
            continue;
          }
          const pdfText = await this.parsePdfAttachment(att);
          if (pdfText) combinedText += '\n--- PDF ATTACHMENT ---\n' + pdfText;
        }
      }
    }

    const flightData = this.extractFlightData(combinedText);
    if (!flightData || flightData.length === 0) return;

    for (const segment of flightData) {
      // Confidence Threshold Rule
      if (segment.confidence >= 60) {
        await this.syncSegment(segment);
      } else {
        console.warn(
          `⚠️ [EmailParser] Skipping segment for "${segment.passengerName || 'Unknown'}" due to low confidence (${segment.confidence}/100). Reasons: ${segment.reasons.join(', ')}`
        );
      }
    }
  },

  async parsePdfAttachment(attachment) {
    try {
      console.log(
        `📄 [EmailParser] Extracting text from PDF: ${attachment.filename || 'ticket.pdf'}`
      );
      const data = await pdfParser(attachment.content);
      return data.text || '';
    } catch (err) {
      console.warn(`⚠️ [EmailParser] PDF Extraction failed (Process remains safe):`, err.message);
      return null;
    }
  },

  extractFlightData(text) {
    const flights = [];
    const cleanText = text.replace(/\s+/g, ' ').trim();

    // Flight ticket detection - check if this is actually a flight ticket
    const flightTicketKeywords = [
      'Airline',
      'Airways',
      'Air',
      'Flight',
      'E-Ticket',
      'Itinerary',
      'Boarding Pass',
      'Reservation',
      'Booking Confirmation',
      'Passenger Name Record',
      'PNR',
      'Booking Reference',
      'E-Ticket Number',
      'ETKT',
      'Departure',
      'Arrival',
    ];

    const isFlightTicket = flightTicketKeywords.some((keyword) =>
      cleanText.toLowerCase().includes(keyword.toLowerCase())
    );

    if (!isFlightTicket) {
      console.log(`ℹ️ [EmailParser] Not a flight ticket email - skipping`);
      return flights;
    }

    // 1️⃣ BOOKING REFERENCE / PNR (VERY STRONG)
    const pnrMatch =
      cleanText.match(/\b(Booking Reference|Reservation Code|PNR)\s*[:-]?\s*([A-Z0-9]{6})\b/i) ||
      cleanText.match(/\bRESERVATION CODE\s+([A-Z0-9]{6})/i) ||
      cleanText.match(/\bBooking Reference\s+([A-Z0-9]{6})/i) ||
      cleanText.match(/\bPNR:?\s*([A-Z0-9]{6})/i);
    const bookingRef = pnrMatch ? pnrMatch[2].toUpperCase() : null;

    // 2️⃣ E-TICKET NUMBER (EXTREMELY STRONG)
    const eticketMatch =
      cleanText.match(/\b(ETKT|E[- ]?TICKET)\s?(\d{3}\s?\d{10}\/\d{2})\b/i) ||
      cleanText.match(/\b(ETKT|E[- ]?TICKET)\s?(\d{13,14}\/\d{2})\b/i);
    const eticketNumber = eticketMatch ? eticketMatch[2] : null;

    // 3️⃣ PASSENGER NAME (CLEAR FORMAT) - Enhanced for multiple formats
    const nameMatch =
      cleanText.match(/\b(MR|MRS|MS|MISS)\s+([A-Z]+(?:\s+[A-Z]+)+)\b/i) ||
      cleanText.match(/Passenger Name:\s*([A-Z ]+?)(?=\s*(?:Flight|Booking|$|\n))/i) ||
      cleanText.match(
        /Passenger\(s\):\s*([A-Z\s/]+?)(?=\s*(?:Reservation|Airline|Flight|Booking|\n|$))/i
      ) ||
      cleanText.match(/PREPARED FOR\s+([A-Z/ ]+?)(?=\s*(?:Passenger|Flight|Booking|$|\n))/i) ||
      cleanText.match(/Passenger Name\s+([A-Z /()0-9]+?)(?=\s*(?:Flight|Booking|$|\n))/i) ||
      cleanText.match(/Dear\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/) ||
      cleanText.match(/»\s+([A-Z/ ]+?)(?=\s*(?:Passenger|Flight|Booking|$|\n))/i);

    const passengerName = this.normalizePassengerName(
      nameMatch ? nameMatch[2] || nameMatch[1] : null
    );

    // 4️⃣ FLIGHT NUMBER + STATUS (AVIATION FORMAT)
    const flightNumMatches = [
      ...cleanText.matchAll(/\b([A-Z]{2})\s?(\d{3,4})\s?\((HK|OK|RR|WL)\)\b/gi),
    ] || [...cleanText.matchAll(/\b([A-Z]{2})\s?(\d{3,4})\b/gi)];

    // Extract flight numbers more precisely - look for patterns like "UN 0613" and "ET Flight Number 950"
    const explicitFlightMatches = [
      ...cleanText.matchAll(/([A-Z]{2})\s+Flight Number\s+(\d{3,4})/gi),
    ] || [...cleanText.matchAll(/\b([A-Z]{2})\s+(\d{3,4})\b/gi)];

    // 5️⃣ DEPARTURE SECTION - Enhanced date parsing (optional dates)
    const dateMatches = [
      ...cleanText.matchAll(
        /\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{2,4})\b/gi
      ),
    ] || [...cleanText.matchAll(/(\d{1,2}\s+[A-Z]{3,9}\s+\d{4})/gi)];

    // Alternative date format: "Wednesday, 28 January"
    const altDateMatches = [
      ...cleanText.matchAll(
        /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\b/gi
      ),
    ];

    // 6️⃣ CITY-BASED ROUTE (VERY COMMON IN DOMESTIC TICKETS) - Enhanced for "Departure/Arrival" format
    const cityRouteMatches = [
      ...cleanText.matchAll(/From:\s*([A-Za-z ]+)\s+Departure\s+(\d{2}:\d{2})/gi),
    ];
    const cityRouteToMatches = [
      ...cleanText.matchAll(/To:\s*([A-Za-z ]+)\s+Arrive\s+(\d{2}:\d{2})/gi),
    ];

    // Ethiopian Airlines format
    const ethiopianDepartureMatches = [
      ...cleanText.matchAll(/Departure:\s*([A-Z]{3})\s+([A-Za-z, ]+)\s+(\d{1,2}:\d{2})/gi),
    ];
    const ethiopianArrivalMatches = [
      ...cleanText.matchAll(/Arrival:\s*([A-Z]{3})\s+([A-Za-z, ]+)\s+(\d{1,2}:\d{2})/gi),
    ];

    // Alternative route format: "rip to: JEDDAH, SAUDI ARABIA"
    const destinationMatches = [...cleanText.matchAll(/rip to:\s*([A-Za-z, ]+)/gi)];
    const originMatches = [
      ...cleanText.matchAll(/(?:Departure:|From:)\s*([A-Z]{3})\s+([A-Za-z, ]+)/gi),
    ];

    // 7️⃣ CABIN / BOOKING CLASS
    const cabinMatch =
      cleanText.match(/\b(Cabin|Class)\s*\(?([A-Z])\)?\b/i) ||
      cleanText.match(/\b([A-Z])\s*\([A-Z]\)\b/);
    const cabinClass = cabinMatch ? cabinMatch[2] || cabinMatch[1] : null;

    // 8️⃣ PAYMENT SIGNALS
    const paymentMatch = cleanText.match(/\bForm of Payment\s+(Credit Card|Cash|Transfer)/i);
    const cardMatch = cleanText.match(/\bCard Number\s+X+\d{4}\b/);
    const paymentInfo = {
      method: paymentMatch ? paymentMatch[1] : null,
      maskedCard: cardMatch ? cardMatch[0] : null,
    };

    // 9️⃣ AGENT / AGENCY IDENTIFIER
    const agentMatch = cleanText.match(/\bAgent Name:\s*([A-Z0-9 ]+?)(?=\s*(?:Agent ID|$))/i);
    const agentIdMatch = cleanText.match(/\bAgent ID:\s*([A-Z0-9]+)\b/i);
    const agentInfo = {
      name: agentMatch ? agentMatch[1].trim() : null,
      id: agentIdMatch ? agentIdMatch[1] : null,
    };

    // Time extraction
    const timeMatches = [...cleanText.matchAll(/\b([01]?\d|2[0-3]):[0-5]\d\b/g)];

    // IATA detection with enhanced blacklist - exclude common words and flight status codes
    const iataBlacklist = [
      'FOR',
      'TKT',
      'BAG',
      'DEP',
      'ARR',
      'RIP',
      'RIA',
      'IFT',
      'TRP',
      'JET',
      'GMT',
      'WED',
      'FRI',
      'SAT',
      'SUN',
      'THE',
      'AND',
      'WAY',
      'MON',
      'TUE',
      'THU',
      'HRS',
      'DAY',
      'ALL',
      'OFF',
      'HK',
      'OK',
      'RR',
      'WL',
      'PNR',
      'ETKT',
      'MRS',
      'MR',
      'MS',
      'MISS',
      'JAN',
      'FEB',
      'MAR',
      'APR',
      'MAY',
      'JUN',
      'JUL',
      'AUG',
      'SEP',
      'OCT',
      'NOV',
      'DEC',
    ];
    const iataMatches = [...cleanText.matchAll(/\b([A-Z]{3})\b/g)];
    const iatas = iataMatches
      .map((m) => m[1].toUpperCase())
      .filter((code) => !iataBlacklist.includes(code) && code.length === 3);

    // Use city routes if available, fallback to IATA
    const useCityRoutes =
      (cityRouteMatches.length > 0 && cityRouteToMatches.length > 0) ||
      (destinationMatches.length > 0 && originMatches.length > 0) ||
      cityRouteMatches.length > 0 ||
      cityRouteToMatches.length > 0 ||
      ethiopianDepartureMatches.length > 0 ||
      ethiopianArrivalMatches.length > 0;

    // Iterate through segments
    const allDates = [...dateMatches, ...altDateMatches];
    const segmentCount = Math.max(
      allDates.length,
      explicitFlightMatches.length,
      useCityRoutes
        ? Math.max(
          cityRouteMatches.length,
          destinationMatches.length,
          ethiopianDepartureMatches.length
        )
        : Math.floor(iatas.length / 2)
    );

    for (let i = 0; i < segmentCount; i++) {
      const segment = {
        passengerName: passengerName,
        airline: this.detectAirline(cleanText),
        flightNumber: explicitFlightMatches[i]
          ? `${explicitFlightMatches[i][1]}${explicitFlightMatches[i][2]}`
            .replace(/\s+/g, '')
            .toUpperCase()
          : flightNumMatches[i]
            ? `${flightNumMatches[i][1]}${flightNumMatches[i][2]}`.replace(/\s+/g, '').toUpperCase()
            : null,
        flightStatus: flightNumMatches[i] && flightNumMatches[i][3] ? flightNumMatches[i][3] : null,
        originIata: useCityRoutes
          ? cityRouteMatches[i]
            ? this.normalizeCityName(cityRouteMatches[i][1])
            : ethiopianDepartureMatches[i]
              ? ethiopianDepartureMatches[i][1]
              : originMatches[i]
                ? originMatches[i][1]
                : null
          : iatas[i * 2] || null,
        destIata: useCityRoutes
          ? cityRouteToMatches[i]
            ? this.normalizeCityName(cityRouteToMatches[i][1])
            : ethiopianArrivalMatches[i]
              ? ethiopianArrivalMatches[i][1]
              : destinationMatches[i]
                ? this.normalizeCityName(destinationMatches[i][1])
                : null
          : iatas[i * 2 + 1] || null,
        departureDate: this.normalizeDate(allDates[i] ? allDates[i][0] : null),
        departureTime: timeMatches[i]
          ? timeMatches[i][1]
          : cityRouteMatches[i]
            ? cityRouteMatches[i][2]
            : ethiopianDepartureMatches[i]
              ? ethiopianDepartureMatches[i][3]
              : null,
        arrivalTime: cityRouteToMatches[i]
          ? cityRouteToMatches[i][2]
          : ethiopianArrivalMatches[i]
            ? ethiopianArrivalMatches[i][3]
            : null,
        pnr: bookingRef,
        eticketNumber: eticketNumber,
        cabinClass: cabinClass,
        paymentInfo: paymentInfo,
        agentInfo: agentInfo,
        confidence: 0,
        reasons: [],
      };

      // Enhanced validation with more flexible requirements
      const hasStrongSignals = bookingRef || eticketNumber;
      const hasBasicInfo = segment.passengerName;
      const hasRouteInfo = segment.originIata && segment.destIata;

      // MANDATORY RULE: Require strong signals + basic info (date is now optional)
      if (!hasStrongSignals || !hasBasicInfo) {
        const missing = [];
        if (!hasStrongSignals) missing.push('PNR/ETicket');
        if (!segment.passengerName) missing.push('name');
        console.log(
          `ℹ️ [EmailParser] Skipping segment: insufficient core data (${missing.join(', ')})`
        );
        continue;
      }

      // Allow processing without IATA if we have strong signals and city names
      if (!hasRouteInfo && !useCityRoutes) {
        console.log(`ℹ️ [EmailParser] Skipping segment: no route information found`);
        continue;
      }

      segment.confidence = this.calculateConfidence(segment);
      flights.push(segment);
    }

    return flights;
  },

  calculateConfidence(s) {
    let score = 0;

    // Core requirements (higher weights)
    if (s.passengerName) score += 20;
    if (s.departureDate) score += 15;
    if (s.originIata && s.destIata) score += 15;

    // Strong signals (very high confidence)
    if (s.pnr) score += 25;
    if (s.eticketNumber) score += 20;

    // Flight details
    if (s.flightNumber && s.flightNumber !== 'FLIGHT') score += 10;
    if (s.flightStatus) score += 5;
    if (s.departureTime && s.departureTime !== '00:00') score += 5;
    if (s.arrivalTime) score += 5;

    // Additional confirmation signals
    if (s.cabinClass) score += 3;
    if (s.paymentInfo.method) score += 2;
    if (s.agentInfo.name) score += 2;

    // Reasons for low confidence
    if (!s.passengerName) s.reasons.push('Name missing');
    if (!s.departureDate) s.reasons.push('Date missing');
    if (!s.originIata || !s.destIata) s.reasons.push('Route incomplete');
    if (!s.pnr) s.reasons.push('PNR missing');
    if (!s.eticketNumber) s.reasons.push('E-ticket missing');
    if (!s.flightNumber) s.reasons.push('Flight number not found');
    if (!s.departureTime) s.reasons.push('Time missing');

    return Math.min(score, 100);
  },

  normalizePassengerName(raw) {
    if (!raw) return null;
    let clean = raw.replace(/\(.*?\)/g, '').trim();

    // Handle title format: "MRS LIZZYIHEZUE IWUAMADI" -> "Lizzyihezue Iwuamadi"
    const titleMatch = clean.match(/^(MR|MRS|MS|MISS)\s+(.+)$/i);
    if (titleMatch) {
      clean = titleMatch[2];
    }

    // Handle multiple passengers separated by newlines
    if (clean.includes('\n')) {
      const names = clean.split('\n').filter((name) => name.trim().length > 0);
      // Return the first name for primary passenger
      clean = names[0];
    }

    // Remove any remaining flight details that might be attached to names
    clean = clean.replace(/\s+Flight.*$/i, '').trim();

    // Handle slash format: "AUGUSTINE/UKEH PAULINE" -> "Ukeh Pauline Augustine"
    if (clean.includes('/')) {
      const parts = clean.split('/').map((p) => p.trim());
      if (parts.length >= 2) {
        const last = parts[0].toLowerCase();
        const firstMiddle = parts[1].toLowerCase();
        return (firstMiddle + ' ' + last).replace(/\b\w/g, (c) => c.toUpperCase());
      }
    }

    clean = clean.replace(/[^a-zA-Z\s/]/g, '');
    return clean
      .split(' ')
      .filter((word) => word.length > 1)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  },

  normalizeCityName(cityName) {
    if (!cityName) return null;
    return cityName
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  },

  normalizeDate(raw) {
    if (!raw) return null;

    // Handle "Wednesday, 28 January" format
    const fullDayMonthMatch = raw.match(
      /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\b/i
    );
    if (fullDayMonthMatch) {
      const [, , day, month] = fullDayMonthMatch;
      const monthMap = {
        january: 0,
        february: 1,
        march: 2,
        april: 3,
        may: 4,
        june: 5,
        july: 6,
        august: 7,
        september: 8,
        october: 9,
        november: 10,
        december: 11,
      };
      const currentYear = new Date().getFullYear();
      const date = new Date(currentYear, monthMap[month.toLowerCase()], parseInt(day));
      return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
    }

    // Handle "Wed 31 Dec 25" format
    const dayMonthYearMatch = raw.match(
      /\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{2,4})\b/i
    );
    if (dayMonthYearMatch) {
      const [, , day, month, year] = dayMonthYearMatch;
      const monthMap = {
        jan: 0,
        feb: 1,
        mar: 2,
        apr: 3,
        may: 4,
        jun: 5,
        jul: 6,
        aug: 7,
        sep: 8,
        oct: 9,
        nov: 10,
        dec: 11,
      };
      const fullYear = year.length === 2 ? 2000 + parseInt(year) : parseInt(year);
      const date = new Date(fullYear, monthMap[month.toLowerCase()], parseInt(day));
      return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
    }

    // Handle "31 Dec 2025" format
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
  },

  detectAirline(text) {
    const airlines = [
      { name: 'Pegasus Airlines', keywords: ['Pegasus', 'PC'] },
      { name: 'Ibom Air', keywords: ['Ibom', 'QI'] },
      { name: 'Air Peace', keywords: ['Air Peace', 'P4'] },
      { name: 'Arik Air', keywords: ['Arik', 'W3'] },
      { name: 'Turkish Airlines', keywords: ['Turkish', 'THY', 'TK'] },
      { name: 'Qatar Airways', keywords: ['Qatar', 'QR'] },
    ];
    const lower = text.toLowerCase();
    for (const a of airlines) {
      if (a.keywords.some((k) => lower.includes(k.toLowerCase()))) return a.name;
    }
    return null;
  },

  async syncSegment(data) {
    try {
      const {
        passengerName,
        flightNumber,
        departureDate,
        departureTime,
        originIata,
        destIata,
        airline,
        pnr,
      } = data;

      const firstName = passengerName.split(' ')[0];
      const passenger = await Passenger.findOne({
        fullName: { $regex: new RegExp(firstName, 'i') },
      });

      if (!passenger) {
        console.warn(
          `⚠️ [EmailParser] Unrecognized traveler: "${passengerName}". Notifying admin...`
        );
        await NotificationService.notifyUnrecognizedBooking({
          travelerName: passengerName,
          flightNumber,
          origin: originIata,
          destination: destIata,
        });
        return;
      }

      const departureUtc = new Date(`${departureDate}T${departureTime || '00:00'}:00Z`);

      let booking = await Booking.findOne({
        passengerId: passenger._id,
        flightNumber,
        departureDateTimeUtc: {
          $gte: new Date(departureUtc.getTime() - 24 * 60 * 60 * 1000),
          $lte: new Date(departureUtc.getTime() + 24 * 60 * 60 * 1000),
        },
      });

      const isNew = !booking;
      if (isNew) {
        booking = new Booking({ passengerId: passenger._id, status: 'confirmed' });
      } else {
        booking.status = 'updated';
      }

      booking.airlineName = airline || 'Airline';
      booking.flightNumber = flightNumber;
      booking.origin = { city: 'City', iata: originIata };
      booking.destination = { city: 'City', iata: destIata };
      booking.departureDateTimeUtc = departureUtc;
      booking.departureTime24 = departureTime;
      booking.externalSource = { provider: 'email_parser', referenceId: pnr };

      await booking.save();
      console.log(`✅ [EmailParser] Sync success: ${passenger.fullName} -> ${flightNumber}`);

      if (isNew) {
        await NotificationService.notifyBookingCreated({ bookingId: booking._id });
        await EmailService.sendBookingConfirmation({ booking, passenger });
      } else {
        await NotificationService.notifyFlightTimeUpdated({ bookingId: booking._id });
      }
    } catch (err) {
      console.error('❌ [EmailParser] Sync error:', err.message);
    }
  },
};
