export type AppRole = 'worker' | 'employer' | 'admin';

const ROLE_ORDER: AppRole[] = ['employer', 'worker'];
const ROLE_LABELS: Record<AppRole, string> = {
  worker: 'Worker',
  employer: 'Employer',
  admin: 'Admin'
};

export function normalizeRoles(input?: unknown): AppRole[] {
  if (!input) return [];
  const values = Array.isArray(input) ? input : [input];
  const roles: AppRole[] = [];
  for (const value of values) {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'worker' || normalized === 'employer' || normalized === 'admin') {
      roles.push(normalized);
    }
  }
  return Array.from(new Set(roles));
}

export function hasRole(roles: AppRole[], role: AppRole): boolean {
  return roles.includes(role);
}

export function getPrimaryRole(roles: AppRole[]): AppRole | null {
  for (const role of ROLE_ORDER) {
    if (roles.includes(role)) return role;
  }
  return roles.length > 0 ? roles[0] : null;
}

export function getPrimaryRoleLabel(roles: AppRole[]): string {
  const primary = getPrimaryRole(roles);
  return primary ? ROLE_LABELS[primary] : 'Member';
}

export function getRoleLabel(roles: AppRole[]): string {
  if (!roles.length) return 'Member';
  return roles.map((role) => ROLE_LABELS[role] || 'Member').join(', ');
}

export function getDefaultRouteForRoles(roles: AppRole[]): string {
  return getPrimaryRole(roles) === 'employer' ? '/employer' : '/jobs';
}
