import express from 'express';
import path from 'path';
import fs from 'fs';

import healthHandler from '../api/health.ts';
import uiItemsHandler from '../api/ui-items.ts';
import casesHandler from '../api/cases.ts';
import caseMessagesHandler from '../api/case-messages.ts';
import hhVacanciesHandler from '../api/hh/vacancies.ts';

type AnyHandler = (req: any, res: any) => Promise<any> | any;

function wrap(handler: AnyHandler) {
  return async (req: any, res: any) => {
    try {
      await handler(req, res);
    } catch (e: any) {
      console.error('API handler crashed:', e);
      if (!res.headersSent) res.status(500).json({ error: e?.message ?? 'unknown' });
    }
  };
}

const app = express();
app.disable('x-powered-by');

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Health (support both /health and /api/health; old docs sometimes used /health/)
app.all('/health', wrap(healthHandler));
app.all('/api/health', wrap(healthHandler));

// NEON-backed API
app.all('/api/ui-items', wrap(uiItemsHandler));
app.all('/api/cases', wrap(casesHandler));
app.all('/api/case-messages', wrap(caseMessagesHandler));
app.all('/api/hh/vacancies', wrap(hhVacanciesHandler));

// Static hosting (for Replit Deployments / any Node hosting)
const distDir = path.resolve(process.cwd(), 'dist');
const indexHtml = path.join(distDir, 'index.html');
const hasDist = fs.existsSync(indexHtml);

if (hasDist) {
  app.use(express.static(distDir));
  app.get('*', (req, res) => res.sendFile(indexHtml));
} else {
  app.get('/', (_req, res) =>
    res.status(200).send('API server is running. Start Vite dev server separately (npm run dev).')
  );
}

const port = (process.env.PORT ? Number(process.env.PORT) : NaN) || 5001;

app.listen(port, '0.0.0.0', () => {
  console.log(`API server listening on http://0.0.0.0:${port}`);
  if (!process.env.NEON_DATABASE_URL && !process.env.DATABASE_URL) {
    console.warn('WARN: NEON_DATABASE_URL/DATABASE_URL is not set; DB endpoints will fail until it is configured.');
  }
});
