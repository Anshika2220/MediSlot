// server/src/services/authService.js
import jwt from 'jsonwebtoken';
import { User, Doctor } from '../models/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'medislot_super_secret_dev_key_change_in_production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Generate signed JWT token
 */
export function generateToken(user, doctorId = null) {
  const payload = {
    id: user._id.toString(),
    role: user.role,
    name: user.name,
    email: user.email,
  };

  if (doctorId) {
    payload.doctorId = doctorId.toString();
  }

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Register a new Patient or Doctor
 * If role === 'doctor', automatically creates their Doctor profile so they are
 * immediately discoverable and bookable in the clinic system!
 */
export async function register(userData) {
  const {
    name,
    email,
    password,
    role = 'patient',
    phone = '',
    specialty,
    bio = '',
    experienceYears = 5,
    consultationFee = 500,
    slotDuration = 30,
  } = userData;

  // 1. Check if email already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    const err = new Error('An account with this email address already exists');
    err.statusCode = 409;
    throw err;
  }

  // 2. Create User account (password will be hashed by pre-save hook)
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password,
    role,
    phone,
  });

  let doctor = null;

  // 3. If doctor, create Doctor profile with default schedule so they are bookable right away
  if (role === 'doctor') {
    doctor = await Doctor.create({
      userId: user._id,
      name: user.name,
      specialty: specialty.trim(),
      bio: bio.trim() || `Specialist in ${specialty}.`,
      experienceYears: Number(experienceYears) || 5,
      consultationFee: Number(consultationFee) || 500,
      slotDuration: Number(slotDuration) === 15 ? 15 : 30,
      weeklySchedule: [
        { dayOfWeek: 1, isWorking: true, startTime: '09:00', endTime: '17:00', breaks: [{ startTime: '13:00', endTime: '14:00', label: 'Lunch' }] },
        { dayOfWeek: 2, isWorking: true, startTime: '09:00', endTime: '17:00', breaks: [{ startTime: '13:00', endTime: '14:00', label: 'Lunch' }] },
        { dayOfWeek: 3, isWorking: true, startTime: '09:00', endTime: '17:00', breaks: [{ startTime: '13:00', endTime: '14:00', label: 'Lunch' }] },
        { dayOfWeek: 4, isWorking: true, startTime: '09:00', endTime: '17:00', breaks: [{ startTime: '13:00', endTime: '14:00', label: 'Lunch' }] },
        { dayOfWeek: 5, isWorking: true, startTime: '09:00', endTime: '17:00', breaks: [{ startTime: '13:00', endTime: '14:00', label: 'Lunch' }] },
        { dayOfWeek: 6, isWorking: false, startTime: '09:00', endTime: '13:00', breaks: [] },
        { dayOfWeek: 0, isWorking: false, startTime: '09:00', endTime: '13:00', breaks: [] },
      ],
      blockedDates: [],
    });
  }

  const token = generateToken(user, doctor?._id);

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
    },
    doctor: doctor
      ? {
          id: doctor._id,
          specialty: doctor.specialty,
          slotDuration: doctor.slotDuration,
          consultationFee: doctor.consultationFee,
        }
      : null,
    token,
  };
}

/**
 * Login with email and password
 */
export async function login({ email, password }) {
  // Select password specifically since it has select: false
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }

  let doctor = null;
  if (user.role === 'doctor') {
    doctor = await Doctor.findOne({ userId: user._id });
  }

  const token = generateToken(user, doctor?._id);

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
    },
    doctor: doctor
      ? {
          id: doctor._id,
          name: doctor.name,
          specialty: doctor.specialty,
          slotDuration: doctor.slotDuration,
          consultationFee: doctor.consultationFee,
        }
      : null,
    token,
  };
}

/**
 * Get current user profile and role details
 */
export async function getMe(userId) {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  let doctor = null;
  if (user.role === 'doctor') {
    doctor = await Doctor.findOne({ userId: user._id });
  }

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
    },
    doctor: doctor
      ? {
          id: doctor._id,
          name: doctor.name,
          specialty: doctor.specialty,
          slotDuration: doctor.slotDuration,
          consultationFee: doctor.consultationFee,
          weeklySchedule: doctor.weeklySchedule,
          blockedDates: doctor.blockedDates,
        }
      : null,
  };
}
