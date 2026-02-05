# 🗄️ NEON Database Connection - Getting Started

## 1️⃣ Create NEON Account & Project

Visit: https://console.neon.tech

1. Sign up (free)
2. Create a new project
3. Wait for project initialization
4. Copy your connection string (looks like: `postgresql://user:password@...`)

## 2️⃣ Set Environment Variable

### For Local Development
Create `.env.local` in your project root:
```
DATABASE_URL=postgresql://your_user:your_password@your_host/dbname
```

### For Vercel Deployment
1. Go to your Vercel project → Settings
2. Click "Environment Variables"
3. Add new variable:
   - **Name:** `DATABASE_URL`
   - **Value:** Your NEON connection string
4. Add to all environments (Development, Preview, Production)

## 3️⃣ Verify Connection

Run the health check:
```bash
# Local
curl http://localhost:5173/api/health?init=true

# Or visit in browser after deployment
https://your-project.vercel.app/api/health?init=true
```

Should return:
```json
{
  "ok": true,
  "db": "ok",
  "timestamp": "2024-02-04T..."
}
```

## 4️⃣ Use in Your Code

### Simple Example
```typescript
// api/get-users.ts
import { getUsers } from './_db';

export default async function handler(req, res) {
  const users = await getUsers();
  res.json(users);
}
```

### With Frontend
```typescript
// components/UserList.tsx
import { useEffect, useState } from 'react';

export function UserList() {
  const [users, setUsers] = useState([]);
  
  useEffect(() => {
    fetch('/api/get-users')
      .then(r => r.json())
      .then(setUsers);
  }, []);
  
  return <div>{users.map(u => <div key={u.id}>{u.name}</div>)}</div>;
}
```

## 📚 Full Documentation

Read these files for complete documentation:
- `DATABASE_SETUP.md` - Complete guide with troubleshooting
- `NEON_SETUP.md` - Quick reference
- `SETUP_COMPLETE.md` - What was implemented

## ✨ Database Functions Included

✅ Users management
✅ Messages & chat history
✅ Notifications system
✅ Document storage
✅ Feedback/ratings
✅ Audit logging
✅ All with proper indexing for performance

## 🆘 Common Issues

| Problem | Solution |
|---------|----------|
| `DATABASE_URL is not set` | Check `.env.local` and restart server |
| Connection timeout | Verify NEON project is active |
| Tables not created | Call `/api/health?init=true` |
| 500 errors | Check Vercel logs and DATABASE_URL |

## 🎯 You're Ready!

Your database is fully configured. Start using it in your API handlers!

Questions? Check:
- `DATABASE_SETUP.md` - Full documentation
- `api/EXAMPLES.ts` - Code examples
- NEON docs: https://neon.tech/docs
