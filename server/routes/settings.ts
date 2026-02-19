
import express from 'express';
import { getSettings, upsertSetting } from '../../api/_db';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = express.Router();

// GET all settings
router.get('/', async (req, res) => {
    try {
        const settings = await getSettings();
        // Convert array to object for easier frontend consumption
        const settingsMap = settings.reduce((acc, curr) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {} as Record<string, any>);

        res.json(settingsMap);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// POST update setting (Admin only)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { key, value, description } = req.body;
        await upsertSetting(key, value, description);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update setting' });
    }
});

export default router;
