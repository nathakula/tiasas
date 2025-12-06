# TIASAS Monorepo

This monorepo contains the TIASAS umbrella and the first app: Market Desk.

**Stack:** Next.js (App Router), TypeScript, Tailwind, shadcn-style UI, NextAuth (Google + Credentials), Prisma/Postgres, Zod, Recharts, Vitest.

## Structure

*   `apps/web`: Next.js web application (Market Desk)
*   `packages/core`: Core business logic, market data adapters, and AI services
*   `packages/database`: Prisma schema, client, and database migrations

## Quickstart

### 1. Prerequisites
*   Node 18+
*   pnpm 9+
*   A Postgres database (Supabase recommended for dev)

### 2. Setup

```bash
# Install dependencies
pnpm i

# Configure Environment Variables
# Create .env in apps/web and packages/database (or share one)
cp apps/web/.env.example apps/web/.env

# Generate Prisma Client
pnpm --filter @tiasas/database generate

# Push Database Schema (Dev)
pnpm --filter @tiasas/database db:push

# Seed Initial Data
pnpm seed

# Start Development Server
pnpm dev
```

Local dev boots the site at `http://localhost:13000`.

## Authentication

Authentication is handled via NextAuth with two providers:
1.  **Google OAuth**: Requires `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
2.  **Email/Password**: Supports registration and login via standard credentials (bcrypt hashed).

## Deployment

*   **App**: `apps/web` (Vercel recommended)
*   **Database**: Postgres (Supabase/Neon)
*   Ensure all environment variables are set in your deployment environment.

### AI Environment Variables
Add to `apps/web/.env`:
```bash
OPENAI_BASE_URL=https://api.openai.com/v1   # or local compatible URL
OPENAI_API_KEY=sk-...                        # required
OPENAI_MODEL=gpt-4o-mini                     # or any supported model
```

## Commands

*   `pnpm dev`: Runs the web app in dev mode
*   `pnpm build`: Builds all packages and apps
*   `pnpm test`: Runs tests
*   `pnpm --filter @tiasas/database db:push`: Push schema changes to DB
*   `pnpm --filter @tiasas/database studio`: Open Prisma Studio

## Notes
*   Multi-tenant by `orgId`.
*   Includes `packages/core` for shared logic between potential future apps.
