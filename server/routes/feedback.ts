
import express from 'express';
import { getFeedback, upsertFeedback } from '../../api/_db';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = express.Router();

// GET all feedback (Admin only)
router.get('/', requireAuth, requireAdmin, async (req, res) => {
    try {
        const feedback = await getFeedback();
        res.json(feedback);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch feedback' });
    }
});

// POST submit feedback
router.post('/', requireAuth, async (req, res) => {
    try {
        const userId = (req as any).user.id;
        const feedback = { ...req.body, userId };

        await upsertFeedback(feedback);
        res.status(201).json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to submit feedback' });
    }
});

export default router;
