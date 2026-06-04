import { Router } from 'express';

import { requireAuth, requireAgency } from '../middleware/authJwt.js';
import { validate } from '../middleware/validate.js';
import { passengersController } from '../controllers/passengers.controller.js';
import { createPassengerSchema, updatePassengerSchema, setPassengerDocSchema } from '../validators/passengers.validator.js';

/**
 * Passenger Profiles Management Routes
 * Business logic moved to passengers.controller.js
 */
const router = Router();

// Authentication required for all passenger-related endpoints
router.use(requireAuth);

// Passenger Route Handlers (Mostly Agency Only)
router.get('/', requireAgency, passengersController.getAll);

router.get('/:id', requireAgency, passengersController.getById);

router.post('/', requireAgency, validate(createPassengerSchema), passengersController.create);

router.patch('/:id', requireAgency, validate(updatePassengerSchema), passengersController.update);

router.post('/:id/documents', requireAgency, validate(setPassengerDocSchema), passengersController.updateDocuments);

router.delete('/:id', requireAgency, passengersController.delete);

export default router;

