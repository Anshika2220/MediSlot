import { format, toZonedTime } from 'date-fns-tz';

const specialtyAliases = {
  cardiology: ['cardiologist', 'heart doctor'],
  dermatology: ['dermatologist', 'skin doctor'],
  pediatrics: ['pediatrician', 'paediatrician', 'child doctor'],
};

function normalized(value) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function shiftDate(dateString, days) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function parseDate(message, currentDate) {
  const isoDate = message.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (isoDate) {
    const date = new Date(`${isoDate[1]}T00:00:00.000Z`);
    if (!Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === isoDate[1]) {
      return isoDate[1];
    }
  }
  if (/\btomorrow\b/i.test(message)) return shiftDate(currentDate, 1);
  if (/\btoday\b/i.test(message)) return currentDate;
  return null;
}

function parseTimePreference(message) {
  const exactTime = message.match(/\b(?:at\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (exactTime) {
    let hours = Number(exactTime[1]) % 12;
    if (exactTime[3].toLowerCase() === 'pm') hours += 12;
    return {
      period: 'exact',
      exactTime: `${String(hours).padStart(2, '0')}:${exactTime[2] || '00'}`,
    };
  }

  for (const period of ['morning', 'afternoon', 'evening']) {
    if (new RegExp(`\\b${period}s?\\b`, 'i').test(message)) {
      return { period, exactTime: null };
    }
  }
  return null;
}

function matchesSpecialty(message, specialties) {
  const normalizedMessage = normalized(message);
  for (const specialty of specialties) {
    const key = specialty.toLowerCase();
    const names = [specialty, ...(specialtyAliases[key] || [])];
    if (names.some((name) => normalizedMessage.includes(normalized(name)))) return specialty;
  }
  return null;
}

export const deterministicIntentProvider = {
  parse({ message, context = {}, specialties = [], now = new Date(), timezone = 'UTC' }) {
    const currentDate = format(toZonedTime(now, timezone), 'yyyy-MM-dd', { timeZone: timezone });
    const specialty = matchesSpecialty(message, specialties) || context.specialty || null;
    const date = parseDate(message, currentDate) || context.date || null;
    const preference = parseTimePreference(message);
    const timePreference = preference?.period || context.timePreference || null;
    const exactTime = preference?.exactTime || context.exactTime || null;
    const nextContext = { specialty, date, timePreference, exactTime };

    if (/\b(diagnos|treatment|medicine|medication|symptom|what should i take)\b/i.test(message)) {
      return {
        intent: 'out-of-scope',
        context: nextContext,
        reply: 'I can help with clinic appointment scheduling, but I cannot provide medical diagnosis or treatment advice.',
      };
    }

    if (!specialty) {
      return { intent: 'clarification', context: nextContext, reply: 'Which medical specialty would you like to book with?' };
    }
    if (!date) {
      return { intent: 'clarification', context: nextContext, reply: 'What date would you prefer? You can say today, tomorrow, or enter a date as YYYY-MM-DD.' };
    }
    if (!timePreference) {
      return { intent: 'clarification', context: nextContext, reply: 'What time works best: morning, afternoon, or evening?' };
    }

    return { intent: 'search', context: nextContext, reply: '' };
  },
};