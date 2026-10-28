import { confirmChatBooking, processChatMessage } from '../services/chatService.js';

export async function postChatMessageEndpoint(req, res, next) {
  try {
    const result = await processChatMessage(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function confirmChatBookingEndpoint(req, res, next) {
  try {
    const result = await confirmChatBooking({
      ...req.body,
      patientId: req.user._id,
    });
    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}