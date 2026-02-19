
import express from 'express';
import { broadcastNotification } from '../../api/_db';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = express.Router();

router.post('/', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { title, message, severity, link, targetGroup } = req.body;

        // TODO: Implement targetGroup filtering in broadcastNotification
        // For now it broadcasts to all

        await broadcastNotification(title, message, {
            severity: severity || 'INFO',
            createdBy: (req as any).user.name,
            link
        });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to broadcast notification' });
    }
});

export default router;
