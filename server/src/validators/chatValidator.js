import { z } from 'zod';

const mongoIdPattern = /^[0-9a-fA-F]{24}$/;

const chatContextSchema = z.object({
  specialty: z.string().max(100).nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  timePreference: z.enum(['morning', 'afternoon', 'evening', 'exact']).nullable().optional(),
  exactTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable().optional(),
});

export const chatMessageSchema = z.object({
  message: z.string().trim().min(1).max(1000),
  context: chatContextSchema.optional(),
});

export const chatConfirmBookingSchema = z.object({
  doctorId: z.string().regex(mongoIdPattern, 'Invalid doctor ID format'),
  slotStartTime: z.string().datetime({ message: 'slotStartTime must be a valid ISO 8601 UTC date string' }),
  reason: z.string().trim().max(500).optional(),
});