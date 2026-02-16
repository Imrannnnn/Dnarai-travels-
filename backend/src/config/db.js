import mongoose from 'mongoose';

export async function connectDb() {
  mongoose.set('strictQuery', true);

  const options = {
    serverSelectionTimeoutMS: 15000, // Timeout after 15s instead of 30s
    family: 4, // Force IPv4 to avoid Atlas connection issues on some networks
  };

  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/skylink';

  console.log('[backend] connecting to mongodb...');

  try {
    await mongoose.connect(uri, options);
    console.log('[backend] mongodb connected');
  } catch (err) {
    console.error('[backend] mongodb connection error:', err.message);
    // Let the caller handle it or let the process crash for the watcher to restart
    throw err;
  }
}
