# TIASAS Monorepo

This monorepo contains the TIASAS umbrella and the first app: Market Desk.

Stack: Next.js (App Router), TypeScript, Tailwind, shadcn-style UI, NextAuth (Google), Prisma/Postgres, Zod, Recharts, Vitest.

## Quickstart

1) Prereqs
- Node 18+
- pnpm 9+
- A Postgres database (Supabase recommended for dev)

2) Setup

```
pnpm i
cp apps/web/.env.example apps/web/.env
# Fill in env vars for DB and Google OAuth
pnpm prisma:generate
pnpm prisma:migrate
pnpm seed
pnpm dev
```

Local dev boots the site at `http://localhost:13000`.

## Deployment
- Vercel for the Next.js app (`apps/web`)
- Supabase Postgres for the database
- Set all environment variables from `.env.example` in your environment provider

### AI Provider (OpenAI-compatible)
- Add to `apps/web/.env` (or your deployment env):
```
OPENAI_BASE_URL=https://api.openai.com/v1   # or your local OpenAI-compatible server URL
OPENAI_API_KEY=sk-...                        # required
OPENAI_MODEL=gpt-4o-mini                     # any model your provider supports
```
- The code uses a lightweight provider wrapper at `apps/web/lib/ai/provider.ts` so you can later point to a local LLM (e.g., vLLM/LM Studio/OpenRouter-compatible) by changing `OPENAI_BASE_URL` and `OPENAI_MODEL` only.

## Structure
- `apps/web` — Next.js app (landing + Market Desk)
- `packages/config` — shared ESLint/TS config

## Commands
- `pnpm dev` — runs the Next.js app in dev mode
- `pnpm build` — builds the app
- `pnpm test` — runs Vitest tests
- `pnpm prisma:migrate` — runs Prisma migrations (interactive in dev)
- `pnpm seed` — seeds initial data (org, user placeholder, sample month)

## Notes
- Multi-tenant by `orgId` on all domain rows; authorization enforced in middleware and API handlers using session + active org logic.
- v0.1 ships with a paper broker adapter and analysis placeholder only; real integrations are not included.
- UI uses minimal shadcn-like primitives vendored under `components/ui` to avoid requiring a codegen step.

## Branding
- Place your logo file at `apps/web/public/tiasas-logo.png`.
- It is referenced by the `Logo` component (`apps/web/components/logo.tsx`) and used on the landing page, sign-in view, and the app sidebar.

## Developer Runbook (local)
- Create app (shown for reference; already scaffolded here):
  - `pnpm create next-app apps/web --ts --eslint --tailwind --app --src-dir --import-alias @/*`
- Install deps: `pnpm i`
- Configure Tailwind: already set in `apps/web/tailwind.config.ts` and `app/globals.css`
- Prisma + Postgres: define schema `apps/web/prisma/schema.prisma`
  - Generate: `pnpm prisma:generate`
  - Migrate: `pnpm prisma:migrate`
- NextAuth (Google): set env in `apps/web/.env` and start dev
  - Callback URL: `http://localhost:13000/api/auth/callback/google`
- Seed: `pnpm seed`
- Dev: `pnpm dev`
