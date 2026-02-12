import { connectDb } from '../config/db.js';
import { User } from '../models/User.js';

async function createSuperAdmin() {
  await connectDb();

  const email = process.env.EMAIL;
  const password = process.env.SUPER_PASSWORD;

  const exists = await User.findOne({ email });

  if (exists) {
    console.log('Super admin already exists.');
    process.exit(0);
  }

  const passwordHash = await User.hashPassword(password);

  await User.create({
    email,
    passwordHash,
    role: 'admin',
  });

  console.log('Super admin created:', email);
  process.exit(0);
}

createSuperAdmin().catch((err) => {
  console.error('Failed to create super admin:', err);
  process.exit(1);
});
