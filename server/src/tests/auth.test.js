// server/src/tests/auth.test.js
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { connectDB } from '../config/db.js';
import { User, Doctor } from '../models/index.js';
import mongoose from 'mongoose';

describe('Phase 5: Authentication & Authorization Tests', () => {
  const testPatientEmail = `test.patient.${Date.now()}@medislot.com`;
  const testDoctorEmail = `test.doctor.${Date.now()}@medislot.com`;

  let patientToken;
  let doctorToken;
  let registeredDoctorId;

  beforeAll(async () => {
    await connectDB();
  }, 30000);

  afterAll(async () => {
    // Cleanup created test users
    await User.deleteMany({ email: { $in: [testPatientEmail, testDoctorEmail] } });
    if (registeredDoctorId) {
      await Doctor.findByIdAndDelete(registeredDoctorId);
    }
    await mongoose.disconnect();
  }, 30000);

  it('1. Successfully registers a new patient', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Alice Wonder',
      email: testPatientEmail,
      password: 'password123',
      role: 'patient',
      phone: '+91 91234 56789',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.role).toBe('patient');
    expect(res.body.data.doctor).toBeNull();
  });

  it('2. Successfully registers a new doctor and creates their bookable Doctor profile', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Dr. Robert Chen',
      email: testDoctorEmail,
      password: 'password123',
      role: 'doctor',
      specialty: 'Neurology',
      consultationFee: 750,
      slotDuration: 30,
      bio: 'Neurologist with focus on stroke prevention and migraine treatment.',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.role).toBe('doctor');
    expect(res.body.data.doctor).toBeDefined();
    expect(res.body.data.doctor.specialty).toBe('Neurology');

    registeredDoctorId = res.body.data.doctor.id;

    // Verify doctor is saved in MongoDB and has active weekly schedule
    const doctorInDb = await Doctor.findById(registeredDoctorId);
    expect(doctorInDb).toBeDefined();
    expect(doctorInDb.specialty).toBe('Neurology');
    expect(doctorInDb.weeklySchedule.length).toBe(7);
  });

  it('3. Rejects registration with duplicate email with 409 Conflict', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Duplicate User',
      email: testPatientEmail,
      password: 'password123',
      role: 'patient',
    });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('already exists');
  });

  it('4. Successfully logs in with valid credentials and receives JWT', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: testPatientEmail,
      password: 'password123',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    patientToken = res.body.data.token;

    // Doctor login
    const docRes = await request(app).post('/api/auth/login').send({
      email: testDoctorEmail,
      password: 'password123',
    });
    expect(docRes.status).toBe(200);
    doctorToken = docRes.body.data.token;
  });

  it('5. Rejects login with incorrect password with 401 Unauthorized', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: testPatientEmail,
      password: 'wrong_password_here',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Invalid email or password');
  });

  it('6. GET /api/auth/me returns authenticated user details', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testPatientEmail.toLowerCase());
    expect(res.body.data.user.role).toBe('patient');
  });

  it('7. Enforces role-based authorization guard (patient cannot access doctor routes)', async () => {
    // Attempt to access doctor today route with patient token
    const res = await request(app)
      .get('/api/appointments/doctor/today')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Forbidden');
  });
});
