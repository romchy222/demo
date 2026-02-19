
import express from 'express';
import { getCasesByUserAndAgent, createCase, updateCase } from '../../api/_db';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// GET cases for a user and agent
router.get('/', requireAuth, async (req: any, res) => {
    try {
        const userId = req.user.id;
        const { agentId } = req.query;

        if (!agentId) {
            return res.status(400).json({ error: 'Agent ID is required' });
        }

        const cases = await getCasesByUserAndAgent(userId, agentId as string);
        res.json(cases);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch cases' });
    }
});

// POST create a case
router.post('/', requireAuth, async (req: any, res) => {
    try {
        const userId = req.user.id;
        const { agentId, caseType, title, payload } = req.body;

        const newCase = {
            id: `case_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId,
            agentId,
            caseType,
            title,
            status: 'OPEN' as const,
            payload,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const created = await createCase(newCase);
        res.status(201).json(created);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create case' });
    }
});

// PATCH update a case
router.patch('/', requireAuth, async (req: any, res) => {
    try {
        const { id } = req.query;
        const updates = req.body;

        if (!id) {
            return res.status(400).json({ error: 'Case ID is required' });
        }

        await updateCase(id as string, updates);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update case' });
    }
});

export default router;
