import { getDoctorWeeklyAnalytics } from '../services/analyticsService.js';

export async function getDoctorWeeklyAnalyticsEndpoint(req, res, next) {
  try {
    if (!req.user.doctorId) {
      return res.status(403).json({
        success: false,
        message: 'A doctor profile is required to view weekly analytics',
      });
    }

    const data = await getDoctorWeeklyAnalytics({
      doctorId: req.user.doctorId,
      weekStart: req.query.weekStart,
    });

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}