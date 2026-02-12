import mongoose from 'mongoose';

export async function connectDb() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/skylink');

  console.log('[backend] mongodb connected');
}
