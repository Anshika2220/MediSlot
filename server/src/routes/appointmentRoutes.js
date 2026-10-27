// server/src/routes/appointmentRoutes.js
import { Router } from 'express';
import { getSlotsEndpoint } from '../controllers/appointmentController.js';
import { validate } from '../middleware/validate.js';
import { getAvailableSlotsQuerySchema } from '../validators/doctorValidator.js';

const router = Router();

// GET /api/appointments/available-slots?doctorId=...&date=YYYY-MM-DD
router.get('/available-slots', validate(getAvailableSlotsQuerySchema, 'query'), getSlotsEndpoint);

export default router;
