import { z } from 'zod';

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export const doctorWeeklyAnalyticsQuerySchema = z.object({
  weekStart: z
    .string()
    .regex(datePattern, 'weekStart must be a date in YYYY-MM-DD format')
    .refine((value) => {
      const date = new Date(`${value}T00:00:00.000Z`);
      return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
    }, 'weekStart must be a valid calendar date')
    .refine((value) => new Date(`${value}T00:00:00.000Z`).getUTCDay() === 1, {
      message: 'weekStart must be a Monday',
    })
    .optional(),
});