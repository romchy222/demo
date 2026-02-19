
import express from 'express';
import { getCaseMessages, addCaseMessage } from '../../api/_db';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// GET messages for a case
router.get('/', requireAuth, async (req, res) => {
    try {
        const { caseId } = req.query;

        if (!caseId) {
            return res.status(400).json({ error: 'Case ID is required' });
        }

        const messages = await getCaseMessages(caseId as string);
        res.json(messages);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch case messages' });
    }
});

// POST add a message to a case
router.post('/', requireAuth, async (req: any, res) => {
    try {
        const userId = req.user.id;
        const { caseId, authorRole, message } = req.body;

        const newMessage = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            caseId,
            authorUserId: userId,
            authorRole,
            message,
            createdAt: new Date().toISOString()
        };

        await addCaseMessage(newMessage);
        res.status(201).json(newMessage);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to add case message' });
    }
});

export default router;
