/**
 * Role badges for chat surfaces.
 *
 * Roles come from `getSenderRoles(gaiaId)` (real governance data). The visual
 * families map onto the Glass 2100 palette: titan (operational), bronze
 * (review authority), pigment (trust).
 */
const ROLE_FAMILIES = {
  node_operator: { fallback: 'Node Operator', variant: 'operator' },
  senior_reviewer: { fallback: 'Senior Reviewer', variant: 'senior' },
  trusted_reviewer: { fallback: 'Trusted Reviewer', variant: 'trusted' }
};

export function describeRole(role, t) {
  const key = String(role || '');
  const known = ROLE_FAMILIES[key];
  const label = (typeof t === 'function' ? (t(key) || '') : '') || known?.fallback || key;
  return { key, label, variant: known?.variant || 'default' };
}

export function buildRoleBadges(roles, t, limit = 2) {
  if (!Array.isArray(roles) || roles.length === 0) return [];
  return roles.slice(0, limit).map(role => describeRole(role, t));
}

export function senderInitials(name) {
  const value = String(name || '').trim();
  if (!value) return '?';
  const parts = value.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}