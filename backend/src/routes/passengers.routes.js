import { Router } from 'express';
import { z } from 'zod';

import { requireAuth, requireAgency } from '../middleware/authJwt.js';
import { validate } from '../middleware/validate.js';
import { Passenger } from '../models/Passenger.js';
import { User } from '../models/User.js';
import { Booking } from '../models/Booking.js';
import { Notification } from '../models/Notification.js';
import { AuditService } from '../services/AuditService.js';
import { EmailService } from '../services/EmailService.js';
import crypto from 'crypto';

const router = Router();

router.use(requireAuth);

router.get('/', requireAgency, async (_req, res, next) => {
  try {
    const passengers = await Passenger.find().sort({ createdAt: -1 }).limit(200);
    res.json(passengers.map((p) => p.toSafeJSON()));
  } catch (err) {
    next(err);
  }
});

const createSchema = z.object({
  body: z.object({
    fullName: z.string().min(2),
    email: z.string().email(),
    phone: z.string().optional(),
  }),
  params: z.any().optional(),
  query: z.any().optional(),
});

router.post('/', requireAgency, validate(createSchema), async (req, res, next) => {
  try {
    const { email, fullName, phone } = req.validated.body;

    // 1. Create Passenger record
    const passenger = await Passenger.create({ fullName, email, phone });

    // 2. Create User account for this passenger
    const tempPassword = crypto.randomBytes(4).toString('hex').toUpperCase(); // E.g. 5A3F1B2C
    const passwordHash = await User.hashPassword(tempPassword);

    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash,
      role: 'passenger',
      passengerId: passenger._id,
      mustChangePassword: true,
    });

    // 3. Send Welcome Email
    await EmailService.sendWelcomeEmail({
      email: user.email,
      fullName: passenger.fullName,
      password: tempPassword,
      loginUrl: process.env.CORS_ORIGIN || 'http://localhost:5173',
    });

    await AuditService.log({
      action: 'PASSENGER_CREATED',
      entityType: 'Passenger',
      entityId: passenger._id,
      actorUserId: req.user?.sub,
    });

    res.status(201).json({
      ...passenger.toSafeJSON(),
      accountCreated: true,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireAgency, async (req, res, next) => {
  try {
    const passenger = await Passenger.findById(req.params.id);
    if (!passenger) return next({ status: 404, code: 'NOT_FOUND', message: 'Passenger not found' });
    res.json(passenger.toSafeJSON());
  } catch (err) {
    next(err);
  }
});

const updateSchema = z.object({
  body: z.object({
    fullName: z.string().min(2).optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    documentType: z.enum(['passport', 'international_card']).optional(),
    documentExpiryDate: z.string().datetime().optional(),
  }),
  params: z.object({ id: z.string() }),
  query: z.any().optional(),
});

router.patch('/:id', requireAgency, validate(updateSchema), async (req, res, next) => {
  try {
    const passenger = await Passenger.findById(req.validated.params.id);
    if (!passenger) return next({ status: 404, code: 'NOT_FOUND', message: 'Passenger not found' });

    const patch = req.validated.body;
    if (patch.fullName !== undefined) passenger.fullName = patch.fullName;
    if (patch.email !== undefined) passenger.email = patch.email;
    if (patch.phone !== undefined) passenger.phone = patch.phone;
    if (patch.documentType !== undefined) passenger.documentType = patch.documentType;
    if (patch.documentExpiryDate !== undefined)
      passenger.documentExpiryDate = new Date(patch.documentExpiryDate);

    await passenger.save();
    await AuditService.log({
      action: 'PASSENGER_UPDATED',
      entityType: 'Passenger',
      entityId: passenger._id,
      actorUserId: req.user?.sub,
    });

    res.json(passenger.toSafeJSON());
  } catch (err) {
    next(err);
  }
});

const setDocSchema = z.object({
  body: z.object({
    documentNumber: z.string().min(4),
    documentExpiryDate: z.string().datetime(),
    documentType: z.enum(['passport', 'international_card']).optional(),
  }),
  params: z.object({ id: z.string() }),
  query: z.any().optional(),
});

router.post('/:id/documents', requireAgency, validate(setDocSchema), async (req, res, next) => {
  try {
    const passenger = await Passenger.findById(req.validated.params.id);
    if (!passenger) return next({ status: 404, code: 'NOT_FOUND', message: 'Passenger not found' });

    const { documentNumber, documentExpiryDate, documentType } = req.validated.body;
    if (documentType) passenger.documentType = documentType;
    passenger.setDocumentNumber(documentNumber);
    passenger.documentExpiryDate = new Date(documentExpiryDate);

    await passenger.save();
    await AuditService.log({
      action: 'PASSENGER_DOCUMENT_UPDATED',
      entityType: 'Passenger',
      entityId: passenger._id,
      actorUserId: req.user?.sub,
    });

    res.json(passenger.toSafeJSON());
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAgency, async (req, res, next) => {
  try {
    const passengerId = req.params.id;

    // 1. Delete Passenger
    const passenger = await Passenger.findByIdAndDelete(passengerId);
    if (!passenger) return next({ status: 404, code: 'NOT_FOUND', message: 'Passenger not found' });

    // 2. Cascade Delete User Account (By ID or Email to be safe)
    await User.deleteMany({
      $or: [{ passengerId: passengerId }, { email: passenger.email }],
    });

    // 3. Cascade Delete Bookings
    await Booking.deleteMany({ passengerId });

    // 4. Cascade Delete Notifications
    await Notification.deleteMany({ passengerId });

    await AuditService.log({
      action: 'PASSENGER_DELETED',
      entityType: 'Passenger',
      entityId: passengerId,
      actorUserId: req.user?.sub,
    });

    res.json({ ok: true, message: 'Passenger and all associated data deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
