import { connectDb } from '../config/db.js';
import { User } from '../models/User.js';
import { env } from '../config/env.js'

async function createSuperAdmin() {
  await connectDb();
  const email = env.EMAIL
  const password = env.SUPER_PASSWORD

  const exists = await User.findOne({ email });
  if (exists) {
    console.log('Super admin already exists.');
    process.exit(0);
  }

  const passwordHash = await User.hashPassword(password);
  await User.create({ email, passwordHash, role: 'admin' });
  console.log('Super admin created:', email);
  process.exit(0);
}

createSuperAdmin().catch((err) => {
  console.error('Failed to create super admin:', err);
  process.exit(1);
});



//recreat password for superadmin 
async function newPassword() {
  await connectDb();
  const email = env.EMAIL
  const password = env.SUPER_PASSWORD

  const user = await User.findOne({ email });
  if (!user) {
    console.log('Super admin not found.');
    process.exit(0);
  }

  const passwordHash = await User.hashPassword(password);
  user.passwordHash = passwordHash;
  await user.save();
  console.log('Super admin password updated:', email);
  process.exit(0);
}

newPassword().catch((err) => {
  console.error('Failed to update super admin password:', err);
  process.exit(1);
});