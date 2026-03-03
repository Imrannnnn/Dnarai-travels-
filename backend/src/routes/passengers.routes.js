import { Router } from 'express';
import { z } from 'zod';

import { requireAuth, requireAgency } from '../middleware/authJwt.js';
import { validate } from '../middleware/validate.js';
import { passengersController } from '../controllers/passengers.controller.js';

/**
 * Passenger Profiles Management Routes
 * Business logic moved to passengers.controller.js
 */
const router = Router();

// Authentication required for all passenger-related endpoints
router.use(requireAuth);

// Validation schemas for passenger operations
const createSchema = z.object({
  body: z.object({
    fullName: z.string().min(2),
    email: z.string().email(),
    phone: z.string().optional(),
  }),
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
});

const setDocSchema = z.object({
  body: z.object({
    documentNumber: z.string().min(4),
    documentExpiryDate: z.string().datetime(),
    documentType: z.enum(['passport', 'international_card']).optional(),
  }),
  params: z.object({ id: z.string() }),
});

// Passenger Route Handlers (Mostly Agency Only)
router.get('/', requireAgency, passengersController.getAll);

router.get('/:id', requireAgency, passengersController.getById);

router.post('/', requireAgency, validate(createSchema), passengersController.create);

router.patch('/:id', requireAgency, validate(updateSchema), passengersController.update);

router.post('/:id/documents', requireAgency, validate(setDocSchema), passengersController.updateDocuments);

router.delete('/:id', requireAgency, passengersController.delete);

export default router;

