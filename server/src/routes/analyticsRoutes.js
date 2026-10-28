import { Router } from 'express';
import { getDoctorWeeklyAnalyticsEndpoint } from '../controllers/analyticsController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { doctorWeeklyAnalyticsQuerySchema } from '../validators/analyticsValidator.js';

const router = Router();

router.get(
  '/doctor-weekly',
  authenticate,
  authorize('doctor'),
  validate(doctorWeeklyAnalyticsQuerySchema, 'query'),
  getDoctorWeeklyAnalyticsEndpoint
);

export default router;