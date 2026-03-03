import { Router } from 'express';
import { z } from 'zod';

import { requireAuth, requireAgency } from '../middleware/authJwt.js';
import { validate } from '../middleware/validate.js';
import { bookingsController } from '../controllers/bookings.controller.js';

/**
 * Booking Management Routes (Agency Only)
 * Business logic moved to bookings.controller.js
 */
const router = Router();

// Apply agency-level authentication to all routes in this file
router.use(requireAuth);
router.use(requireAgency);

// Validation schemas for booking operations
const createSchema = z.object({
  body: z.object({
    passengerId: z.string(),
    airlineName: z.string().min(2),
    flightNumber: z.string().min(2),
    origin: z.object({
      city: z.string().min(2),
      iata: z.string().min(2),
      countryCode: z.string().optional(),
    }),
    destination: z.object({
      city: z.string().min(2),
      iata: z.string().min(2),
      countryCode: z.string().optional(),
    }),
    bookingReference: z.string().optional(),
    ticketNumber: z.string().optional(),
    departureDateTimeUtc: z.string().datetime(),
    departureTime24: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .optional(),
  }),
});

const updateSchema = z.object({
  body: z.object({
    airlineName: z.string().min(2).optional(),
    flightNumber: z.string().min(2).optional(),
    departureDateTimeUtc: z.string().datetime().optional(),
    departureTime24: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .optional(),
    origin: z
      .object({
        city: z.string().min(2),
        iata: z.string().min(2),
        countryCode: z.string().optional(),
      })
      .optional(),
    destination: z
      .object({
        city: z.string().min(2),
        iata: z.string().min(2),
        countryCode: z.string().optional(),
      })
      .optional(),
    bookingReference: z.string().optional(),
    ticketNumber: z.string().optional(),
    status: z.enum(['confirmed', 'updated', 'cancelled', 'completed']).optional(),
  }),
  params: z.object({ id: z.string() }),
});

// Booking Route Handlers
router.get('/', bookingsController.getAll);
router.post('/', validate(createSchema), bookingsController.create);
router.get('/:id', bookingsController.getById);
router.patch('/:id', validate(updateSchema), bookingsController.update);
router.post('/:id/resend-reminder', bookingsController.resendReminder);

export default router;

