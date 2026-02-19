
import express from 'express';
import { getAgents, upsertAgent } from '../../api/_db';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = express.Router();

// GET all agents
router.get('/', async (req, res) => {
    try {
        const agents = await getAgents();
        res.json(agents);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch agents' });
    }
});

// POST/PUT upsert agent (Admin only)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
    try {
        const agent = {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ...req.body
        };
        await upsertAgent(agent);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save agent' });
    }
});

export default router;
