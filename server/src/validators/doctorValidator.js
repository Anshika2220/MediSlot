// server/src/validators/doctorValidator.js
import { z } from 'zod';

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const getAvailableSlotsQuerySchema = z.object({
  date: z
    .string({ required_error: 'Date query parameter is required (format: YYYY-MM-DD)' })
    .regex(dateRegex, 'Date format must be YYYY-MM-DD'),
  doctorId: z.string().optional(),
});

export const updateAvailabilitySchema = z.object({
  slotDuration: z.enum(['15', '30']).transform(Number).or(z.literal(15)).or(z.literal(30)).optional(),
  weeklySchedule: z
    .array(
      z.object({
        dayOfWeek: z.number().min(0).max(6),
        isWorking: z.boolean(),
        startTime: z.string().regex(timeRegex, 'startTime must be in HH:mm 24h format'),
        endTime: z.string().regex(timeRegex, 'endTime must be in HH:mm 24h format'),
        breaks: z
          .array(
            z.object({
              startTime: z.string().regex(timeRegex, 'Break startTime must be HH:mm'),
              endTime: z.string().regex(timeRegex, 'Break endTime must be HH:mm'),
              label: z.string().optional(),
            })
          )
          .optional()
          .default([]),
      })
    )
    .optional(),
  blockedDates: z
    .array(
      z.object({
        date: z.string().regex(dateRegex, 'Blocked date must be YYYY-MM-DD'),
        reason: z.string().max(200).optional().default('Leave / Unavailable'),
      })
    )
    .optional(),
});
