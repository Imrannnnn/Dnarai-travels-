import { Notification } from '../models/Notification.js';

/**
 * Controller for system-wide notifications and alerts
 */
export const notificationsController = {
    /**
     * Retrieves all notifications with optional filters (Agency/Admin Only)
     */
    getAll: async (req, res, next) => {
        try {
            const q = {};
            const { unread, type } = req.query;

            if (type) q.type = type;
            if (unread === 'true') q.read = false;

            // SuperAdmins/Staff view all notifications with populated passenger details
            const items = await Notification.find(q)
                .populate('passengerId', 'fullName email phone')
                .sort({ createdAt: -1 })
                .limit(500);

            res.json(items);
        } catch (err) {
            next(err);
        }
    },

    /**
     * Marks a specific notification as read
     */
    markAsRead: async (req, res, next) => {
        try {
            const item = await Notification.findById(req.params.id);
            if (!item) {
                return next({
                    status: 404,
                    code: 'NOT_FOUND',
                    message: 'Notification not found'
                });
            }

            item.read = true;
            item.sentAt = item.sentAt || new Date();
            await item.save();

            res.json({ ok: true });
        } catch (err) {
            next(err);
        }
    },

    /**
     * Marks all unread notifications as read
     */
    markAllAsRead: async (req, res, next) => {
        try {
            await Notification.updateMany(
                { read: false },
                { $set: { read: true } }
            );
            res.json({ ok: true });
        } catch (err) {
            next(err);
        }
    },

    /**
     * Permanently deletes all notifications (Dangerous Operation)
     */
    deleteAll: async (req, res, next) => {
        try {
            await Notification.deleteMany({});
            res.json({ ok: true });
        } catch (err) {
            next(err);
        }
    }
};
