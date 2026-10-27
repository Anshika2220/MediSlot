// server/src/routes/doctorRoutes.js
import { Router } from 'express';
import {
  getDoctors,
  getDoctorById,
  getDoctorAvailability,
  updateDoctorAvailability,
} from '../controllers/doctorController.js';
import { validate } from '../middleware/validate.js';
import {
  getAvailableSlotsQuerySchema,
  updateAvailabilitySchema,
} from '../validators/doctorValidator.js';

const router = Router();

router.get('/', getDoctors);
router.get('/:id', getDoctorById);
router.get('/:id/availability', validate(getAvailableSlotsQuerySchema, 'query'), getDoctorAvailability);
router.put('/:id/availability', validate(updateAvailabilitySchema, 'body'), updateDoctorAvailability);

export default router;
