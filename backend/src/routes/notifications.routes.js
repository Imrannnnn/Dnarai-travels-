import { Router } from 'express';
import { requireAuth, requireAgency } from '../middleware/authJwt.js';
import { Notification } from '../models/Notification.js';

const router = Router();
router.use(requireAuth);
router.use(requireAgency);

router.get('/', async (req, res, next) => {
  try {
    // SuperAdmins receive literally all notifications (passenger alerts + admin alerts)
    // with full details of the linked passenger.
    const q = {};

    const { unread, type } = req.query;
    if (type) q.type = type;
    if (unread === 'true') q.read = false;

    const items = await Notification.find(q)
      .populate('passengerId', 'fullName email phone')
      .sort({ createdAt: -1 })
      .limit(500);
    res.json(items);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/read', async (req, res, next) => {
  try {
    const item = await Notification.findById(req.params.id);
    if (!item) return next({ status: 404, code: 'NOT_FOUND', message: 'Notification not found' });

    item.read = true;
    item.sentAt = item.sentAt || new Date();
    await item.save();

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.patch('/read-all', async (req, res, next) => {
  try {
    // Mark all notifications as read when admin clicks Mark All as Read
    await Notification.updateMany(
      { read: false },
      { $set: { read: true } }
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.delete('/', async (req, res, next) => {
  try {
    await Notification.deleteMany({});
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
