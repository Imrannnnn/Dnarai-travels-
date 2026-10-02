/**
 * Helper to identify the primary Super Admin account (e.g. admin@dnarai.com)
 * Regular 'admin' staff members can be scheduled and viewed in the roster,
 * but the main super admin is strictly excluded from staff rosters and shift duties.
 */
export function isSuperAdminUser(user) {
    if (!user) return false
    if (user.isSuperAdmin === true || user.role === 'superadmin') return true
    const email = (user.email || '').toLowerCase().trim()
    return email === 'admin@dnarai.com' || email === 'admin@dnaraitravels.com'
}
