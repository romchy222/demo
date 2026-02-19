
import express from 'express';
import { getNotificationsByUser, createNotification, markNotificationAsRead, countUnreadNotifications } from '../../api/_db';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// GET notifications for current user
router.get('/', requireAuth, async (req, res) => {
    try {
        const userId = (req as any).user.id;
        const notifications = await getNotificationsByUser(userId);
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// GET count unread
router.get('/unread-count', requireAuth, async (req, res) => {
    try {
        const userId = (req as any).user.id;
        const count = await countUnreadNotifications(userId);
        res.json({ count });
    } catch (error) {
        res.status(500).json({ error: 'Failed to count notifications' });
    }
});

// POST create notification (Internal?)
router.post('/', requireAuth, async (req, res) => {
    // Only Admin or System should create? 
    // For now allow any auth user (e.g. agent acting on behalf of user?)
    // But realistically mostly system/admin.
    try {
        await createNotification(req.body);
        res.status(201).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create notification' });
    }
});

// PATCH mark as read
router.patch('/:id/read', requireAuth, async (req, res) => {
    try {
        await markNotificationAsRead(req.params.id as string);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to mark as read' });
    }
});

export default router;
