# NEON Database Setup Guide

## 1. Get Your NEON Connection String

1. Go to https://console.neon.tech
2. Create a new project or select existing one
3. Copy the connection string (it looks like: `postgresql://user:password@host/dbname`)
4. Add it to your `.env` file:

```
DATABASE_URL=postgresql://your_user:your_password@your_host/your_db
```

## 2. Environment Variables

Create a `.env.local` file in the root directory:

```env
DATABASE_URL=postgresql://user:password@your-neon-host.neon.tech/your_database
```

For production, add the same variable to your hosting environment (Secrets / env vars).

## 3. Initialize Database

The database tables are automatically created when you first call functions from `_db.ts`.

Alternatively, you can run the migration manually:

```bash
npm run migrate
```

## 4. Available Database Functions

### Users
- `getUsers()` - Get all users
- `getUserByEmail(email)` - Find user by email
- `getUserById(id)` - Find user by ID
- `createUser(user)` - Create new user
- `updateUser(id, updates)` - Update user data

### Messages
- `getMessages()` - Get all messages
- `getMessagesByUserAndAgent(userId, agentId)` - Get messages for specific user and agent
- `saveMessage(message)` - Save new message
- `clearMessages(userId, agentId)` - Clear messages for user and agent

### Notifications
- `getNotifications()` - Get all notifications
- `getNotificationsByUser(userId)` - Get notifications for specific user
- `countUnreadNotifications(userId)` - Count unread notifications
- `markNotificationAsRead(id)` - Mark notification as read
- `createNotification(notification)` - Create new notification
- `broadcastNotification(title, message, opts)` - Send notification to all users

### Documents
- `getDocs()` - Get all documents
- `getDocsByUser(userId)` - Get documents for specific user
- `createDoc(doc)` - Create new document
- `updateDoc(id, updates)` - Update document
- `removeDoc(id)` - Delete document

### Feedback
- `getFeedback()` - Get all feedback
- `getFeedbackByMessage(messageId)` - Get feedback for specific message
- `upsertFeedback(feedback)` - Create or update feedback

### Audit
- `getAuditLog()` - Get audit log entries
- `logAuditEvent(event)` - Log audit event
- `clearAuditLog()` - Clear audit log

## 5. Database Schema

The database includes the following tables:
- `tbl_users` - User accounts
- `tbl_messages` - Chat messages
- `tbl_notifications` - Notifications
- `tbl_docs` - Documents/Notes
- `tbl_feedback` - Message feedback/ratings
- `tbl_audit` - Audit logs

All tables include appropriate indexes for performance optimization.
