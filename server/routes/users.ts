
import express from 'express';
import { getUsers, getUserById, createUser, updateUser, getUserByEmail } from '../../api/_db';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = express.Router();

// GET all users (Admin only) OR get by email (Public for login)
router.get('/', async (req: any, res) => {
    try {
        const { email } = req.query;
        if (email) {
            const user = await getUserByEmail(email as string);
            if (user) return res.json(user); // dbService handles non-array return too
            return res.status(404).json({ error: 'User not found' });
        }

        // If no email, check for auth and admin
        // We manually check auth here because the route itself is public for email lookup
        // This is a bit hacky for demo. In real app, use separate /login or /lookup endpoint.
        // But adapting to existing frontend architecture:

        // Use a helper or middleware logic manually
        // Since we didn't use app.use(requireAuth) globally for this route, we check headers.
        // But headers might not be present if just listing.

        // Let's rely on the client sending headers.
        // And we need to verify them.
        // Since I can't easily invoke middleware conditionally without chaining, I'll just check if query is empty.

        // If listing all users, must be admin.
        // middleware: requireAuth, requireAdmin.
        // But I can't apply them to the whole route if email lookup is public.

        // For simplicity in this demo:
        // if (email) -> return user (public)
        // else -> require headers and admin check.

        // Note: Basic check
        const userId = req.headers['x-user-id'];
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        // Check if user is admin
        const requestingUser = await getUserById(userId as string);
        if (!requestingUser || requestingUser.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const users = await getUsers();
        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// GET user by ID
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const user = await getUserById(req.params.id as string);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

// POST create user
router.post('/', async (req, res) => {
    try {
        const newUser = await createUser(req.body);
        res.status(201).json(newUser);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// PUT update user
router.put('/:id', requireAuth, async (req: any, res) => {
    try {
        // Check if user is updating themselves or if admin
        const currentUser = req.user;
        if (currentUser.id !== req.params.id && currentUser.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Forbidden' });
        }

        await updateUser(req.params.id as string, req.body);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

export default router;
