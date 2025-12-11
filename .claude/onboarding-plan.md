# User Onboarding Flow - Implementation Plan

**Created:** December 10, 2025
**Status:** Planning Phase
**Priority:** High - Improves new user experience significantly

---

## Executive Summary

Currently, new users land on an empty slate after authentication, which can be confusing and doesn't set clear expectations. This plan outlines a comprehensive onboarding wizard that:

1. **Collects user context** - Trading proficiency level, goals, and preferences
2. **Sets up broker connections** - Pre-populate supported brokers (E*TRADE, Fidelity, Schwab, Robinhood, CSV import)
3. **Offers seed data** - Optional sample data to explore the platform immediately
4. **Configures preferences** - Starting capital, benchmarks, AI provider settings
5. **Provides skip option** - Users can skip to empty state if preferred

---

## Current State Analysis

### Authentication Flow
- **Entry Point**: Users sign in via `/signin` page (Google OAuth or credentials)
- **Auto-Provisioning**: On first sign-in, `lib/auth.ts` events.signIn automatically creates:
  - Organization named `{firstName}'s Workspace`
  - Membership with `OWNER` role
  - **Problem**: User lands directly at `/market-desk` overview with NO data
- **First Experience**: Empty dashboard with zero guidance

### Existing Database Schema (Relevant Tables)

```prisma
model User {
  id            String   @id @default(cuid())
  email         String?  @unique
  name          String?
  // No proficiency level or onboarding completion tracking
}

model Org {
  id                        String   @id @default(cuid())
  name                      String
  // No trading preferences or user settings
}

// Missing: UserPreferences, OnboardingStatus tables
```

### Supported Broker Integrations

**Currently Available:**
- ✅ E*TRADE (OAuth integration via `/api/brokerbridge/etrade/*`)
- ✅ CSV Import (for Fidelity, Schwab, Robinhood, E*TRADE exports)
- 🚧 Direct API integrations for Fidelity, Schwab, Robinhood (commented out but scaffolded)

**Broker Detection**: `packages/core/src/brokerbridge/parsers/broker-detector.ts` can detect CSV formats from:
- E*TRADE
- Fidelity
- Charles Schwab
- Robinhood

---

## Proposed Solution: Multi-Step Onboarding Wizard

### User Flow

```
Sign In (OAuth/Credentials)
    ↓
[NEW] Check onboarding_completed flag
    ↓
If NOT completed → Redirect to /onboarding
If completed → Redirect to /market-desk
    ↓
┌─────────────────────────────────────────┐
│  ONBOARDING WIZARD (Multi-Step)         │
├─────────────────────────────────────────┤
│ Step 1: Welcome & Proficiency Level     │
│ Step 2: Broker Connection Setup         │
│ Step 3: Seed Data Offer                 │
│ Step 4: Preferences & Settings          │
│ Step 5: Complete & Launch                │
└─────────────────────────────────────────┘
    ↓
Mark onboarding_completed = true
    ↓
Redirect to /market-desk with personalized experience
```

### Skip Option
Each step (except Welcome) shows a "Skip" button that:
- Sets `onboarding_completed = true`
- Skips remaining steps
- Redirects to `/market-desk` with empty slate

---

## Detailed Step Breakdown

### **Step 1: Welcome & Trading Proficiency**

**Purpose**: Set expectations and understand user's trading experience level

**UI Components:**
```tsx
<WelcomeScreen>
  <Logo />
  <Heading>Welcome to Tiasas Portfolio Tracker!</Heading>
  <Subheading>Let's personalize your experience in 4 quick steps</Subheading>

  <Question>What's your trading proficiency level?</Question>
  <RadioGroup>
    ○ Beginner (0-1 years) - Just getting started
    ○ Intermediate (1-3 years) - Regular trader with some experience
    ○ Advanced (3-5 years) - Experienced trader with consistent strategy
    ○ Professional (5+ years) - Full-time trader or finance professional
  </RadioGroup>

  <Question>What are your primary goals?</Question>
  <CheckboxGroup>
    ☐ Track P&L and performance metrics
    ☐ Aggregate positions across multiple brokers
    ☐ Journal trades and improve discipline
    ☐ Analyze performance vs benchmarks (SPY, QQQ)
    ☐ Use AI insights for market analysis
  </CheckboxGroup>

  <ButtonGroup>
    <Button variant="secondary" onClick={skip}>Skip Setup</Button>
    <Button variant="primary" onClick={next}>Next: Connect Brokers</Button>
  </ButtonGroup>
</WelcomeScreen>
```

**Data Collected:**
- `proficiency_level`: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "PROFESSIONAL"
- `goals`: string[] (array of selected goals)

**Storage**: New `UserPreferences` table (see Database Changes section)

---

### **Step 2: Broker Connection Setup**

**Purpose**: Pre-populate broker connections or upload historical data

**UI Components:**
```tsx
<BrokerConnectionStep>
  <Heading>Connect Your Brokerage Accounts</Heading>
  <Subheading>
    Aggregate positions across brokers or start with CSV import
  </Subheading>

  <BrokerGrid>
    <BrokerCard
      name="E*TRADE"
      logo="/brokers/etrade.svg"
      status="AVAILABLE"
      connection_type="OAuth"
      onClick={connectEtrade}
    >
      <Button>Connect Now</Button>
      <SmallText>Securely link via OAuth</SmallText>
    </BrokerCard>

    <BrokerCard
      name="Fidelity"
      logo="/brokers/fidelity.svg"
      status="CSV_ONLY"
      connection_type="CSV Import"
    >
      <Button>Upload CSV</Button>
      <SmallText>Import positions from CSV export</SmallText>
    </BrokerCard>

    <BrokerCard
      name="Charles Schwab"
      logo="/brokers/schwab.svg"
      status="CSV_ONLY"
      connection_type="CSV Import"
    >
      <Button>Upload CSV</Button>
    </BrokerCard>

    <BrokerCard
      name="Robinhood"
      logo="/brokers/robinhood.svg"
      status="CSV_ONLY"
      connection_type="CSV Import"
    >
      <Button>Upload CSV</Button>
    </BrokerCard>

    <BrokerCard
      name="Other / Generic CSV"
      status="CSV_ONLY"
    >
      <Button>Upload CSV</Button>
      <SmallText>Works with any broker's CSV export</SmallText>
    </BrokerCard>
  </BrokerGrid>

  <ConnectionSummary>
    {connections.length > 0 ? (
      <SuccessMessage>
        ✓ Connected {connections.length} broker{connections.length > 1 ? 's' : ''}
      </SuccessMessage>
    ) : (
      <InfoMessage>
        You can add connections later from Settings → Broker Connections
      </InfoMessage>
    )}
  </ConnectionSummary>

  <ButtonGroup>
    <Button variant="ghost" onClick={back}>Back</Button>
    <Button variant="secondary" onClick={skip}>Skip for Now</Button>
    <Button variant="primary" onClick={next}>
      Next: {connections.length > 0 ? 'Load Data' : 'Set Preferences'}
    </Button>
  </ButtonGroup>
</BrokerConnectionStep>
```

**Behavior:**
- **E*TRADE OAuth**: Opens OAuth flow in popup/redirect, returns with access token
- **CSV Upload**: Shows drag-drop zone → Uses existing broker detector → Processes via `/api/brokerbridge/import`
- **Connection Created**: Adds to `BrokerConnection` table with status `ACTIVE`

**Data Flow:**
1. User clicks "Connect Now" for E*TRADE → OAuth flow → Redirect to `/api/brokerbridge/etrade/verify`
2. User uploads CSV → Parse → Detect broker → Create `BrokerConnection` with `CSV_IMPORT` type
3. Store connection IDs in wizard state

---

### **Step 3: Seed Data Offer**

**Purpose**: Allow users to explore the platform with pre-populated demo data

**UI Components:**
```tsx
<SeedDataStep>
  <Heading>Want to Explore with Sample Data?</Heading>
  <Subheading>
    We can populate your account with example trades and positions
    so you can see the platform in action
  </Subheading>

  <CardGrid>
    <OptionCard selected={seedOption === 'use_real'}>
      <Icon>📊</Icon>
      <Title>Use My Real Data</Title>
      <Description>
        {connections.length > 0
          ? `Start with ${connections.length} connected broker(s)`
          : 'Start with an empty slate and add data manually'
        }
      </Description>
      <Radio name="seed" value="use_real" />
    </OptionCard>

    <OptionCard selected={seedOption === 'demo'}>
      <Icon>🎯</Icon>
      <Title>Explore with Demo Data</Title>
      <Description>
        Pre-populated with 30 days of sample trades,
        journal entries, and performance metrics
      </Description>
      <SmallText>
        Includes: 15 positions, 20 journal entries,
        daily P&L data, and benchmark comparisons
      </SmallText>
      <Radio name="seed" value="demo" />
    </OptionCard>

    <OptionCard selected={seedOption === 'hybrid'}>
      <Icon>🔀</Icon>
      <Title>Both (Hybrid Mode)</Title>
      <Description>
        Add demo data alongside your real connections
        for a fuller experience while learning
      </Description>
      <SmallText>
        Demo data will be clearly labeled
      </SmallText>
      <Radio name="seed" value="hybrid" />
    </OptionCard>
  </CardGrid>

  {seedOption === 'demo' && (
    <Warning>
      Demo data can be cleared anytime from Settings
    </Warning>
  )}

  <ButtonGroup>
    <Button variant="ghost" onClick={back}>Back</Button>
    <Button variant="secondary" onClick={skip}>Skip</Button>
    <Button variant="primary" onClick={next}>Continue</Button>
  </ButtonGroup>
</SeedDataStep>
```

**Seed Data Contents:**

```typescript
// Sample data to insert if user chooses demo mode
const DEMO_DATA = {
  journalEntries: [
    { date: '2025-11-15', text: 'Sold covered call on AAPL, collected $500 premium', tags: ['options', 'income'] },
    { date: '2025-11-18', text: 'Stopped out of TSLA position, -$200', tags: ['loss', 'momentum'] },
    // ... 18 more entries
  ],
  dailyPnl: [
    { date: '2025-11-15', realizedPnl: 500, unrealizedPnl: 1200, totalEquity: 52000 },
    { date: '2025-11-16', realizedPnl: -150, unrealizedPnl: 1100, totalEquity: 51850 },
    // ... 28 more days
  ],
  positions: [
    { symbol: 'SPY', quantity: 100, averagePrice: 450, assetClass: 'ETF' },
    { symbol: 'AAPL', quantity: 50, averagePrice: 180, assetClass: 'EQUITY' },
    // ... 13 more positions
  ],
  monthlyNav: [
    { date: '2025-10-31', nav: 50000 },
    { date: '2025-11-30', nav: 52000 },
  ],
};
```

**Implementation:**
- Seed data inserted with `metadata: { is_demo: true }` flag
- Can be bulk-deleted later via Settings

---

### **Step 4: Preferences & Settings**

**Purpose**: Configure trading preferences and performance tracking

**UI Components:**
```tsx
<PreferencesStep>
  <Heading>Set Up Performance Tracking</Heading>

  <Section>
    <Label>Starting Capital (for current year)</Label>
    <CurrencyInput
      value={startingCapital}
      onChange={setStartingCapital}
      placeholder="50000"
    />
    <HelpText>
      Used to calculate returns and performance metrics.
      You can add deposits/withdrawals later.
    </HelpText>
  </Section>

  <Section>
    <Label>Benchmark Symbols (optional)</Label>
    <MultiSymbolInput
      value={benchmarks}
      onChange={setBenchmarks}
      default={['SPY', 'QQQ']}
    />
    <HelpText>
      Compare your performance against these benchmarks.
      Defaults: SPY, QQQ
    </HelpText>
  </Section>

  <Section>
    <Label>AI Provider (for Analyst's Bench)</Label>
    <Select value={aiProvider} onChange={setAiProvider}>
      <option value="openai">OpenAI (GPT-4)</option>
      <option value="openrouter">OpenRouter (Multi-model)</option>
      <option value="custom">Custom Endpoint</option>
    </Select>

    {aiProvider === 'custom' && (
      <Input
        placeholder="https://api.example.com/v1"
        label="API Base URL"
      />
    )}

    <HelpText>
      Uses environment API key by default.
      Configure custom keys in Settings later.
    </HelpText>
  </Section>

  <ButtonGroup>
    <Button variant="ghost" onClick={back}>Back</Button>
    <Button variant="secondary" onClick={skipToComplete}>Skip</Button>
    <Button variant="primary" onClick={next}>Complete Setup</Button>
  </ButtonGroup>
</PreferencesStep>
```

**Data Collected:**
- `starting_capital`: Decimal (stored in `YearlyPerformanceSettings`)
- `benchmarks`: string[] (stored in `YearlyPerformanceSettings`)
- `ai_provider`: string (stored in `AiConfig`)

---

### **Step 5: Complete & Launch**

**Purpose**: Confirm setup and redirect to dashboard

**UI Components:**
```tsx
<CompletionStep>
  <SuccessIcon>✨</SuccessIcon>
  <Heading>You're All Set!</Heading>
  <Subheading>Your Tiasas workspace is ready</Subheading>

  <SetupSummary>
    <SummaryItem>
      <Icon>👤</Icon>
      <Label>Trading Level</Label>
      <Value>{proficiencyLevel}</Value>
    </SummaryItem>

    <SummaryItem>
      <Icon>🔗</Icon>
      <Label>Connected Brokers</Label>
      <Value>{connections.length || 'None (you can add later)'}</Value>
    </SummaryItem>

    <SummaryItem>
      <Icon>📊</Icon>
      <Label>Data Mode</Label>
      <Value>{seedOption === 'demo' ? 'Demo Data' : 'Real Data'}</Value>
    </SummaryItem>

    <SummaryItem>
      <Icon>💰</Icon>
      <Label>Starting Capital</Label>
      <Value>{startingCapital ? `$${startingCapital.toLocaleString()}` : 'Not set'}</Value>
    </SummaryItem>
  </SetupSummary>

  <NextSteps>
    <Heading>What You Can Do Next:</Heading>
    <StepList>
      <Step>📝 Add your first journal entry</Step>
      <Step>📅 View your calendar and add daily P&L</Step>
      <Step>💼 Check your aggregated positions</Step>
      <Step>📈 Explore performance analytics</Step>
      <Step>🤖 Try the AI Analyst's Bench</Step>
    </StepList>
  </NextSteps>

  <ButtonGroup>
    <Button variant="primary" size="lg" onClick={goToDashboard}>
      Go to Dashboard →
    </Button>
  </ButtonGroup>
</CompletionStep>
```

**Actions on Complete:**
1. Create/update `UserPreferences` record with `onboarding_completed = true`
2. Insert seed data if selected
3. Create `YearlyPerformanceSettings` for current year
4. Create `AiConfig` with selected provider
5. Redirect to `/market-desk` with success toast

---

## Database Schema Changes

### New Tables

```prisma
// User preferences and onboarding tracking
model UserPreferences {
  id                    String    @id @default(cuid())
  userId                String    @unique
  onboardingCompleted   Boolean   @default(false)
  proficiencyLevel      ProficiencyLevel?
  goals                 String[]  @default([])
  showTutorialHints     Boolean   @default(true)  // Show tooltip hints in UI
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

enum ProficiencyLevel {
  BEGINNER
  INTERMEDIATE
  ADVANCED
  PROFESSIONAL
}

// Onboarding wizard progress (for resuming if user closes browser)
model OnboardingProgress {
  id                String    @id @default(cuid())
  userId            String    @unique
  currentStep       Int       @default(1)  // 1-5
  wizardData        Json?     // Stores form data for each step
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### Modified Tables

```prisma
// Add relation to User model
model User {
  // ... existing fields
  preferences       UserPreferences?
  onboardingProgress OnboardingProgress?
}

// Add demo data flag to existing tables (optional)
model JournalEntry {
  // ... existing fields
  metadata          Json?  // Can include { is_demo: true }
}

model DailyPnl {
  // ... existing fields
  metadata          Json?  // Can include { is_demo: true }
}
```

---

## Implementation Approach

### Phase 1: Core Infrastructure (Week 1)

**Files to Create:**

1. **`packages/database/prisma/migrations/add_onboarding.sql`**
   - Add `UserPreferences` and `OnboardingProgress` tables
   - Migration script

2. **`apps/web/app/(app)/onboarding/layout.tsx`**
   - Clean layout for wizard (no sidebar)
   - Progress indicator at top

3. **`apps/web/app/(app)/onboarding/page.tsx`**
   - Main wizard orchestrator
   - Step routing logic
   - State management (React Context or useState)

4. **`apps/web/components/onboarding/*.tsx`**
   - `WelcomeStep.tsx`
   - `BrokerConnectionStep.tsx`
   - `SeedDataStep.tsx`
   - `PreferencesStep.tsx`
   - `CompletionStep.tsx`
   - `ProgressIndicator.tsx` (step tracker UI)

5. **`apps/web/app/api/onboarding/route.ts`**
   - POST endpoint to save onboarding data
   - Creates UserPreferences, YearlyPerformanceSettings, AiConfig
   - Inserts seed data if requested

**Files to Modify:**

1. **`apps/web/lib/auth.ts`**
   - After creating org/membership, check if `UserPreferences` exists
   - If not, redirect to `/onboarding` instead of `/market-desk`

```typescript
// lib/auth.ts - events.signIn
async signIn({ user }) {
  const memberships = await prisma.membership.count({ where: { userId: user.id } });
  if (memberships === 0) {
    // Create org and membership
    const org = await prisma.org.create({ data: { name: `${base}'s Workspace` } });
    await prisma.membership.create({ data: { userId: user.id, orgId: org.id, role: "OWNER" } });

    // Create UserPreferences with onboarding incomplete
    await prisma.userPreferences.create({
      data: {
        userId: user.id,
        onboardingCompleted: false,
      }
    });
  }
}
```

2. **`apps/web/middleware.ts`** (or `app/(app)/layout.tsx`)
   - Add onboarding check before rendering main app
   - Redirect incomplete users to `/onboarding`

```typescript
// Check if onboarding completed
const preferences = await prisma.userPreferences.findUnique({
  where: { userId: user.id }
});

if (!preferences?.onboardingCompleted && pathname !== '/onboarding') {
  redirect('/onboarding');
}
```

### Phase 2: Wizard Steps (Week 2)

**Step 1 - Welcome:**
- Simple form with radio buttons and checkboxes
- Save to `OnboardingProgress.wizardData` on "Next"

**Step 2 - Broker Connections:**
- Reuse existing broker connection components from `/market-desk/connections`
- E*TRADE OAuth flow integration
- CSV upload with broker detection
- Display connected accounts

**Step 3 - Seed Data:**
- Create seed data generator utility
- `lib/onboarding/seed-data.ts` with demo records
- Bulk insert on user selection

**Step 4 - Preferences:**
- Form with starting capital input
- Benchmark symbol multi-select
- AI provider dropdown
- Save to `YearlyPerformanceSettings` and `AiConfig`

**Step 5 - Completion:**
- Summary display
- Mark `onboardingCompleted = true`
- Clear `OnboardingProgress`
- Redirect with success message

### Phase 3: Polish & Testing (Week 3)

**Enhancements:**

1. **Progress Persistence**
   - Save wizard state to `OnboardingProgress` after each step
   - Resume if user closes browser mid-flow

2. **Skip Flow**
   - "Skip Setup" button marks onboarding complete
   - Shows confirmation modal: "You can configure these later in Settings"

3. **Tutorial Hints** (if `showTutorialHints = true`)
   - First-time tooltips in main app
   - Highlight key features on dashboard

4. **Data Cleanup**
   - Settings page: "Clear Demo Data" button
   - Deletes all records with `metadata.is_demo = true`

5. **Re-run Onboarding**
   - Settings page: "Re-run Setup Wizard" button
   - Resets `onboardingCompleted = false`
   - Redirects to `/onboarding`

---

## API Endpoints

### `POST /api/onboarding`

**Purpose**: Save onboarding wizard data and complete setup

**Request Body:**
```typescript
{
  step: 'complete',
  data: {
    proficiencyLevel: 'INTERMEDIATE',
    goals: ['track_pnl', 'aggregate_positions'],
    connections: ['conn_123', 'conn_456'],  // IDs of created connections
    seedDataOption: 'demo' | 'use_real' | 'hybrid',
    startingCapital: 50000,
    benchmarks: ['SPY', 'QQQ'],
    aiProvider: 'openai',
    aiBaseUrl?: 'https://...',
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Onboarding completed successfully",
  "redirectUrl": "/market-desk"
}
```

**Implementation:**
```typescript
// app/api/onboarding/route.ts
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  const body = await req.json();

  // Update UserPreferences
  await prisma.userPreferences.update({
    where: { userId: user.id },
    data: {
      onboardingCompleted: true,
      proficiencyLevel: body.data.proficiencyLevel,
      goals: body.data.goals,
    }
  });

  // Create YearlyPerformanceSettings
  if (body.data.startingCapital) {
    const currentYear = new Date().getFullYear();
    await prisma.yearlyPerformanceSettings.upsert({
      where: { orgId_year: { orgId, year: currentYear } },
      update: {
        startingCapital: body.data.startingCapital,
        benchmarks: body.data.benchmarks,
      },
      create: {
        orgId,
        year: currentYear,
        startingCapital: body.data.startingCapital,
        benchmarks: body.data.benchmarks,
      }
    });
  }

  // Create AiConfig
  await prisma.aiConfig.upsert({
    where: { orgId },
    update: {
      provider: body.data.aiProvider,
      baseUrl: body.data.aiBaseUrl || 'https://api.openai.com/v1',
    },
    create: {
      orgId,
      provider: body.data.aiProvider,
      baseUrl: body.data.aiBaseUrl || 'https://api.openai.com/v1',
    }
  });

  // Insert seed data if requested
  if (body.data.seedDataOption === 'demo' || body.data.seedDataOption === 'hybrid') {
    await insertSeedData(orgId, user.id);
  }

  // Clear onboarding progress
  await prisma.onboardingProgress.delete({
    where: { userId: user.id }
  });

  return NextResponse.json({
    success: true,
    message: 'Onboarding completed successfully',
    redirectUrl: '/market-desk'
  });
}
```

### `POST /api/onboarding/progress`

**Purpose**: Save wizard progress (called after each step)

**Request Body:**
```json
{
  "currentStep": 2,
  "wizardData": {
    "proficiencyLevel": "INTERMEDIATE",
    "goals": ["track_pnl"]
  }
}
```

**Response:**
```json
{
  "success": true
}
```

### `GET /api/onboarding/progress`

**Purpose**: Resume wizard from saved progress

**Response:**
```json
{
  "currentStep": 2,
  "wizardData": {
    "proficiencyLevel": "INTERMEDIATE",
    "goals": ["track_pnl"]
  }
}
```

---

## UI/UX Design Principles

### Visual Design

**Layout:**
- Centered wizard card (max-width: 800px)
- Clean white background (dark mode: slate-900)
- Progress indicator at top showing steps 1-5
- Large, clear typography

**Progress Indicator:**
```
Step 1 ━━━━━ Step 2 ━━━━━ Step 3 ━━━━━ Step 4 ━━━━━ Step 5
  ●  completed   ●  active    ○  pending   ○  pending   ○  pending
```

**Color Scheme:**
- Primary action: Gold (`bg-gold-600 hover:bg-gold-700`)
- Skip/Secondary: Slate (`border-slate-300`)
- Success indicators: Emerald
- Progress line: Gold gradient

### Accessibility

- Keyboard navigation (Tab, Enter, Esc)
- Focus indicators on all interactive elements
- ARIA labels for screen readers
- Skip navigation link

### Mobile Responsiveness

- Stack broker cards vertically on mobile
- Larger touch targets (min 44px)
- Simplified multi-column layouts to single column

---

## Migration Strategy

### For Existing Users

**Problem**: Existing users already have accounts without `UserPreferences`

**Solution**:
1. Migration script creates `UserPreferences` for all existing users
2. Sets `onboardingCompleted = true` (don't force existing users through wizard)
3. Sets `proficiencyLevel = null` and `goals = []`

```sql
-- Migration script
INSERT INTO "UserPreferences" (id, "userId", "onboardingCompleted", "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  id,
  true,  -- Mark existing users as completed
  NOW(),
  NOW()
FROM "User"
WHERE NOT EXISTS (
  SELECT 1 FROM "UserPreferences" WHERE "UserPreferences"."userId" = "User".id
);
```

### Opt-in for Existing Users

Add to Settings page:
```tsx
<Button onClick={resetOnboarding}>
  Re-run Setup Wizard
</Button>
```

Function:
```typescript
async function resetOnboarding() {
  await fetch('/api/user/reset-onboarding', { method: 'POST' });
  window.location.href = '/onboarding';
}
```

---

## Testing Plan

### Unit Tests

1. **Wizard State Management**
   - Test step progression
   - Test skip functionality
   - Test back navigation

2. **API Endpoints**
   - Test POST /api/onboarding with valid data
   - Test error handling for invalid inputs
   - Test seed data insertion

3. **Data Validation**
   - Proficiency level enum validation
   - Starting capital numeric validation
   - Benchmark symbol format validation

### Integration Tests

1. **E2E Onboarding Flow**
   - New user signs in → redirected to onboarding
   - Complete all steps → redirected to dashboard
   - Skip onboarding → empty dashboard

2. **Broker Connection Flow**
   - E*TRADE OAuth during onboarding
   - CSV upload during onboarding
   - Connection appears in Settings afterward

3. **Seed Data**
   - Demo data inserted correctly
   - Demo data appears in journal, calendar, positions
   - Demo data can be cleared from Settings

### Manual QA Checklist

- [ ] New user onboarding completes successfully
- [ ] Skip button works at each step
- [ ] Back button preserves form data
- [ ] Progress saved if user closes browser
- [ ] Existing users not affected
- [ ] Mobile responsive design works
- [ ] Dark mode styling correct
- [ ] Keyboard navigation functional
- [ ] Screen reader accessibility

---

## Performance Considerations

### Load Time

- Lazy load wizard steps (code splitting)
- Preload broker logos as WebP images
- Minimize wizard bundle size

### Database

- Index on `UserPreferences.userId` (already unique)
- Batch insert seed data in transaction
- No N+1 queries

---

## Security Considerations

### OAuth Flow

- CSRF protection for E*TRADE OAuth
- Validate state parameter
- Store tokens encrypted

### Data Privacy

- Seed data clearly marked as demo
- User can delete demo data anytime
- No PII collected beyond email/name

---

## Future Enhancements (Post-MVP)

1. **Interactive Tutorial**
   - Guided tour of main features after onboarding
   - Highlight key UI elements with tooltips

2. **Smart Defaults**
   - Pre-fill starting capital based on proficiency level
   - Suggest benchmarks based on trading style

3. **Personalized Dashboard**
   - Show different widgets based on proficiency level
   - Beginner: Simple P&L view
   - Advanced: Sharpe ratio, Greeks, Greeks, risk metrics

4. **Onboarding Analytics**
   - Track completion rates per step
   - Identify drop-off points
   - A/B test wizard variations

5. **Email Follow-up**
   - Send welcome email with getting started guide
   - Reminder email if onboarding incomplete after 24h

---

## Success Metrics

**KPIs to Track:**

1. **Onboarding Completion Rate**
   - Target: >75% of new users complete wizard
   - Metric: `completed / started`

2. **Time to First Value**
   - Target: <5 minutes from sign-in to dashboard
   - Metric: Timestamp between sign-in and onboarding completion

3. **Feature Adoption**
   - Broker connections added during onboarding: Target >40%
   - Seed data accepted: Target >60%
   - Settings configured: Target >80%

4. **User Retention**
   - Day 7 retention for onboarded vs skipped users
   - Hypothesis: Onboarded users have higher retention

---

## Dependencies

### External Libraries

- No new dependencies needed
- Uses existing:
  - NextAuth.js for session management
  - Prisma for database
  - React Hook Form (if needed for complex forms)

### Internal Dependencies

- Existing broker connection infrastructure
- Existing CSV import pipeline
- Existing seed data patterns (journal bulk import)

---

## Timeline Estimate

| Phase | Duration | Tasks |
|-------|----------|-------|
| **Phase 1: Infrastructure** | 3-4 days | Database migration, API routes, layout shell |
| **Phase 2: Wizard Steps** | 4-5 days | Implement all 5 step components, state management |
| **Phase 3: Broker Integration** | 2-3 days | E*TRADE OAuth, CSV upload in wizard context |
| **Phase 4: Seed Data** | 2 days | Generate demo data, insertion logic |
| **Phase 5: Polish & Testing** | 3-4 days | UI refinement, accessibility, E2E tests |
| **Phase 6: Migration & Deployment** | 1-2 days | Existing user migration, production deploy |
| **Total** | **15-20 days** | ~3-4 weeks for full implementation |

---

## Questions for Clarification

Before implementation, please confirm:

1. **Proficiency Levels**: Are the 4 levels (Beginner, Intermediate, Advanced, Professional) appropriate, or would you like different categories?

2. **Seed Data**: Should demo data be:
   - Completely fictional (random trades, generic notes)?
   - Based on real market data from a specific time period?
   - Include both winning and losing trades for realism?

3. **Broker Prioritization**: Should E*TRADE OAuth be the only "Connect Now" option, or should we fast-track other OAuth integrations (Schwab API, Robinhood unofficial API)?

4. **Skip Behavior**: If user skips onboarding, should we:
   - Show a one-time modal on dashboard with tips?
   - Display persistent tutorial hints until dismissed?
   - Just go straight to empty dashboard?

5. **Re-run Onboarding**: Should existing users be able to re-run the wizard to:
   - Update their preferences?
   - Add demo data later?
   - Both?

---

## Recommendation

I recommend proceeding with **Phase 1 implementation immediately** because:

1. ✅ **No architectural changes needed** - Builds on existing auth and database patterns
2. ✅ **High user impact** - Dramatically improves first-time user experience
3. ✅ **Low risk** - Doesn't affect existing users (with proper migration)
4. ✅ **Reuses existing code** - Leverages broker connections, CSV import, seed data patterns
5. ✅ **Measurable improvement** - Clear before/after metrics (completion rate, retention)

This onboarding wizard will transform the new user experience from "empty and confusing" to "guided and productive" within the first 5 minutes.

---

**Next Steps:**

1. Review this plan and provide feedback
2. Clarify the questions above
3. Approve database schema changes
4. Begin Phase 1 implementation
5. Design review for wizard UI mockups (optional)

Would you like me to proceed with implementation, or would you like to discuss any aspects of this plan first?
