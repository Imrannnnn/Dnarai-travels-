import { Router } from 'express';
import { requireAuth, requireAgency } from '../middleware/authJwt.js';
import { notificationsController } from '../controllers/notifications.controller.js';

/**
 * System Notification Routes (Agency Only)
 * Business logic moved to notifications.controller.js
 */
const router = Router();

// Agency authorization required for all notification management
router.use(requireAuth);
router.use(requireAgency);

// Notifications Route Handlers
router.get('/', notificationsController.getAll);
router.patch('/:id/read', notificationsController.markAsRead);
router.patch('/read-all', notificationsController.markAllAsRead);
router.delete('/', notificationsController.deleteAll);

export default router;

