# Fresh Context Brand Studio

AI-powered brand asset generation studio. Create on-brand images and videos using configurable shot types with reference images, system prompts, and style guides.

## Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────┐
│  React Frontend │────▶│   Supabase   │────▶│    n8n      │
│  (Vite + TW)    │     │  Auth / DB   │     │  Workflows  │
│  Hosted: Vercel │     │  Edge Fns    │     │  OpenAI/Veo │
└─────────────────┘     └──────────────┘     └─────────────┘
```

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# Fill in your Supabase URL + anon key and n8n webhook URL

# 3. Run the SQL migration
# Paste supabase/migrations/001_initial_schema.sql into Supabase SQL Editor

# 4. Enable Google OAuth in Supabase
# Dashboard → Authentication → Providers → Google → Enable

# 5. Start dev server
npm run dev
```

## Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Run the migration SQL in the SQL Editor
3. Create a storage bucket called `generation-assets` (set to public)
4. Enable Google OAuth provider under Authentication → Providers
5. Add your dev URL (`http://localhost:5173`) to the redirect allow list

## n8n Integration

The app calls two n8n webhook endpoints:

- **Image generation** — `POST /webhook/56d4f2e5-...` (synchronous, returns base64)
- **Video generation** — `POST /webhook/video-generate-v2` (async, uses callback)

Import the workflow JSON files into your n8n instance. Update `VITE_N8N_WEBHOOK_URL` in `.env`.

## Deployment (Vercel)

```bash
# Connect to GitHub and deploy
npx vercel --prod
```

Add the production URL to Supabase Auth redirect allow list.

## Development with Claude Code

```bash
cd ~/Fresh\ Context/brand-studio
claude  # opens Claude Code in this project
```
