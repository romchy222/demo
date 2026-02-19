
import { Request, Response, NextFunction } from 'express';
import { getSql } from '../../api/_db';

export async function checkMaintenance(req: Request, res: Response, next: NextFunction) {
    try {
        const sql = await getSql();
        // Check if maintenance mode is enabled in settings
        const result = await sql`
      SELECT value FROM tbl_settings WHERE key = 'maintenance_mode'
    `;

        const isMaintenance = result[0]?.value === true;

        // Allow admins to bypass maintenance
        // We need to check auth first typically, or check the header here again if auth middleware runs after?
        // Let's assume this runs BEFORE auth for public routes, but we can check the header manually for bypass
        // Or better: let it run AFTER auth? 
        // If we run it after auth, we can check req.user.role.
        // If we run it before, we can't.
        // Let's rely on x-user-id for bypass check if not authenticated yet, 
        // but better design is: Public routes -> Check Maintenance -> Auth -> Admin Routes

        // For simplicity: If maintenance is on, reject UNLESS it's an admin trying to login or access admin API.
        // But since we are stateless, we can check the user from the header just like auth does, 
        // or just let auth middleware run first?
        // If we run auth first, then public pages (login) might be blocked if they require auth?
        // Login shouldn't require auth.

        // If path is /api/auth/login (if we had one) we skip.
        // But we use /api/users usually.

        if (isMaintenance) {
            // Ideally we should allow generic read if we want to show a "Maintenance" page that fetches status?
            // But the frontend usually gets 503 and shows the screen.

            // Allow Admin bypass
            // Quick verify of user role if header is present
            const userId = req.headers['x-user-id'] as string;
            if (userId) {
                const userRes = await sql`SELECT role FROM tbl_users WHERE id = ${userId}`;
                if (userRes[0]?.role === 'ADMIN') {
                    return next();
                }
            }

            return res.status(503).json({ error: 'Service Unavailable: Maintenance Mode' });
        }

        next();
    } catch (error) {
        console.error('Maintenance check error:', error);
        // Fail open or closed? Fail open to allow access if DB is down? 
        // If DB is down, nothing works anyway.
        next();
    }
}
