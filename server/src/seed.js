// server/src/seed.js
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import { User, Doctor, Appointment } from './models/index.js';
import { fromZonedTime, format } from 'date-fns-tz';
import { addDays, subDays } from 'date-fns';

const TIMEZONE = process.env.CLINIC_TIMEZONE || 'Asia/Kolkata';

// Helper to construct UTC Date from local clinic date (YYYY-MM-DD) and time (HH:mm)
function createUtcDate(dateStr, timeStr) {
  return fromZonedTime(`${dateStr} ${timeStr}:00`, TIMEZONE);
}

// Format local date string (YYYY-MM-DD)
function getLocalDateString(date) {
  return format(date, 'yyyy-MM-dd', { timeZone: TIMEZONE });
}

async function seed() {
  console.log('🌱 Starting MediSlot database seeding...');
  await connectDB();

  // Ensure database indexes are created
  console.log('📑 Synchronizing database indexes...');
  await User.syncIndexes();
  await Doctor.syncIndexes();
  await Appointment.syncIndexes();

  // Clear existing collections
  console.log('🧹 Clearing existing collections...');
  await Appointment.deleteMany({});
  await Doctor.deleteMany({});
  await User.deleteMany({});

  // ── 1. Create Patient Users ────────────────────────────────────────────────
  console.log('👤 Creating patients...');
  const patient1 = await User.create({
    name: 'John Doe',
    email: 'patient1@medislot.com',
    password: 'password123',
    role: 'patient',
    phone: '+91 98765 43210',
  });

  const patient2 = await User.create({
    name: 'Jane Smith',
    email: 'patient2@medislot.com',
    password: 'password123',
    role: 'patient',
    phone: '+91 98765 43211',
  });

  // ── 2. Create Doctor Users & Profiles ──────────────────────────────────────
  console.log('👨‍⚕️ Creating doctors...');

  // Doctor 1: Sarah Jenkins - Cardiology (30-min slots)
  const doctorUser1 = await User.create({
    name: 'Dr. Sarah Jenkins',
    email: 'sarah.jenkins@medislot.com',
    password: 'password123',
    role: 'doctor',
    phone: '+91 98765 11111',
  });

  const doctor1 = await Doctor.create({
    userId: doctorUser1._id,
    name: 'Dr. Sarah Jenkins',
    specialty: 'Cardiology',
    bio: 'Board-certified cardiologist with over 12 years of experience specializing in preventive heart care, arrhythmia, and hypertension management.',
    experienceYears: 12,
    consultationFee: 800,
    slotDuration: 30,
    weeklySchedule: [
      { dayOfWeek: 1, isWorking: true, startTime: '09:00', endTime: '17:00', breaks: [{ startTime: '13:00', endTime: '14:00', label: 'Lunch' }] },
      { dayOfWeek: 2, isWorking: true, startTime: '09:00', endTime: '17:00', breaks: [{ startTime: '13:00', endTime: '14:00', label: 'Lunch' }] },
      { dayOfWeek: 3, isWorking: true, startTime: '09:00', endTime: '17:00', breaks: [{ startTime: '13:00', endTime: '14:00', label: 'Lunch' }] },
      { dayOfWeek: 4, isWorking: true, startTime: '09:00', endTime: '17:00', breaks: [{ startTime: '13:00', endTime: '14:00', label: 'Lunch' }] },
      { dayOfWeek: 5, isWorking: true, startTime: '09:00', endTime: '17:00', breaks: [{ startTime: '13:00', endTime: '14:00', label: 'Lunch' }] },
      { dayOfWeek: 6, isWorking: false, startTime: '09:00', endTime: '13:00', breaks: [] },
      { dayOfWeek: 0, isWorking: false, startTime: '09:00', endTime: '13:00', breaks: [] },
    ],
    blockedDates: [
      {
        date: getLocalDateString(addDays(new Date(), 7)),
        reason: 'Attending Cardiology Medical Conference',
      },
    ],
  });

  // Doctor 2: Alex Mercer - Dermatology (15-min slots)
  const doctorUser2 = await User.create({
    name: 'Dr. Alex Mercer',
    email: 'alex.mercer@medislot.com',
    password: 'password123',
    role: 'doctor',
    phone: '+91 98765 22222',
  });

  const doctor2 = await Doctor.create({
    userId: doctorUser2._id,
    name: 'Dr. Alex Mercer',
    specialty: 'Dermatology',
    bio: 'Specialist in clinical dermatology, skin cancer screenings, acne treatments, and minimally invasive laser therapies.',
    experienceYears: 8,
    consultationFee: 650,
    slotDuration: 15,
    weeklySchedule: [
      { dayOfWeek: 1, isWorking: true, startTime: '10:00', endTime: '16:00', breaks: [{ startTime: '12:30', endTime: '13:30', label: 'Lunch' }] },
      { dayOfWeek: 2, isWorking: true, startTime: '10:00', endTime: '16:00', breaks: [{ startTime: '12:30', endTime: '13:30', label: 'Lunch' }] },
      { dayOfWeek: 3, isWorking: true, startTime: '10:00', endTime: '16:00', breaks: [{ startTime: '12:30', endTime: '13:30', label: 'Lunch' }] },
      { dayOfWeek: 4, isWorking: true, startTime: '10:00', endTime: '16:00', breaks: [{ startTime: '12:30', endTime: '13:30', label: 'Lunch' }] },
      { dayOfWeek: 5, isWorking: true, startTime: '10:00', endTime: '16:00', breaks: [{ startTime: '12:30', endTime: '13:30', label: 'Lunch' }] },
      { dayOfWeek: 6, isWorking: true, startTime: '10:00', endTime: '13:00', breaks: [] },
      { dayOfWeek: 0, isWorking: false, startTime: '10:00', endTime: '13:00', breaks: [] },
    ],
    blockedDates: [],
  });

  // Doctor 3: Priya Patel - Pediatrics (30-min slots)
  const doctorUser3 = await User.create({
    name: 'Dr. Priya Patel',
    email: 'priya.patel@medislot.com',
    password: 'password123',
    role: 'doctor',
    phone: '+91 98765 33333',
  });

  const doctor3 = await Doctor.create({
    userId: doctorUser3._id,
    name: 'Dr. Priya Patel',
    specialty: 'Pediatrics',
    bio: 'Compassionate pediatrician focusing on childhood development, routine immunizations, and pediatric urgent care with over 10 years of practice.',
    experienceYears: 10,
    consultationFee: 500,
    slotDuration: 30,
    weeklySchedule: [
      { dayOfWeek: 1, isWorking: false, startTime: '08:30', endTime: '16:30', breaks: [] },
      { dayOfWeek: 2, isWorking: true, startTime: '08:30', endTime: '16:30', breaks: [{ startTime: '12:00', endTime: '13:00', label: 'Lunch' }] },
      { dayOfWeek: 3, isWorking: true, startTime: '08:30', endTime: '16:30', breaks: [{ startTime: '12:00', endTime: '13:00', label: 'Lunch' }] },
      { dayOfWeek: 4, isWorking: true, startTime: '08:30', endTime: '16:30', breaks: [{ startTime: '12:00', endTime: '13:00', label: 'Lunch' }] },
      { dayOfWeek: 5, isWorking: true, startTime: '08:30', endTime: '16:30', breaks: [{ startTime: '12:00', endTime: '13:00', label: 'Lunch' }] },
      { dayOfWeek: 6, isWorking: true, startTime: '08:30', endTime: '14:00', breaks: [] },
      { dayOfWeek: 0, isWorking: false, startTime: '08:30', endTime: '13:00', breaks: [] },
    ],
    blockedDates: [],
  });

  // ── 3. Create Sample Appointments ──────────────────────────────────────────
  console.log('📅 Creating demo appointments across statuses...');

  const today = new Date();
  const todayStr = getLocalDateString(today);
  const tomorrowStr = getLocalDateString(addDays(today, 1));
  const yesterdayStr = getLocalDateString(subDays(today, 1));
  const twoDaysAgoStr = getLocalDateString(subDays(today, 2));

  const demoAppointments = [
    // 1. Dr. Sarah Jenkins (Cardiology) - Past Completed
    {
      patientId: patient1._id,
      doctorId: doctor1._id,
      slotStartTime: createUtcDate(twoDaysAgoStr, '10:00'),
      slotEndTime: createUtcDate(twoDaysAgoStr, '10:30'),
      status: 'completed',
      reason: 'Routine ECG and blood pressure checkup',
      notes: 'Blood pressure normal at 120/80. Follow up in 6 months.',
    },
    // 2. Dr. Sarah Jenkins (Cardiology) - Past Cancelled (allows testing cancelled slot exclusion)
    {
      patientId: patient2._id,
      doctorId: doctor1._id,
      slotStartTime: createUtcDate(yesterdayStr, '11:00'),
      slotEndTime: createUtcDate(yesterdayStr, '11:30'),
      status: 'cancelled',
      reason: 'Chest tightness consultation',
      cancellationReason: 'Patient rescheduled due to personal travel',
      cancelledAt: createUtcDate(yesterdayStr, '08:00'),
      cancelledBy: patient2._id,
    },
    // 3. Dr. Sarah Jenkins (Cardiology) - Today Booked
    {
      patientId: patient1._id,
      doctorId: doctor1._id,
      slotStartTime: createUtcDate(todayStr, '14:30'),
      slotEndTime: createUtcDate(todayStr, '15:00'),
      status: 'booked',
      reason: 'Follow-up on cholesterol medication',
    },
    // 4. Dr. Sarah Jenkins (Cardiology) - Tomorrow Booked
    {
      patientId: patient2._id,
      doctorId: doctor1._id,
      slotStartTime: createUtcDate(tomorrowStr, '10:00'),
      slotEndTime: createUtcDate(tomorrowStr, '10:30'),
      status: 'booked',
      reason: 'Palpitation assessment',
    },
    // 5. Dr. Alex Mercer (Dermatology) - Past No-Show
    {
      patientId: patient2._id,
      doctorId: doctor2._id,
      slotStartTime: createUtcDate(twoDaysAgoStr, '11:00'),
      slotEndTime: createUtcDate(twoDaysAgoStr, '11:15'),
      status: 'no-show',
      reason: 'Acne flare-up examination',
      notes: 'Patient did not attend appointment without notice.',
    },
    // 6. Dr. Alex Mercer (Dermatology) - Today Booked
    {
      patientId: patient1._id,
      doctorId: doctor2._id,
      slotStartTime: createUtcDate(todayStr, '11:15'),
      slotEndTime: createUtcDate(todayStr, '11:30'),
      status: 'booked',
      reason: 'Skin rash inspection on forearm',
    },
    // 7. Dr. Alex Mercer (Dermatology) - Tomorrow Booked
    {
      patientId: patient2._id,
      doctorId: doctor2._id,
      slotStartTime: createUtcDate(tomorrowStr, '14:00'),
      slotEndTime: createUtcDate(tomorrowStr, '14:15'),
      status: 'booked',
      reason: 'Annual skin mole screening',
    },
    // 8. Dr. Priya Patel (Pediatrics) - Past Completed
    {
      patientId: patient1._id,
      doctorId: doctor3._id,
      slotStartTime: createUtcDate(yesterdayStr, '09:30'),
      slotEndTime: createUtcDate(yesterdayStr, '10:00'),
      status: 'completed',
      reason: 'Toddler milestone checkup and vaccination',
      notes: 'Administered MMR booster. Growth curve normal (75th percentile).',
    },
    // 9. Dr. Priya Patel (Pediatrics) - Tomorrow Booked
    {
      patientId: patient2._id,
      doctorId: doctor3._id,
      slotStartTime: createUtcDate(tomorrowStr, '11:00'),
      slotEndTime: createUtcDate(tomorrowStr, '11:30'),
      status: 'booked',
      reason: 'Persistent mild fever and cough',
    },
  ];

  await Appointment.insertMany(demoAppointments);

  console.log('✅ Database seeded successfully!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 SEEDED TEST CREDENTIALS (All passwords: password123)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🩺 Doctors (3 seeded):');
  console.log('   1. Dr. Sarah Jenkins  - sarah.jenkins@medislot.com (Cardiology, 30m slots)');
  console.log('   2. Dr. Alex Mercer    - alex.mercer@medislot.com   (Dermatology, 15m slots)');
  console.log('   3. Dr. Priya Patel    - priya.patel@medislot.com   (Pediatrics, 30m slots)');
  console.log('\n🧑 Patients (2 seeded):');
  console.log('   1. John Doe           - patient1@medislot.com');
  console.log('   2. Jane Smith         - patient2@medislot.com');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await mongoose.disconnect();
  console.log('🔌 Disconnected from MongoDB.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
