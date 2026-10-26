// server/src/config/db.js
// Mongoose connection helper.
//
// WHY dns.setServers:
//   On Windows machines with a VPN/corporate Ethernet interface the default
//   DNS servers (e.g. 10.x.x.x) block external SRV lookups needed by the
//   mongodb+srv:// URI scheme.  Setting public DNS (Google 8.8.8.8) as the
//   resolver for the Node process fixes "querySrv ECONNREFUSED" on Atlas.
//   This only affects the Node process — it does NOT change system DNS.

import dns from 'dns';
import mongoose from 'mongoose';

// Use public DNS resolvers so mongodb+srv SRV lookup works regardless of
// which network interface Windows routes the DNS traffic through.
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

export async function connectDB() {
  const conn = await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
    family: 4, // IPv4 only — avoids ::1 resolution issues on Windows
  });
  console.log(`✅  MongoDB connected: ${conn.connection.host}`);
  return conn;
}
