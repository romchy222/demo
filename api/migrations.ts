/**
 * Database migrations for NEON
 * Run this once to set up your database
 */

import { initializeTables } from './_db.ts';
import { pathToFileURL } from 'url';

export async function runMigrations() {
  try {
    console.log('🔄 Running database migrations...');
    await initializeTables();
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migrations if this file is executed directly
const argv1 = process.argv?.[1];
const isDirect = Boolean(argv1) && import.meta.url === pathToFileURL(argv1).href;
if (isDirect) runMigrations().catch(console.error);
