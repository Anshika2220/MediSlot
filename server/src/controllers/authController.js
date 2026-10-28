// server/src/controllers/authController.js
import * as authService from '../services/authService.js';

/**
 * POST /api/auth/register
 */
export async function registerEndpoint(req, res, next) {
  try {
    const result = await authService.register(req.body);
    res.status(201).json({
      success: true,
      message: `${req.body.role === 'doctor' ? 'Doctor' : 'Patient'} registered successfully`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/login
 */
export async function loginEndpoint(req, res, next) {
  try {
    const result = await authService.login(req.body);
    res.json({
      success: true,
      message: 'Logged in successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/me
 */
export async function getMeEndpoint(req, res, next) {
  try {
    const result = await authService.getMe(req.user.id);
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

