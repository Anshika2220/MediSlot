// server/src/controllers/appointmentController.js
import { getAvailableSlots } from '../services/availabilityService.js';
import * as bookingService from '../services/bookingService.js';

/**
 * GET /api/appointments/available-slots?doctorId=...&date=YYYY-MM-DD
 */
export async function getSlotsEndpoint(req, res, next) {
  try {
    const { doctorId, date } = req.query;
    if (!doctorId) {
      return res.status(400).json({
        success: false,
        message: 'doctorId query parameter is required',
      });
    }

    const availability = await getAvailableSlots(doctorId, date);
    res.json({
      success: true,
      data: availability,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/appointments
 * Book a new appointment
 */
export async function bookAppointmentEndpoint(req, res, next) {
  try {
    const { doctorId, slotStartTime, reason } = req.body;
    // Extract patient ID from auth token or fallback header/body for testability
    const patientId = req.user?._id || req.body.patientId || req.headers['x-user-id'];

    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: 'patientId is required to book an appointment',
      });
    }

    const appointment = await bookingService.bookAppointment({
      patientId,
      doctorId,
      slotStartTime,
      reason,
    });

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully',
      data: appointment,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/appointments/my
 * View upcoming and past appointments for logged-in patient
 */
export async function getMyAppointmentsEndpoint(req, res, next) {
  try {
    const patientId = req.user?._id || req.query.patientId || req.headers['x-user-id'];

    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: 'patientId is required',
      });
    }

    const result = await bookingService.getPatientAppointments(patientId);

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/appointments/doctor/today
 * View today's appointments in chronological order for doctor
 */
export async function getDoctorTodayEndpoint(req, res, next) {
  try {
    const doctorId = req.user?.doctorId || req.query.doctorId || req.headers['x-doctor-id'];

    if (!doctorId) {
      return res.status(400).json({
        success: false,
        message: 'doctorId is required',
      });
    }

    const result = await bookingService.getDoctorTodayAppointments(doctorId);

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/appointments/:id/cancel
 * Cancel an appointment (enforces 2-hour rule)
 */
export async function cancelAppointmentEndpoint(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user?._id || req.body.userId || req.headers['x-user-id'];
    const userRole = req.user?.role || req.body.role || 'patient';

    const appointment = await bookingService.cancelAppointment({
      appointmentId: id,
      userId,
      userRole,
      reason,
    });

    res.json({
      success: true,
      message: 'Appointment cancelled successfully',
      data: appointment,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/appointments/:id/reschedule
 * Reschedule an appointment (enforces 2-hour rule & concurrency protection)
 */
export async function rescheduleAppointmentEndpoint(req, res, next) {
  try {
    const { id } = req.params;
    const { newSlotStartTime, reason } = req.body;
    const userId = req.user?._id || req.body.userId || req.headers['x-user-id'];
    const userRole = req.user?.role || req.body.role || 'patient';

    const appointment = await bookingService.rescheduleAppointment({
      appointmentId: id,
      newSlotStartTime,
      userId,
      userRole,
      reason,
    });

    res.json({
      success: true,
      message: 'Appointment rescheduled successfully',
      data: appointment,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/appointments/:id/status
 * Mark appointment as 'completed' or 'no-show' (Doctor endpoint)
 */
export async function updateStatusEndpoint(req, res, next) {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const doctorId = req.user?.doctorId || req.body.doctorId || req.headers['x-doctor-id'];

    const appointment = await bookingService.updateAppointmentStatus({
      appointmentId: id,
      doctorId,
      status,
      notes,
    });

    res.json({
      success: true,
      message: `Appointment marked as ${status}`,
      data: appointment,
    });
  } catch (err) {
    next(err);
  }
}
