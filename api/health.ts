import { getSql, initializeTables } from './_db';

export default async function handler(req: any, res: any) {
  try {
    const sql = await getSql();
    
    // Test connection
    await sql`select 1 as ok`;
    
    // Initialize tables if needed (safe to call multiple times)
    if (req.query.init === 'true') {
      await initializeTables();
    }
    
    res.status(200).json({ 
      ok: true, 
      db: 'ok',
      timestamp: new Date().toISOString()
    });
  } catch (e: any) {
    console.error('Health check failed:', e);
    res.status(500).json({ 
      ok: false, 
      error: e?.message ?? 'unknown' 
    });
  }
}

