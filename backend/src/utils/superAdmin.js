/**
 * Helper to identify whether a user is the primary Super Admin.
 * The Super Admin is the system owner account (e.g. admin@dnarai.com or process.env.EMAIL).
 * Regular administrators (other users with role 'admin') and staff are NOT super admins.
 */
export function isSuperAdminUser(user) {
  if (!user) return false;

  // If passed an email string
  if (typeof user === 'string') {
    if (user.includes('@')) {
      const email = user.toLowerCase().trim();
      const envEmail = (process.env.EMAIL || '').toLowerCase().trim();
      const superEmails = ['admin@dnarai.com', 'admin@dnaraitravels.com'];
      if (envEmail) superEmails.push(envEmail);
      return superEmails.includes(email);
    }
    return false;
  }

  // Check explicit super admin flag or role
  if (user.isSuperAdmin === true) return true;
  if (user.role === 'superadmin') return true;

  // Check email match
  const email = (user.email || '').toLowerCase().trim();
  const envEmail = (process.env.EMAIL || '').toLowerCase().trim();
  const superEmails = ['admin@dnarai.com', 'admin@dnaraitravels.com'];
  if (envEmail) superEmails.push(envEmail);

  return superEmails.includes(email);
}
