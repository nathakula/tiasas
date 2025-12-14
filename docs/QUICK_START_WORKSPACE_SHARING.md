# Quick Start: Workspace Sharing

## For Users

### How to Invite Someone to Your Workspace

1. Navigate to **Settings → Workspace** in the sidebar
2. Click the **"Invite Member"** button (top right)
3. Enter the person's **email address**
4. Choose their **role**:
   - **VIEWER** - Read-only (can view but not edit)
   - **MEMBER** - Can add/edit journal entries and trades
   - **ADMIN** - Can manage broker connections and invite others
5. Click **"Send Invitation"**
6. Share the invitation link with them (copy from "Pending Invitations" table)

### How to Accept an Invitation

1. Click the invitation link you received
2. If not logged in, you'll be prompted to sign in
3. Make sure you sign in with the **same email** the invitation was sent to
4. Click **"Accept Invitation"**
5. You'll now see the shared workspace in your org selector dropdown

### How to Switch Between Workspaces

1. Click the **workspace dropdown** in the top header
2. You'll see two sections:
   - **My Workspaces** - Workspaces you own (👑)
   - **Shared With Me** - Workspaces shared with you
3. Select the workspace you want to switch to
4. The page will refresh and show data from that workspace

### How to Manage Members (Owner/Admin only)

**Change a Member's Role:**
1. Go to **Settings → Workspace**
2. Find the member in the members table
3. Click the role dropdown next to their name (Owner only)
4. Select the new role
5. Confirm the change

**Remove a Member:**
1. Go to **Settings → Workspace**
2. Find the member in the members table
3. Click the **"Remove"** button
4. Confirm the removal

**Cancel a Pending Invitation:**
1. Go to **Settings → Workspace**
2. Scroll to **"Pending Invitations"**
3. Click **"Cancel"** next to the invitation
4. Confirm the cancellation

---

## For Developers

### Adding Permission Checks to a Page

```typescript
// In your server component (page.tsx)
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db as prisma } from "@/lib/db";

// Get user's role
const session = await getServerSession(authOptions);
const user = await prisma.user.findUnique({
  where: { email: session.user.email }
});
const membership = await prisma.membership.findUnique({
  where: { userId_orgId: { userId: user.id, orgId } }
});
const userRole = membership?.role;

// Check permissions
const canWrite = ["MEMBER", "ADMIN", "OWNER"].includes(userRole);
const canAdmin = ["ADMIN", "OWNER"].includes(userRole);
const isOwner = userRole === "OWNER";

// Pass to client component
<MyComponent readOnly={!canWrite} />
```

### Adding Permission Checks to an API Route

```typescript
import { requireRole, requireWriteAccess, requireAdmin } from "../route-helpers";

// Require specific role
export async function POST(req: Request) {
  const auth = await requireWriteAccess(); // MEMBER or higher
  if ("error" in auth) return auth.error;
  const { orgId, user, membership } = auth;

  // Your logic here
}

// Or check manually
export async function DELETE(req: Request) {
  const auth = await requireAuthOrgMembership();
  if ("error" in auth) return auth.error;
  const { membership } = auth;

  if (membership.role !== "OWNER") {
    return NextResponse.json(
      { error: "Only owners can delete" },
      { status: 403 }
    );
  }
}
```

### Role Enforcement Functions

```typescript
// Available in apps/web/app/api/route-helpers.ts
requireAuthOrgMembership()  // Any role
requireRole(minRole)        // Specific minimum role
requireWriteAccess()        // MEMBER or higher
requireAdmin()              // ADMIN or higher
requireOwner()              // OWNER only

// Client-side utilities (apps/web/lib/use-role.ts)
hasRole(userRole, requiredRole)  // Check hierarchy
canWrite(userRole)               // MEMBER+
canAdmin(userRole)               // ADMIN+
isOwner(userRole)                // OWNER only
```

### Creating a New Permission-Aware Component

```typescript
"use client";

import { Role } from "@tiasas/database";
import { canWrite } from "@/lib/use-role";

interface MyComponentProps {
  userRole: Role | null;
}

export function MyComponent({ userRole }: MyComponentProps) {
  const isEditable = canWrite(userRole);

  return (
    <div>
      {isEditable ? (
        <button>Edit</button>
      ) : (
        <span className="text-slate-400">Read-Only</span>
      )}
    </div>
  );
}
```

---

## Common Patterns

### Pattern 1: Show/Hide Features Based on Role

```typescript
{canWrite && <AddEntryButton />}
{canAdmin && <InviteMemberButton />}
{isOwner && <DeleteWorkspaceButton />}
```

### Pattern 2: Disable Features for Viewers

```typescript
<button disabled={!canWrite}>
  {canWrite ? "Save" : "Read-Only"}
</button>
```

### Pattern 3: Show Role Badge

```typescript
const ROLE_COLORS = {
  OWNER: "bg-purple-100 text-purple-700",
  ADMIN: "bg-blue-100 text-blue-700",
  MEMBER: "bg-green-100 text-green-700",
  VIEWER: "bg-slate-100 text-slate-700",
};

<span className={ROLE_COLORS[userRole]}>
  {userRole}
</span>
```

---

## API Endpoints

### Invitations
- `GET /api/invitations` - List pending invitations (ADMIN+)
- `POST /api/invitations` - Create invitation (ADMIN+)
- `DELETE /api/invitations?token=xxx` - Cancel invitation (ADMIN+)
- `GET /api/invitations/accept?token=xxx` - Get invitation details (Public)
- `POST /api/invitations/accept` - Accept invitation (Authenticated)

### Members
- `GET /api/members` - List workspace members (Any role)
- `PATCH /api/members` - Update member role (OWNER only)
- `DELETE /api/members?userId=xxx` - Remove member (ADMIN+)

---

## Testing

### Manual Testing Steps

1. **Create Invitation**
   ```bash
   curl -X POST http://localhost:3000/api/invitations \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","role":"VIEWER"}'
   ```

2. **Accept Invitation**
   - Get token from database or invitation list
   - Visit: `http://localhost:3000/accept-invite?token=<token>`

3. **Test Permissions**
   - Log in as VIEWER
   - Try to create journal entry (should fail with 403)
   - Log in as MEMBER
   - Create journal entry (should succeed)

### Database Queries

**Check invitations:**
```sql
SELECT * FROM "Invitation" WHERE "orgId" = '<orgId>';
```

**Check memberships:**
```sql
SELECT u.email, m.role
FROM "Membership" m
JOIN "User" u ON m."userId" = u.id
WHERE m."orgId" = '<orgId>';
```

**Update member role:**
```sql
UPDATE "Membership"
SET role = 'ADMIN'
WHERE "userId" = '<userId>' AND "orgId" = '<orgId>';
```

---

## Troubleshooting

### User can't accept invitation
- Check they're logged in with the correct email
- Check invitation hasn't expired (7 days)
- Check invitation status is PENDING in database

### Permission denied errors
- Verify user's role in Membership table
- Check API route requires correct role level
- Ensure `active_org` cookie is set correctly

### Invitation link doesn't work
- Verify token exists in Invitation table
- Check token hasn't been used (status != ACCEPTED)
- Check URL is correct: `/accept-invite?token=xxx`

---

## Next Steps

After implementing workspace sharing:

1. **Set up email service** to automatically send invitation emails
2. **Add ownership transfer** functionality
3. **Implement activity logs** to track member actions
4. **Add team collaboration** features (comments, mentions)
5. **Create bulk invitation** tool for adding multiple users
