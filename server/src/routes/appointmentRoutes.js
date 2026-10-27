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
import { getAvailableSlotsQuerySchema } from '../validators/doctorValidator.js';
import {
  createAppointmentSchema,
  cancelAppointmentSchema,
  rescheduleAppointmentSchema,
  updateStatusSchema,
} from '../validators/appointmentValidator.js';

const router = Router();

// 1. Get Available Slots (Patients & AI chatbot)
router.get('/available-slots', validate(getAvailableSlotsQuerySchema, 'query'), getSlotsEndpoint);

// 2. Book an Appointment
router.post('/', validate(createAppointmentSchema, 'body'), bookAppointmentEndpoint);

// 3. Get Patient's upcoming and past appointments
router.get('/my', getMyAppointmentsEndpoint);

// 4. Get Doctor's appointments for today
router.get('/doctor/today', getDoctorTodayEndpoint);

// 5. Cancel an Appointment (subject to 2-hour restriction)
router.patch('/:id/cancel', validate(cancelAppointmentSchema, 'body'), cancelAppointmentEndpoint);

// 6. Reschedule an Appointment (subject to 2-hour restriction)
router.patch('/:id/reschedule', validate(rescheduleAppointmentSchema, 'body'), rescheduleAppointmentEndpoint);

// 7. Update Status: 'completed' or 'no-show' (Doctor endpoint)
router.patch('/:id/status', validate(updateStatusSchema, 'body'), updateStatusEndpoint);

export default router;
