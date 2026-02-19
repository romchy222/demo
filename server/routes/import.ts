
import express from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { createUser, getUserByEmail } from '../../api/_db';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { User } from '../../types';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/', requireAuth, requireAdmin, upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet) as any[];

        const results = {
            success: 0,
            failed: 0,
            errors: [] as string[]
        };

        for (const row of data) {
            // Expected columns: Name, Email, Role, Department
            if (!row.Email || !row.Name) {
                results.failed++;
                continue;
            }

            try {
                const existing = await getUserByEmail(row.Email);
                if (existing) {
                    results.failed++;
                    results.errors.push(`User ${row.Email} already exists`);
                    continue;
                }

                const newUser: User = {
                    id: crypto.randomUUID(),
                    email: row.Email,
                    name: row.Name,
                    role: (row.Role || 'STUDENT').toUpperCase() as any,
                    department: row.Department,
                    joinedAt: new Date().toISOString(),
                    passwordHash: '' // Should generate random password or handle auth provider
                };

                await createUser(newUser);
                results.success++;
            } catch (err: any) {
                results.failed++;
                results.errors.push(`Error creating ${row.Email}: ${err.message}`);
            }
        }

        res.json(results);
    } catch (error) {
        console.error('Import error:', error);
        res.status(500).json({ error: 'Failed to process import file' });
    }
});

export default router;
