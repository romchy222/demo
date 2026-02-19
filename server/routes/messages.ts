
import express from 'express';
import { getMessages, getMessagesByUserAndAgent, saveMessage, clearMessages } from '../../api/_db';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// GET messages for a user and agent
router.get('/', requireAuth, async (req: any, res) => {
    try {
        const userId = req.user.id;
        const { agentId } = req.query;

        // If agentId is provided, filter by user and agent
        if (agentId) {
            const messages = await getMessagesByUserAndAgent(userId, agentId as string);
            return res.json(messages);
        }

        // If no agentId, return all messages (Admin view or global history)
        // In a real app, restrict this to Admin role.
        // For demo, we allow fetching all messages.
        const messages = await getMessages();
        res.json(messages);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// POST save a message
router.post('/', requireAuth, async (req: any, res) => {
    try {
        const userId = req.user.id;
        const message = { ...req.body, userId }; // Ensure userId matches auth token

        await saveMessage(message);
        res.status(201).json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to save message' });
    }
});

// DELETE clear history
router.delete('/', requireAuth, async (req: any, res) => {
    try {
        const userId = req.user.id;
        const { agentId } = req.query;

        if (!agentId) {
            return res.status(400).json({ error: 'Agent ID is required' });
        }

        await clearMessages(userId, agentId as string);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to clear messages' });
    }
});

export default router;
