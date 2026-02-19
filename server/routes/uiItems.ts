
import express from 'express';
import { getUiItems } from '../../api/_db';

const router = express.Router();

// GET UI items
router.get('/', async (req, res) => {
    try {
        const { agentId, kind, groupKey } = req.query;

        if (!agentId || !kind) {
            return res.status(400).json({ error: 'Agent ID and Kind are required' });
        }

        const items = await getUiItems(agentId as string, kind as any, groupKey as string);
        res.json(items);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch UI items' });
    }
});

export default router;
