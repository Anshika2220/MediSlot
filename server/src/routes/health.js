// server/src/routes/health.js
// Simple health-check endpoint — no auth, no DB required.
// Used by the frontend to verify the API is reachable.
// Also used by load-balancers / uptime monitors.

import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'MediSlot API is running 🏥',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
  });
});

export default router;
