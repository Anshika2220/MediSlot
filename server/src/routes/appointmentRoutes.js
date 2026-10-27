// server/src/routes/appointmentRoutes.js
import { Router } from 'express';
import {
  getSlotsEndpoint,
  bookAppointmentEndpoint,
  getMyAppointmentsEndpoint,
  getDoctorTodayEndpoint,
  cancelAppointmentEndpoint,
  rescheduleAppointmentEndpoint,
  updateStatusEndpoint,
} from '../controllers/appointmentController.js';
import { validate } from '../middleware/validate.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { getAvailableSlotsQuerySchema } from '../validators/doctorValidator.js';
import {
  createAppointmentSchema,
  cancelAppointmentSchema,
  rescheduleAppointmentSchema,
  updateStatusSchema,
} from '../validators/appointmentValidator.js';

const router = Router();

// 1. Get Available Slots (Public for browsing & AI chatbot)
router.get('/available-slots', validate(getAvailableSlotsQuerySchema, 'query'), getSlotsEndpoint);

// 2. Book an Appointment (Patient only)
router.post(
  '/',
  authenticate,
  authorize('patient'),
  validate(createAppointmentSchema, 'body'),
  bookAppointmentEndpoint
);

// 3. Get Patient's upcoming and past appointments (Patient only)
router.get('/my', authenticate, authorize('patient'), getMyAppointmentsEndpoint);

// 4. Get Doctor's appointments for today (Doctor only)
router.get('/doctor/today', authenticate, authorize('doctor'), getDoctorTodayEndpoint);

// 5. Cancel an Appointment (Patient or Doctor)
router.patch(
  '/:id/cancel',
  authenticate,
  validate(cancelAppointmentSchema, 'body'),
  cancelAppointmentEndpoint
);

// 6. Reschedule an Appointment (Patient only)
router.patch(
  '/:id/reschedule',
  authenticate,
  authorize('patient'),
  validate(rescheduleAppointmentSchema, 'body'),
  rescheduleAppointmentEndpoint
);

// 7. Update Status: 'completed' or 'no-show' (Doctor only)
router.patch(
  '/:id/status',
  authenticate,
  authorize('doctor'),
  validate(updateStatusSchema, 'body'),
  updateStatusEndpoint
);

export default router;
