import { connectDb } from './src/config/db.js';
import { User } from './src/models/User.js';
import dotenv from 'dotenv';

dotenv.config();

async function check() {
    await connectDb();
    let users = await User.find({ "pushSubscriptions.0": { $exists: true } });
    console.log("Users with subscriptions:", users.map(u => ({ email: u.email, count: u.pushSubscriptions.length })));
    process.exit(0);
}
check();
