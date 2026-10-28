import { format, toZonedTime } from 'date-fns-tz';
import { Doctor } from '../models/index.js';
import { DEFAULT_TIMEZONE, getAvailableSlots } from './availabilityService.js';
import { bookAppointment } from './bookingService.js';
import { deterministicIntentProvider } from './intentProvider.js';

const PERIOD_BOUNDS = {
  morning: [5 * 60, 12 * 60],
  afternoon: [12 * 60, 17 * 60],
  evening: [17 * 60, 24 * 60],
};

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function matchesTimePreference(slot, context) {
  if (context.timePreference === 'exact') return slot.startTime === context.exactTime;
  const [hours, minutes] = slot.startTime.split(':').map(Number);
  const startMinutes = hours * 60 + minutes;
  const [start, end] = PERIOD_BOUNDS[context.timePreference] || [];
  return start !== undefined && startMinutes >= start && startMinutes < end;
}

function publicSlot(doctor, slot, date) {
  return {
    doctorId: doctor._id.toString(),
    doctorName: doctor.name,
    specialty: doctor.specialty,
    date,
    startTime: slot.startTime,
    endTime: slot.endTime,
    slotStartTime: slot.slotStartTime,
    slotEndTime: slot.slotEndTime,
    duration: slot.duration,
  };
}

export async function processChatMessage({
  message,
  context = {},
  provider = deterministicIntentProvider,
  timezone = DEFAULT_TIMEZONE,
  now = new Date(),
}) {
  const specialties = await Doctor.distinct('specialty');
  const parsed = provider.parse({ message, context, specialties, timezone, now });

  if (parsed.intent !== 'search') {
    return { reply: parsed.reply, intent: parsed.intent, context: parsed.context, slots: [] };
  }

  const doctors = await Doctor.find({
    specialty: new RegExp(`^${escapeRegex(parsed.context.specialty)}$`, 'i'),
  })
    .select('name specialty')
    .sort({ name: 1 })
    .lean();
  const allSlots = [];

  for (const doctor of doctors) {
    const availability = await getAvailableSlots(doctor._id, parsed.context.date, timezone);
    for (const slot of availability.slots) {
      if (matchesTimePreference(slot, parsed.context)) {
        allSlots.push(publicSlot(doctor, slot, parsed.context.date));
      }
    }
  }

  if (!allSlots.length) {
    return {
      reply: `I couldn't find an available ${parsed.context.specialty} slot for ${parsed.context.date} in that time range. Try another date or time.`,
      intent: 'no-slots',
      context: parsed.context,
      slots: [],
    };
  }

  const timeLabel = parsed.context.timePreference === 'exact'
    ? `at ${parsed.context.exactTime}`
    : `in the ${parsed.context.timePreference}`;

  return {
    reply: `I found ${allSlots.length} available ${parsed.context.specialty} slot${allSlots.length === 1 ? '' : 's'} ${timeLabel} on ${parsed.context.date}. Select one, then confirm the booking.`,
    intent: 'slots',
    context: parsed.context,
    slots: allSlots,
  };
}

export async function confirmChatBooking({
  patientId,
  doctorId,
  slotStartTime,
  reason = 'Booked with MediSlot assistant',
  timezone = DEFAULT_TIMEZONE,
  now = new Date(),
}) {
  const requestedStart = new Date(slotStartTime);
  const localDate = format(toZonedTime(requestedStart, timezone), 'yyyy-MM-dd', {
    timeZone: timezone,
  });
  const availability = await getAvailableSlots(doctorId, localDate, timezone);
  const isOfferedSlot = availability.slots.some(
    (slot) => new Date(slot.slotStartTime).getTime() === requestedStart.getTime()
  );

  if (!isOfferedSlot) {
    const error = new Error('That slot is no longer available. Please choose another available slot.');
    error.statusCode = 409;
    throw error;
  }

  const appointment = await bookAppointment({
    patientId,
    doctorId,
    slotStartTime,
    reason,
    timezone,
    now,
  });

  return {
    appointment,
    reply: `Your appointment with ${appointment.doctorId.name} is confirmed for ${format(
      toZonedTime(appointment.slotStartTime, timezone),
      'yyyy-MM-dd HH:mm',
      { timeZone: timezone }
    )} (${timezone}).`,
  };
}