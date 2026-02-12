import mongoose from 'mongoose';
import { User } from './models/User.js';
import { Passenger } from './models/Passenger.js';
import dotenv from 'dotenv';

dotenv.config();

async function cleanup() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/DNaraiEnterprise';
    await mongoose.connect(uri);
    console.log('Connected to MongoDB for cleanup...');

    // Find all users with role 'passenger'
    const passengerUsers = await User.find({ role: 'passenger' });
    console.log(`Found ${passengerUsers.length} total passenger users.`);

    let deletedCount = 0;
    for (const user of passengerUsers) {
      // Check if the associated passenger exists
      const passenger = await Passenger.findById(user.passengerId);
      if (!passenger) {
        console.log(`Found orphaned user: ${user.email}. Deleting...`);
        await User.findByIdAndDelete(user._id);
        deletedCount++;
      }
    }

    console.log(`Cleanup complete. Deleted ${deletedCount} orphaned users.`);
    process.exit(0);
  } catch (err) {
    console.error('Cleanup failed:', err);
    process.exit(1);
  }
}

cleanup();
