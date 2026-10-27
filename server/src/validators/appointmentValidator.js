// server/src/validators/appointmentValidator.js
import { z } from 'zod';

const mongoIdRegex = /^[0-9a-fA-F]{24}$/;

export const createAppointmentSchema = z.object({
  doctorId: z
    .string({ required_error: 'doctorId is required' })
    .regex(mongoIdRegex, 'Invalid doctor ID format'),
  slotStartTime: z
    .string({ required_error: 'slotStartTime is required' })
    .datetime({ message: 'slotStartTime must be a valid ISO 8601 UTC date string' }),
  reason: z
    .string()
    .max(500, 'Reason cannot exceed 500 characters')
    .optional()
    .default('General Consultation'),
});

export const cancelAppointmentSchema = z.object({
  reason: z
    .string()
    .max(500, 'Cancellation reason cannot exceed 500 characters')
    .optional()
    .default('Cancelled by user'),
});

export const rescheduleAppointmentSchema = z.object({
  newSlotStartTime: z
    .string({ required_error: 'newSlotStartTime is required' })
    .datetime({ message: 'newSlotStartTime must be a valid ISO 8601 UTC date string' }),
  reason: z
    .string()
    .max(500, 'Reason cannot exceed 500 characters')
    .optional()
    .default('Rescheduled by user'),
});

export const updateStatusSchema = z.object({
  status: z.enum(['completed', 'no-show'], {
    errorMap: () => ({ message: "Status must be either 'completed' or 'no-show'" }),
  }),
  notes: z.string().max(1000).optional().default(''),
});
