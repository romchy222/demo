
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import userRoutes from './routes/users';
import messageRoutes from './routes/messages';
import notificationRoutes from './routes/notifications';
import docRoutes from './routes/docs';
import feedbackRoutes from './routes/feedback';
import auditRoutes from './routes/audit';
import dashboardRoutes from './routes/dashboard';
import knowledgeRoutes from './routes/knowledge';
import agentRoutes from './routes/agents';
import settingRoutes from './routes/settings';
import importRoutes from './routes/import';
import analyticsRoutes from './routes/analytics';
import broadcastRoutes from './routes/broadcasts';
import caseRoutes from './routes/cases';
import caseMessageRoutes from './routes/caseMessages';
import uiItemRoutes from './routes/uiItems';

import { checkMaintenance } from './middleware/maintenance';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Maintenance Check (Global for /api, or specific?)
// Let's apply to all /api routes
app.use('/api', checkMaintenance);

// Routes
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/docs', docRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/import', importRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/broadcasts', broadcastRoutes);

// New Routes
app.use('/api/cases', caseRoutes);
app.use('/api/case-messages', caseMessageRoutes);
app.use('/api/ui-items', uiItemRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start Server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
