// server/src/server.js
// Entry point.
// Strategy: Start the HTTP server first so /api/health is always reachable,
// then connect to MongoDB. If the DB connection fails, we log an error
// but keep serving (routes that need DB will fail gracefully per-request).

import 'dotenv/config';
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
