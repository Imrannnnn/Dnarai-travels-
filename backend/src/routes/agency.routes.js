import { Router } from 'express';
import { z } from 'zod';

import { validate } from '../middleware/validate.js';
import { requireAuth, requireAgency } from '../middleware/authJwt.js';
import { agencyController } from '../controllers/agency.controller.js';

/**
 * Agency Access routes
 * Business logic moved to agency.controller.js
 */
const router = Router();

// Apply authentication middleware to all routes
router.use(requireAuth);
router.use(requireAgency);

// Validation schemas for agency functions
const createPassengerAccountSchema = z.object({
  body: z.object({
    passengerId: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(8),
  }),
});

const onboardPassengerSchema = z.object({
  body: z.object({
    fullName: z.string().min(2),
    email: z.string().email(),
    phone: z.string().optional(),
  }),
});

// Agency Route Handlers
router.post(
  '/create-passenger-account',
  validate(createPassengerAccountSchema),
  agencyController.createPassengerAccount
);

router.post(
  '/onboard-passenger',
  validate(onboardPassengerSchema),
  agencyController.onboardPassenger
);

export default router;

