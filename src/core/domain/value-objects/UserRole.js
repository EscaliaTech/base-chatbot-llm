export const UserRole = Object.freeze({
  ADMIN: 'admin',
  SUPERVISOR: 'supervisor',
  ASESOR: 'asesor',

  isValid: (role) => ['admin', 'supervisor', 'asesor'].includes(role),

  /**
   * Returns true if `role` has at least the same privileges as `requiredRole`.
   * Hierarchy: admin > supervisor > asesor
   */
  hasPermission: (role, requiredRole) => {
    const hierarchy = { admin: 3, supervisor: 2, asesor: 1 }
    return (hierarchy[role] ?? 0) >= (hierarchy[requiredRole] ?? 0)
  },

  /**
   * Route-level permissions map.
   * Key = resource, value = minimum role required.
   */
  permissions: {
    admin_users: 'admin',
    admin_config: 'admin',
    admin_metrics: 'supervisor',
    conversations_all: 'supervisor',
    conversations_own: 'asesor',
    templates: 'asesor',
  },

  canAccess: (role, resource) => {
    const required = UserRole.permissions[resource]
    if (!required) return false
    return UserRole.hasPermission(role, required)
  },
})
