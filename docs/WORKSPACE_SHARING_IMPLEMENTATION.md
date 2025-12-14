# Workspace Sharing & Access Control Implementation

## Overview
This document describes the implementation of multi-user workspace sharing and role-based access control (RBAC) for Tiasas. This feature enables users to invite others to their workspaces with granular permissions.

## Use Cases Supported

### 1. **Family SaaS Model**
- **Scenario:** Srinath and Sridhar (brothers) each have their own workspace
- **Example:**
  - Srinath invites Sridhar to "Srinath Akula's Workspace" as **VIEWER** (read-only)
  - Sridhar invites Srinath to "Sridhar Akula's Workspace" as **MEMBER** (can edit)
  - Both users can switch between their own workspace and shared workspaces

### 2. **Hedge Fund Manager**
- **Scenario:** Manager oversees 5 different portfolios with team members
- **Example:**
  - Manager creates 5 workspaces ("Fund Alpha", "Fund Beta", etc.)
  - Junior Analyst: **VIEWER** (read-only access)
  - Senior Analyst: **MEMBER** (can add trades/journal entries)
  - Chief Analyst: **ADMIN** (can manage brokers, export data)
  - Fund Manager: **OWNER** (full control)

---

## Architecture

### Database Schema

#### New Models

**Invitation Model** ([schema.prisma:91-108](packages/database/prisma/schema.prisma#L91-L108))
```prisma
model Invitation {
  id         String           @id @default(cuid())
  email      String
  orgId      String
  role       Role             // VIEWER, MEMBER, ADMIN (not OWNER)
  invitedBy  String
  token      String           @unique @default(cuid())
  status     InvitationStatus @default(PENDING)
  expiresAt  DateTime         // 7 days from creation
  createdAt  DateTime         @default(now())
  updatedAt  DateTime         @updatedAt
  org        Org              @relation(fields: [orgId], references: [id])
  inviter    User             @relation(fields: [invitedBy], references: [id])

  @@unique([email, orgId])
}

enum InvitationStatus {
  PENDING
  ACCEPTED
  REJECTED
  EXPIRED
  CANCELLED
}
```

#### Updated Models

**User Model** - Added `sentInvitations` relation
**Org Model** - Added `invitations` relation

### Role Hierarchy

Roles are ranked by permission level (defined in [route-helpers.ts:9-14](apps/web/app/api/route-helpers.ts#L9-L14)):

```typescript
const ROLE_HIERARCHY: Record<Role, number> = {
  VIEWER: 1,   // Read-only
  MEMBER: 2,   // Can create/edit
  ADMIN: 3,    // Can manage connections, invite members
  OWNER: 4,    // Full control
};
```

### Permission Matrix

| Action | VIEWER | MEMBER | ADMIN | OWNER |
|--------|--------|--------|-------|-------|
| View dashboard, journal, P&L | ✅ | ✅ | ✅ | ✅ |
| Add/edit journal entries | ❌ | ✅ | ✅ | ✅ |
| Add/edit trades | ❌ | ✅ | ✅ | ✅ |
| Manage broker connections | ❌ | ❌ | ✅ | ✅ |
| Export data | ❌ | ❌ | ✅ | ✅ |
| Invite members | ❌ | ❌ | ✅ | ✅ |
| Change member roles | ❌ | ❌ | ❌ | ✅ |
| Remove members | ❌ | ❌ | ✅* | ✅ |
| Delete workspace | ❌ | ❌ | ❌ | ✅ |

*ADMIN can only remove VIEWER/MEMBER roles, not other ADMINs or OWNERs

---

## API Implementation

### New API Routes

#### 1. **Invitation Management** ([apps/web/app/api/invitations/route.ts](apps/web/app/api/invitations/route.ts))

**GET /api/invitations**
- Lists all pending invitations for current org
- Requires: **ADMIN** or **OWNER** role
- Returns: Array of invitations with inviter details

**POST /api/invitations**
- Creates new invitation
- Requires: **ADMIN** or **OWNER** role
- Body: `{ email: string, role: "VIEWER" | "MEMBER" | "ADMIN" }`
- Validates:
  - Email is valid
  - User not inviting themselves
  - No existing membership
  - No pending invitation already sent
- Creates invitation with 7-day expiration
- Returns: Created invitation

**DELETE /api/invitations?token=xxx**
- Cancels pending invitation
- Requires: **ADMIN** or **OWNER** role
- Validates: Invitation belongs to current org
- Updates status to `CANCELLED`

#### 2. **Invitation Acceptance** ([apps/web/app/api/invitations/accept/route.ts](apps/web/app/api/invitations/accept/route.ts))

**GET /api/invitations/accept?token=xxx**
- Fetches invitation details for preview
- Public endpoint (no auth required)
- Returns: Invitation details with org and inviter info

**POST /api/invitations/accept**
- Accepts invitation and creates membership
- Requires: **Authenticated user**
- Body: `{ token: string }`
- Validates:
  - Token is valid
  - Invitation is for logged-in user's email
  - Status is PENDING
  - Not expired
- Creates membership and updates invitation status to `ACCEPTED`
- Returns: Membership details

#### 3. **Member Management** ([apps/web/app/api/members/route.ts](apps/web/app/api/members/route.ts))

**GET /api/members**
- Lists all members in current org
- Requires: **Authenticated member**
- Returns: Members with user details, sorted by role then join date

**PATCH /api/members**
- Updates member's role
- Requires: **OWNER** role only
- Body: `{ userId: string, role: Role }`
- Validates: Cannot change own role
- Returns: Updated membership

**DELETE /api/members?userId=xxx**
- Removes member from workspace
- Requires: **ADMIN** or **OWNER** role
- Validates:
  - Cannot remove self
  - Only OWNER can remove ADMIN/OWNER roles
- Deletes membership

### Updated API Routes

#### Role Enforcement Added:

**Journal Routes:**
- **GET /api/journal** - All roles (VIEWER+)
- **POST /api/journal** - Requires **MEMBER+** ([journal/route.ts:36-38](apps/web/app/api/journal/route.ts#L36-L38))
- **PUT /api/journal/[id]** - Requires **MEMBER+** ([journal/[id]/route.ts:12-14](apps/web/app/api/journal/[id]/route.ts#L12-L14))
- **DELETE /api/journal/[id]** - Requires **MEMBER+** ([journal/[id]/route.ts:30-32](apps/web/app/api/journal/[id]/route.ts#L30-L32))

**Connections Routes:**
- **GET /api/connections** - All roles (VIEWER+)
- **POST /api/connections** - Requires **ADMIN+** ([connections/route.ts:21-23](apps/web/app/api/connections/route.ts#L21-L23))

### Route Helper Functions

New helpers in [route-helpers.ts](apps/web/app/api/route-helpers.ts):

```typescript
// Check minimum role level
async function requireRole(minRole: Role)

// Shortcuts
async function requireAdmin()   // ADMIN or OWNER
async function requireOwner()   // OWNER only
async function requireWriteAccess()  // MEMBER or higher

// Utility
function hasRole(userRole: Role, requiredRole: Role): boolean
```

---

## UI Implementation

### 1. **Workspace Settings Page** ([apps/web/app/(app)/settings/workspace/page.tsx](apps/web/app/(app)/settings/workspace/page.tsx))

**Features:**
- Shows workspace name and member count
- "Invite Member" button (for ADMIN/OWNER only)
- Members table with roles
- Pending invitations table
- Role descriptions

**Access Control:**
- Only OWNER can change member roles
- ADMIN and OWNER can remove members
- ADMIN and OWNER can see pending invitations

### 2. **Members Table Component** ([components/workspace/members-table.tsx](apps/web/components/workspace/members-table.tsx))

**Features:**
- Displays all workspace members with avatar, name, email
- Shows role badges with color coding:
  - OWNER: Purple
  - ADMIN: Blue
  - MEMBER: Green
  - VIEWER: Gray
- Role dropdown (OWNER only) for changing member roles
- "Remove" button (ADMIN/OWNER only)
- Prevents removing self or changing own role

### 3. **Invitations Table Component** ([components/workspace/invitations-table.tsx](apps/web/components/workspace/invitations-table.tsx))

**Features:**
- Lists pending invitations with email, role, expiration
- "Copy Link" button for invitation URL
- "Cancel" button to revoke invitation
- Shows days until expiration

### 4. **Invite Member Dialog** ([components/workspace/invite-member-button.tsx](apps/web/components/workspace/invite-member-button.tsx))

**Features:**
- Email input with validation
- Role selector (VIEWER, MEMBER, ADMIN)
- Role descriptions for each option
- Error handling and display
- Success feedback

### 5. **Enhanced Org Selector** ([components/org-selector.tsx](apps/web/components/org-selector.tsx))

**Features:**
- Groups workspaces into "My Workspaces" (OWNER) and "Shared With Me"
- Shows role badges (👑 OWNER, ⚙️ ADMIN, ✏️ MEMBER, 👁️ VIEWER)
- Displays current role badge next to selector
- Color-coded role text

### 6. **Invitation Acceptance Page** ([apps/web/app/accept-invite/page.tsx](apps/web/app/accept-invite/page.tsx))

**Features:**
- Fetches invitation details from token
- Handles unauthenticated users (redirects to sign-in)
- Validates logged-in user matches invited email
- Shows invitation details (workspace name, role, inviter)
- One-click accept button
- Error states (expired, invalid, wrong account)

### 7. **Permission-Based UI Controls**

**Example: Journal Page** ([market-desk/journal/page.tsx](apps/web/app/(app)/market-desk/journal/page.tsx#L54-L59))
- Shows "Read-Only Mode" banner for VIEWERs
- Hides "Add Entry" form for VIEWERs
- Passes `readOnly` prop to components
- Disables edit/delete buttons based on role

**Utility Functions** ([lib/use-role.ts](apps/web/lib/use-role.ts))
```typescript
hasRole(userRole, requiredRole)  // Check role hierarchy
canWrite(userRole)               // MEMBER or higher
canAdmin(userRole)               // ADMIN or higher
isOwner(userRole)                // OWNER only
```

---

## User Flows

### Flow 1: Inviting a User

1. **User 1 (OWNER/ADMIN)** goes to **Settings → Workspace**
2. Clicks "Invite Member" button
3. Enters email and selects role (VIEWER, MEMBER, or ADMIN)
4. Clicks "Send Invitation"
5. System creates invitation record with unique token
6. Invitation appears in "Pending Invitations" table
7. **User 2** receives email with invite link (manual for now - TODO: email integration)

### Flow 2: Accepting an Invitation

**Scenario A: Unauthenticated User**
1. User clicks invitation link (`/accept-invite?token=xxx`)
2. Sees invitation details (workspace name, role, inviter)
3. Clicks "Sign In to Accept"
4. Redirected to sign-in with callback to `/accept-invite?token=xxx`
5. After sign-in, automatically shown accept page
6. Clicks "Accept Invitation"
7. Membership created, redirected to app

**Scenario B: Logged-In User (Correct Email)**
1. User clicks invitation link
2. Already logged in with matching email
3. Sees accept page with invitation details
4. Clicks "Accept Invitation"
5. Membership created, redirected to app
6. Can now switch to new workspace via org selector

**Scenario C: Logged-In User (Wrong Email)**
1. User clicks invitation link
2. Logged in with different email than invitation
3. Sees error: "This invitation is for user@example.com but you're signed in as other@example.com"
4. Option to sign in with correct account

### Flow 3: Switching Workspaces

1. User clicks org selector dropdown in header
2. Sees grouped list:
   - **My Workspaces** (OWNER roles)
     - 👑 Srinath Akula's Workspace
   - **Shared With Me** (Other roles)
     - 👁️ Sridhar Akula's Workspace (VIEWER)
     - ✏️ Mom's Portfolio (MEMBER)
3. Selects workspace
4. Page refreshes with new active workspace
5. Role badge updates next to selector
6. UI reflects permissions (e.g., read-only banner for VIEWERs)

### Flow 4: Managing Members

**Changing Roles (OWNER only)**
1. Go to **Settings → Workspace**
2. Find member in table
3. Click role dropdown
4. Select new role
5. Confirm change
6. Member's role updates immediately

**Removing Members (ADMIN/OWNER)**
1. Go to **Settings → Workspace**
2. Find member in table
3. Click "Remove" button
4. Confirm removal
5. Member loses access to workspace
6. Active sessions remain valid until next page load

### Flow 5: Revoking Invitations

1. Go to **Settings → Workspace**
2. Scroll to "Pending Invitations"
3. Click "Cancel" next to invitation
4. Confirm cancellation
5. Invitation status updated to CANCELLED
6. Token becomes invalid

---

## Security Considerations

### 1. **Token Security**
- Invitation tokens are CUID (Collision-resistant Unique Identifier)
- Tokens are single-use (status changes to ACCEPTED after use)
- 7-day expiration enforced
- Tokens stored in database, not sent via query params after initial load

### 2. **Email Validation**
- Invitation email must match logged-in user's email (case-insensitive)
- Prevents token sharing to gain unauthorized access

### 3. **Role Enforcement**
- **Server-side validation** on all API routes
- Role hierarchy checked before any mutation
- Cannot escalate own privileges
- OWNER role cannot be assigned via invitation (only at org creation)

### 4. **Audit Logging**
- All member changes logged to `AuditLog` table
- Tracks: invitation creation, acceptance, role changes, removals
- Includes before/after states

### 5. **Data Isolation**
- All queries filtered by `orgId`
- Membership verified before granting access
- No cross-org data leakage

---

## Testing Checklist

### Database
- [x] Invitation table created
- [x] InvitationStatus enum created
- [x] Relations established (User ↔ Invitation ↔ Org)
- [x] Unique constraints enforced (email + orgId, token)

### API Routes
- [ ] POST /api/invitations creates valid invitation
- [ ] GET /api/invitations returns only org invitations
- [ ] DELETE /api/invitations cancels invitation
- [ ] POST /api/invitations/accept creates membership
- [ ] GET /api/invitations/accept returns invitation details
- [ ] PATCH /api/members updates role (OWNER only)
- [ ] DELETE /api/members removes member
- [ ] Journal routes enforce MEMBER+ for writes
- [ ] Connections routes enforce ADMIN+ for creation

### UI Components
- [ ] Workspace settings page displays members correctly
- [ ] Invite member dialog validates email
- [ ] Invitations table shows pending invites
- [ ] Members table allows role changes (OWNER only)
- [ ] Org selector groups workspaces correctly
- [ ] Role badges display with correct colors
- [ ] Accept-invite page handles all scenarios
- [ ] Read-only banner shows for VIEWERs
- [ ] Edit buttons hidden for VIEWERs

### User Flows
- [ ] Complete invitation flow (send → receive → accept)
- [ ] Role change flow (OWNER changes MEMBER to ADMIN)
- [ ] Member removal flow
- [ ] Workspace switching flow
- [ ] Permission enforcement (VIEWER tries to edit journal)

---

## Future Enhancements

### High Priority
1. **Email Notifications**
   - Send invitation emails via SendGrid/Resend
   - Include workspace details, inviter name, role
   - Add "Accept Invitation" button in email

2. **Ownership Transfer**
   - Allow OWNER to transfer ownership to another member
   - Requires confirmation from both parties
   - Original OWNER becomes ADMIN

3. **Bulk Invitations**
   - Upload CSV with emails and roles
   - Preview before sending
   - Track batch status

### Medium Priority
4. **Invitation Templates**
   - Pre-defined role sets for common scenarios
   - "Family Member" (VIEWER), "Analyst" (MEMBER), "Manager" (ADMIN)

5. **Member Activity Dashboard**
   - Show recent actions by each member
   - Track last login, contributions
   - Usage analytics per role

6. **Guest Links**
   - Generate time-limited public links
   - Read-only access without account
   - Auto-expire after N days

### Low Priority
7. **Custom Permissions**
   - Fine-grained permissions beyond roles
   - "Can view dashboard but not journal"
   - Per-section access control

8. **Team Collaboration Features**
   - Shared notes/comments on journal entries
   - @mention notifications
   - Activity feed

---

## File Changes Summary

### New Files Created
- `packages/database/prisma/schema.prisma` - Updated with Invitation model
- `apps/web/app/api/invitations/route.ts` - Invitation CRUD
- `apps/web/app/api/invitations/accept/route.ts` - Accept invitation
- `apps/web/app/api/members/route.ts` - Member management
- `apps/web/app/(app)/settings/workspace/page.tsx` - Workspace settings page
- `apps/web/components/workspace/members-table.tsx` - Members table component
- `apps/web/components/workspace/invitations-table.tsx` - Invitations table
- `apps/web/components/workspace/invite-member-button.tsx` - Invite dialog
- `apps/web/app/accept-invite/page.tsx` - Invitation acceptance page
- `apps/web/lib/use-role.ts` - Permission utility functions

### Modified Files
- `apps/web/app/api/route-helpers.ts` - Added role enforcement functions
- `apps/web/app/api/journal/route.ts` - Applied MEMBER+ requirement for writes
- `apps/web/app/api/journal/[id]/route.ts` - Applied MEMBER+ for updates/deletes
- `apps/web/app/api/connections/route.ts` - Applied ADMIN+ for creation
- `apps/web/components/org-selector.tsx` - Enhanced with role badges and grouping
- `apps/web/app/(app)/layout.tsx` - Added "Workspace" nav link
- `apps/web/app/(app)/market-desk/journal/page.tsx` - Added permission checks
- `apps/web/app/(app)/settings/page.tsx` - Displays user orgs and roles

---

## Configuration

### Environment Variables
No new environment variables required. Uses existing:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - For session management

### Database Migration
Run: `npx prisma db push` (development) or `npx prisma migrate deploy` (production)

---

## Support & Troubleshooting

### Common Issues

**"Invitation not found"**
- Token may have expired (7 days)
- Invitation may have been cancelled
- Check invitation status in database

**"Insufficient permissions"**
- User role doesn't meet minimum requirement
- Check membership role in database
- Verify API route permission requirements

**"User already a member"**
- Invitation email matches existing member
- Remove existing membership first, or invite different email

**"Cannot change own role"**
- Security measure to prevent privilege escalation
- Another OWNER must change your role

---

## Conclusion

This implementation provides a complete foundation for multi-user workspace sharing with role-based access control. The architecture supports both family sharing (Srinath ↔ Sridhar) and organizational hierarchies (hedge fund manager with team).

Key benefits:
- ✅ Granular permission control (4 role levels)
- ✅ Secure invitation system with expiration
- ✅ Clean UX for workspace switching
- ✅ Server-side enforcement of all permissions
- ✅ Audit trail of all member changes

Next steps:
1. Integrate email service for invitation delivery
2. Add comprehensive test coverage
3. Implement ownership transfer
4. Deploy to production environment
