import { Router } from 'express';
import { requireAuth, requireAgency } from '../middleware/authJwt.js';
import { validate } from '../middleware/validate.js';
import { quotationController } from '../controllers/quotation.controller.js';
import {
  createQuotationSchema,
  updateQuotationSchema,
  updateStatusSchema,
  updateSettingsSchema,
  previewMessageSchema,
} from '../validators/quotation.validator.js';

const router = Router();

// Apply auth to all quotation routes
router.use(requireAuth);
router.use(requireAgency);

// Agency Settings
router.get('/settings', quotationController.getSettings);
router.patch('/settings', validate(updateSettingsSchema), quotationController.updateSettings);

// Live preview without saving
router.post('/preview', validate(previewMessageSchema), quotationController.previewMessage);

// Quotation CRUD
router.get('/', quotationController.getQuotations);
router.get('/:id', quotationController.getQuotationById);
router.post('/', validate(createQuotationSchema), quotationController.createQuotation);
router.patch('/:id', validate(updateQuotationSchema), quotationController.updateQuotation);
router.patch('/:id/status', validate(updateStatusSchema), quotationController.updateStatus);
router.delete('/:id', quotationController.deleteQuotation);

export default router;
