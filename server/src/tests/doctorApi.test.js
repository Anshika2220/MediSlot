// server/src/tests/doctorApi.test.js
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { connectDB } from '../config/db.js';
import { Doctor } from '../models/index.js';
import mongoose from 'mongoose';

describe('Doctor & Availability HTTP API Integration Tests', () => {
  let seededDoctorId;

  beforeAll(async () => {
    await connectDB();
    const doc = await Doctor.findOne();
    if (doc) {
      seededDoctorId = doc._id.toString();
    }
  }, 30000);

  afterAll(async () => {
    await mongoose.disconnect();
  }, 30000);

  it('GET /api/doctors returns list of doctors', async () => {
    const res = await request(app).get('/api/doctors');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(3);
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

  it('GET /api/appointments/available-slots returns 400 when date parameter is missing or invalid', async () => {
    const res = await request(app).get('/api/appointments/available-slots?date=invalid-date');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors.some((e) => e.field === 'date')).toBe(true);
  });

  it('PUT /api/doctors/:id/availability updates doctor slot duration', async () => {
    const res = await request(app)
      .put(`/api/doctors/${seededDoctorId}/availability`)
      .send({ slotDuration: 15 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.slotDuration).toBe(15);

    // Revert back
    await Doctor.findByIdAndUpdate(seededDoctorId, { slotDuration: 30 });
  });
});
