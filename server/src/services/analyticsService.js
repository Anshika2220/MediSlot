import { fromZonedTime, toZonedTime, format } from 'date-fns-tz';
import { Appointment, Doctor } from '../models/index.js';
import { DEFAULT_TIMEZONE } from './availabilityService.js';

const OCCUPYING_STATUSES = ['booked', 'completed', 'no-show'];

function addDays(dateStr, days) {
  const date = new Date(`${dateStr}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function getMonday(dateStr) {
  const date = new Date(`${dateStr}T00:00:00.000Z`);
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - daysSinceMonday);
  return date.toISOString().slice(0, 10);
}

function toMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function mergeIntervals(intervals) {
  const sorted = intervals
    .filter(([start, end]) => end > start)
    .sort((left, right) => left[0] - right[0]);
  const merged = [];

  for (const interval of sorted) {
    const previous = merged[merged.length - 1];
    if (!previous || interval[0] > previous[1]) {
      merged.push([...interval]);
    } else {
      previous[1] = Math.max(previous[1], interval[1]);
    }
  }

  return merged;
}

function getWorkingIntervals({ doctor, date, timezone }) {
  const dayOfWeek = new Date(`${date}T00:00:00.000Z`).getUTCDay();
  const schedule = doctor.weeklySchedule?.find((day) => day.dayOfWeek === dayOfWeek);
  const isBlocked = doctor.blockedDates?.some((blocked) => blocked.date === date) || false;

  if (!schedule?.isWorking || isBlocked) {
    return { intervals: [], isBlocked };
  }

  const start = toMinutes(schedule.startTime);
  const end = toMinutes(schedule.endTime);
  const breaks = mergeIntervals(
    (schedule.breaks || []).map((period) => [
      Math.max(start, toMinutes(period.startTime)),
      Math.min(end, toMinutes(period.endTime)),
    ])
  );
  const localIntervals = [];
  let cursor = start;

  for (const [breakStart, breakEnd] of breaks) {
    if (breakStart > cursor) localIntervals.push([cursor, breakStart]);
    cursor = Math.max(cursor, breakEnd);
  }
  if (cursor < end) localIntervals.push([cursor, end]);

  return {
    isBlocked,
    intervals: localIntervals.map(([intervalStart, intervalEnd]) => [
      fromZonedTime(`${date} ${String(Math.floor(intervalStart / 60)).padStart(2, '0')}:${String(intervalStart % 60).padStart(2, '0')}:00`, timezone).getTime(),
      fromZonedTime(`${date} ${String(Math.floor(intervalEnd / 60)).padStart(2, '0')}:${String(intervalEnd % 60).padStart(2, '0')}:00`, timezone).getTime(),
    ]),
  };
}

function hoursFromMinutes(minutes) {
  return Math.round((minutes / 60 + Number.EPSILON) * 100) / 100;
}

export function buildWeeklyAnalytics({ doctor, appointments, weekStart, timezone = DEFAULT_TIMEZONE }) {
  const days = [];

  for (let dayOffset = 0; dayOffset < 7; dayOffset += 1) {
    const date = addDays(weekStart, dayOffset);
    const { intervals, isBlocked } = getWorkingIntervals({ doctor, date, timezone });
    const scheduledMilliseconds = intervals.reduce((total, [start, end]) => total + end - start, 0);
    const dayAppointments = appointments.filter((appointment) => {
      if (!OCCUPYING_STATUSES.includes(appointment.status)) return false;
      const localStart = format(toZonedTime(appointment.slotStartTime, timezone), 'yyyy-MM-dd', {
        timeZone: timezone,
      });
      return localStart === date;
    });
    const occupiedIntervals = [];

    for (const appointment of dayAppointments) {
      const appointmentStart = new Date(appointment.slotStartTime).getTime();
      const appointmentEnd = new Date(appointment.slotEndTime).getTime();
      for (const [workStart, workEnd] of intervals) {
        const overlapStart = Math.max(appointmentStart, workStart);
        const overlapEnd = Math.min(appointmentEnd, workEnd);
        if (overlapEnd > overlapStart) occupiedIntervals.push([overlapStart, overlapEnd]);
      }
    }

    const bookedMilliseconds = mergeIntervals(occupiedIntervals).reduce(
      (total, [start, end]) => total + end - start,
      0
    );
    const scheduledMinutes = scheduledMilliseconds / 60000;
    const bookedMinutes = Math.min(bookedMilliseconds / 60000, scheduledMinutes);
    const availableMinutes = Math.max(0, scheduledMinutes - bookedMinutes);

    days.push({
      date,
      day: new Intl.DateTimeFormat('en', { weekday: 'short', timeZone: 'UTC' }).format(
        new Date(`${date}T12:00:00.000Z`)
      ),
      isBlocked,
      scheduledHours: hoursFromMinutes(scheduledMinutes),
      bookedHours: hoursFromMinutes(bookedMinutes),
      availableHours: hoursFromMinutes(availableMinutes),
      appointmentCount: dayAppointments.length,
    });
  }

  const totals = days.reduce(
    (summary, day) => ({
      scheduledHours: summary.scheduledHours + day.scheduledHours,
      bookedHours: summary.bookedHours + day.bookedHours,
      availableHours: summary.availableHours + day.availableHours,
      appointmentCount: summary.appointmentCount + day.appointmentCount,
    }),
    { scheduledHours: 0, bookedHours: 0, availableHours: 0, appointmentCount: 0 }
  );
  totals.utilizationPercent = totals.scheduledHours
    ? Math.round((totals.bookedHours / totals.scheduledHours) * 10000) / 100
    : 0;

  return {
    weekStart,
    weekEnd: addDays(weekStart, 6),
    timezone,
    totals,
    days,
  };
}

export async function getDoctorWeeklyAnalytics({
  doctorId,
  weekStart,
  timezone = DEFAULT_TIMEZONE,
  now = new Date(),
}) {
  const doctor = await Doctor.findById(doctorId).lean();
  if (!doctor) {
    const error = new Error('Doctor not found');
    error.statusCode = 404;
    throw error;
  }

  const localToday = format(toZonedTime(now, timezone), 'yyyy-MM-dd', { timeZone: timezone });
  const resolvedWeekStart = weekStart || getMonday(localToday);
  const weekEndExclusive = addDays(resolvedWeekStart, 7);
  const appointments = await Appointment.find({
    doctorId,
    slotStartTime: {
      $gte: fromZonedTime(`${resolvedWeekStart} 00:00:00`, timezone),
      $lt: fromZonedTime(`${weekEndExclusive} 00:00:00`, timezone),
    },
    status: { $in: OCCUPYING_STATUSES },
  })
    .select('slotStartTime slotEndTime status')
    .lean();

  return {
    doctor: { id: doctor._id, name: doctor.name },
    ...buildWeeklyAnalytics({
      doctor,
      appointments,
      weekStart: resolvedWeekStart,
      timezone,
    }),
  };
}