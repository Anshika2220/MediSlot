import { Router } from 'express';
import { confirmChatBookingEndpoint, postChatMessageEndpoint } from '../controllers/chatController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { chatConfirmBookingSchema, chatMessageSchema } from '../validators/chatValidator.js';

const router = Router();
router.use(authenticate, authorize('patient'));

router.post('/message', validate(chatMessageSchema), postChatMessageEndpoint);
router.post('/confirm-booking', validate(chatConfirmBookingSchema), confirmChatBookingEndpoint);

export default router;