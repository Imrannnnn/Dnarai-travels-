import { Notification } from '../models/Notification.js';
import { Booking } from '../models/Booking.js';
import { Passenger } from '../models/Passenger.js';
import { User } from '../models/User.js';
import { WeatherService } from './WeatherService.js';
import { EmailService } from './EmailService.js';
import { WhatsAppService } from './WhatsAppService.js';
import { to12Hour, timePeriod } from '../utils/time.js';

function isoDay(d) {
  return new Date(d).toISOString().slice(0, 10);
}

export const NotificationService = {
  async createInApp({ passengerId, bookingId, type, message, dedupeKey, meta, isAdminOnly = false }) {
    try {
      const notif = await Notification.create({
        passengerId,
        bookingId,
        type,
        message,
        deliveryMethod: 'in_app',
        read: false,
        isAdminOnly,
        sentAt: new Date(),
        dedupeKey,
        meta,
      });
      // Trigger email/WhatsApp if user exists and env vars are configured
      const user = await User.findOne({ passengerId });
      if (user) {
        if (process.env.EMAIL_WEBHOOK_URL) {
          EmailService.send({
            to: user.email,
            subject: 'D.Narai Enterprise Notification',
            body: message,
          }).catch(() => { });
        }
        if (process.env.WHATSAPP_WEBHOOK_URL) {
          WhatsAppService.send({ to: user.email, message }).catch(() => { });
        }
      }
      return notif;
    } catch (err) {
      // Duplicate key = already sent
      if (err?.code === 11000) return null;
      throw err;
    }
  },

  async notifyBookingCreated({ bookingId }) {
    const booking = await Booking.findById(bookingId);
    if (!booking) throw Object.assign(new Error('Booking not found'), { status: 404 });

    const passenger = await Passenger.findById(booking.passengerId);
    if (!passenger) throw Object.assign(new Error('Passenger not found'), { status: 404 });

    const depart = booking.departureTime24 || '14:30';
    const message = `New booking added: ${booking.flightNumber} ${booking.origin.city} → ${booking.destination.city} departs at ${to12Hour(depart)} (${timePeriod(depart)}).`;

    const dedupeKey = `booking_created:${bookingId}:${booking.createdAt?.toISOString?.() || Date.now()}`;

    return this.createInApp({
      passengerId: passenger._id,
      bookingId: booking._id,
      type: 'booking_created',
      message,
      dedupeKey,
    });
  },

  async sendFlightReminder({ bookingId, force = false }) {
    const booking = await Booking.findById(bookingId);
    if (!booking) throw Object.assign(new Error('Booking not found'), { status: 404 });

    const passenger = await Passenger.findById(booking.passengerId);
    if (!passenger) throw Object.assign(new Error('Passenger not found'), { status: 404 });

    const depart = booking.departureTime24 || '14:30';
    const messageBase = `Reminder: ${booking.flightNumber} ${booking.origin.city} → ${booking.destination.city} departs at ${to12Hour(depart)} (${timePeriod(depart)}).`;

    const weather = await WeatherService.getCityForecast({ city: booking.destination.city });
    const message = `${messageBase} Destination weather: ${weather.desc}, ${weather.tempC}°C.`;

    const dedupeKey = force
      ? `reminder:${bookingId}:${Date.now()}`
      : `reminder:${bookingId}:${isoDay(booking.departureDateTimeUtc)}`;

    return this.createInApp({
      passengerId: passenger._id,
      bookingId: booking._id,
      type: 'flight_reminder',
      message,
      dedupeKey,
      meta: { weather },
    });
  },

  async notifyFlightTimeUpdated({ bookingId }) {
    const booking = await Booking.findById(bookingId);
    if (!booking) throw Object.assign(new Error('Booking not found'), { status: 404 });

    const passenger = await Passenger.findById(booking.passengerId);
    if (!passenger) throw Object.assign(new Error('Passenger not found'), { status: 404 });

    const depart = booking.departureTime24 || '14:30';
    const message = `Update: ${booking.flightNumber} departure time is now ${to12Hour(depart)} (${timePeriod(depart)}).`;

    const dedupeKey = `time_update:${bookingId}:${booking.departureDateTimeUtc.toISOString()}`;

    return this.createInApp({
      passengerId: passenger._id,
      bookingId: booking._id,
      type: 'time_update',
      message,
      dedupeKey,
    });
  },

  async notifyPassportExpiry({ passengerId, monthsLeft }) {
    const passenger = await Passenger.findById(passengerId);
    if (!passenger) return null;

    const expiryIso = passenger.documentExpiryDate
      ? passenger.documentExpiryDate.toISOString().slice(0, 10)
      : 'unknown';
    const dedupeKey = `passport:${passengerId}:${expiryIso}:6mo`;

    const message = `Your ${passenger.documentType} expires in ${monthsLeft} months. Renew soon to avoid travel issues.`;

    return this.createInApp({
      passengerId: passenger._id,
      type: 'passport_alert',
      message,
      dedupeKey,
    });
  },

  async notifyUnrecognizedBooking({ travelerName, flightNumber, origin, destination }) {
    const message = `⚠️ Unrecognized Traveler: A booking for "${travelerName}" (${flightNumber} ${origin} → ${destination}) was detected but the person is not in our system.`;
    const dedupeKey = `unrecognized:${travelerName}:${flightNumber}:${origin}:${destination}`;

    return this.createInApp({
      type: 'unrecognized_booking',
      message,
      dedupeKey,
      isAdminOnly: true,
    });
  },
};
