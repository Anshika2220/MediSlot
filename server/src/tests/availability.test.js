// server/src/tests/availability.test.js
import { describe, it, expect } from 'vitest';
import { generateSlots, timeToMinutes, minutesToTime, intervalsOverlap } from '../services/availabilityService.js';
import { fromZonedTime } from 'date-fns-tz';

const TEST_TIMEZONE = 'Asia/Kolkata';

// Mock doctor for tests
const mockDoctor30Min = {
  slotDuration: 30,
  weeklySchedule: [
    { dayOfWeek: 0, isWorking: false, startTime: '09:00', endTime: '17:00', breaks: [] }, // Sunday
    {
      dayOfWeek: 1, // Monday
      isWorking: true,
      startTime: '09:00',
      endTime: '17:00',
      breaks: [{ startTime: '13:00', endTime: '14:00', label: 'Lunch' }],
    },
    { dayOfWeek: 2, isWorking: true, startTime: '09:00', endTime: '12:00', breaks: [] }, // Tuesday (half day)
  ],
  blockedDates: [
    { date: '2026-11-09', reason: 'Annual Leave' },
  ],
};

const mockDoctor15Min = {
  slotDuration: 15,
  weeklySchedule: [
    {
      dayOfWeek: 1, // Monday
      isWorking: true,
      startTime: '10:00',
      endTime: '12:00',
      breaks: [],
    },
  ],
  blockedDates: [],
};

describe('Time Helper Utilities', () => {
  it('converts HH:mm to minutes and back accurately', () => {
    expect(timeToMinutes('09:30')).toBe(570);
    expect(timeToMinutes('00:00')).toBe(0);
    expect(timeToMinutes('23:59')).toBe(1439);

    expect(minutesToTime(570)).toBe('09:30');
    expect(minutesToTime(0)).toBe('00:00');
  });

  it('detects interval overlaps accurately', () => {
    // Overlapping intervals
    expect(intervalsOverlap(540, 600, 570, 630)).toBe(true); // 9:00-10:00 overlaps 9:30-10:30
    expect(intervalsOverlap(540, 600, 540, 600)).toBe(true); // Identical

    // Non-overlapping / Adjacent intervals
    expect(intervalsOverlap(540, 600, 600, 660)).toBe(false); // 9-10 and 10-11 adjacent
    expect(intervalsOverlap(540, 600, 660, 720)).toBe(false); // Completely separate
  });
});

describe('Slot Generation Business Logic', () => {
  // Use a fixed Monday in the future: 2026-11-02 (Monday)
  const mondayDate = '2026-11-02';
  // Fixed early morning "now": 06:00 local time
  const earlyMorningNow = fromZonedTime(`${mondayDate} 06:00:00`, TEST_TIMEZONE);

  it('1. Generates correct number of 30-minute slots excluding lunch break', () => {
    // 09:00 to 17:00 = 8 hours = 16 potential 30-min slots
    // 13:00 to 14:00 = 1 hour lunch break = 2 slots excluded (13:00-13:30, 13:30-14:00)
    // Total expected = 14 available slots
    const result = generateSlots({
      doctor: mockDoctor30Min,
      dateStr: mondayDate,
      existingAppointments: [],
      now: earlyMorningNow,
      timezone: TEST_TIMEZONE,
    });

    expect(result.isWorking).toBe(true);
    expect(result.slots.length).toBe(14);
    expect(result.slots[0].startTime).toBe('09:00');
    expect(result.slots[0].endTime).toBe('09:30');
    expect(result.slots[result.slots.length - 1].startTime).toBe('16:30');
    expect(result.slots[result.slots.length - 1].endTime).toBe('17:00');

    // Ensure lunch break slots are NOT present
    const hasLunchSlot = result.slots.some(
      (s) => s.startTime === '13:00' || s.startTime === '13:30'
    );
    expect(hasLunchSlot).toBe(false);
  });

  it('2. Supports 15-minute slot intervals correctly', () => {
    // 10:00 to 12:00 = 2 hours = 8 15-minute slots
    const result = generateSlots({
      doctor: mockDoctor15Min,
      dateStr: mondayDate,
      existingAppointments: [],
      now: earlyMorningNow,
      timezone: TEST_TIMEZONE,
    });

    expect(result.slots.length).toBe(8);
    expect(result.slots[0].duration).toBe(15);
    expect(result.slots[0].startTime).toBe('10:00');
    expect(result.slots[0].endTime).toBe('10:15');
    expect(result.slots[1].startTime).toBe('10:15');
    expect(result.slots[1].endTime).toBe('10:30');
  });

  it('3. Excludes past slots when query is for today after certain hours', () => {
    // Suppose current time is 11:15 AM
    const midDayNow = fromZonedTime(`${mondayDate} 11:15:00`, TEST_TIMEZONE);

    const result = generateSlots({
      doctor: mockDoctor30Min,
      dateStr: mondayDate,
      existingAppointments: [],
      now: midDayNow,
      timezone: TEST_TIMEZONE,
    });

    // Slots starting at 09:00, 09:30, 10:00, 10:30, 11:00 should be filtered out
    const pastSlots = result.slots.filter((s) => s.startTime < '11:15');
    expect(pastSlots.length).toBe(0);

    // First available slot must be 11:30 or later
    expect(result.slots[0].startTime).toBe('11:30');
  });

  it('4. Excludes occupied slots from active existing appointments', () => {
    const existingBooked = [
      {
        slotStartTime: fromZonedTime(`${mondayDate} 09:30:00`, TEST_TIMEZONE),
        slotEndTime: fromZonedTime(`${mondayDate} 10:00:00`, TEST_TIMEZONE),
        status: 'booked',
      },
      {
        slotStartTime: fromZonedTime(`${mondayDate} 14:00:00`, TEST_TIMEZONE),
        slotEndTime: fromZonedTime(`${mondayDate} 14:30:00`, TEST_TIMEZONE),
        status: 'completed',
      },
    ];

    const result = generateSlots({
      doctor: mockDoctor30Min,
      dateStr: mondayDate,
      existingAppointments: existingBooked,
      now: earlyMorningNow,
      timezone: TEST_TIMEZONE,
    });

    expect(result.slots.length).toBe(12); // 14 - 2 occupied = 12
    expect(result.slots.some((s) => s.startTime === '09:30')).toBe(false);
    expect(result.slots.some((s) => s.startTime === '14:00')).toBe(false);
    // 09:00 should still be free
    expect(result.slots.some((s) => s.startTime === '09:00')).toBe(true);
  });

  it('5. Cancelled appointments do NOT block the slot', () => {
    const cancelledAppt = [
      {
        slotStartTime: fromZonedTime(`${mondayDate} 09:30:00`, TEST_TIMEZONE),
        slotEndTime: fromZonedTime(`${mondayDate} 10:00:00`, TEST_TIMEZONE),
        status: 'cancelled', // Cancelled!
      },
    ];

    const result = generateSlots({
      doctor: mockDoctor30Min,
      dateStr: mondayDate,
      existingAppointments: cancelledAppt,
      now: earlyMorningNow,
      timezone: TEST_TIMEZONE,
    });

    // 09:30 slot MUST be available because appointment was cancelled
    expect(result.slots.some((s) => s.startTime === '09:30')).toBe(true);
    expect(result.slots.length).toBe(14);
  });

  it('6. Returns empty slots with reason when doctor is on leave (blocked date)', () => {
    // 2026-11-09 is in mockDoctor30Min.blockedDates
    const result = generateSlots({
      doctor: mockDoctor30Min,
      dateStr: '2026-11-09',
      existingAppointments: [],
      now: earlyMorningNow,
      timezone: TEST_TIMEZONE,
    });

    expect(result.isWorking).toBe(false);
    expect(result.slots.length).toBe(0);
    expect(result.reason).toContain('Annual Leave');
  });

  it('7. Returns empty slots when doctor does not work on that day (Sunday)', () => {
    // 2026-11-08 is a Sunday
    const result = generateSlots({
      doctor: mockDoctor30Min,
      dateStr: '2026-11-08',
      existingAppointments: [],
      now: earlyMorningNow,
      timezone: TEST_TIMEZONE,
    });

    expect(result.isWorking).toBe(false);
    expect(result.slots.length).toBe(0);
    expect(result.reason).toContain('does not work');
  });
});
