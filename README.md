<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1LHtYkHX5k891A0edYmyTA3Y_sSJ65D8L

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install` (on Windows PowerShell, you may need `npm.cmd install`)
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev` (or `npm.cmd run dev`)

## Deploy to Vercel + Neon (Postgres)

1. Create a Neon Postgres project and copy the connection string.
2. In Vercel project settings add Environment Variables:
   - `GEMINI_API_KEY` — Gemini key for AI responses
   - `DATABASE_URL` — Neon Postgres connection string
3. Deploy to Vercel (static Vite build). API is served via Vercel Functions in `api/*`.

Health-check endpoint after deploy: `/api/health`

HH proxy endpoint (for vacancies): `/api/hh/vacancies`

## Demo accounts

- Admin: `admin@bolashak.kz`
- Student: `student@bolashak.kz`
- Faculty: `profi@bolashak.kz`

Password for all demo accounts: `password`

## Key features

- Multi-agent chat with voice input + TTS and image attachment
- Feedback on AI answers (thumb up/down) + latency tracking
- Documents (local knowledge base) + “use documents in chat” mode
- Notifications center + admin broadcast notifications
- Admin panel: analytics, user management, audit log, backup export/import
