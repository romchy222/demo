
import express from 'express';
import { getDocsByUser, createDoc, updateDoc, removeDoc } from '../../api/_db';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// GET docs for user
router.get('/', requireAuth, async (req, res) => {
    try {
        const userId = (req as any).user.id;
        const docs = await getDocsByUser(userId);
        res.json(docs);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch docs' });
    }
});

// POST create doc
router.post('/', requireAuth, async (req, res) => {
    try {
        const userId = (req as any).user.id;
        const doc = { ...req.body, userId };

        await createDoc(doc);
        res.status(201).json({ success: true, id: doc.id });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create doc' });
    }
});

// PUT update doc
router.put('/:id', requireAuth, async (req, res) => {
    try {
        await updateDoc(req.params.id as string, req.body);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update doc' });
    }
});

// DELETE remove doc
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        await removeDoc(req.params.id as string);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete doc' });
    }
});

export default router;
