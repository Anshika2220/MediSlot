// server/src/services/availabilityService.js
import { fromZonedTime, toZonedTime, format } from 'date-fns-tz';
import { Doctor, Appointment } from '../models/index.js';

export const DEFAULT_TIMEZONE = process.env.CLINIC_TIMEZONE || 'Asia/Kolkata';

/**
 * Converts "HH:mm" string to minutes from midnight
 */
export function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Converts minutes from midnight to "HH:mm"
 */
export function minutesToTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, '0');
  const minutes = (totalMinutes % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Checks if two time intervals [startA, endA) and [startB, endB) overlap
 */
export function intervalsOverlap(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

/**
 * Determines day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday) for YYYY-MM-DD
 * in the specified timezone.
 */
export function getDayOfWeekForDate(dateStr, timezone = DEFAULT_TIMEZONE) {
  // Use 12:00 (midday) in the clinic timezone to eliminate edge-of-day DST / UTC shifts
  const middayZoned = fromZonedTime(`${dateStr} 12:00:00`, timezone);
  const localDate = toZonedTime(middayZoned, timezone);
  return localDate.getDay();
}

/**
 * Core Slot Generation Function (Pure business logic)
 *
 * @param {Object} doctor Doctor document or plain object
 * @param {string} dateStr "YYYY-MM-DD"
 * @param {Object} options
 * @param {Array}  options.existingAppointments Active appointments booked for this doctor
 * @param {Date}   options.now Current time (used to filter out past slots)
 * @param {string} options.timezone Clinic timezone
 * @returns {Object} { date, isWorking, reason, slots }
 */
export function generateSlots({
  doctor,
  dateStr,
  existingAppointments = [],
  now = new Date(),
  timezone = DEFAULT_TIMEZONE,
}) {
  const dayOfWeek = getDayOfWeekForDate(dateStr, timezone);
  const scheduleForDay = doctor.weeklySchedule?.find((s) => s.dayOfWeek === dayOfWeek);

  // 1. Check if doctor works on this day of week
  if (!scheduleForDay || !scheduleForDay.isWorking) {
    return {
      date: dateStr,
      dayOfWeek,
      isWorking: false,
      reason: 'Doctor does not work on this day of the week',
      slots: [],
    };
  }

  // 2. Check if the date is explicitly blocked (single-day leave or holiday)
  const blockedDate = doctor.blockedDates?.find((b) => b.date === dateStr);
  if (blockedDate) {
    return {
      date: dateStr,
      dayOfWeek,
      isWorking: false,
      reason: blockedDate.reason || 'Doctor is on leave on this date',
      slots: [],
    };
  }

  const duration = doctor.slotDuration || 30; // 15 or 30 minutes
  const workStartMinutes = timeToMinutes(scheduleForDay.startTime);
  const workEndMinutes = timeToMinutes(scheduleForDay.endTime);

  const breaks = (scheduleForDay.breaks || []).map((b) => ({
    startMinutes: timeToMinutes(b.startTime),
    endMinutes: timeToMinutes(b.endTime),
    label: b.label || 'Break',
  }));

  // Parse existing occupied appointments for fast comparison
  // Only appointments with status in ['booked', 'completed', 'no-show'] occupy a slot.
  // 'cancelled' appointments do NOT occupy a slot.
  const occupiedIntervals = existingAppointments
    .filter((a) => ['booked', 'completed', 'no-show'].includes(a.status))
    .map((a) => {
      const startUtc = new Date(a.slotStartTime).getTime();
      const endUtc = new Date(a.slotEndTime).getTime();
      return { startUtc, endUtc };
    });

  const slots = [];
  const currentNowUtc = now.getTime();

  for (let current = workStartMinutes; current + duration <= workEndMinutes; current += duration) {
    const slotStartStr = minutesToTime(current);
    const slotEndStr = minutesToTime(current + duration);

    // Check if slot overlaps with any scheduled break (e.g. Lunch)
    const inBreak = breaks.some((b) =>
      intervalsOverlap(current, current + duration, b.startMinutes, b.endMinutes)
    );
    if (inBreak) {
      continue; // Skip break slots completely
    }

    // Convert slot start and end to UTC Date objects
    const slotStartUtcDate = fromZonedTime(`${dateStr} ${slotStartStr}:00`, timezone);
    const slotEndUtcDate = fromZonedTime(`${dateStr} ${slotEndStr}:00`, timezone);
    const slotStartUtc = slotStartUtcDate.getTime();
    const slotEndUtc = slotEndUtcDate.getTime();

    // Condition A: Never offer past slots
    const isPast = slotStartUtc <= currentNowUtc;
    if (isPast) {
      continue; // Do not offer slots that have already passed
    }

    // Condition B: Check if slot overlaps with an existing appointment
    const isOccupied = occupiedIntervals.some((occ) =>
      intervalsOverlap(slotStartUtc, slotEndUtc, occ.startUtc, occ.endUtc)
    );

    if (isOccupied) {
      continue; // Occupied slots are excluded from free available slots
    }

    slots.push({
      startTime: slotStartStr,
      endTime: slotEndStr,
      slotStartTime: slotStartUtcDate.toISOString(),
      slotEndTime: slotEndUtcDate.toISOString(),
      duration,
      available: true,
    });
  }

  return {
    date: dateStr,
    dayOfWeek,
    isWorking: true,
    reason: null,
    totalSlots: slots.length,
    slots,
  };
}

/**
 * Service to retrieve available slots for a given doctor and date from the database
 */
export async function getAvailableSlots(doctorId, dateStr, timezone = DEFAULT_TIMEZONE) {
  const doctor = await Doctor.findById(doctorId);
  if (!doctor) {
    const error = new Error('Doctor not found');
    error.statusCode = 404;
    throw error;
  }

  // Find start and end of that date in UTC to query MongoDB efficiently
  const dayStartUtc = fromZonedTime(`${dateStr} 00:00:00`, timezone);
  const dayEndUtc = fromZonedTime(`${dateStr} 23:59:59`, timezone);

  const existingAppointments = await Appointment.find({
    doctorId,
    slotStartTime: { $gte: dayStartUtc, $lte: dayEndUtc },
    status: { $in: ['booked', 'completed', 'no-show'] },
  }).lean();

  const result = generateSlots({
    doctor,
    dateStr,
    existingAppointments,
    now: new Date(),
    timezone,
  });

  return {
    doctor: {
      id: doctor._id,
      name: doctor.name,
      specialty: doctor.specialty,
      consultationFee: doctor.consultationFee,
      slotDuration: doctor.slotDuration,
    },
    ...result,
  };
}
