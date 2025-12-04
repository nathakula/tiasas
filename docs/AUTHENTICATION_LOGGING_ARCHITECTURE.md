# Authentication & Logging Architecture Documentation

**Application:** Tiasas Portfolio Tracker
**Framework:** Next.js 14 with App Router
**Last Updated:** December 4, 2025

---

## Table of Contents

1. [Authentication Architecture](#authentication-architecture)
2. [Adding Microsoft Authentication](#adding-microsoft-authentication)
3. [Logging Architecture](#logging-architecture)
4. [Replication Guide for New Apps](#replication-guide)

---

## Authentication Architecture

### 1. Core Framework

**NextAuth.js v4.24.7** (Auth.js) - Industry-standard authentication for Next.js

**Key Configuration Files:**
- `lib/auth.ts` - Central authentication configuration
- `app/api/auth/[...nextauth]/route.ts` - NextAuth API routes
- `middleware.ts` - Route protection middleware

### 2. Session Strategy

**JWT-based with Database Persistence**

```typescript
// lib/auth.ts
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: { prompt: "select_account" },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.uid = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.uid as string;
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      // Auto-provision organization on first sign-in
      const memberships = await prisma.membership.count({
        where: { userId: user.id }
      });
      if (memberships === 0) {
        const base = user.name?.split(" ")[0] || "Personal";
        const org = await prisma.org.create({
          data: { name: `${base}'s Workspace` }
        });
        await prisma.membership.create({
          data: { userId: user.id, orgId: org.id, role: "OWNER" }
        });
      }
    },
  },
};
```

### 3. Database Schema

**Core Tables:**

```prisma
// User - OAuth authenticated users
model User {
  id            String       @id @default(cuid())
  name          String?
  email         String?      @unique
  emailVerified DateTime?
  image         String?
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
  accounts      Account[]    // OAuth provider accounts
  sessions      Session[]    // Active sessions
  memberships   Membership[] // Organization memberships
}

// Account - OAuth provider details
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String  // "google", "microsoft", etc.
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

// Session - Active user sessions
model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// Multi-tenancy models
model Org {
  id          String       @id @default(cuid())
  name        String
  memberships Membership[]
  createdAt   DateTime     @default(now())
}

model Membership {
  id        String   @id @default(cuid())
  userId    String
  orgId     String
  role      Role     // OWNER, ADMIN, MEMBER, VIEWER
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  org       Org      @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@unique([userId, orgId])
}

enum Role {
  OWNER
  ADMIN
  MEMBER
  VIEWER
}
```

### 4. Route Protection

**Middleware Protection:**

```typescript
// middleware.ts
export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/app/:path*",      // All app routes
    "/api/:path*",      // All API routes
  ],
};
```

**API Route Protection Helpers:**

```typescript
// app/api/route-helpers.ts

// Basic auth + org context
export async function requireAuthAndOrg() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  // Get active org from cookie
  let orgId = (await cookies()).get("active_org")?.value;

  // Fallback to first membership
  if (!orgId) {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      include: { memberships: { take: 1 } }
    });
    orgId = user?.memberships[0]?.orgId;
  }

  if (!orgId) {
    return { error: NextResponse.json({ error: "No active org" }, { status: 400 }) };
  }

  return { session, orgId };
}

// Auth + org membership verification
export async function requireAuthOrgMembership() {
  const res = await requireAuthAndOrg();
  if ("error" in res) return res;

  const { session, orgId } = res;
  const user = await prisma.user.findUnique({
    where: { email: session.user!.email! }
  });

  if (!user) {
    return { error: NextResponse.json({ error: "User not found" }, { status: 401 }) };
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_orgId: { userId: user.id, orgId } }
  });

  if (!membership) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { session, orgId, user, membership };
}
```

**Usage in API Routes:**

```typescript
// app/api/journal/route.ts
export async function GET(req: Request) {
  const auth = await requireAuthOrgMembership();
  if ("error" in auth) return auth.error;

  const { orgId } = auth;
  // Protected logic...
}
```

### 5. Client-Side Components

**Sign-in Page:**

```typescript
// app/signin/page.tsx
"use client";
import { signIn } from "next-auth/react";

export default function SignIn() {
  return (
    <button onClick={() => signIn("google", { callbackUrl: "/market-desk" })}>
      <svg>Google Icon</svg>
      Continue with Google
    </button>
  );
}
```

**Sign-out Component:**

```typescript
// components/user-menu.tsx
"use client";
import { signOut } from "next-auth/react";

export function UserMenu({ name }: { name?: string | null }) {
  return (
    <button onClick={() => signOut({ callbackUrl: "/" })}>
      Sign out
    </button>
  );
}
```

### 6. Environment Variables

```bash
# .env
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
NEXTAUTH_URL="http://localhost:13000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### 7. Security Features

- ✅ **JWT Token Signing** - Secure token generation with NEXTAUTH_SECRET
- ✅ **httpOnly Cookies** - Prevents XSS attacks
- ✅ **CSRF Protection** - Built into NextAuth
- ✅ **Rate Limiting** - Per-user rate limiting on sensitive endpoints
- ✅ **Audit Logging** - Complete audit trail of user actions
- ✅ **Role-Based Access** - Four-tier role system for future RBAC
- ✅ **Cascade Deletion** - Clean removal of related records
- ✅ **Email Uniqueness** - Prevents duplicate accounts

---

## Adding Microsoft Authentication

### Step 1: Install Dependencies (Already Included)

NextAuth.js already includes Microsoft provider - no additional packages needed.

### Step 2: Register Application in Azure

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations** → **New registration**
3. Configure:
   - **Name**: Your App Name
   - **Supported account types**: Multitenant (or single tenant)
   - **Redirect URI**:
     - Type: Web
     - URI: `https://yourdomain.com/api/auth/callback/azure-ad`
4. After registration:
   - Copy **Application (client) ID**
   - Go to **Certificates & secrets** → **New client secret**
   - Copy the **secret value** (shown once)

### Step 3: Update Environment Variables

```bash
# .env
# Existing Google credentials
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# Add Microsoft credentials
AZURE_AD_CLIENT_ID="your-application-client-id"
AZURE_AD_CLIENT_SECRET="your-client-secret"
AZURE_AD_TENANT_ID="common"  # Use "common" for multitenant, or specific tenant ID
```

### Step 4: Update Authentication Configuration

```typescript
// lib/auth.ts
import GoogleProvider from "next-auth/providers/google";
import AzureADProvider from "next-auth/providers/azure-ad";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: { prompt: "select_account" },
      },
    }),
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
      authorization: {
        params: { prompt: "select_account" },
      },
      // Optional: Enable account linking if same email
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  // ... rest of configuration stays the same
};
```

### Step 5: Update Sign-in Page UI

```typescript
// app/signin/page.tsx
"use client";
import { signIn } from "next-auth/react";

export default function SignIn() {
  return (
    <div className="flex flex-col gap-4">
      {/* Google Sign-in */}
      <button
        onClick={() => signIn("google", { callbackUrl: "/market-desk" })}
        className="btn-google"
      >
        <GoogleIcon />
        Continue with Google
      </button>

      {/* Microsoft Sign-in */}
      <button
        onClick={() => signIn("azure-ad", { callbackUrl: "/market-desk" })}
        className="btn-microsoft"
      >
        <MicrosoftIcon />
        Continue with Microsoft
      </button>
    </div>
  );
}
```

### Step 6: Update Azure Redirect URIs

Add these redirect URIs in Azure App Registration:
- Development: `http://localhost:13000/api/auth/callback/azure-ad`
- Production: `https://yourdomain.com/api/auth/callback/azure-ad`

### Step 7: Test the Integration

1. Start your app
2. Navigate to sign-in page
3. Click "Continue with Microsoft"
4. Authenticate with Microsoft account
5. User should be created/linked automatically
6. Organization auto-provisioned on first sign-in

### Important Notes

**Account Linking:**
- If `allowDangerousEmailAccountLinking: true`, users with same email can sign in with either Google or Microsoft
- Without this, users must stick to the provider they first used
- Production apps should carefully consider this setting for security

**Provider Priority:**
- Users see both buttons - they choose their preferred provider
- No default provider - equal prominence

**Database Impact:**
- **NO schema changes needed** - same User, Account, Session tables work for both
- Provider stored in `Account.provider` field ("google" or "azure-ad")
- Each provider creates a separate Account record linked to same User (if email matches)

**Multi-Provider User Example:**

```typescript
// User can have multiple provider accounts
User {
  id: "user123",
  email: "john@example.com",
  accounts: [
    { provider: "google", providerAccountId: "google-id-123" },
    { provider: "azure-ad", providerAccountId: "microsoft-id-456" }
  ]
}
```

---

## Logging Architecture

### 1. Current Implementation

**Type:** Custom logging with database persistence

**Components:**
- Native Node.js `console` methods (console.log, console.error)
- Prisma database models for structured logging
- File-based logs in `apps/web/logs/`
- Custom sensitive data masking utilities

### 2. Database Logging Models

**AuditLog - User Action Tracking:**

```prisma
model AuditLog {
  id        String   @id @default(cuid())
  orgId     String
  userId    String?
  action    String   // CREATE, UPDATE, DELETE
  entity    String   // Entity type (Connection, Journal, etc.)
  entityId  String   // Reference to affected entity
  before    Json?    // State before change
  after     Json?    // State after change
  at        DateTime @default(now())
  org       Org      @relation(fields: [orgId], references: [id], onDelete: Cascade)
  user      User?    @relation(fields: [userId], references: [id])

  @@index([orgId])
  @@index([userId])
  @@index([at])
}
```

**Usage Example:**

```typescript
// After creating/updating an entity
await prisma.auditLog.create({
  data: {
    orgId,
    userId: user.id,
    action: "CREATE",
    entity: "Connection",
    entityId: connection.id,
    before: Prisma.DbNull,
    after: JSON.parse(JSON.stringify(connection))
  }
});
```

**SyncLog - Background Job Tracking:**

```prisma
model SyncLog {
  id           String            @id @default(cuid())
  connectionId String?
  accountId    String?
  startedAt    DateTime
  finishedAt   DateTime?
  result       String?           // SUCCESS, ERROR, RUNNING
  message      String?
  connection   BrokerConnection? @relation(fields: [connectionId], references: [id])
  account      BrokerAccount?    @relation(fields: [accountId], references: [id])

  @@index([connectionId])
  @@index([accountId])
  @@index([startedAt])
}
```

**Usage Example:**

```typescript
// Start sync
const syncLog = await prisma.syncLog.create({
  data: {
    connectionId,
    startedAt: new Date(),
    result: "RUNNING",
  },
});

// Update on completion
await prisma.syncLog.update({
  where: { id: syncLog.id },
  data: {
    finishedAt: new Date(),
    result: "SUCCESS",
    message: `Synced ${accounts.length} accounts`,
  },
});
```

### 3. Structured Console Logging

**Pattern: Context-Tagged Logs**

```typescript
// Good practice - tagged logs
console.log('[Calendar Debug] Date objects:', { today, start, end });
console.log('[API] Processing request:', { userId, orgId, action });
console.error('[Sync Error]', { accountId, error: error.message });
```

### 4. Sensitive Data Masking

```typescript
// lib/brokerbridge/encryption.ts

export function redactSensitiveFields(
  obj: Record<string, unknown>,
  sensitiveKeys: string[] = [
    "password", "token", "secret", "key", "auth",
    "apiKey", "accessToken", "refreshToken"
  ]
): Record<string, unknown> {
  const redacted: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    if (sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive))) {
      redacted[key] = maskCredential(String(value));
    } else if (typeof value === "object" && value !== null) {
      redacted[key] = redactSensitiveFields(value as Record<string, unknown>, sensitiveKeys);
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}

export function maskCredential(value: string, visibleChars: number = 4): string {
  if (value.length <= visibleChars) return "***";
  return "***" + value.slice(-visibleChars);
}
```

**Usage:**

```typescript
console.error("Sync error:", redactSensitiveFields({
  accountId,
  credentials: { apiKey: "secret123", token: "abc456" },
  error
}));
// Output: { accountId: "123", credentials: { apiKey: "***t123", token: "***c456" }, error: ... }
```

### 5. Error Classification

```typescript
// lib/brokerbridge/types.ts

export type AdapterErrorCode =
  | "AUTH_FAILED"
  | "RATE_LIMITED"
  | "INVALID_ACCOUNT"
  | "NETWORK_ERROR"
  | "PARSE_ERROR"
  | "UNKNOWN_ERROR";

export class AdapterError extends Error {
  constructor(
    public code: AdapterErrorCode,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AdapterError";
  }

  static authFailed(message: string): AdapterError {
    return new AdapterError("AUTH_FAILED", message);
  }

  static rateLimited(message: string, retryAfter?: number): AdapterError {
    return new AdapterError("RATE_LIMITED", message, { retryAfter });
  }

  // ... other factory methods
}
```

**Error Handling Pattern:**

```typescript
try {
  // Operation
} catch (error) {
  console.error("Operation failed:", redactSensitiveFields({ error }));

  if (error instanceof AdapterError) {
    return NextResponse.json({
      error: error.message,
      code: error.code,
      details: error.details,
    }, { status: getStatusForCode(error.code) });
  }

  return NextResponse.json({
    error: "Internal server error",
  }, { status: 500 });
}
```

### 6. Rate Limiting

```typescript
// lib/ratelimit.ts

const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, max = 60, windowMs = 60_000) {
  const now = Date.now();
  const rec = buckets.get(key);

  if (!rec || rec.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (rec.count >= max) {
    return { ok: false, retryAfter: rec.resetAt - now };
  }

  rec.count++;
  return { ok: true };
}
```

**Usage in API Routes:**

```typescript
const rl = rateLimit(`journal:${session.user.email}`, 60, 60_000);
if (!rl.ok) {
  return NextResponse.json({
    error: "Rate limited",
    retryAfter: rl.retryAfter
  }, { status: 429 });
}
```

### 7. Log Files

**Location:** `apps/web/logs/`

- `startup.log` - Application startup messages
- `app.log` - General application logs
- `error.log` - Error stack traces and exceptions

**Created by:** Task Scheduler batch wrapper (`ops-scripts/start-web-app.bat`)

### 8. Recommendations for Production

**Current Gaps:**
- ❌ No external error monitoring (Sentry, Rollbar)
- ❌ No log rotation policy
- ❌ No centralized log aggregation
- ❌ No request/response logging middleware
- ❌ No performance metrics

**Recommended Additions:**

1. **Add Sentry for Error Tracking:**

```typescript
// lib/sentry.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  beforeSend(event, hint) {
    // Redact sensitive data before sending
    return redactSensitiveFields(event);
  },
});
```

2. **Add Request Logging Middleware:**

```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const start = Date.now();
  const response = await NextResponse.next();
  const duration = Date.now() - start;

  console.log('[Request]', {
    method: request.method,
    path: request.nextUrl.pathname,
    status: response.status,
    duration: `${duration}ms`,
    userAgent: request.headers.get('user-agent'),
  });

  return response;
}
```

3. **Implement Log Rotation:**

Use `pino` with `pino-roll` or OS-level `logrotate`:

```bash
# /etc/logrotate.d/tiasas
/path/to/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
}
```

---

## Replication Guide for New Apps

### Quick Start Checklist

#### 1. Install Dependencies

```bash
npm install next-auth@4.24.7 @next-auth/prisma-adapter
npm install @prisma/client
npm install -D prisma
```

#### 2. Copy Core Files

```
Your New App/
├── lib/
│   ├── auth.ts                    # NextAuth configuration
│   ├── ratelimit.ts              # Rate limiting
│   └── brokerbridge/
│       └── encryption.ts          # Sensitive data utilities
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   └── route-helpers.ts      # Auth helpers
│   ├── signin/page.tsx           # Sign-in UI
│   └── middleware.ts             # Route protection
├── prisma/
│   └── schema.prisma             # Database schema
└── .env.example                  # Environment template
```

#### 3. Configure Prisma Schema

Copy these models:
- User
- Account
- Session
- VerificationToken
- Org
- Membership
- AuditLog
- SyncLog (if needed)

#### 4. Set Up OAuth Providers

**Google:**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials
3. Add redirect URI: `https://yourdomain.com/api/auth/callback/google`

**Microsoft (optional):**
1. Go to [Azure Portal](https://portal.azure.com)
2. Register app in Azure AD
3. Add redirect URI: `https://yourdomain.com/api/auth/callback/azure-ad`

#### 5. Environment Variables

```bash
# Database
DATABASE_URL="postgresql://..."

# NextAuth
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"

# Google OAuth
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# Microsoft OAuth (optional)
AZURE_AD_CLIENT_ID="..."
AZURE_AD_CLIENT_SECRET="..."
AZURE_AD_TENANT_ID="common"
```

#### 6. Run Migrations

```bash
npx prisma migrate dev --name init
npx prisma generate
```

#### 7. Test Authentication

1. Start dev server: `npm run dev`
2. Navigate to `/signin`
3. Sign in with Google/Microsoft
4. Verify user created in database
5. Test protected routes

### Key Customization Points

1. **Auto-Provisioning Logic** - Customize in `lib/auth.ts` events.signIn
2. **Role System** - Adjust Role enum and permission checks
3. **Org Structure** - Modify for single-tenant or different multi-tenancy
4. **Audit Logging** - Add/remove fields based on compliance needs
5. **Rate Limiting** - Adjust limits per endpoint

---

## Architecture Diagrams

### Authentication Flow

```
┌─────────┐
│  User   │
└────┬────┘
     │
     │ 1. Visit /signin
     ▼
┌─────────────────┐
│  Sign-in Page   │
│  - Google btn   │
│  - Microsoft btn│
└────┬────────────┘
     │
     │ 2. Click provider button
     ▼
┌──────────────────┐
│ OAuth Provider   │
│ (Google/MS)      │
└────┬─────────────┘
     │
     │ 3. Authenticate
     ▼
┌──────────────────┐
│  NextAuth.js     │
│  - Create User   │
│  - Create Account│
│  - Auto-provision│
│    Organization  │
└────┬─────────────┘
     │
     │ 4. Issue JWT token
     ▼
┌──────────────────┐
│  Protected App   │
│  /market-desk    │
└──────────────────┘
```

### API Request Flow

```
API Request
    ↓
Middleware (NextAuth)
    ↓
Session Valid? ──No──> 401 Unauthorized
    ↓ Yes
Route Handler
    ↓
requireAuthOrgMembership()
    ↓
Org Member? ──No──> 403 Forbidden
    ↓ Yes
Rate Limit Check
    ↓
Exceeded? ──Yes──> 429 Rate Limited
    ↓ No
Business Logic
    ↓
Audit Log (if mutation)
    ↓
Response
```

---

## Security Best Practices

1. ✅ **Use JWT with short expiration** (default 30 days, can reduce)
2. ✅ **Store secrets in environment variables** never in code
3. ✅ **Enable CSRF protection** (built into NextAuth)
4. ✅ **Use httpOnly cookies** for session tokens
5. ✅ **Implement rate limiting** on all mutations
6. ✅ **Log all state changes** in AuditLog
7. ✅ **Mask sensitive data** in logs
8. ✅ **Use HTTPS in production** always
9. ✅ **Validate org membership** on every API call
10. ✅ **Implement role-based access** for future features

---

## Support & Resources

- **NextAuth.js Docs**: https://next-auth.js.org
- **Prisma Docs**: https://www.prisma.io/docs
- **Google OAuth Setup**: https://console.cloud.google.com
- **Microsoft OAuth Setup**: https://portal.azure.com
- **Rate Limiting Guide**: https://github.com/vercel/next.js/discussions/46225

---

**Document Version:** 1.0
**Author:** Tiasas Development Team
**Contact:** For questions, see project README.md
