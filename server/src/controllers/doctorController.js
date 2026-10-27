// server/src/controllers/doctorController.js
import { Doctor } from '../models/index.js';
import { getAvailableSlots } from '../services/availabilityService.js';

/**
 * GET /api/doctors
 * Browse doctors with optional specialty filter
 */
export async function getDoctors(req, res, next) {
  try {
    const { specialty } = req.query;
    const filter = {};
    if (specialty) {
      filter.specialty = new RegExp(`^${specialty.trim()}$`, 'i');
    }

    const doctors = await Doctor.find(filter)
      .populate('userId', 'email phone')
      .sort({ name: 1 })
      .lean();

    res.json({
      success: true,
      count: doctors.length,
      data: doctors,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/doctors/:id
 * Retrieve doctor profile by ID
 */
export async function getDoctorById(req, res, next) {
  try {
    const doctor = await Doctor.findById(req.params.id)
      .populate('userId', 'email phone')
      .lean();

    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    res.json({
      success: true,
      data: doctor,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/doctors/:id/availability?date=YYYY-MM-DD
 * Retrieve available slots for a doctor on a specific date
 */
export async function getDoctorAvailability(req, res, next) {
  try {
    const { id } = req.params;
    const { date } = req.query;

    const availability = await getAvailableSlots(id, date);

    res.json({
      success: true,
      data: availability,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/doctors/:id/availability
 * Configure weekly schedule, slot duration (15/30), or blocked dates
 */
export async function updateDoctorAvailability(req, res, next) {
  try {
    const { id } = req.params;
    const { slotDuration, weeklySchedule, blockedDates } = req.body;

    const doctor = await Doctor.findById(id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    if (slotDuration !== undefined) {
      doctor.slotDuration = Number(slotDuration);
    }
    if (weeklySchedule !== undefined) {
      doctor.weeklySchedule = weeklySchedule;
    }
    if (blockedDates !== undefined) {
      doctor.blockedDates = blockedDates;
    }

    await doctor.save();

    res.json({
      success: true,
      message: 'Doctor availability and schedule updated successfully',
      data: doctor,
    });
  } catch (err) {
    next(err);
  }
}
