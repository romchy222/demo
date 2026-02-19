
import express from 'express';
import { getEvents, getUserById } from '../../api/_db';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

router.get('/stats', requireAuth, async (req, res) => {
    try {
        const userId = (req as any).user.id;
        const user = await getUserById(userId);
        const events = await getEvents();

        // Filter events for user's target group if applicable (simplified logic)
        // For now return all events or simple filter

        const stats = {
            gpa: user?.metadata?.gpa || 'N/A',
            attendance: user?.metadata?.attendance || 'N/A',
            credits: user?.metadata?.credits || 0,
            schedule: events.filter(e => e.type === 'SCHEDULE'),
            deadlines: events.filter(e => e.type === 'DEADLINE')
        };

        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});

export default router;
