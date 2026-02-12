import { Router } from 'express';

import { requireAuth, requireRole } from '../middleware/authJwt.js';
import { User } from '../models/User.js';
import { Passenger } from '../models/Passenger.js';
import { Booking } from '../models/Booking.js';
import { Notification } from '../models/Notification.js';

const router = Router();

router.use(requireAuth);
router.use(requireRole(['passenger']));

router.use(async (req, _res, next) => {
  try {
    const user = await User.findById(req.user?.sub);
    if (!user) return next({ status: 401, code: 'UNAUTHORIZED', message: 'User not found' });
    if (!user.passengerId)
      return next({ status: 403, code: 'FORBIDDEN', message: 'Passenger account not linked' });

    req.passengerId = String(user.passengerId);
    return next();
  } catch (err) {
    return next(err);
  }
});

router.get('/me', async (req, res, next) => {
  try {
    const passenger = await Passenger.findById(req.passengerId);
    if (!passenger) return next({ status: 404, code: 'NOT_FOUND', message: 'Passenger not found' });
    res.json(passenger.toSafeJSON());
  } catch (err) {
    next(err);
  }
});

router.get('/bookings', async (req, res, next) => {
  try {
    const bookings = await Booking.find({ passengerId: req.passengerId })
      .sort({ departureDateTimeUtc: 1 })
      .limit(500);
    res.json(bookings);
  } catch (err) {
    next(err);
  }
});

router.get('/notifications', async (req, res, next) => {
  try {
    const { unread, type } = req.query;
    const q = { passengerId: req.passengerId };

    if (type) q.type = type;
    if (unread === 'true') q.read = false;

    const items = await Notification.find(q).sort({ createdAt: -1 }).limit(500);
    res.json(items);
  } catch (err) {
    next(err);
  }
});

router.patch('/notifications/:id/read', async (req, res, next) => {
  try {
    const item = await Notification.findById(req.params.id);
    if (!item) return next({ status: 404, code: 'NOT_FOUND', message: 'Notification not found' });
    if (String(item.passengerId) !== String(req.passengerId)) {
      return next({ status: 403, code: 'FORBIDDEN', message: 'Not allowed' });
    }

    item.read = true;
    item.sentAt = item.sentAt || new Date();
    await item.save();

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Booking request endpoint - allows passengers to request new bookings
router.post('/booking-requests', async (req, res, next) => {
  try {
    const { departureCity, destination, date, notes } = req.body;

    if (!departureCity || !destination || !date) {
      return next({
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'Departure city, destination and date are required'
      });
    }

    const passenger = await Passenger.findById(req.passengerId);
    if (!passenger) {
      return next({ status: 404, code: 'NOT_FOUND', message: 'Passenger not found' });
    }

    const { EmailService } = await import('../services/EmailService.js');

    // Send professional alert to Admin
    try {
      await EmailService.sendBookingRequestNotification({
        adminEmail: process.env.GMAIL_USER, // Notifying the system admin
        passengerName: passenger.fullName,
        requestDetails: { departureCity, destination, date, notes }
      });
    } catch (emailErr) {
      console.error('Failed to send booking request email to admin:', emailErr);
    }

    // Create a notification for the passenger
    await Notification.create({
      passengerId: req.passengerId,
      type: 'booking_request',
      message: `Your booking request from ${departureCity} to ${destination} on ${date} has been submitted. Our team will contact you shortly.`,
      deliveryMethod: 'in_app',
      dedupeKey: `booking_request:${req.passengerId}:${Date.now()}`,
      read: false,
    });

    res.status(201).json({
      ok: true,
      message: 'Booking request submitted successfully'
    });
  } catch (err) {
    next(err);
  }
});

export default router;

