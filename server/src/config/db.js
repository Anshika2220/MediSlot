// server/src/config/db.js
// Mongoose connection helper.
import dns from 'dns';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Ensure .env is always loaded regardless of execution context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Use public DNS resolvers so mongodb+srv SRV lookup works regardless of
// which network interface Windows routes the DNS traffic through.
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

export async function connectDB() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is missing in server/.env file');
  }

  const conn = await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
    family: 4, // IPv4 only — avoids ::1 resolution issues on Windows
  });
  console.log(`✅  MongoDB connected: ${conn.connection.host}`);
  return conn;
}
