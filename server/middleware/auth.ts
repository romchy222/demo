
import { Request, Response, NextFunction } from 'express';
import { getUserById } from '../../api/_db';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized: No user ID provided' });
    }

    try {
        const user = await getUserById(userId);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized: User not found' });
        }

        // Attach user to request object
        (req as any).user = user;
        next();
    } catch (error) {
        console.error('Auth error:', error);
        res.status(500).json({ error: 'Internal Server Error during auth' });
    }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
    const user = (req as any).user;

    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    next();
}
