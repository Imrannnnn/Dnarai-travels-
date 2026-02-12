import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireAgency } from '../middleware/authJwt.js';
import { Passenger } from '../models/Passenger.js';
import { User } from '../models/User.js';

const router = Router();

// Apply authentication middleware to all routes
router.use(requireAuth);
router.use(requireAgency);

const createPassengerAccountSchema = z.object({
  body: z.object({
    passengerId: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(8),
  }),
  params: z.any().optional(),
  query: z.any().optional(),
});

// Agency-only: create a passenger user account linked to a Passenger record
router.post(
  '/create-passenger-account',
  validate(createPassengerAccountSchema),
  async (req, res, next) => {
    try {
      const { passengerId, email, password } = req.validated.body;

      const passenger = await Passenger.findById(passengerId);
      if (!passenger)
        return next({ status: 404, code: 'PASSENGER_NOT_FOUND', message: 'Passenger not found' });

      const existingUser = await User.findOne({ email });
      if (existingUser)
        return next({ status: 409, code: 'EMAIL_TAKEN', message: 'Email already in use' });

      const existingLink = await User.findOne({ passengerId });
      if (existingLink)
        return next({
          status: 409,
          code: 'PASSENGER_ALREADY_LINKED',
          message: 'Passenger already has a user account',
        });

      const passwordHash = await User.hashPassword(password);
      const user = await User.create({ email, passwordHash, role: 'passenger', passengerId });

      res.json({ id: user._id, email: user.email, role: user.role, passengerId: user.passengerId });
    } catch (err) {
      next(err);
    }
  }
);

const onboardPassengerSchema = z.object({
  body: z.object({
    fullName: z.string().min(2),
    email: z.string().email(),
    phone: z.string().optional(),
  }),
  params: z.any().optional(),
  query: z.any().optional(),
});

// Agency-only: Onboard a new passenger (Create Passenger + User + Email)
router.post('/onboard-passenger', validate(onboardPassengerSchema), async (req, res, next) => {
  try {
    const { fullName, email, phone } = req.validated.body;

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return next({ status: 409, code: 'EMAIL_TAKEN', message: 'Email already in use' });

    // 1. Create Passenger
    const passenger = await Passenger.create({ fullName, email, phone });

    // 2. Generate Random Password
    const tempPassword = Math.random().toString(36).slice(-10) + 'A1!';
    const passwordHash = await User.hashPassword(tempPassword);

    // 3. Create User Account
    const user = await User.create({
      email,
      passwordHash,
      role: 'passenger',
      passengerId: passenger._id,
    });

    // 4. Send Welcome Email
    const loginUrl = process.env.CORS_ORIGIN || 'http://localhost:5173';
    try {
      const { EmailService } = await import('../services/EmailService.js');
      const emailResult = await EmailService.sendWelcomeEmail({
        email,
        fullName,
        password: tempPassword,
        loginUrl,
      });
      if (emailResult?.ok) {
        console.log(`✅ Welcome email sent successfully to ${email}`);
      } else {
        console.error(
          `❌ Welcome email failed to send to ${email}:`,
          emailResult?.error || 'Unknown error'
        );
      }
    } catch (emailErr) {
      console.error('⚠️ Welcome email execution error:', emailErr);
    }

    res.json({
      passenger: passenger.toSafeJSON(),
      userId: user._id,
      tempPassword,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
