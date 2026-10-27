// server/src/controllers/appointmentController.js
import { getAvailableSlots } from '../services/availabilityService.js';

/**
 * GET /api/appointments/available-slots?doctorId=...&date=YYYY-MM-DD
 * Core slot search endpoint used by patient booking UI and AI chatbot
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
