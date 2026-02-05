# NEON Database Connection - Complete Setup Guide

## 🚀 Quick Start

### Step 1: Create NEON Database
1. Go to https://console.neon.tech
2. Sign up or log in
3. Create a new project
4. Copy your connection string (format: `postgresql://user:password@host/dbname`)

### Step 2: Configure Environment Variables
Create a `.env.local` file in your project root:

```env
DATABASE_URL=postgresql://user:password@your-neon-host.neon.tech/your_database
```

For **Vercel deployment**, add this to your project settings:
- Go to Settings → Environment Variables
- Add `DATABASE_URL` with your NEON connection string

### Step 3: Initialize Database (Optional)
The database tables are automatically created when functions from `_db.ts` are first called.

To manually initialize:
```bash
curl https://your-project.vercel.app/api/health?init=true
```

## 📁 File Structure

```
api/
├── _db.ts              # Core database functions (DO NOT EDIT)
├── health.ts           # Health check endpoint
├── migrations.ts       # Database initialization
└── EXAMPLES.ts         # Usage examples
```

## 🔧 Available Functions

All functions are async and located in `api/_db.ts`:

### Users
```typescript
import { getUsers, getUserByEmail, getUserById, createUser, updateUser } from './api/_db';

const users = await getUsers();
const user = await getUserByEmail('user@example.com');
const user = await getUserById('user-id');
await createUser(newUser);
await updateUser('user-id', { name: 'New Name' });
```

### Messages
```typescript
import { getMessages, getMessagesByUserAndAgent, saveMessage, clearMessages } from './api/_db';

const messages = await getMessagesByUserAndAgent('user-id', 'agent-id');
await saveMessage(messageObject);
await clearMessages('user-id', 'agent-id');
```

### Notifications
```typescript
import { 
  getNotifications, 
  getNotificationsByUser, 
  countUnreadNotifications,
  markNotificationAsRead,
  createNotification,
  broadcastNotification 
} from './api/_db';

const notifs = await getNotificationsByUser('user-id');
const count = await countUnreadNotifications('user-id');
await markNotificationAsRead('notification-id');
await createNotification(notificationObject);
await broadcastNotification('Title', 'Message', { severity: 'WARN' });
```

### Documents
```typescript
import { getDocs, getDocsByUser, createDoc, updateDoc, removeDoc } from './api/_db';

const docs = await getDocsByUser('user-id');
await createDoc(docObject);
await updateDoc('doc-id', { title: 'New Title' });
await removeDoc('doc-id');
```

### Feedback
```typescript
import { getFeedback, getFeedbackByMessage, upsertFeedback } from './api/_db';

const feedback = await getFeedbackByMessage('message-id');
await upsertFeedback(feedbackObject);
```

### Audit Log
```typescript
import { getAuditLog, logAuditEvent, clearAuditLog } from './api/_db';

const log = await getAuditLog();
await logAuditEvent({ type: 'USER_LOGIN', actorUserId: 'user-id' });
```

## 📊 Database Schema

### tbl_users
```sql
id (TEXT, PRIMARY KEY)
email (TEXT, UNIQUE)
name (TEXT)
role (TEXT) - STUDENT, FACULTY, ADMIN, ALUMNI
avatar (TEXT)
password_hash (TEXT)
department (TEXT)
joined_at (TIMESTAMPTZ)
```

### tbl_messages
```sql
id (TEXT, PRIMARY KEY)
user_id (TEXT, FK → tbl_users)
agent_id (TEXT) - abitur, kadr, nav, career, room
role (TEXT) - user, model
content (TEXT)
attachment (TEXT) - Base64 image
latency_ms (INTEGER)
timestamp (TIMESTAMPTZ)
```

### tbl_notifications
```sql
id (TEXT, PRIMARY KEY)
user_id (TEXT, FK → tbl_users)
title (TEXT)
message (TEXT)
is_read (BOOLEAN)
severity (TEXT) - INFO, WARN, ALERT
link (TEXT)
created_by (TEXT)
created_at (TIMESTAMPTZ)
```

### tbl_docs
```sql
id (TEXT, PRIMARY KEY)
user_id (TEXT, FK → tbl_users)
title (TEXT)
content (TEXT)
created_at (TIMESTAMPTZ)
updated_at (TIMESTAMPTZ)
```

### tbl_feedback
```sql
id (TEXT, PRIMARY KEY)
message_id (TEXT)
user_id (TEXT, FK → tbl_users)
agent_id (TEXT)
rating (INTEGER) - 1 or -1
comment (TEXT)
created_at (TIMESTAMPTZ)
```

### tbl_audit
```sql
id (TEXT, PRIMARY KEY)
actor_user_id (TEXT, FK → tbl_users)
type (TEXT)
details (JSONB)
at (TIMESTAMPTZ)
```

## 🛠️ Usage Examples

### Example API Handler

```typescript
// api/get-user.ts
import { getUserById } from './_db';

export default async function handler(req, res) {
  try {
    const { id } = req.query;
    const user = await getUserById(id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

### Frontend Usage

```typescript
// Get user messages
async function loadMessages(userId, agentId) {
  try {
    const response = await fetch(
      `/api/messages?userId=${userId}&agentId=${agentId}`
    );
    const messages = await response.json();
    return messages;
  } catch (error) {
    console.error('Failed to load messages:', error);
  }
}
```

## 🔐 Security Notes

1. **Never expose** `DATABASE_URL` to client-side code
2. Always use it in API handlers only
3. Remove `passwordHash` before sending user data to frontend
4. Use HTTPS for all database connections
5. Validate and sanitize all inputs

## 🐛 Troubleshooting

### "DATABASE_URL is not set"
- Make sure `.env.local` exists in project root
- Restart development server: `npm run dev`
- For Vercel, check project Settings → Environment Variables

### Connection timeouts
- Verify NEON connection string is correct
- Check network connection
- Ensure NEON project is active
- Check Vercel logs: `vercel logs --follow`

### Tables not created
- Call `/api/health?init=true` to manually initialize
- Or call any database function first time
- Tables have `IF NOT EXISTS` so safe to call multiple times

### Permission denied errors
- Verify DATABASE_URL user has correct permissions
- Try reconnecting in NEON console

## 📚 Additional Resources

- [NEON Documentation](https://neon.tech/docs)
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)
- [PostgreSQL Basics](https://www.postgresql.org/docs/)

## ✅ Verification Checklist

- [ ] NEON project created
- [ ] CONNECTION_URL copied
- [ ] `.env.local` created with CONNECTION_URL
- [ ] `/api/health` endpoint returns `{ ok: true, db: 'ok' }`
- [ ] Database tables created (verified in NEON console)
- [ ] Ready to deploy!

