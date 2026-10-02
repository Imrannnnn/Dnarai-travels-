import { Router } from 'express';
import { requireAuth, requireRole, requireAgency } from '../middleware/authJwt.js';
import { dutyController } from '../controllers/duty.controller.js';

const router = Router();

// Staff duty dashboard endpoints
router.get('/my-duties', requireAuth, requireAgency, dutyController.getMyDuties);
router.patch('/assignments/:id/complete', requireAuth, requireAgency, dutyController.completeDutyAssignment);
router.patch('/assignments/:id/notes', requireAuth, requireAgency, dutyController.updateDutyAssignmentNotes);

// Admin-only duty management routes
router.get('/', requireAuth, requireRole(['admin']), dutyController.getDuties);
router.post('/', requireAuth, requireRole(['admin']), dutyController.createDuty);
router.delete('/:id', requireAuth, requireRole(['admin']), dutyController.deleteDuty);
router.post('/send-daily-briefing', requireAuth, requireRole(['admin']), dutyController.triggerDailyBriefing);

export default router;
