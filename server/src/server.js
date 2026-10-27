// server/src/server.js
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import app from './app.js';
import { connectDB } from './config/db.js';

const PORT = process.env.PORT || 5000;

// Start HTTP server immediately
app.listen(PORT, () => {
  console.log(`🚀  MediSlot API listening on http://localhost:${PORT}`);
  console.log(`   Health → http://localhost:${PORT}/api/health`);
  console.log(`   Ping   → http://localhost:${PORT}/api/ping`);
});

// Then attempt DB connection
connectDB().catch((err) => {
  console.error('⚠️  Server is running WITHOUT database — booking features will fail.');
  console.error('   Set MONGO_URI in server/.env and restart.');
});
