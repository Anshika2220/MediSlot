// server/src/services/bookingService.js
import { fromZonedTime, toZonedTime, format } from 'date-fns-tz';
import { Doctor, Appointment, User } from '../models/index.js';
import {
  DEFAULT_TIMEZONE,
  timeToMinutes,
  intervalsOverlap,
  getDayOfWeekForDate,
} from './availabilityService.js';

/**
 * Validates whether a requested slot falls within the doctor's active schedule
 */
export function validateSlotWithinSchedule(doctor, slotStartDate, timezone = DEFAULT_TIMEZONE) {
  const localDate = toZonedTime(slotStartDate, timezone);
  const dateStr = format(localDate, 'yyyy-MM-dd', { timeZone: timezone });
  const dayOfWeek = getDayOfWeekForDate(dateStr, timezone);

  // 1. Check if doctor works on this day
  const schedule = doctor.weeklySchedule?.find((s) => s.dayOfWeek === dayOfWeek);
  if (!schedule || !schedule.isWorking) {
    const err = new Error(`Doctor does not work on this day (${format(localDate, 'EEEE')})`);
    err.statusCode = 400;
    throw err;
  }

  // 2. Check if doctor has blocked this single day (leave)
  const blocked = doctor.blockedDates?.find((b) => b.date === dateStr);
  if (blocked) {
    const err = new Error(`Doctor is on leave on ${dateStr}: ${blocked.reason}`);
    err.statusCode = 400;
    throw err;
  }

  // 3. Check slot start and end within daily working hours
  const slotStartMinutes = localDate.getHours() * 60 + localDate.getMinutes();
  const slotEndMinutes = slotStartMinutes + (doctor.slotDuration || 30);
  const workStartMinutes = timeToMinutes(schedule.startTime);
  const workEndMinutes = timeToMinutes(schedule.endTime);

  if (slotStartMinutes < workStartMinutes || slotEndMinutes > workEndMinutes) {
    const err = new Error(
      `Requested time ${format(localDate, 'HH:mm')} is outside doctor's working hours (${schedule.startTime} - ${schedule.endTime})`
    );
    err.statusCode = 400;
    throw err;
  }

  // 4. Check if slot overlaps with doctor's breaks (e.g. lunch)
  const inBreak = (schedule.breaks || []).some((b) =>
    intervalsOverlap(
      slotStartMinutes,
      slotEndMinutes,
      timeToMinutes(b.startTime),
      timeToMinutes(b.endTime)
    )
  );

  if (inBreak) {
    const err = new Error('Requested time falls during the doctor’s break period');
    err.statusCode = 400;
    throw err;
  }

  return { dateStr, slotStartMinutes, slotEndMinutes };
}

/**
 * 1. Book an Appointment
 * Concurrency strategy: Database-level compound partial unique index on { doctorId: 1, slotStartTime: 1 }
 * When a collision occurs, MongoDB atomically raises an E11000 duplicate key error.
 */
export async function bookAppointment({
  patientId,
  doctorId,
  slotStartTime,
  reason = 'General Consultation',
  now = new Date(),
  timezone = DEFAULT_TIMEZONE,
}) {
  const patient = await User.findById(patientId);
  if (!patient) {
    const err = new Error('Patient not found');
    err.statusCode = 404;
    throw err;
  }

  const doctor = await Doctor.findById(doctorId);
  if (!doctor) {
    const err = new Error('Doctor not found');
    err.statusCode = 404;
    throw err;
  }

  const slotStartDate = new Date(slotStartTime);
  if (isNaN(slotStartDate.getTime())) {
    const err = new Error('Invalid slot start time date format');
    err.statusCode = 400;
    throw err;
  }

  // Booking correctness: Never offer or book past slots
  if (slotStartDate.getTime() <= now.getTime()) {
    const err = new Error('Cannot book an appointment for a past time');
    err.statusCode = 400;
    throw err;
  }

  // Verify slot adheres to doctor's schedule, breaks, and leaves
  validateSlotWithinSchedule(doctor, slotStartDate, timezone);

  // Compute end time based on doctor's slot duration
  const durationMs = (doctor.slotDuration || 30) * 60 * 1000;
  const slotEndDate = new Date(slotStartDate.getTime() + durationMs);

  try {
    const appointment = await Appointment.create({
      patientId,
      doctorId,
      slotStartTime: slotStartDate,
      slotEndTime: slotEndDate,
      status: 'booked',
      reason,
    });

    return await Appointment.findById(appointment._id)
      .populate('patientId', 'name email phone')
      .populate('doctorId', 'name specialty consultationFee slotDuration');
  } catch (err) {
    // E11000 Duplicate Key Error from the MongoDB unique index
    if (err.code === 11000) {
      const conflictErr = new Error(
        'This appointment slot has already been reserved by another patient. Please select another slot.'
      );
      conflictErr.statusCode = 409;
      throw conflictErr;
    }
    throw err;
  }
}

/**
 * 2. Cancel an Appointment
 * Server-side restriction: Cannot cancel if fewer than 2 hours remain before start time.
 */
export async function cancelAppointment({
  appointmentId,
  userId,
  userRole = 'patient',
  reason = 'Cancelled by user',
  now = new Date(),
}) {
  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    const err = new Error('Appointment not found');
    err.statusCode = 404;
    throw err;
  }

  // Check authorization / ownership
  if (userRole === 'patient' && appointment.patientId.toString() !== userId.toString()) {
    const err = new Error('You are not authorized to cancel this appointment');
    err.statusCode = 403;
    throw err;
  }

  if (appointment.status === 'cancelled') {
    const err = new Error('Appointment is already cancelled');
    err.statusCode = 400;
    throw err;
  }

  if (appointment.status === 'completed') {
    const err = new Error('Cannot cancel a completed appointment');
    err.statusCode = 400;
    throw err;
  }

  // 2-hour cancellation rule
  const twoHoursMs = 2 * 60 * 60 * 1000;
  const timeDifferenceMs = appointment.slotStartTime.getTime() - now.getTime();

  if (timeDifferenceMs < twoHoursMs) {
    const err = new Error(
      'Appointments cannot be cancelled fewer than 2 hours before the start time'
    );
    err.statusCode = 400;
    throw err;
  }

  appointment.status = 'cancelled';
  appointment.cancellationReason = reason;
  appointment.cancelledAt = now;
  appointment.cancelledBy = userId;

  await appointment.save();

  return appointment;
}

/**
 * 3. Reschedule an Appointment
 * Server-side restriction: Cannot reschedule if fewer than 2 hours remain before existing start time.
 */
export async function rescheduleAppointment({
  appointmentId,
  newSlotStartTime,
  userId,
  userRole = 'patient',
  reason = 'Rescheduled by user',
  now = new Date(),
  timezone = DEFAULT_TIMEZONE,
}) {
  const existingAppointment = await Appointment.findById(appointmentId);
  if (!existingAppointment) {
    const err = new Error('Appointment not found');
    err.statusCode = 404;
    throw err;
  }

  // Check authorization
  if (userRole === 'patient' && existingAppointment.patientId.toString() !== userId.toString()) {
    const err = new Error('You are not authorized to reschedule this appointment');
    err.statusCode = 403;
    throw err;
  }

  if (existingAppointment.status !== 'booked') {
    const err = new Error(`Cannot reschedule an appointment with status '${existingAppointment.status}'`);
    err.statusCode = 400;
    throw err;
  }

  // 2-hour reschedule restriction
  const twoHoursMs = 2 * 60 * 60 * 1000;
  const timeDifferenceMs = existingAppointment.slotStartTime.getTime() - now.getTime();

  if (timeDifferenceMs < twoHoursMs) {
    const err = new Error(
      'Appointments cannot be rescheduled fewer than 2 hours before the start time'
    );
    err.statusCode = 400;
    throw err;
  }

  const newStartDate = new Date(newSlotStartTime);
  if (newStartDate.getTime() <= now.getTime()) {
    const err = new Error('Cannot reschedule to a past time slot');
    err.statusCode = 400;
    throw err;
  }

  const doctor = await Doctor.findById(existingAppointment.doctorId);
  validateSlotWithinSchedule(doctor, newStartDate, timezone);

  const durationMs = (doctor.slotDuration || 30) * 60 * 1000;
  const newEndDate = new Date(newStartDate.getTime() + durationMs);

  // Step 1: Create new appointment first to safely verify concurrency & uniqueness
  let newAppointment;
  try {
    newAppointment = await Appointment.create({
      patientId: existingAppointment.patientId,
      doctorId: existingAppointment.doctorId,
      slotStartTime: newStartDate,
      slotEndTime: newEndDate,
      status: 'booked',
      reason: reason || existingAppointment.reason,
      rescheduledFrom: existingAppointment._id,
    });
  } catch (err) {
    if (err.code === 11000) {
      const conflictErr = new Error('The target reschedule slot is already booked. Please choose another slot.');
      conflictErr.statusCode = 409;
      throw conflictErr;
    }
    throw err;
  }

  // Step 2: Cancel old appointment (frees old slot in unique index)
  existingAppointment.status = 'cancelled';
  existingAppointment.cancellationReason = `Rescheduled to ${newStartDate.toISOString()}`;
  existingAppointment.cancelledAt = now;
  existingAppointment.cancelledBy = userId;
  await existingAppointment.save();

  return await Appointment.findById(newAppointment._id)
    .populate('patientId', 'name email phone')
    .populate('doctorId', 'name specialty consultationFee slotDuration');
}

/**
 * 4. Update Appointment Status (Doctor endpoint)
 * Allows marking status as 'completed' or 'no-show'
 */
export async function updateAppointmentStatus({ appointmentId, doctorId, status, notes = '' }) {
  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    const err = new Error('Appointment not found');
    err.statusCode = 404;
    throw err;
  }

  // Verify doctor ownership
  if (doctorId && appointment.doctorId.toString() !== doctorId.toString()) {
    const err = new Error('You are not authorized to update this appointment');
    err.statusCode = 403;
    throw err;
  }

  if (appointment.status === 'cancelled') {
    const err = new Error('Cannot update status of a cancelled appointment');
    err.statusCode = 400;
    throw err;
  }

  appointment.status = status;
  if (notes) {
    appointment.notes = notes;
  }

  await appointment.save();
  return appointment;
}

/**
 * 5. Get Patient Appointments (Upcoming and Past)
 */
export async function getPatientAppointments(patientId, now = new Date()) {
  const appointments = await Appointment.find({ patientId })
    .populate('doctorId', 'name specialty consultationFee slotDuration')
    .sort({ slotStartTime: -1 })
    .lean();

  const upcoming = [];
  const past = [];

  for (const appt of appointments) {
    const isUpcoming =
      new Date(appt.slotStartTime).getTime() >= now.getTime() && appt.status === 'booked';
    if (isUpcoming) {
      upcoming.push(appt);
    } else {
      past.push(appt);
    }
  }

  // Sort upcoming chronologically ascending
  upcoming.sort((a, b) => new Date(a.slotStartTime) - new Date(b.slotStartTime));

  return { upcoming, past, total: appointments.length };
}

/**
 * 6. Get Doctor's Today Appointments (Chronological order)
 */
export async function getDoctorTodayAppointments(doctorId, timezone = DEFAULT_TIMEZONE, now = new Date()) {
  const localToday = toZonedTime(now, timezone);
  const todayStr = format(localToday, 'yyyy-MM-dd', { timeZone: timezone });

  const dayStartUtc = fromZonedTime(`${todayStr} 00:00:00`, timezone);
  const dayEndUtc = fromZonedTime(`${todayStr} 23:59:59`, timezone);

  const appointments = await Appointment.find({
    doctorId,
    slotStartTime: { $gte: dayStartUtc, $lte: dayEndUtc },
  })
    .populate('patientId', 'name email phone')
    .sort({ slotStartTime: 1 }) // Chronological order
    .lean();

  return {
    date: todayStr,
    count: appointments.length,
    appointments,
  };
}
