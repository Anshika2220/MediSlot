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
  let otherPatient;
  let doctor;
  let otherDoctor;

  // Keep each suite's fixtures and appointment cleanup inside the test database.
  async function cleanupTestAppointments() {
    if (!doctor) return;
    const testDateStart = fromZonedTime(`${TEST_DATE_STR} 00:00:00`, TIMEZONE);
    const testDateEnd = fromZonedTime(`${TEST_DATE_STR} 23:59:59`, TIMEZONE);
    await Appointment.deleteMany({
      doctorId: { $in: [doctor._id, otherDoctor?._id].filter(Boolean) },
      slotStartTime: { $gte: testDateStart, $lte: testDateEnd },
    });
  }

  beforeAll(async () => {
    await connectDB();
    await Appointment.init();
    const suffix = Date.now();
    patient = await User.create({
      name: 'Booking Test Patient',
      email: `booking.patient.${suffix}@medislot.test`,
      password: 'test-password-123',
      role: 'patient',
    });
    otherPatient = await User.create({
      name: 'Other Booking Patient',
      email: `booking.other-patient.${suffix}@medislot.test`,
      password: 'test-password-123',
      role: 'patient',
    });
    const doctorUser = await User.create({
      name: 'Booking Test Doctor',
      email: `booking.doctor.${suffix}@medislot.test`,
      password: 'test-password-123',
      role: 'doctor',
    });
    const otherDoctorUser = await User.create({
      name: 'Other Booking Doctor',
      email: `booking.other-doctor.${suffix}@medislot.test`,
      password: 'test-password-123',
      role: 'doctor',
    });
    doctor = await Doctor.create({
      userId: doctorUser._id,
      name: 'Dr. Sarah Jenkins',
      specialty: 'Cardiology',
      slotDuration: 30,
    });
    otherDoctor = await Doctor.create({
      userId: otherDoctorUser._id,
      name: 'Other Test Doctor',
      specialty: 'Cardiology',
      slotDuration: 30,
    });
    await cleanupTestAppointments();
  }, 30000);

  afterAll(async () => {
    await cleanupTestAppointments();
    await Doctor.deleteMany({ _id: { $in: [doctor?._id, otherDoctor?._id].filter(Boolean) } });
    await User.deleteMany({
      _id: { $in: [patient?._id, otherPatient?._id, doctor?.userId, otherDoctor?.userId].filter(Boolean) },
    });
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

  it('2. Prevents concurrent double-booking via database compound unique index', async () => {
    const collisionSlotTime = fromZonedTime(`${TEST_DATE_STR} 10:30:00`, TIMEZONE).toISOString();

    const results = await Promise.allSettled([
      bookingService.bookAppointment({
        patientId: patient._id,
        doctorId: doctor._id,
        slotStartTime: collisionSlotTime,
        reason: 'Concurrent reservation one',
        now: new Date('2026-11-01T00:00:00Z'),
      }),
      bookingService.bookAppointment({
        patientId: otherPatient._id,
        doctorId: doctor._id,
        slotStartTime: collisionSlotTime,
        reason: 'Concurrent reservation two',
        now: new Date('2026-11-01T00:00:00Z'),
      }),
    ]);

    const successfulBookings = results.filter((result) => result.status === 'fulfilled');
    const failedBookings = results.filter((result) => result.status === 'rejected');
    expect(successfulBookings).toHaveLength(1);
    expect(successfulBookings[0].value.status).toBe('booked');
    expect(failedBookings).toHaveLength(1);
    expect(failedBookings[0].reason.statusCode).toBe(409);
    expect(failedBookings[0].reason.message).toContain('already been reserved');
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

  it('rejects rescheduling when fewer than two hours remain', async () => {
    const slotStartTime = fromZonedTime(`${TEST_DATE_STR} 11:00:00`, TIMEZONE);
    const appointment = await bookingService.bookAppointment({
      patientId: patient._id,
      doctorId: doctor._id,
      slotStartTime: slotStartTime.toISOString(),
      now: new Date('2026-11-01T00:00:00Z'),
    });

    await expect(
      bookingService.rescheduleAppointment({
        appointmentId: appointment._id,
        newSlotStartTime: fromZonedTime(`${TEST_DATE_STR} 16:00:00`, TIMEZONE).toISOString(),
        userId: patient._id,
        now: fromZonedTime(`${TEST_DATE_STR} 09:30:00`, TIMEZONE),
      })
    ).rejects.toMatchObject({ statusCode: 400, message: expect.stringContaining('fewer than 2 hours') });
  });

  it('prevents a doctor from cancelling another doctor’s appointment', async () => {
    const appointment = await bookingService.bookAppointment({
      patientId: patient._id,
      doctorId: doctor._id,
      slotStartTime: fromZonedTime(`${TEST_DATE_STR} 14:00:00`, TIMEZONE).toISOString(),
      now: new Date('2026-11-01T00:00:00Z'),
    });

    await expect(
      bookingService.cancelAppointment({
        appointmentId: appointment._id,
        userId: otherDoctor.userId,
        userRole: 'doctor',
        doctorId: otherDoctor._id,
        now: fromZonedTime(`${TEST_DATE_STR} 10:00:00`, TIMEZONE),
      })
    ).rejects.toMatchObject({ statusCode: 403 });

    const unchangedAppointment = await Appointment.findById(appointment._id);
    expect(unchangedAppointment.status).toBe('booked');
  });

  it('prevents a patient from cancelling another patient’s appointment', async () => {
    const appointment = await bookingService.bookAppointment({
      patientId: patient._id,
      doctorId: doctor._id,
      slotStartTime: fromZonedTime(`${TEST_DATE_STR} 15:00:00`, TIMEZONE).toISOString(),
      now: new Date('2026-11-01T00:00:00Z'),
    });

    await expect(
      bookingService.cancelAppointment({
        appointmentId: appointment._id,
        userId: otherPatient._id,
        userRole: 'patient',
        now: fromZonedTime(`${TEST_DATE_STR} 10:00:00`, TIMEZONE),
      })
    ).rejects.toMatchObject({ statusCode: 403 });
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

    await expect(
      bookingService.updateAppointmentStatus({
        appointmentId: appt._id,
        doctorId: otherDoctor._id,
        status: 'completed',
      })
    ).rejects.toMatchObject({ statusCode: 403 });

    await expect(
      bookingService.updateAppointmentStatus({
        appointmentId: appt._id,
        doctorId: doctor._id,
        status: 'no-show',
      })
    ).rejects.toMatchObject({ statusCode: 400 });

    const noShowAppointment = await bookingService.bookAppointment({
      patientId: patient._id,
      doctorId: doctor._id,
      slotStartTime: fromZonedTime(`${TEST_DATE_STR} 12:00:00`, TIMEZONE).toISOString(),
      now: new Date('2026-11-01T00:00:00Z'),
    });
    const noShow = await bookingService.updateAppointmentStatus({
      appointmentId: noShowAppointment._id,
      doctorId: doctor._id,
      status: 'no-show',
    });
    expect(noShow.status).toBe('no-show');
  });
});
