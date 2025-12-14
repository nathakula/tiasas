import { Role } from "@tiasas/database";

const ROLE_HIERARCHY: Record<Role, number> = {
  VIEWER: 1,
  MEMBER: 2,
  ADMIN: 3,
  OWNER: 4,
};

/**
 * Check if user has at least the specified role level
 */
export function hasRole(userRole: Role | null | undefined, requiredRole: Role): boolean {
  if (!userRole) return false;
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Check if user can write (MEMBER or higher)
 */
export function canWrite(userRole: Role | null | undefined): boolean {
  return hasRole(userRole, "MEMBER");
}

/**
 * Check if user can administer (ADMIN or higher)
 */
export function canAdmin(userRole: Role | null | undefined): boolean {
  return hasRole(userRole, "ADMIN");
}

/**
 * Check if user is owner
 */
export function isOwner(userRole: Role | null | undefined): boolean {
  return userRole === "OWNER";
}
