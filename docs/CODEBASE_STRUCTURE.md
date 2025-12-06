# Tiasas Codebase Structure & Architecture

**Last Updated:** December 4, 2025
**Version:** 1.0

---

## Quick Reference

- **Framework:** Next.js 14 App Router + TypeScript
- **Database:** PostgreSQL with Prisma ORM
- **Auth:** NextAuth.js (Google OAuth + Credentials)
- **Styling:** Tailwind CSS (custom gold theme)
- **Package Manager:** pnpm (workspaces monorepo)
- **Dev Server:** http://localhost:13000

---

## Project Structure

```
tiasas/
├── apps/
│   └── web/                          # Main Next.js application
│       ├── app/                      # Next.js App Router
│       │   ├── (app)/               # Authenticated app layout
│       │   │   ├── layout.tsx       # App shell with sidebar
│       │   │   ├── market-desk/     # Core features
│       │   │   └── settings/        # User/org settings
│       │   ├── api/                 # API routes
│       │   ├── signin/              # Login page
│       │   └── register/            # Registration
│       ├── components/              # Shared React components
│       ├── lib/                     # Utilities & config
│       ├── middleware.ts            # NextAuth route protection
│       └── prisma/                  # Database schema
├── packages/
│   ├── core/                        # Shared business logic
│   │   └── src/
│   │       ├── brokerbridge/       # Multi-broker aggregation
│   │       ├── ai/                 # LLM integrations
│   │       ├── market/             # Market data utilities
│   │       └── brokers/            # Broker interfaces
│   ├── database/                    # Prisma client package
│   └── config/                      # Shared build configs
├── docs/                            # Documentation
├── ops-scripts/                     # Operational scripts
└── archive/                         # Legacy code
```

---

## Core Application Features

### 1. Market Desk (`/market-desk`)

| Feature | Route | Description |
|---------|-------|-------------|
| **Dashboard** | `/market-desk` | YTD P&L, monthly stats, NAV summary |
| **Positions** | `/market-desk/positions` | Aggregated portfolio across all brokers |
| **Journal** | `/market-desk/journal` | Trading notes with tags & bulk upload |
| **Calendar** | `/market-desk/calendar` | Event/date visualization |
| **Charts** | `/market-desk/charts` | Performance visualization (Recharts) |
| **AI Analysis** | `/market-desk/ai` | LLM-powered insights (quick scan, deep dive, macro) |
| **Connections** | `/market-desk/connections` | Broker connection management |
| **Help** | `/market-desk/help` | User documentation |

### 2. Authentication

| Route | Purpose |
|-------|---------|
| `/signin` | Login (Google OAuth or email/password) |
| `/register` | Email/password registration |
| `/api/auth/[...nextauth]` | NextAuth handler |

---

## API Routes Organization

### Authentication
- `POST /api/auth/register` - Email/password signup

### AI Features
- `POST /api/ai/quick-scan` - Quick technical analysis
- `POST /api/ai/deep-dive` - Detailed fundamental analysis
- `POST /api/ai/macro` - Macro economic insights
- `POST /api/ai/notes-to-actions` - Parse journal to action items

### BrokerBridge (Position Aggregation)
- `GET /api/brokerbridge/positions` - All positions
- `GET /api/brokerbridge/positions/[id]` - Single instrument
- `GET/POST /api/brokerbridge/connections` - Broker connections
- `DELETE /api/brokerbridge/connections/[id]` - Remove connection
- `POST /api/brokerbridge/connections/[id]/sync` - Trigger sync
- `POST /api/brokerbridge/import` - CSV/OFX import
- `POST /api/brokerbridge/import/preview` - Preview before import

### E*TRADE Integration
- `GET /api/brokerbridge/etrade/auth` - Initiate OAuth
- `GET /api/brokerbridge/etrade/callback` - OAuth callback
- `POST /api/brokerbridge/etrade/verify` - Manual verification

### Journal & Performance
- `GET/POST /api/journal` - Journal entries
- `GET/PUT/DELETE /api/journal/[id]` - Single entry
- `POST /api/journal/bulk` - Bulk import
- `GET/POST /api/pnl/daily` - Daily P&L
- `GET /api/pnl/monthly` - Monthly P&L
- `GET/POST /api/nav/monthly` - Monthly NAV

### Market Data
- `GET /api/market/snapshot` - Real-time prices (Yahoo Finance)
- `GET /api/market-calendar` - Trading calendar
- `GET /api/benchmarks` - Benchmark tracking

### Utilities
- `GET /api/me` - Current user info
- `GET/PUT /api/org` - Organization details
- `GET /api/export/csv` - CSV export

---

## Database Schema Overview

### Core Models

**Authentication & Multi-Tenancy:**
```typescript
User          // Users (email/password or OAuth)
Account       // OAuth provider accounts (Google)
Session       // Active sessions
Org           // Organizations (workspaces)
Membership    // User-Org relationships (with Role)
```

**Roles:** `OWNER`, `ADMIN`, `MEMBER`, `VIEWER`

**BrokerBridge (Position Aggregation):**
```typescript
BrokerConnection   // Broker auth & credentials
BrokerAccount      // Accounts within a connection
Instrument         // Securities (stocks, ETFs, options)
OptionDetail       // Option-specific data
PositionSnapshot   // Point-in-time account state
PositionLot        // Individual position holdings
SyncLog            // Sync job tracking
```

**Journal & Performance:**
```typescript
JournalEntry      // Trading notes with tags
DailyPnl          // Daily P&L tracking
MonthlyNavEom     // Month-end NAV
Trade             // Trade records (legacy)
```

**Audit & Logging:**
```typescript
AuditLog          // All entity changes (before/after)
BulkImport        // Bulk operation tracking
```

---

## Key Architectural Patterns

### 1. Adapter Pattern (BrokerBridge)

**Purpose:** Normalize different broker APIs into a unified interface

```typescript
// packages/core/src/brokerbridge/types.ts
export interface BrokerAdapter {
  listAccounts(): Promise<NormalizedAccount[]>;
  fetchPositions(accountId: string): Promise<NormalizedSnapshot>;
  testConnection(): Promise<boolean>;
}

// Implementations:
- CSVAdapter         // CSV/OFX file imports
- ETradeAdapter      // E*TRADE OAuth API
- (Future: Fidelity, Schwab, Robinhood, etc.)
```

### 2. Service Layer

**Purpose:** Encapsulate business logic separate from API routes

```typescript
// packages/core/src/brokerbridge/services/

connection-service.ts    // Manage broker connections
  - createConnection()
  - deleteConnection()
  - testConnection()

sync-service.ts         // Orchestrate position syncs
  - syncConnection()
  - syncAccount()
  - getSyncStatus()

positions-service.ts    // Query aggregated positions
  - getAggregatedPositions()
  - getPositionDetails()
  - getPortfolioSummary()
```

### 3. Route Protection

**Middleware:** NextAuth protects all `/app/*` and `/api/*` routes

**API Helpers:**
```typescript
// apps/web/app/api/route-helpers.ts

requireAuthAndOrg()          // Auth + org context
requireAuthOrgMembership()   // Auth + org + verify membership

// Usage in routes:
const auth = await requireAuthOrgMembership();
if ("error" in auth) return auth.error;
const { user, orgId, membership } = auth;
```

### 4. Encrypted Credential Storage

```typescript
// packages/core/src/brokerbridge/encryption.ts

encryptCredentials(data)    // AES-256-GCM encryption
decryptCredentials(encrypted)
maskCredential(value)       // Display-safe masking (***last4)
redactSensitiveFields(obj)  // Recursive redaction
```

**Encryption Details:**
- Algorithm: AES-256-GCM
- Key Derivation: PBKDF2 (100k iterations)
- Salt: Random 64 bytes per encryption
- Format: `salt.iv.tag.ciphertext` (base64)

### 5. Audit Trail

**Every mutation logged:**
```typescript
await prisma.auditLog.create({
  data: {
    orgId,
    userId,
    action: "CREATE",        // CREATE, UPDATE, DELETE
    entity: "JournalEntry",  // Entity type
    entityId: entry.id,
    before: Prisma.DbNull,   // State before
    after: entry,            // State after
  }
});
```

### 6. Rate Limiting

```typescript
// packages/core/src/ratelimit.ts
const rl = rateLimit(`journal:${user.email}`, 60, 60_000);
if (!rl.ok) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
```

**Limits:** 60 requests per minute per user per endpoint (customizable)

---

## Component Organization

### Shared Components (`/components`)

```typescript
animated-stat-card.tsx    // Animated number display
logo.tsx                  // TIASAS logo
month-banner.tsx          // Monthly summary header
org-selector.tsx          // Organization switcher
skeleton.tsx              // Loading skeletons
theme-toggle.tsx          // Dark/light mode
toast.tsx                 // Notifications
user-menu.tsx             // User dropdown
```

### Page Components

**Located in:** `/app/(app)/market-desk/[feature]/`

- `page.tsx` - Server component (data fetching)
- `*_client.tsx` - Client components (interactivity)

**Example:**
```typescript
journal/
├── page.tsx                    // Server: fetch journal entries
├── journal_client.tsx          // Client: editing interface
├── journal_summary_client.tsx  // Client: statistics
└── daily_pnl_form.tsx         // Client: P&L form
```

---

## Data Flow Examples

### 1. Journal Entry Creation

```
User enters note in journal_client.tsx
  ↓
POST /api/journal { date, text, tags }
  ↓
requireAuthOrgMembership() → { user, orgId }
  ↓
Rate limit check (60/min)
  ↓
prisma.journalEntry.create({ orgId, userId, ... })
  ↓
prisma.auditLog.create({ before: null, after: entry })
  ↓
Response: 201 Created
```

### 2. CSV Import Flow

```
User uploads CSV file
  ↓
POST /api/brokerbridge/import/preview
  - parseCSVContent()
  - inferColumnMapping()
  - Return preview with asset classes
  ↓
User confirms mapping
  ↓
POST /api/brokerbridge/import
  - Create BrokerConnection (broker: CSV_IMPORT)
  - Get CSVAdapter instance
  - adapter.fetchPositions() → NormalizedSnapshot
  - Create Instrument records (if new)
  - Create PositionSnapshot + PositionLots
  - Log to SyncLog
  ↓
Response: snapshot ID
```

### 3. Broker Position Sync

```
User clicks "Sync" on connection
  ↓
POST /api/brokerbridge/connections/[id]/sync
  ↓
Get BrokerConnection (with encrypted auth)
  ↓
getAdapter(broker) → ETradeAdapter instance
  ↓
decryptCredentials()
  ↓
adapter.listAccounts() → OAuth API call
  ↓
For each account:
  - adapter.fetchPositions()
  - Normalize instruments
  - Create/update PositionSnapshot
  - Create PositionLots
  ↓
Update BrokerConnection.lastSyncedAt
  ↓
Create SyncLog (SUCCESS/ERROR)
  ↓
Response: { accounts: 3, lots: 47 }
```

### 4. AI Analysis Request

```
User enters ticker "AAPL" on AI page
  ↓
POST /api/ai/quick-scan { ticker: "AAPL" }
  ↓
requireAuthOrgMembership()
  ↓
chatJson<QuickScanResult>(systemPrompt, userPrompt)
  - Call OpenAI API in JSON mode
  - Parse structured response
  ↓
Response: {
  trend, momentum, supportLevels,
  resistanceLevels, keyIndicators
}
```

---

## Configuration Files

### Environment Variables (`.env`)

```bash
# Database
DATABASE_URL="postgresql://user:pass@host:5432/tiasas"

# NextAuth
NEXTAUTH_URL="http://localhost:13000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# OAuth Providers
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# AI/LLM
OPENAI_BASE_URL="https://api.openai.com/v1"
OPENAI_API_KEY="sk-..."
OPENAI_MODEL="gpt-4o-mini"

# Optional: E*TRADE
ETRADE_CONSUMER_KEY="..."
ETRADE_CONSUMER_SECRET="..."

# Optional: Encryption
BROKER_ENCRYPTION_KEY="32-char-min-key"
```

### Build Configuration

```typescript
// next.config.js
- TypeScript plugin
- Image optimization
- Experimental features

// tailwind.config.ts
- Custom gold theme (D4AF37)
- Dark mode (class-based)
- Custom typography

// tsconfig.json
- Strict mode
- Path aliases: @/*
- ES2021 target
```

---

## Development Workflow

### Setup

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm prisma:generate

# Run migrations
pnpm prisma:migrate

# Start dev server
pnpm dev

# Access app
http://localhost:13000
```

### Key Commands

```bash
pnpm dev                  # Dev server (port 13000)
pnpm build               # Production build
pnpm start               # Run production build
pnpm lint                # ESLint
pnpm test                # Vitest tests
pnpm seed                # Seed database
pnpm prisma:studio       # Prisma Studio GUI
```

### Adding New Features

**New Broker:**
1. Implement `BrokerAdapter` interface
2. Add to `packages/core/src/brokerbridge/adapters/`
3. Register in adapter factory
4. Add OAuth flow if needed

**New API Route:**
1. Create `app/api/[feature]/route.ts`
2. Use `requireAuthOrgMembership()` helper
3. Add rate limiting if mutation
4. Log to AuditLog for state changes

**New AI Feature:**
1. Define result type in `packages/core/src/ai/types.ts`
2. Add system prompt in `packages/core/src/ai/prompts.ts`
3. Create API route in `app/api/ai/[feature]/route.ts`
4. Use `chatJson<ResultType>()` helper

**New Page:**
1. Create `app/(app)/[feature]/page.tsx` (server component)
2. Create `app/(app)/[feature]/[feature]_client.tsx` (client interactivity)
3. Add to sidebar navigation in layout

---

## Security Considerations

1. ✅ **NextAuth Middleware** - All `/app/*` routes protected
2. ✅ **Org Membership Checks** - API routes verify membership
3. ✅ **Encrypted Credentials** - Broker auth encrypted at rest
4. ✅ **Audit Logging** - Complete trail of all changes
5. ✅ **Rate Limiting** - Prevent abuse
6. ✅ **HTTPS Only** - Production must use HTTPS
7. ✅ **SQL Injection Protection** - Prisma parameterized queries
8. ✅ **Secrets Management** - Environment variables only
9. ✅ **CSRF Protection** - Built into NextAuth
10. ✅ **httpOnly Cookies** - Session tokens secure

---

## Deployment

### Recommended Stack

- **App:** Vercel (optimized for Next.js)
- **Database:** Supabase, Neon, or Railway (PostgreSQL)
- **Environment:** Set all `.env` vars in platform

### Build Process

```bash
# Production build
pnpm build

# Run production server
pnpm start
```

### Required Environment Variables

All variables from `.env.example` must be set in production environment.

---

## Testing

### Framework
- **Vitest** with jsdom environment
- **Testing Library** for component testing

### Run Tests
```bash
pnpm test                # Run all tests
pnpm test:watch         # Watch mode
pnpm test:coverage      # Coverage report
```

### Test Location
```
apps/web/tests/
├── components/         # Component tests
├── api/               # API route tests
└── utils/             # Utility function tests
```

---

## Performance Optimizations

1. **API Route Caching:**
   - Journal: 2 min cache
   - NAV: 5 min cache
   - Market data: 1 min cache

2. **Database Indexes:**
   - All foreign keys indexed
   - Composite indexes on org+date queries
   - Symbol+assetClass for instruments

3. **React Query:**
   - Client-side caching
   - Background refetch
   - Optimistic updates

4. **Image Optimization:**
   - Next.js Image component
   - Automatic WebP conversion
   - Lazy loading

---

## Common Patterns

### API Route Template

```typescript
// app/api/[feature]/route.ts
import { requireAuthOrgMembership } from "../route-helpers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const auth = await requireAuthOrgMembership();
  if ("error" in auth) return auth.error;

  const { orgId } = auth;

  const data = await prisma.[model].findMany({
    where: { orgId },
  });

  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const auth = await requireAuthOrgMembership();
  if ("error" in auth) return auth.error;

  const { orgId, user } = auth;
  const body = await req.json();

  // Validate with Zod here if needed

  const created = await prisma.[model].create({
    data: { ...body, orgId },
  });

  await prisma.auditLog.create({
    data: {
      orgId,
      userId: user.id,
      action: "CREATE",
      entity: "[Model]",
      entityId: created.id,
      after: created,
    },
  });

  return NextResponse.json(created, { status: 201 });
}
```

### Client Component Template

```typescript
"use client";
import { useState, useEffect } from "react";

export function FeatureClient({ initialData }: { initialData: Data[] }) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);

  async function handleAction() {
    setLoading(true);
    try {
      const res = await fetch("/api/feature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ... }),
      });

      if (!res.ok) throw new Error("Failed");

      const newData = await res.json();
      setData([...data, newData]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* UI here */}
    </div>
  );
}
```

---

## Troubleshooting

### Common Issues

**Issue:** `Module not found: Can't resolve '@/...'`
**Fix:** Run `pnpm prisma:generate` to generate Prisma client

**Issue:** Database connection errors
**Fix:** Check `DATABASE_URL` in `.env`, ensure PostgreSQL is running

**Issue:** NextAuth errors
**Fix:** Verify `NEXTAUTH_SECRET` is set, check `NEXTAUTH_URL` matches your domain

**Issue:** Build fails on Vercel
**Fix:** Ensure all packages use same Next.js version, check `pnpm-lock.yaml` is committed

---

## Resources

- **Next.js Docs:** https://nextjs.org/docs
- **Prisma Docs:** https://www.prisma.io/docs
- **NextAuth Docs:** https://next-auth.js.org
- **Tailwind CSS:** https://tailwindcss.com
- **Recharts:** https://recharts.org

---

**Document Version:** 1.0
**Maintainer:** Tiasas Development Team
**Last Review:** December 4, 2025
