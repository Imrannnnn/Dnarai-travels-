import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/authJwt.js';
import { portalController } from '../controllers/portal.controller.js';

/**
 * Passenger Portal (B2C) Routes
 * Business logic moved to portal.controller.js
 */
const router = Router();

// Mandatory authentication and passenger-only access
router.use(requireAuth);
router.use(requireRole(['passenger']));

// Profile linking and data hydration middleware
router.use(portalController.portalMiddleware);

// Profile Management
router.post('/update-profile', portalController.updateProfile);
router.get('/me', portalController.getMe);

// Flight Itineraries (With Weather Service)
router.get('/bookings', portalController.getBookings);

// Passenger Notifications
router.get('/notifications', portalController.getNotifications);
router.patch('/notifications/:id/read', portalController.readNotification);
router.patch('/notifications/read-all', portalController.readAllNotifications);

// Interaction: Requesting new services
router.post('/booking-requests', portalController.submitBookingRequest);

export default router;


