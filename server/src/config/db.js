// server/src/config/db.js
// Mongoose connection helper.
// Does NOT call process.exit() — server.js decides what to do on failure.

import mongoose from 'mongoose';

export async function connectDB() {
  const conn = await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
  });
  console.log(`✅  MongoDB connected: ${conn.connection.host}`);
  return conn;
}
