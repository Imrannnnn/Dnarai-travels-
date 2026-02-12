import { Router } from 'express';
import { Passenger } from '../models/Passenger.js';
import { Booking } from '../models/Booking.js';
import { Notification } from '../models/Notification.js';

// Demo routes exist to satisfy the React app's simple endpoints.
// They are only enabled when PUBLIC_DEMO=true.

const router = Router();

router.get('/passenger', async (_req, res, next) => {
  try {
    const p = await Passenger.findOne().sort({ createdAt: -1 });
    if (!p) {
      return res.json({
        name: 'John Doe',
        fullName: 'John Michael Doe',
        email: 'john.doe@email.com',
        phone: '+1 (555) 123-4567',
        dob: 'January 15, 1985',
        membership: 'Premium Member',
      });
    }

    res.json({
      name: p.fullName,
      fullName: p.fullName,
      email: p.email,
      phone: p.phone,
      dob: 'N/A',
      membership: 'Premium Member',
    });
  } catch (err) {
    next(err);
  }
});

router.get('/flights', async (_req, res, next) => {
  try {
    const bookings = await Booking.find().sort({ departureDateTimeUtc: 1 }).limit(50);

    const flights = bookings.map((b) => {
      const dt = new Date(b.departureDateTimeUtc);
      const dateStr = dt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      return {
        id: String(b._id),
        airline: b.airlineName,
        flightNumber: b.flightNumber,
        logoUrl: `https://picsum.photos/seed/${encodeURIComponent(b.airlineName)}/64/64`,
        status: b.status === 'updated' ? 'Updated' : 'On Time',
        date: dateStr,
        fromCity: b.origin.city,
        fromCode: b.origin.iata,
        departTime24: b.departureTime24 || '14:30',
        toCity: b.destination.city,
        toCode: b.destination.iata,
        arriveTime24: '21:15',
        duration: '6h 45m',
        seat: '24A',
        bags: '2 Bags',
        weather: {
          label: `${b.destination.city} Weather`,
          tempC: 18,
          desc: 'Partly Cloudy',
          type: 'cloudSun',
        },
      };
    });

    res.json(flights);
  } catch (err) {
    next(err);
  }
});

router.get('/notifications', async (_req, res, next) => {
  try {
    const items = await Notification.find().sort({ createdAt: -1 }).limit(50);

    const mapped = items.map((n) => ({
      id: String(n._id),
      type:
        n.type === 'passport_alert'
          ? 'passport'
          : n.type === 'flight_reminder' || n.type === 'time_update' || n.type === 'booking_created'
            ? 'flight'
            : 'weather',
      title:
        n.type === 'passport_alert'
          ? 'Passport Expiration Alert'
          : n.type === 'booking_created'
            ? 'New Booking Added'
            : n.type === 'time_update'
              ? 'Flight Time Update'
              : n.type === 'weather'
                ? 'Weather Forecast'
                : 'Flight Reminder',
      message: n.message,
      timeAgo: 'recently',
      unread: !n.read,
      alert: n.type === 'passport_alert',
      actionLabel: n.type === 'passport_alert' ? 'Renew Now' : 'View Details',
    }));

    res.json(mapped);
  } catch (err) {
    next(err);
  }
});

export default router;
