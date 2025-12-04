# Archived Code

This directory contains duplicate/unused code files that were removed during project cleanup.

## Date: 2025-11-13

### Folders Archived:

1. **app-(app)-market-desk/market-desk/**
   - **Reason**: Duplicate of `app/(app)/app/market-desk/`
   - **Issue**: Created confusing nested structure with duplicate pages
   - **Active Location**: `apps/web/app/(app)/app/market-desk/`
   - **URL Pattern**: `/app/market-desk/*`

2. **app-(app)-settings/**
   - **Reason**: Duplicate of `app/(app)/app/settings/`
   - **Active Location**: `apps/web/app/(app)/app/settings/`
   - **URL Pattern**: `/app/settings`

### Why This Happened:

Next.js uses `(app)` as a route group (doesn't affect URLs), but there was an extra `app` folder inside creating the `/app` prefix in URLs. During BrokerBridge implementation, files were initially created in the wrong location (`app/(app)/market-desk/`) instead of the active location (`app/(app)/app/market-desk/`), creating duplicates.

### Current Clean Structure:

```
app/
  (app)/          ← Route group (no URL impact)
    app/          ← Creates /app in URL
      market-desk/  → /app/market-desk/*
        connections/
        positions/
        journal/
        calendar/
        charts/
        ai/
      settings/     → /app/settings
```

### Recovery:

If these files are needed, they can be restored from this archive directory. However, the active codebase in `app/(app)/app/` should be considered the source of truth.
