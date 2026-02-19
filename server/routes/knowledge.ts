
import express from 'express';
import { getKnowledge, createKnowledge } from '../../api/_db';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = express.Router();

// GET knowledge (Public/Auth)
router.get('/', requireAuth, async (req, res) => {
    try {
        const { agentId } = req.query;
        const knowledge = await getKnowledge(agentId as string);
        res.json(knowledge);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch knowledge base' });
    }
});

// POST create entry (Admin only)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
    try {
        const entry = {
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            ...req.body
        };
        await createKnowledge(entry);
        res.status(201).json(entry);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create knowledge entry' });
    }
});

export default router;
