import express from 'express';
import { createInvoice, getInvoices, getInvoiceById, deleteInvoice, sendInvoice, deleteAllInvoices } from '../controllers/invoiceController.js';
import { requireAuth, requireAgency } from '../middleware/authJwt.js';

const router = express.Router();

router.use(requireAuth);

router.post('/', requireAgency, createInvoice);
router.post('/:id/send', requireAgency, sendInvoice);
router.get('/', requireAgency, getInvoices);
router.get('/:id', getInvoiceById);
router.delete('/all', requireAgency, deleteAllInvoices);
router.delete('/:id', requireAgency, deleteInvoice);

export default router;
