
import express from 'express';
import { getAuditLog, logAuditEvent, clearAuditLog } from '../../api/_db';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = express.Router();

// GET audit log (Admin only)
router.get('/', requireAuth, requireAdmin, async (req, res) => {
    try {
        const logs = await getAuditLog();
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
});

// POST log event (Internal/System use mainly, but exposed for client-side events if needed)
router.post('/', requireAuth, async (req, res) => {
    try {
        const actorUserId = (req as any).user.id;
        const event = { ...req.body, actorUserId };

        await logAuditEvent(event);
        res.status(201).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to log event' });
    }
});

// DELETE clear log (Admin only)
router.delete('/', requireAuth, requireAdmin, async (req, res) => {
    try {
        await clearAuditLog();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to clear audit log' });
    }
});

export default router;
