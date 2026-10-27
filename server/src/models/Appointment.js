// server/src/models/Appointment.js
import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Patient ID is required'],
      index: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: [true, 'Doctor ID is required'],
      index: true,
    },
    // Stored in UTC ISO Date
    slotStartTime: {
      type: Date,
      required: [true, 'Slot start time is required'],
      index: true,
    },
    // Stored in UTC ISO Date
    slotEndTime: {
      type: Date,
      required: [true, 'Slot end time is required'],
    },
    status: {
      type: String,
      enum: {
        values: ['booked', 'completed', 'cancelled', 'no-show'],
        message: '{VALUE} is not a valid appointment status',
      },
      default: 'booked',
      index: true,
    },
    reason: {
      type: String,
      default: 'General Consultation',
      trim: true,
      maxlength: [500, 'Reason cannot exceed 500 characters'],
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    cancellationReason: {
      type: String,
      default: null,
      trim: true,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    rescheduledFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// CONCURRENCY & INTEGRITY CONSTRAINT:
// Compound partial unique index preventing double-booking of the same doctor & slot.
// When an appointment is 'cancelled', it drops out of this filter expression,
// which cleanly allows the slot to be booked again without unique key conflicts.
// Any race condition / concurrent reservation attempt will trigger E11000 duplicate key error.
// ─────────────────────────────────────────────────────────────────────────────
appointmentSchema.index(
  { doctorId: 1, slotStartTime: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ['booked', 'completed', 'no-show'] },
    },
  }
);

// Secondary index for quick queries by doctor and date range
appointmentSchema.index({ doctorId: 1, status: 1, slotStartTime: 1 });

// Secondary index for patient history
appointmentSchema.index({ patientId: 1, slotStartTime: -1 });

export const Appointment = mongoose.model('Appointment', appointmentSchema);
