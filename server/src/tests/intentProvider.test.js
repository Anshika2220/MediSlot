import { describe, expect, it } from 'vitest';
import { deterministicIntentProvider } from '../services/intentProvider.js';

const specialties = ['Cardiology', 'Dermatology', 'Pediatrics'];
const now = new Date('2026-10-27T06:00:00.000Z');

describe('Deterministic booking intent provider', () => {
  it('parses specialty, relative date, and time period from a booking request', () => {
    const result = deterministicIntentProvider.parse({
      message: 'I need a dermatologist tomorrow afternoon',
      specialties,
      now,
      timezone: 'Asia/Kolkata',
    });

    expect(result).toMatchObject({
      intent: 'search',
      context: {
        specialty: 'Dermatology',
        date: '2026-10-28',
        timePreference: 'afternoon',
      },
    });
  });

  it('asks for missing details while retaining the previously parsed context', () => {
    const first = deterministicIntentProvider.parse({
      message: 'I need a cardiologist',
      specialties,
      now,
      timezone: 'Asia/Kolkata',
    });
    const second = deterministicIntentProvider.parse({
      message: 'tomorrow',
      context: first.context,
      specialties,
      now,
      timezone: 'Asia/Kolkata',
    });

    expect(first.intent).toBe('clarification');
    expect(first.reply).toContain('date');
    expect(second).toMatchObject({
      intent: 'clarification',
      context: { specialty: 'Cardiology', date: '2026-10-28' },
    });
  });

  it('parses a specific 12-hour time and refuses medical advice requests', () => {
    const result = deterministicIntentProvider.parse({
      message: 'Dermatologist tomorrow at 2:30 pm, what medicine should I take?',
      specialties,
      now,
      timezone: 'Asia/Kolkata',
    });

    expect(result.intent).toBe('out-of-scope');
    expect(result.context.exactTime).toBe('14:30');
    expect(result.reply).toContain('cannot provide medical diagnosis or treatment advice');
  });
});