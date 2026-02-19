
import express from 'express';
import { getAnalytics } from '../../api/_db';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = express.Router();

router.get('/', requireAuth, requireAdmin, async (req, res) => {
    try {
        const stats = await getAnalytics();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

export default router;
