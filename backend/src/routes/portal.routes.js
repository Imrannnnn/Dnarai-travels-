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
  console.log('[portal] middleware start', { userId: req.user?.sub });
  try {
    const user = await User.findById(req.user?.sub);
    console.log('[portal] user found', { hasPassengerId: !!user?.passengerId });
    if (!user) return next({ status: 401, code: 'UNAUTHORIZED', message: 'User not found' });

    // Inject the passengerId if it exists, but don't block here
    if (user.passengerId) {
      req.passengerId = String(user.passengerId);
    }

    req.fullUser = user;
    console.log('[portal] middleware complete');
    return next();
  } catch (err) {
    console.error('[portal] middleware error', err);
    return next(err);
  }
});

// Route to setup or update passenger profile
router.post('/update-profile', async (req, res, next) => {
  console.log('[portal] update-profile start', { body: req.body });
  try {
    const { fullName, phone } = req.body;

    if (!fullName) {
      console.log('[portal] update-profile validation failed');
      return next({ status: 400, code: 'VALIDATION_ERROR', message: 'Full name is required' });
    }

    let passenger;
    if (req.passengerId) {
      console.log('[portal] updating existing passenger', { passengerId: req.passengerId });
      // Update existing
      passenger = await Passenger.findById(req.passengerId);
      if (!passenger) {
        console.log('[portal] passenger not found');
        return next({ status: 404, code: 'NOT_FOUND', message: 'Passenger not found' });
      }

      passenger.fullName = fullName;
      passenger.phone = phone || '';
      await passenger.save();
    } else {
      console.log('[portal] creating new passenger', { email: req.fullUser?.email });
      // Create and link
      passenger = await Passenger.create({
        fullName,
        email: req.fullUser?.email,
        phone: phone || ''
      });

      req.fullUser.passengerId = passenger._id;
      await req.fullUser.save();
      console.log('[portal] passenger created and linked');
    }

    console.log('[portal] update-profile success');
    res.status(200).json({
      ok: true,
      message: 'Profile updated successfully',
      passenger: passenger.toSafeJSON()
    });
  } catch (err) {
    console.error('[portal] update-profile error', err);
    next(err);
  }
});

router.get('/me', async (req, res, next) => {
  try {
    if (!req.passengerId) {
      return next({ status: 403, code: 'FORBIDDEN', message: 'Passenger account not linked' });
    }
    const passenger = await Passenger.findById(req.passengerId);
    if (!passenger) return next({ status: 404, code: 'NOT_FOUND', message: 'Passenger not found' });
    res.json(passenger.toSafeJSON());
  } catch (err) {
    next(err);
  }
});

router.get('/bookings', async (req, res, next) => {
  try {
    if (!req.passengerId) {
      return next({ status: 403, code: 'FORBIDDEN', message: 'Passenger account not linked' });
    }
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
    if (!req.passengerId) {
      return next({ status: 403, code: 'FORBIDDEN', message: 'Passenger account not linked' });
    }
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
    if (!req.passengerId) {
      return next({ status: 403, code: 'FORBIDDEN', message: 'Passenger account not linked' });
    }
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
    if (!req.passengerId) {
      return next({ status: 403, code: 'FORBIDDEN', message: 'Passenger account not linked' });
    }
    const { departureCity, destination, date, notes, isReturn, returnDate, passengers } = req.body;

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

    const requestDetails = {
      departureCity,
      destination,
      date,
      notes,
      isReturn,
      returnDate,
      passengers
    };

    // Send professional alert to Admin
    try {
      await EmailService.sendBookingRequestNotification({
        adminEmail: process.env.EMAIL || process.env.BREVO_SMTP_USER, // Notifying the system admin
        passengerName: passenger.fullName,
        passengerEmail: passenger.email,
        passengerPhone: passenger.phone,
        requestDetails
      });
    } catch (emailErr) {
      console.error('Failed to send booking request email to admin:', emailErr);
    }

    // Create a notification for the passenger
    await Notification.create({
      passengerId: req.passengerId,
      type: 'booking_request',
      message: `Your request (${departureCity} ➝ ${destination}, ${date}${isReturn ? `, Returning: ${returnDate}` : ''}) has been submitted.`,
      deliveryMethod: 'in_app',
      dedupeKey: `booking_request_pass:${req.passengerId}:${Date.now()}`,
      read: false,
    });

    // Create a system-level notification for Admins
    await Notification.create({
      passengerId: null, // System notification
      type: 'booking_request',
      message: `New Request: ${passenger.fullName} - ${departureCity} to ${destination} on ${date}. ${isReturn ? `Return: ${returnDate}.` : ''} (${passengers?.adults || 1} Pax)`,
      meta: {
        passenger: passenger.fullName,
        email: passenger.email,
        phone: passenger.phone,
        wa_link: `https://wa.me/${passenger.phone?.replace(/[^0-9]/g, '')}`,
        requestDetails
      },
      deliveryMethod: 'in_app',
      dedupeKey: `booking_request_admin:${req.passengerId}:${Date.now()}`,
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

