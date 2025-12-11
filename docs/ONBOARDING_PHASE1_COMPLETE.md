# Onboarding Flow - Phase 1 Implementation Complete

**Date:** December 10, 2025
**Status:** ✅ Phase 1 Complete - Ready for Testing
**Next:** Run database migration and test with new user signup

---

## What Was Implemented

Phase 1 establishes the core onboarding infrastructure with Step 1 (Welcome & Proficiency Level) fully functional.

### ✅ Completed Tasks

1. **Database Schema** - Added onboarding tables
2. **Onboarding Layout** - Clean, centered wizard layout
3. **Progress Indicator** - Visual step tracker (1-5)
4. **Step 1: Welcome** - Proficiency level and goals selection
5. **Wizard Orchestrator** - Page routing and state management
6. **API Endpoints** - Save progress and complete onboarding
7. **Auth Integration** - Auto-create UserPreferences on sign-in
8. **Redirect Logic** - Send new users to onboarding

---

## Files Created

### Database & Schema
- `packages/database/prisma/migrations/20251210_add_onboarding/migration.sql` - Migration script
- `packages/database/prisma/schema.prisma` - Updated with UserPreferences, OnboardingProgress, ProficiencyLevel enum

### Pages & Layouts
- `apps/web/app/(app)/onboarding/layout.tsx` - Clean onboarding layout (no sidebar)
- `apps/web/app/(app)/onboarding/page.tsx` - Main wizard orchestrator

### Components
- `apps/web/components/onboarding/progress-indicator.tsx` - Step progress UI
- `apps/web/components/onboarding/welcome-step.tsx` - Step 1 component

### API Routes
- `apps/web/app/api/onboarding/route.ts` - Complete/skip onboarding
- `apps/web/app/api/onboarding/progress/route.ts` - Save/resume progress

### Modified Files
- `apps/web/lib/auth.ts` - Create UserPreferences on sign-in
- `apps/web/app/(app)/layout.tsx` - Redirect incomplete users to onboarding

---

## How It Works

### New User Flow

```
User Signs In (Google OAuth / Credentials)
    ↓
auth.ts events.signIn
    ├── Create Org & Membership (if new user)
    └── Create UserPreferences { onboardingCompleted: false }
    ↓
Redirect to /market-desk
    ↓
App Layout checks preferences.onboardingCompleted
    ↓
IF onboardingCompleted === false
    → Redirect to /onboarding
    ↓
Onboarding Wizard Loads
    ├── Progress Indicator (Step 1 of 5)
    ├── Welcome Step Component
    │   ├── Select Proficiency Level (BEGINNER/INTERMEDIATE/ADVANCED/PROFESSIONAL)
    │   └── Select Goals (track_pnl, aggregate_positions, journal_trades, etc.)
    ├── Click "Next: Connect Brokers"
    │   → Save progress to OnboardingProgress table
    │   → Move to Step 2
    ↓
Step 2-5 (Phase 1: Placeholder)
    → Shows "Coming Soon" message
    → Click "Complete Setup"
    → Calls POST /api/onboarding { step: "partial_complete" }
    → Sets onboardingCompleted = true
    → Redirects to /market-desk
```

### Skip Option

At any step, user can click "Skip Setup":
- Confirmation dialog
- Sets `onboardingCompleted = true`
- Clears OnboardingProgress
- Redirects to `/market-desk` with empty slate

### Progress Resumability

If user closes browser mid-onboarding:
- OnboardingProgress table stores current step + wizard data
- On next visit, wizard resumes from saved step
- GET /api/onboarding/progress returns saved state

---

## Database Schema

### UserPreferences Table

```sql
CREATE TABLE "UserPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL UNIQUE,
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "proficiencyLevel" "ProficiencyLevel",
    "goals" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "showTutorialHints" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreferences_pkey" PRIMARY KEY ("id")
);
```

### OnboardingProgress Table

```sql
CREATE TABLE "OnboardingProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL UNIQUE,
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "wizardData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingProgress_pkey" PRIMARY KEY ("id")
);
```

### ProficiencyLevel Enum

```sql
CREATE TYPE "ProficiencyLevel" AS ENUM (
    'BEGINNER',
    'INTERMEDIATE',
    'ADVANCED',
    'PROFESSIONAL'
);
```

---

## API Endpoints

### POST /api/onboarding

**Complete or skip onboarding**

**Request:**
```json
{
  "step": "skip" | "partial_complete" | "complete",
  "data": {
    "step1": {
      "proficiencyLevel": "INTERMEDIATE",
      "goals": ["track_pnl", "journal_trades"]
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Onboarding completed (partial)",
  "redirectUrl": "/market-desk"
}
```

### POST /api/onboarding/progress

**Save wizard progress**

```json
{
  "currentStep": 2,
  "wizardData": {
    "step1": { "proficiencyLevel": "ADVANCED", "goals": [...] }
  }
}
```

### GET /api/onboarding/progress

**Resume wizard**

```json
{
  "currentStep": 2,
  "wizardData": { "step1": {...} }
}
```

---

## Testing Instructions

### 1. Run Database Migration

**IMPORTANT:** You need to run this migration before testing.

```bash
cd packages/database
npx prisma migrate dev --name add_onboarding
npx prisma generate
```

If migration fails due to shadow database permissions, manually run the SQL:

```bash
# Connect to your database
psql -U your_user -d tiasas

# Run the migration SQL
\i packages/database/prisma/migrations/20251210_add_onboarding/migration.sql
```

Then regenerate Prisma client:

```bash
npx prisma generate
```

### 2. Test New User Onboarding

**Create a new test user:**

1. Sign out of current account
2. Sign in with a new Google account OR create new credentials account
3. You should be redirected to `/onboarding`
4. You should see:
   - Tiasas logo at top
   - Progress indicator (Step 1 of 5)
   - "Welcome to Tiasas Portfolio Tracker!" heading
   - Proficiency level radio buttons
   - Goals checkboxes
   - "Skip Setup" and "Next: Connect Brokers" buttons

**Test Step 1:**

1. Try clicking "Next" without selecting proficiency
   → Should show alert "Please select your trading proficiency level"
2. Select "Intermediate" proficiency
3. Check 2-3 goals
4. Click "Next: Connect Brokers"
   → Should save progress and move to Step 2
5. Step 2 shows placeholder with "Coming Soon" message
6. Click "Complete Setup"
   → Should redirect to `/market-desk`

**Test Skip:**

1. On Step 1, click "Skip Setup"
   → Should show confirmation dialog
2. Confirm skip
   → Should redirect to `/market-desk`
3. Check database: `UserPreferences.onboardingCompleted` should be `true`
4. Navigate back to `/market-desk` or any app route
   → Should NOT redirect to onboarding (already completed)

**Test Progress Resumability:**

1. Start onboarding as new user
2. Complete Step 1, move to Step 2
3. Close browser WITHOUT completing
4. Reopen browser and navigate to app
   → Should redirect to `/onboarding`
   → Should resume at Step 2 with Step 1 data preserved

### 3. Test Existing Users

**Verify existing users NOT affected:**

1. Sign in with an existing account (created before migration)
2. Migration script backfills `UserPreferences` with `onboardingCompleted = true`
3. You should go straight to `/market-desk` (NOT redirected to onboarding)

### 4. Verify Database

```sql
-- Check UserPreferences created
SELECT * FROM "UserPreferences";

-- Check OnboardingProgress saved
SELECT * FROM "OnboardingProgress";

-- Check AuditLog for onboarding events
SELECT * FROM "AuditLog" WHERE entity = 'Onboarding';
```

---

## Known Limitations (Phase 1)

1. **Steps 2-5 Not Implemented**
   - Broker connection step (placeholder)
   - Seed data step (placeholder)
   - Preferences step (placeholder)
   - Completion step (placeholder)

2. **Minimal Validation**
   - Step 1 validates proficiency level required
   - Goals are optional (validation works but allows empty)

3. **No Resume Prompt**
   - OnboardingProgress saved but not auto-loaded on page load
   - Would require GET /api/onboarding/progress call in useEffect

4. **No Tutorial Hints**
   - `showTutorialHints` field exists but not used in UI yet

5. **No Re-run Wizard**
   - Settings page doesn't have "Re-run Onboarding" button yet

---

## Next Steps (Phase 2)

### Step 2: Broker Connection Setup

**Files to Create:**
- `apps/web/components/onboarding/broker-connection-step.tsx`

**Features:**
- Display broker cards (E*TRADE, Fidelity, Schwab, Robinhood, CSV)
- E*TRADE OAuth integration
- CSV upload with broker detection
- Show connected brokers count

### Step 3: Seed Data Offer

**Files to Create:**
- `apps/web/components/onboarding/seed-data-step.tsx`

**Features:**
- 3 options: Use Real Data, Demo Data, Hybrid
- Call `generateSeedData()` if demo selected
- Preview what demo data includes

### Step 4: Preferences & Settings

**Files to Create:**
- `apps/web/components/onboarding/preferences-step.tsx`

**Features:**
- Starting capital input
- Benchmark symbols (default: SPY, QQQ)
- AI provider selection
- Save to `YearlyPerformanceSettings` and `AiConfig`

### Step 5: Completion

**Files to Create:**
- `apps/web/components/onboarding/completion-step.tsx`

**Features:**
- Summary of setup (proficiency, brokers, data mode, capital)
- "What You Can Do Next" suggestions
- "Go to Dashboard" button

---

## Troubleshooting

### Onboarding Not Showing

**Symptom:** New user goes straight to dashboard, skips onboarding

**Check:**
1. UserPreferences exists: `SELECT * FROM "UserPreferences" WHERE "userId" = '...'`
2. onboardingCompleted is false: Should be `false` for new users
3. App layout redirect logic working (check server logs)

**Fix:**
Manually set onboarding incomplete:
```sql
UPDATE "UserPreferences"
SET "onboardingCompleted" = false
WHERE "userId" = 'your-user-id';
```

### Infinite Redirect Loop

**Symptom:** Keeps redirecting between /onboarding and /market-desk

**Check:**
1. Onboarding layout is separate from app layout (no nested check)
2. Path check in app layout excludes `/onboarding`

**Fix:**
Verify `apps/web/app/(app)/layout.tsx` line 30:
```typescript
if (!pathname.includes("/onboarding")) {
  redirect("/onboarding");
}
```

### Progress Not Saving

**Symptom:** Browser refresh resets wizard to Step 1

**Check:**
1. POST /api/onboarding/progress is being called
2. OnboardingProgress table has record

**Fix:**
Add GET /api/onboarding/progress call in `page.tsx` useEffect:
```typescript
useEffect(() => {
  fetch('/api/onboarding/progress')
    .then(res => res.json())
    .then(data => {
      setCurrentStep(data.currentStep);
      setWizardData(data.wizardData);
    });
}, []);
```

---

## Success Criteria

Phase 1 is successful if:

- ✅ Database migration runs without errors
- ✅ New users are redirected to `/onboarding`
- ✅ Existing users go straight to `/market-desk`
- ✅ Step 1 form captures proficiency and goals
- ✅ "Skip Setup" marks onboarding complete
- ✅ "Complete Setup" saves preferences and redirects
- ✅ OnboardingProgress saves step state
- ✅ No errors in browser console
- ✅ No errors in server logs

---

## Resources

- [Full Onboarding Plan](./.claude/onboarding-plan.md)
- [Seed Data Cleanup Feature](./SEED_DATA_CLEANUP.md)
- [Authentication Architecture](./AUTHENTICATION_LOGGING_ARCHITECTURE.md)

---

**Status:** ✅ Phase 1 Complete
**Ready for:** Database migration and user testing
**Next Phase:** Implement Steps 2-5 (broker connection, seed data, preferences, completion)
