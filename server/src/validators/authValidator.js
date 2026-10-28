// server/src/validators/authValidator.js
import { z } from 'zod';

export const registerSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters')
    .trim(),
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email address')
    .toLowerCase()
    .trim(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password cannot exceed 100 characters'),
  role: z.enum(['patient', 'doctor']).default('patient'),
  phone: z.string().optional().default(''),

  // Doctor-specific fields (required when role is 'doctor')
  specialty: z.string().min(2, 'Specialty is required for doctors').optional(),
  bio: z.string().max(1000).optional().default(''),
  experienceYears: z.number().min(0).max(70).optional().default(5),
  consultationFee: z.number().min(0).optional().default(500),
  slotDuration: z
    .enum(['15', '30'])
    .transform(Number)
    .or(z.literal(15))
    .or(z.literal(30))
    .optional()
    .default(30),
}).refine(
  (data) => {
    if (data.role === 'doctor' && (!data.specialty || data.specialty.trim() === '')) {
      return false;
    }
    return true;
  },
  {
    message: 'Doctor specialty is required when registering as a doctor',
    path: ['specialty'],
  }
);

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email address')
    .toLowerCase()
    .trim(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password cannot be empty'),
});

