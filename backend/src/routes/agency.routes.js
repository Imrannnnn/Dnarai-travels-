import { Router } from 'express';

import { validate } from '../middleware/validate.js';
import { requireAuth, requireAgency } from '../middleware/authJwt.js';
import { agencyController } from '../controllers/agency.controller.js';
import { createPassengerAccountSchema, onboardPassengerSchema } from '../validators/agency.validator.js';

/**
 * Agency Access routes
 * Business logic moved to agency.controller.js
 */
const router = Router();

// Apply authentication middleware to all routes
router.use(requireAuth);
router.use(requireAgency);

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

