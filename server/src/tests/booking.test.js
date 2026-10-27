// server/src/tests/booking.test.js
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { connectDB } from '../config/db.js';
import { Doctor, User, Appointment } from '../models/index.js';
import * as bookingService from '../services/bookingService.js';
import { fromZonedTime } from 'date-fns-tz';
import mongoose from 'mongoose';

const TIMEZONE = 'Asia/Kolkata';
const TEST_DATE_STR = '2026-11-18'; // Future Wednesday

describe('Phase 4: Booking, Cancellation, Rescheduling & Concurrency Tests', () => {
  let patient;
  let doctor;

  // Cleanup helper for the test date to guarantee test isolation
  async function cleanupTestAppointments() {
    if (!doctor) return;
    const testDateStart = fromZonedTime(`${TEST_DATE_STR} 00:00:00`, TIMEZONE);
    const testDateEnd = fromZonedTime(`${TEST_DATE_STR} 23:59:59`, TIMEZONE);
    await Appointment.deleteMany({
      doctorId: doctor._id,
      slotStartTime: { $gte: testDateStart, $lte: testDateEnd },
    });
  }

  beforeAll(async () => {
    await connectDB();
    patient = await User.findOne({ role: 'patient' });
    doctor = await Doctor.findOne({ specialty: 'Cardiology' });
    await cleanupTestAppointments();
  }, 30000);

  afterAll(async () => {
    await cleanupTestAppointments();
    await mongoose.disconnect();
  }, 30000);

  beforeEach(async () => {
    await cleanupTestAppointments();
  });

  it('1. Successfully books a valid future appointment slot', async () => {
    const slotStartTime = fromZonedTime(`${TEST_DATE_STR} 10:00:00`, TIMEZONE).toISOString();

    const appointment = await bookingService.bookAppointment({
      patientId: patient._id,
      doctorId: doctor._id,
      slotStartTime,
      reason: 'General Heart Checkup',
      now: new Date('2026-11-01T00:00:00Z'),
    });

    expect(appointment).toBeDefined();
    expect(appointment.status).toBe('booked');
    expect(appointment.doctorId.name).toBe('Dr. Sarah Jenkins');
    expect(appointment.reason).toBe('General Heart Checkup');
  });

  it('2. Prevents simultaneous double-booking via database compound unique index', async () => {
    const collisionSlotTime = fromZonedTime(`${TEST_DATE_STR} 10:30:00`, TIMEZONE).toISOString();

    // Patient 1 books the slot first
    const appt1 = await bookingService.bookAppointment({
      patientId: patient._id,
      doctorId: doctor._id,
      slotStartTime: collisionSlotTime,
      reason: 'Initial reservation',
      now: new Date('2026-11-01T00:00:00Z'),
    });
    expect(appt1.status).toBe('booked');

    // Attempt concurrent double-booking of the exact same doctor and slot
    let error;
    try {
      await bookingService.bookAppointment({
        patientId: patient._id,
        doctorId: doctor._id,
        slotStartTime: collisionSlotTime,
        reason: 'Simultaneous duplicate booking attempt',
        now: new Date('2026-11-01T00:00:00Z'),
      });
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.statusCode).toBe(409); // 409 Conflict
    expect(error.message).toContain('already been reserved');
  });

  it('3. Rejects booking appointments in the past', async () => {
    const pastSlotTime = fromZonedTime('2026-10-01 10:00:00', TIMEZONE).toISOString();
    const fixedNow = new Date('2026-10-20T00:00:00Z');

    let error;
    try {
      await bookingService.bookAppointment({
        patientId: patient._id,
        doctorId: doctor._id,
        slotStartTime: pastSlotTime,
        now: fixedNow,
      });
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.statusCode).toBe(400);
    expect(error.message).toContain('past');
  });

  it('4. Enforces 2-hour cancellation rule: rejects cancellation if fewer than 2 hours remain', async () => {
    const slotTime = fromZonedTime(`${TEST_DATE_STR} 14:00:00`, TIMEZONE);

    // Create an appointment at 14:00
    const appt = await bookingService.bookAppointment({
      patientId: patient._id,
      doctorId: doctor._id,
      slotStartTime: slotTime.toISOString(),
      now: new Date('2026-11-01T00:00:00Z'),
    });

    // Attempt cancellation at 12:30 on the same day (1.5 hours before start)
    const simulatedNow = fromZonedTime(`${TEST_DATE_STR} 12:30:00`, TIMEZONE);

    let error;
    try {
      await bookingService.cancelAppointment({
        appointmentId: appt._id,
        userId: patient._id,
        userRole: 'patient',
        now: simulatedNow,
      });
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.statusCode).toBe(400);
    expect(error.message).toContain('fewer than 2 hours');
  });

  it('5. Successfully cancels appointment when > 2 hours remain and frees the slot', async () => {
    const slotTime = fromZonedTime(`${TEST_DATE_STR} 15:00:00`, TIMEZONE);

    const appt = await bookingService.bookAppointment({
      patientId: patient._id,
      doctorId: doctor._id,
      slotStartTime: slotTime.toISOString(),
      now: new Date('2026-11-01T00:00:00Z'),
    });

    // Cancel 5 hours in advance
    const simulatedNow = fromZonedTime(`${TEST_DATE_STR} 10:00:00`, TIMEZONE);
    const cancelled = await bookingService.cancelAppointment({
      appointmentId: appt._id,
      userId: patient._id,
      userRole: 'patient',
      reason: 'Schedule conflict',
      now: simulatedNow,
    });

    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.cancellationReason).toBe('Schedule conflict');

    // Verify the slot is now free to be re-booked!
    const rebooked = await bookingService.bookAppointment({
      patientId: patient._id,
      doctorId: doctor._id,
      slotStartTime: slotTime.toISOString(),
      reason: 'Rebooking previously cancelled slot',
      now: simulatedNow,
    });

    expect(rebooked.status).toBe('booked');
  });

  it('6. Enforces 2-hour rescheduling rule and successfully reschedules when valid', async () => {
    const oldSlotTime = fromZonedTime(`${TEST_DATE_STR} 11:00:00`, TIMEZONE);
    const newSlotTime = fromZonedTime(`${TEST_DATE_STR} 16:00:00`, TIMEZONE);

    const appt = await bookingService.bookAppointment({
      patientId: patient._id,
      doctorId: doctor._id,
      slotStartTime: oldSlotTime.toISOString(),
      now: new Date('2026-11-01T00:00:00Z'),
    });

    // 1 day before
    const simulatedNow = fromZonedTime('2026-11-17 10:00:00', TIMEZONE);
    const rescheduled = await bookingService.rescheduleAppointment({
      appointmentId: appt._id,
      newSlotStartTime: newSlotTime.toISOString(),
      userId: patient._id,
      userRole: 'patient',
      reason: 'Moved to afternoon',
      now: simulatedNow,
    });

    expect(rescheduled.status).toBe('booked');
    expect(new Date(rescheduled.slotStartTime).getTime()).toBe(newSlotTime.getTime());

    // Verify the old appointment was marked cancelled
    const oldAppt = await Appointment.findById(appt._id);
    expect(oldAppt.status).toBe('cancelled');
    expect(oldAppt.cancellationReason).toContain('Rescheduled');
  });

  it('7. Allows doctor to update appointment status to completed and no-show', async () => {
    const slotTime = fromZonedTime(`${TEST_DATE_STR} 11:30:00`, TIMEZONE);

    const appt = await bookingService.bookAppointment({
      patientId: patient._id,
      doctorId: doctor._id,
      slotStartTime: slotTime.toISOString(),
      now: new Date('2026-11-01T00:00:00Z'),
    });

    // Mark as completed
    const completed = await bookingService.updateAppointmentStatus({
      appointmentId: appt._id,
      doctorId: doctor._id,
      status: 'completed',
      notes: 'Patient examined. Prescription provided.',
    });

    expect(completed.status).toBe('completed');
    expect(completed.notes).toBe('Patient examined. Prescription provided.');
  });
});
