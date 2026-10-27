// server/src/models/Doctor.js
import mongoose from 'mongoose';

const breakPeriodSchema = new mongoose.Schema(
  {
    startTime: {
      type: String, // "13:00" in 24h format
      required: true,
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:mm)'],
    },
    endTime: {
      type: String, // "14:00" in 24h format
      required: true,
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:mm)'],
    },
    label: {
      type: String,
      default: 'Lunch Break',
    },
  },
  { _id: false }
);

const dailyScheduleSchema = new mongoose.Schema(
  {
    dayOfWeek: {
      type: Number, // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      required: true,
      min: 0,
      max: 6,
    },
    isWorking: {
      type: Boolean,
      default: true,
    },
    startTime: {
      type: String, // "09:00" in 24h format
      required: true,
      default: '09:00',
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:mm)'],
    },
    endTime: {
      type: String, // "17:00" in 24h format
      required: true,
      default: '17:00',
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:mm)'],
    },
    breaks: [breakPeriodSchema],
  },
  { _id: false }
);

const blockedDateSchema = new mongoose.Schema(
  {
    date: {
      type: String, // "YYYY-MM-DD" in clinic local time
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date format must be YYYY-MM-DD'],
    },
    reason: {
      type: String,
      default: 'Leave / Unavailable',
      trim: true,
    },
  },
  { _id: false }
);

const doctorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: [true, 'Doctor name is required'],
      trim: true,
    },
    specialty: {
      type: String,
      required: [true, 'Specialty is required'],
      trim: true,
      index: true,
    },
    bio: {
      type: String,
      default: '',
      trim: true,
    },
    experienceYears: {
      type: Number,
      default: 5,
      min: 0,
    },
    consultationFee: {
      type: Number,
      default: 500,
      min: 0,
    },
    slotDuration: {
      type: Number,
      enum: [15, 30],
      default: 30, // in minutes
      required: true,
    },
    weeklySchedule: {
      type: [dailyScheduleSchema],
      default: () => [
        { dayOfWeek: 1, isWorking: true, startTime: '09:00', endTime: '17:00', breaks: [{ startTime: '13:00', endTime: '14:00', label: 'Lunch' }] },
        { dayOfWeek: 2, isWorking: true, startTime: '09:00', endTime: '17:00', breaks: [{ startTime: '13:00', endTime: '14:00', label: 'Lunch' }] },
        { dayOfWeek: 3, isWorking: true, startTime: '09:00', endTime: '17:00', breaks: [{ startTime: '13:00', endTime: '14:00', label: 'Lunch' }] },
        { dayOfWeek: 4, isWorking: true, startTime: '09:00', endTime: '17:00', breaks: [{ startTime: '13:00', endTime: '14:00', label: 'Lunch' }] },
        { dayOfWeek: 5, isWorking: true, startTime: '09:00', endTime: '17:00', breaks: [{ startTime: '13:00', endTime: '14:00', label: 'Lunch' }] },
        { dayOfWeek: 6, isWorking: false, startTime: '09:00', endTime: '13:00', breaks: [] },
        { dayOfWeek: 0, isWorking: false, startTime: '09:00', endTime: '13:00', breaks: [] },
      ],
    },
    blockedDates: [blockedDateSchema],
  },
  {
    timestamps: true,
  }
);

export const Doctor = mongoose.model('Doctor', doctorSchema);
