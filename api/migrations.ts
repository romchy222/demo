/**
 * Database migrations for NEON
 * Run this once to set up your database
 */

import { initializeTables } from './_db.ts';

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
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations().catch(console.error);
}
