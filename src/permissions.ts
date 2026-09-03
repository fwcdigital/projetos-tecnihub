import type { UserRole } from './types';

export function isAdministrator(role: UserRole): boolean {
  return role === 'ADMIN_PRINCIPAL' || role === 'ADMIN';
}

export function canManageProjectOperations(role: UserRole): boolean {
  return isAdministrator(role) || role === 'GESTOR_PROJETO';
}

export function canEditProjectDates(role: UserRole): boolean {
  return isAdministrator(role);
}

export function canManageTaskAssignments(role: UserRole): boolean {
  return isAdministrator(role) || role === 'GESTOR_PROJETO';
}

export function canManageUsers(role: UserRole): boolean {
  return isAdministrator(role);
}
