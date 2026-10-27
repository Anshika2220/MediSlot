// server/src/routes/authRoutes.js
import { Router } from 'express';
import {
  registerEndpoint,
  loginEndpoint,
  getMeEndpoint,
} from '../controllers/authController.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { registerSchema, loginSchema } from '../validators/authValidator.js';

const router = Router();

router.post('/register', validate(registerSchema, 'body'), registerEndpoint);
router.post('/login', validate(loginSchema, 'body'), loginEndpoint);
router.get('/me', authenticate, getMeEndpoint);

export default router;
