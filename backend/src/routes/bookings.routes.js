import { Router } from 'express';

import { requireAuth, requireAgency } from '../middleware/authJwt.js';
import { validate } from '../middleware/validate.js';
import { bookingsController } from '../controllers/bookings.controller.js';
import {
  createBookingSchema,
  updateBookingSchema,
  createReminderNoAccountSchema
} from '../validators/bookings.validator.js';

/**
 * Booking Management Routes (Agency Only)
 * Business logic moved to bookings.controller.js
 */
const router = Router();

// Apply agency-level authentication to all routes in this file
router.use(requireAuth);
router.use(requireAgency);

// Booking Route Handlers
router.get('/', bookingsController.getAll);
router.post('/', validate(createBookingSchema), bookingsController.create);
router.post('/set-reminder-no-account', validate(createReminderNoAccountSchema), bookingsController.createReminderNoAccount);
router.get('/:id', bookingsController.getById);
router.patch('/:id', validate(updateBookingSchema), bookingsController.update);
router.post('/:id/resend-reminder', bookingsController.resendReminder);

export default router;

