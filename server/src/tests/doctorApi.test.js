// server/src/tests/doctorApi.test.js
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { connectDB } from '../config/db.js';
import { Appointment, Doctor, User } from '../models/index.js';
import { generateToken } from '../services/authService.js';
import mongoose from 'mongoose';
import { format, toZonedTime } from 'date-fns-tz';

function nextWeekdayClinicDate(timezone) {
  const today = format(toZonedTime(new Date(), timezone), 'yyyy-MM-dd', { timeZone: timezone });
  const date = new Date(`${today}T00:00:00.000Z`);
  do {
    date.setUTCDate(date.getUTCDate() + 1);
  } while ([0, 6].includes(date.getUTCDay()));
  return date.toISOString().slice(0, 10);
}

describe('Doctor & Availability HTTP API Integration Tests', () => {
  let seededDoctorId;
  let doctorToken;
  let otherDoctorToken;
  let patientToken;
  let fixtureDoctorId;
  let fixtureUserIds = [];
  const fixtureAppointmentIds = [];

  beforeAll(async () => {
    await connectDB();
    const suffix = Date.now();
    const doctorUser = await User.create({
      name: 'Doctor API Fixture',
      email: `doctor-api.${suffix}@medislot.test`,
      password: 'test-password-123',
      role: 'doctor',
    });
    const otherDoctorUser = await User.create({
      name: 'Other Doctor API Fixture',
      email: `doctor-api.other.${suffix}@medislot.test`,
      password: 'test-password-123',
      role: 'doctor',
    });
    const patientUser = await User.create({
      name: 'Chat API Patient',
      email: `chat-api.${suffix}@medislot.test`,
      password: 'test-password-123',
      role: 'patient',
    });
    const doc = await Doctor.create({
      userId: doctorUser._id,
      name: 'Dr. API Fixture',
      specialty: 'Cardiology',
    });
    const otherDoc = await Doctor.create({
      userId: otherDoctorUser._id,
      name: 'Dr. Other API Fixture',
      specialty: 'Dermatology',
    });
    fixtureDoctorId = doc._id;
    fixtureUserIds = [doctorUser._id, otherDoctorUser._id, patientUser._id];
    seededDoctorId = doc._id.toString();
    doctorToken = generateToken(doctorUser, doc._id);
    otherDoctorToken = generateToken(otherDoctorUser, otherDoc._id);
    patientToken = generateToken(patientUser);
  }, 30000);

  afterAll(async () => {
    await Appointment.deleteMany({ _id: { $in: fixtureAppointmentIds } });
    if (fixtureDoctorId) {
      await Doctor.deleteMany({ userId: { $in: fixtureUserIds } });
      await User.deleteMany({ _id: { $in: fixtureUserIds } });
    }
    await mongoose.disconnect();
  }, 30000);

  it('GET /api/doctors returns list of doctors', async () => {
    const res = await request(app).get('/api/doctors');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/doctors?specialty=Cardiology filters by specialty case-insensitively', async () => {
    const res = await request(app).get('/api/doctors?specialty=cardiology');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].specialty).toBe('Cardiology');
  });

  it('GET /api/doctors/:id returns single doctor profile', async () => {
    const res = await request(app).get(`/api/doctors/${seededDoctorId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBe(seededDoctorId);
  });

  it('GET /api/doctors/:id/availability?date=2026-11-04 generates slots for valid date', async () => {
    // 2026-11-04 is a Wednesday
    const res = await request(app).get(`/api/doctors/${seededDoctorId}/availability?date=2026-11-04`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.date).toBe('2026-11-04');
    expect(Array.isArray(res.body.data.slots)).toBe(true);
  });

  it('GET /api/analytics/doctor-weekly returns seven days for the authenticated doctor', async () => {
    const res = await request(app)
      .get('/api/analytics/doctor-weekly?weekStart=2026-11-02')
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.weekStart).toBe('2026-11-02');
    expect(res.body.data.days).toHaveLength(7);
    expect(res.body.data.totals).toHaveProperty('utilizationPercent');
  });

  it('GET /api/analytics/doctor-weekly rejects unauthenticated requests', async () => {
    const res = await request(app).get('/api/analytics/doctor-weekly');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/analytics/doctor-weekly requires Monday as the week start', async () => {
    const res = await request(app)
      .get('/api/analytics/doctor-weekly?weekStart=2026-11-03')
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/chat/message asks for missing booking details', async () => {
    const res = await request(app)
      .post('/api/chat/message')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ message: 'tomorrow afternoon' });

    expect(res.status).toBe(200);
    expect(res.body.data.intent).toBe('clarification');
    expect(res.body.data.reply).toContain('specialty');
  });

  it('POST /api/chat/message returns actual available slots to a patient', async () => {
    const timezone = 'Asia/Kolkata';
    const tomorrow = nextWeekdayClinicDate(timezone);
    const res = await request(app)
      .post('/api/chat/message')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ message: `I need a cardiologist on ${tomorrow} morning` });

    expect(res.status).toBe(200);
    expect(res.body.data.intent).toBe('slots');
    expect(res.body.data.slots.length).toBeGreaterThan(0);
    expect(res.body.data.slots[0]).toMatchObject({
      doctorId: seededDoctorId,
      specialty: 'Cardiology',
      date: tomorrow,
    });
  });

  it('POST /api/chat/confirm-booking uses the existing booking service', async () => {
    const timezone = 'Asia/Kolkata';
    const tomorrow = nextWeekdayClinicDate(timezone);
    const slotsRes = await request(app)
      .post('/api/chat/message')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ message: `I need a cardiologist on ${tomorrow} morning` });
    const selectedSlot = slotsRes.body.data.slots[0];

    const res = await request(app)
      .post('/api/chat/confirm-booking')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ doctorId: selectedSlot.doctorId, slotStartTime: selectedSlot.slotStartTime });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.appointment.status).toBe('booked');
    fixtureAppointmentIds.push(res.body.data.appointment._id);
  });

  it('POST /api/chat endpoints reject doctor accounts', async () => {
    const res = await request(app)
      .post('/api/chat/message')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ message: 'I need a cardiologist tomorrow morning' });

    expect(res.status).toBe(403);
  });

  it('GET /api/appointments/available-slots returns 400 when date parameter is missing or invalid', async () => {
    const res = await request(app).get('/api/appointments/available-slots?date=invalid-date');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors.some((e) => e.field === 'date')).toBe(true);
  });

  it('PUT /api/doctors/:id/availability updates doctor slot duration with doctor auth', async () => {
    const res = await request(app)
      .put(`/api/doctors/${seededDoctorId}/availability`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ slotDuration: 15 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.slotDuration).toBe(15);

    // Revert back
    await Doctor.findByIdAndUpdate(seededDoctorId, { slotDuration: 30 });
  });

  it('PUT /api/doctors/:id/availability rejects unauthorized request without token', async () => {
    const res = await request(app)
      .put(`/api/doctors/${seededDoctorId}/availability`)
      .send({ slotDuration: 15 });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('PUT /api/doctors/:id/availability rejects another doctor’s token', async () => {
    const res = await request(app)
      .put(`/api/doctors/${seededDoctorId}/availability`)
      .set('Authorization', `Bearer ${otherDoctorToken}`)
      .send({ slotDuration: 15 });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});
