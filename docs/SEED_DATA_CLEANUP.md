# Seed Data Cleanup Feature

## Overview

The seed data cleanup feature allows users who accepted demo data during onboarding to easily remove all sample/demo records with a single button click from the Settings page.

## How It Works

### Seed Data Identification

All demo/seed data created during onboarding is marked with specific identifiers:

| Data Type | Identifier Method |
|-----------|-------------------|
| **Journal Entries** | Text contains `[DEMO]` OR has `"demo"` tag |
| **Daily P&L Entries** | Note field contains `[DEMO]` |
| **Position Snapshots** | BrokerConnection has `brokerSource = "DEMO"` |
| **Monthly NAV** | Note field contains `[DEMO]` |

### User Interface

**Location:** Settings Page (`/settings`)

**Component:** `SeedDataManager` ([seed-data-manager.tsx](../apps/web/components/settings/seed-data-manager.tsx))

**Display Logic:**
- Only shows if user has seed data (at least 1 demo record)
- If no seed data exists, component renders nothing

**UI Features:**
1. **Information Card** - Shows amber/yellow info box with:
   - Total count of demo records
   - Breakdown by data type (journal entries, daily P&L, positions, NAV)
   - Clear indication this is demo data

2. **Delete Button** - Red button labeled "Remove All Demo Data"

3. **Confirmation Dialog** - Shows:
   - Warning about permanent deletion
   - Total record count
   - Reassurance that real data won't be affected
   - Two buttons: "Yes, Delete Demo Data" and "Cancel"

4. **Success Feedback** - Alert showing number of deleted records

### API Endpoint

**Endpoint:** `DELETE /api/settings/seed-data`

**Authentication:** Requires authenticated session

**Process:**
1. Verifies user authentication
2. Identifies all seed data for user's organization
3. Deletes data in a transaction (atomic operation):
   - Demo broker connections (cascades to accounts, positions)
   - Journal entries with `[DEMO]` marker
   - Daily P&L entries with `[DEMO]` marker
   - Monthly NAV entries with `[DEMO]` marker
4. Creates audit log entry for deletion
5. Returns count of deleted records

**Response:**
```json
{
  "success": true,
  "message": "Demo data deleted successfully",
  "deletedCount": 87,
  "breakdown": {
    "journalEntries": 20,
    "dailyPnlEntries": 30,
    "positions": 35,
    "monthlyNavEntries": 2
  }
}
```

### Seed Data Generation

**Utility:** `seed-data-generator.ts` ([lib/onboarding/seed-data-generator.ts](../apps/web/lib/onboarding/seed-data-generator.ts))

**Function:** `generateSeedData(options)`

**Created Data:**
- **8 sample positions** (SPY, AAPL, MSFT, TSLA, NVDA, QQQ, AMZN, GOOGL)
- **10 journal entries** with realistic trading notes
- **30 days of daily P&L data** with fluctuating returns
- **3 monthly NAV snapshots**
- **1 demo broker connection** labeled "Demo Portfolio"

**All data marked with appropriate identifiers for cleanup**

## Usage

### For Users

1. Navigate to Settings (`/settings`)
2. Scroll to "Demo Data Management" section (only visible if you have demo data)
3. Click "Remove All Demo Data" button
4. Confirm deletion
5. Demo data is permanently removed

### For Developers

**Check if user has seed data:**
```typescript
import { hasSeedData } from "@/lib/onboarding/seed-data-generator";

const hasDemo = await hasSeedData(orgId);
```

**Generate seed data during onboarding:**
```typescript
import { generateSeedData } from "@/lib/onboarding/seed-data-generator";

const result = await generateSeedData({
  orgId: user.orgId,
  userId: user.id,
  includeSamplePositions: true,
  includeSampleJournal: true,
  includeSamplePnl: true,
  includeSampleNav: true,
});

if (result.success) {
  console.log(`Created ${result.created.journalEntries} journal entries`);
}
```

## Data Safety

### What Gets Deleted
- ✅ Journal entries with `[DEMO]` marker or `demo` tag
- ✅ Daily P&L entries with `[DEMO]` note
- ✅ Broker connections with `brokerSource = "DEMO"`
- ✅ All positions linked to demo connections
- ✅ Monthly NAV entries with `[DEMO]` note

### What Is Protected
- ✅ Real broker connections (E*TRADE, CSV imports without DEMO marker)
- ✅ User-created journal entries
- ✅ Manually entered daily P&L records
- ✅ Actual positions from connected brokers
- ✅ Performance settings
- ✅ User preferences

### Safeguards
1. **Confirmation dialog** - Prevents accidental deletion
2. **Transaction wrapper** - All-or-nothing deletion (atomic)
3. **Audit logging** - Deletion is logged for accountability
4. **Specific markers** - Only data with demo identifiers is deleted
5. **No cascade to real data** - Demo connections isolated from real connections

## Future Enhancements

1. **Metadata Field Migration**
   - Add `metadata` JSON field to all relevant tables
   - Store `{ is_demo: true }` in metadata instead of note markers
   - More robust and queryable

2. **Partial Cleanup**
   - Allow users to delete specific types (e.g., only journal entries)
   - Keep some demo data for reference

3. **Undo/Restore**
   - Soft delete with restore option within 30 days
   - Requires additional table structure

4. **Export Before Delete**
   - Download demo data as JSON before deletion
   - Allows users to keep records for learning

## Testing

### Manual Testing

1. **Setup:**
   - Create a new user account
   - Generate seed data using `generateSeedData()`
   - Verify demo data appears in:
     - Journal tab
     - Calendar view
     - Positions page
     - Performance charts

2. **Cleanup:**
   - Navigate to Settings
   - Verify "Demo Data Management" section appears
   - Verify correct counts displayed
   - Click "Remove All Demo Data"
   - Confirm deletion
   - Verify success message
   - Check all pages - demo data should be gone

3. **Safety:**
   - Add real journal entry or broker connection
   - Delete demo data
   - Verify real data still exists

### Automated Tests

```typescript
// Test seed data generation
test("should generate seed data with correct markers", async () => {
  const result = await generateSeedData({ orgId, userId });

  expect(result.success).toBe(true);
  expect(result.created.journalEntries).toBeGreaterThan(0);

  // Verify markers
  const demoJournal = await prisma.journalEntry.findFirst({
    where: { orgId, text: { contains: "[DEMO]" } }
  });
  expect(demoJournal).toBeDefined();
});

// Test seed data cleanup
test("should delete only demo data", async () => {
  // Create demo data
  await generateSeedData({ orgId, userId });

  // Create real data
  await prisma.journalEntry.create({
    data: { orgId, userId, date: new Date(), text: "Real entry", tags: [] }
  });

  // Delete demo data
  const response = await DELETE("/api/settings/seed-data");

  // Verify demo data gone
  const demoCount = await prisma.journalEntry.count({
    where: { orgId, text: { contains: "[DEMO]" } }
  });
  expect(demoCount).toBe(0);

  // Verify real data remains
  const realCount = await prisma.journalEntry.count({
    where: { orgId, text: "Real entry" }
  });
  expect(realCount).toBe(1);
});
```

## Files

| File | Purpose |
|------|---------|
| `apps/web/components/settings/seed-data-manager.tsx` | UI component for cleanup |
| `apps/web/app/api/settings/seed-data/route.ts` | API endpoint for deletion |
| `apps/web/lib/onboarding/seed-data-generator.ts` | Seed data generation utility |
| `apps/web/app/(app)/settings/page.tsx` | Settings page (includes component) |

## Related Documentation

- [Onboarding Implementation Plan](./onboarding-plan.md)
- [Authentication Architecture](./AUTHENTICATION_LOGGING_ARCHITECTURE.md)

---

**Last Updated:** December 10, 2025
**Status:** Implemented and Ready for Testing
