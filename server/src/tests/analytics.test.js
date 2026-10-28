import { describe, expect, it } from 'vitest';
import { fromZonedTime } from 'date-fns-tz';
import { buildWeeklyAnalytics } from '../services/analyticsService.js';

const timezone = 'Asia/Kolkata';
const weekStart = '2026-11-02';

describe('Weekly doctor analytics calculations', () => {
  it('subtracts breaks and blocked dates, ignores cancellations, and calculates utilization', () => {
    const doctor = {
      weeklySchedule: [
        {
          dayOfWeek: 1,
          isWorking: true,
          startTime: '09:00',
          endTime: '17:00',
          breaks: [
            { startTime: '13:00', endTime: '13:30' },
            { startTime: '13:15', endTime: '14:00' },
          ],
        },
        { dayOfWeek: 2, isWorking: true, startTime: '09:00', endTime: '12:00', breaks: [] },
        { dayOfWeek: 3, isWorking: true, startTime: '09:00', endTime: '17:00', breaks: [] },
      ],
      blockedDates: [{ date: '2026-11-04', reason: 'Leave' }],
    };
    const appointments = [
      {
        slotStartTime: fromZonedTime('2026-11-02 09:00:00', timezone),
        slotEndTime: fromZonedTime('2026-11-02 09:30:00', timezone),
        status: 'booked',
      },
      {
        slotStartTime: fromZonedTime('2026-11-02 10:00:00', timezone),
        slotEndTime: fromZonedTime('2026-11-02 10:30:00', timezone),
        status: 'completed',
      },
      {
        slotStartTime: fromZonedTime('2026-11-02 11:00:00', timezone),
        slotEndTime: fromZonedTime('2026-11-02 11:30:00', timezone),
        status: 'cancelled',
      },
    ];

    const result = buildWeeklyAnalytics({ doctor, appointments, weekStart, timezone });

    expect(result.days[0]).toMatchObject({
      scheduledHours: 7,
      bookedHours: 1,
      availableHours: 6,
      appointmentCount: 2,
    });
    expect(result.days[1].scheduledHours).toBe(3);
    expect(result.days[2]).toMatchObject({ isBlocked: true, scheduledHours: 0 });
    expect(result.totals).toMatchObject({
      scheduledHours: 10,
      bookedHours: 1,
      availableHours: 9,
      appointmentCount: 2,
      utilizationPercent: 10,
    });
  });

  it('returns zero utilization when the doctor has no scheduled hours', () => {
    const result = buildWeeklyAnalytics({
      doctor: { weeklySchedule: [], blockedDates: [] },
      appointments: [],
      weekStart,
      timezone,
    });

    expect(result.totals).toMatchObject({
      scheduledHours: 0,
      bookedHours: 0,
      availableHours: 0,
      utilizationPercent: 0,
    });
  });
});