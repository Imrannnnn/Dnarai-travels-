import { Router } from 'express';
import { requireAuth, requireRole, requireAgency } from '../middleware/authJwt.js';
import { scheduleController } from '../controllers/schedule.controller.js';

const router = Router();

// Staff personal schedule
router.get('/my-schedule', requireAuth, scheduleController.getMySchedule);

// Query on-duty staff (accessible to all agency personnel and admin)
router.get('/on-duty', requireAuth, requireAgency, scheduleController.getOnDutyStaff);

// Schedule routes: viewable by staff & admin, editable only by admin
router.get('/', requireAuth, requireAgency, scheduleController.getSchedules);
router.post('/', requireAuth, requireRole(['admin']), scheduleController.createSchedule);
router.patch('/staff-color/:staffId', requireAuth, requireRole(['admin']), scheduleController.updateStaffColor);
router.patch('/:id', requireAuth, requireRole(['admin']), scheduleController.updateSchedule);
router.delete('/:id', requireAuth, requireRole(['admin']), scheduleController.deleteSchedule);

export default router;
