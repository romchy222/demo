# Bolashak AI - University Agent Ecosystem

## Overview
This is a React + TypeScript application built with Vite, featuring an AI-powered university ecosystem for Bolashak University. The application integrates with Google Gemini AI and Neon Database.

## Tech Stack
- **Frontend**: React 19 with TypeScript
- **Build Tool**: Vite 6
- **UI Libraries**: Recharts (charts), React Router DOM (routing), React Markdown
- **AI Integration**: Google Gemini API (@google/genai)
- **Database**: Neon Database (PostgreSQL, serverless)

## Project Structure
```
/
├── App.tsx           # Main application component
├── index.tsx         # Application entry point
├── index.html        # HTML template
├── vite.config.ts    # Vite configuration
├── components/       # React components
├── services/         # Service layer for API calls
├── api/              # API handlers and database utilities
├── public/           # Static assets
├── constants.tsx     # Application constants
└── types.ts          # TypeScript type definitions
```

## Development
- **Dev Server**: `npm run dev` - Runs on port 5000
- **Build**: `npm run build`
- **Preview**: `npm run preview`

## Configuration
- Frontend runs on port 5000 with `host: '0.0.0.0'` and `allowedHosts: true` for Replit compatibility
- HH API proxy configured at `/api/hh` → `https://api.hh.ru`

## Environment Variables
- `GEMINI_API_KEY` or `API_KEY`: Google Gemini API key for AI features
- Database connection configured via Neon Database

## Recent Changes
- 2026-02-04: Initial Replit setup - configured Vite to use port 5000 with allowedHosts enabled
