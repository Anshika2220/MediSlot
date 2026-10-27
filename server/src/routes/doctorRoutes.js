// server/src/routes/doctorRoutes.js
import { Router } from 'express';
import {
  getDoctors,
  getDoctorById,
  getDoctorAvailability,
  updateDoctorAvailability,
} from '../controllers/doctorController.js';
import { validate } from '../middleware/validate.js';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  getAvailableSlotsQuerySchema,
  updateAvailabilitySchema,
} from '../validators/doctorValidator.js';

const router = Router();

// Public doctor browsing
router.get('/', getDoctors);
router.get('/:id', getDoctorById);
router.get('/:id/availability', validate(getAvailableSlotsQuerySchema, 'query'), getDoctorAvailability);

// Doctor availability update: requires doctor login and ownership
router.put(
  '/:id/availability',
  authenticate,
  authorize('doctor'),
  validate(updateAvailabilitySchema, 'body'),
  updateDoctorAvailability
);

export default router;
