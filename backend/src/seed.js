import dotenv from 'dotenv';
import mongoose from 'mongoose';


import { Passenger } from './models/Passenger.js';
import { Booking } from './models/Booking.js';
import { Notification } from './models/Notification.js';

dotenv.config();

function hoursFromNow(h) {
  return new Date(Date.now() + h * 60 * 60 * 1000);
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/skylink');

  // Clear only demo collections (safe for demo use; remove if you want to preserve data)
  await Promise.all([
    Passenger.deleteMany({}),
    Booking.deleteMany({}),
    Notification.deleteMany({}),
  ]);

  const passenger = new Passenger({
    fullName: 'John Michael Doe',
    email: 'john.doe@email.com',
    phone: '+1 (555) 123-4567',
    documentType: 'passport',
    documentExpiryDate: hoursFromNow(24 * 30 * 5), // ~5 months
  });

  // Requires DOC_ENCRYPTION_KEY_BASE64 to be set.
  passenger.setDocumentNumber('A123456789');
  await passenger.save();

  const booking1 = await Booking.create({
    passengerId: passenger._id,
    airlineName: 'D.Narai Enterprise',
    flightNumber: 'EK 984',
    origin: { city: 'Lagos', iata: 'LOS', countryCode: 'NG' },
    destination: { city: 'London', iata: 'LHR', countryCode: 'GB' },
    departureDateTimeUtc: hoursFromNow(24.1), // within reminder window soon
    departureTime24: '14:30',
    status: 'confirmed',
  });

  const booking2 = await Booking.create({
    passengerId: passenger._id,
    airlineName: 'D.Narai Enterprise',
    flightNumber: 'QR 593',
    origin: { city: 'London', iata: 'LHR', countryCode: 'GB' },
    destination: { city: 'Dubai', iata: 'DXB', countryCode: 'AE' },
    departureDateTimeUtc: hoursFromNow(24 * 7),
    departureTime24: '07:15',
    status: 'updated',
  });

  await Notification.create({
    passengerId: passenger._id,
    bookingId: booking1._id,
    type: 'flight_reminder',
    message: 'Your flight EK 984 from Lagos to London departs in 24 hours.',
    deliveryMethod: 'in_app',
    read: false,
    sentAt: new Date(),
    dedupeKey: `seed:reminder:${booking1._id}`,
  });


  await Notification.create({
    passengerId: passenger._id,
    bookingId: booking2._id,
    type: 'time_update',
    message: 'QR 593 departure time changed from 7:00 AM to 7:15 AM.',
    deliveryMethod: 'in_app',
    read: false,
    sentAt: new Date(),
    dedupeKey: `seed:update:${booking2._id}`,
  });

  await Notification.create({
    passengerId: passenger._id,
    type: 'passport_alert',
    message: 'Your passport expires in 5 months. Renew soon to avoid travel issues.',
    deliveryMethod: 'in_app',
    read: false,
    sentAt: new Date(),
    dedupeKey: `seed:passport:${passenger._id}`,
  });

  console.log('[seed] inserted demo passenger/bookings/notifications');
  console.log(`[seed] passengerId=${passenger._id}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('[seed] failed', err);
  process.exit(1);
});
