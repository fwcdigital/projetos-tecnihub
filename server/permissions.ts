import type { AuthScope, UserRole } from './db.js';

type Actor = Pick<AuthScope, 'id' | 'role'> | undefined;

export const ADMIN_ROLES: UserRole[] = ['SUPER_ADMIN', 'ADMIN'];

export function isAdministrator(actor: Actor): boolean {
  return Boolean(actor && ADMIN_ROLES.includes(actor.role));
}

export function canManageProjectOperations(actor: Actor): boolean {
  return Boolean(actor && (isAdministrator(actor) || actor.role === 'PROJECT_MANAGER'));
}

export function canManageProjectTeam(actor: Actor): boolean {
  return canManageProjectOperations(actor);
}

export function canEditProjectDates(actor: Actor): boolean {
  return isAdministrator(actor);
}

export function canManageTaskAssignments(actor: Actor): boolean {
  return Boolean(actor && (isAdministrator(actor) || actor.role === 'PROJECT_MANAGER'));
}

export function canAdministerProjectStatuses(actor: Actor): boolean {
  return isAdministrator(actor);
}

export function canManageUsers(actor: Actor): boolean {
  return isAdministrator(actor);
}
