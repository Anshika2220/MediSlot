// client/src/pages/DoctorDashboard.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import api from '../services/api';
import Navbar from '../components/Navbar';
import {
  Calendar,
  Clock,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  Save,
  Plus,
  Trash2,
  CalendarX,
  Stethoscope,
  Phone,
} from 'lucide-react';

export default function DoctorDashboard() {
  const { user, doctor } = useAuth();
  const [activeTab, setActiveTab] = useState('today'); // 'today' | 'schedule' | 'leaves'

  // Today's appointments state
  const [todayData, setTodayData] = useState({ appointments: [], count: 0, date: '' });
  const [loadingToday, setLoadingToday] = useState(true);
  const [statusActionLoading, setStatusActionLoading] = useState(false);
  const [notesModalAppt, setNotesModalAppt] = useState(null);
  const [medicalNotes, setMedicalNotes] = useState('');

  // Schedule management state
  const [slotDuration, setSlotDuration] = useState(doctor?.slotDuration || 30);
  const [weeklySchedule, setWeeklySchedule] = useState(
    doctor?.weeklySchedule || [
      { dayOfWeek: 1, isWorking: true, startTime: '09:00', endTime: '17:00', breaks: [{ startTime: '13:00', endTime: '14:00', label: 'Lunch' }] },
      { dayOfWeek: 2, isWorking: true, startTime: '09:00', endTime: '17:00', breaks: [{ startTime: '13:00', endTime: '14:00', label: 'Lunch' }] },
      { dayOfWeek: 3, isWorking: true, startTime: '09:00', endTime: '17:00', breaks: [{ startTime: '13:00', endTime: '14:00', label: 'Lunch' }] },
      { dayOfWeek: 4, isWorking: true, startTime: '09:00', endTime: '17:00', breaks: [{ startTime: '13:00', endTime: '14:00', label: 'Lunch' }] },
      { dayOfWeek: 5, isWorking: true, startTime: '09:00', endTime: '17:00', breaks: [{ startTime: '13:00', endTime: '14:00', label: 'Lunch' }] },
      { dayOfWeek: 6, isWorking: false, startTime: '09:00', endTime: '13:00', breaks: [] },
      { dayOfWeek: 0, isWorking: false, startTime: '09:00', endTime: '13:00', breaks: [] },
    ]
  );
  const [blockedDates, setBlockedDates] = useState(doctor?.blockedDates || []);
  const [newBlockedDate, setNewBlockedDate] = useState('');
  const [newBlockedReason, setNewBlockedReason] = useState('');

  const [saveLoading, setSaveLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState({ type: '', text: '' });

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  async function fetchTodayAppointments() {
    setLoadingToday(true);
    try {
      const res = await api.get('/appointments/doctor/today');
      setTodayData(res.data.data);
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: 'Failed to load today appointments' });
    } finally {
      setLoadingToday(false);
    }
  }

  // Load doctor profile schedule if not in context
  useEffect(() => {
    fetchTodayAppointments();
    if (doctor?.id) {
      api.get(`/doctors/${doctor.id}`).then((res) => {
        const d = res.data.data;
        setSlotDuration(d.slotDuration);
        if (d.weeklySchedule?.length) setWeeklySchedule(d.weeklySchedule);
        if (d.blockedDates) setBlockedDates(d.blockedDates);
      }).catch(() => {});
    }
  }, [doctor?.id]);

  // Handle Marking Complete or No-Show
  async function handleUpdateStatus(apptId, status, notes = '') {
    setStatusActionLoading(true);
    setFeedbackMsg({ type: '', text: '' });
    try {
      await api.patch(`/appointments/${apptId}/status`, { status, notes });
      setFeedbackMsg({ type: 'success', text: `Appointment marked as ${status}.` });
      setNotesModalAppt(null);
      setMedicalNotes('');
      fetchTodayAppointments();
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        text: err.response?.data?.message || 'Failed to update status',
      });
    } finally {
      setStatusActionLoading(false);
    }
  }

  // Save updated schedule & slot settings
  async function handleSaveSchedule() {
    if (!doctor?.id) return;
    setSaveLoading(true);
    setFeedbackMsg({ type: '', text: '' });
    try {
      await api.put(`/doctors/${doctor.id}/availability`, {
        slotDuration: Number(slotDuration),
        weeklySchedule,
        blockedDates,
      });
      setFeedbackMsg({
        type: 'success',
        text: 'Weekly schedule and slot configuration updated successfully!',
      });
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        text: err.response?.data?.message || 'Failed to save schedule changes.',
      });
    } finally {
      setSaveLoading(false);
    }
  }

  // Toggle Day Working Status
  function handleToggleDay(dayIndex) {
    setWeeklySchedule((prev) =>
      prev.map((day) =>
        day.dayOfWeek === dayIndex ? { ...day, isWorking: !day.isWorking } : day
      )
    );
  }

  // Update working hours for a day
  function handleHourChange(dayIndex, field, value) {
    setWeeklySchedule((prev) =>
      prev.map((day) =>
        day.dayOfWeek === dayIndex ? { ...day, [field]: value } : day
      )
    );
  }

  // Add Blocked Date
  function handleAddBlockedDate(e) {
    e.preventDefault();
    if (!newBlockedDate) return;
    if (blockedDates.some((b) => b.date === newBlockedDate)) {
      alert('This date is already blocked.');
      return;
    }
    setBlockedDates([
      ...blockedDates,
      { date: newBlockedDate, reason: newBlockedReason || 'Leave / Unavailable' },
    ]);
    setNewBlockedDate('');
    setNewBlockedReason('');
  }

  // Remove Blocked Date
  function handleRemoveBlockedDate(dateStr) {
    setBlockedDates(blockedDates.filter((b) => b.date !== dateStr));
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-20">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-[var(--text)]">
                Doctor Practice Dashboard
              </h1>
              <span className="badge badge-accent">
                {doctor?.specialty || 'Specialist'}
              </span>
            </div>
            <p className="text-xs text-[var(--muted)]">
              Logged in as <span className="text-[var(--text)] font-semibold">{user?.name}</span>. Manage your schedule, slot durations, and today’s appointments.
            </p>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {feedbackMsg.text && (
          <div
            className={`alert ${
              feedbackMsg.type === 'success' ? 'alert-success' : 'alert-error'
            } mb-6 flex items-center gap-2 text-xs fade-in`}
          >
            {feedbackMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-4 border-b border-[var(--border)] mb-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('today')}
            className={`pb-3 border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'today'
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            <Clock size={15} />
            Today's Appointments ({todayData.count || 0})
          </button>

          <button
            onClick={() => setActiveTab('schedule')}
            className={`pb-3 border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'schedule'
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            <Calendar size={15} />
            Weekly Schedule & Slots ({slotDuration}m)
          </button>

          <button
            onClick={() => setActiveTab('leaves')}
            className={`pb-3 border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'leaves'
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            <CalendarX size={15} />
            Blocked Dates / Leaves ({blockedDates.length})
          </button>
        </div>

        {/* TAB 1: Today's Appointments */}
        {activeTab === 'today' && (
          <div className="space-y-4 fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
                Chronological Schedule for Today ({todayData.date})
              </span>
              <button
                onClick={fetchTodayAppointments}
                className="btn btn-secondary text-xs px-3 py-1"
              >
                Refresh
              </button>
            </div>

            {loadingToday ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-[var(--muted)]">
                <div className="spinner" />
                <span className="text-xs">Loading today’s schedule…</span>
              </div>
            ) : todayData.appointments?.length === 0 ? (
              <div className="card text-center py-16 px-4">
                <Clock size={36} className="mx-auto mb-2 text-[var(--muted)] opacity-50" />
                <h3 className="text-sm font-semibold text-[var(--text)] mb-1">
                  No appointments scheduled for today
                </h3>
                <p className="text-xs text-[var(--muted)]">
                  Your patients will appear here in chronological order when booked.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {todayData.appointments.map((appt) => {
                  const patientName = appt.patientId?.name || 'Walk-in Patient';
                  const patientPhone = appt.patientId?.phone || 'No phone provided';
                  const startTime = new Date(appt.slotStartTime).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  const endTime = new Date(appt.slotEndTime).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div key={appt._id} className="card p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="w-16 text-center py-2 rounded bg-[var(--surface)] border border-[var(--border)] shrink-0">
                            <span className="text-xs font-bold text-[var(--accent)] block">
                              {startTime}
                            </span>
                            <span className="text-[10px] text-[var(--muted)]">to {endTime}</span>
                          </div>

                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-sm text-[var(--text)]">
                                {patientName}
                              </span>
                              <span
                                className={`badge ${
                                  appt.status === 'completed'
                                    ? 'badge-success'
                                    : appt.status === 'no-show' || appt.status === 'cancelled'
                                    ? 'badge-danger'
                                    : 'badge-accent'
                                }`}
                              >
                                {appt.status}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
                              <span className="flex items-center gap-1">
                                <Phone size={12} />
                                {patientPhone}
                              </span>
                              {appt.reason && (
                                <span className="italic text-[var(--text)]">
                                  "{appt.reason}"
                                </span>
                              )}
                            </div>

                            {appt.notes && (
                              <p className="text-[11px] text-[var(--success)] mt-1.5">
                                Notes: {appt.notes}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Status Actions */}
                        {appt.status === 'booked' && (
                          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                            <button
                              onClick={() => {
                                setNotesModalAppt(appt);
                                setMedicalNotes('');
                              }}
                              className="btn btn-secondary text-xs px-2.5 py-1.5"
                            >
                              <CheckCircle size={14} className="text-[var(--success)]" />
                              Mark Completed
                            </button>

                            <button
                              onClick={() => handleUpdateStatus(appt._id, 'no-show')}
                              className="btn btn-danger text-xs px-2.5 py-1.5"
                            >
                              <XCircle size={14} />
                              No-Show
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Weekly Schedule & Slot Duration */}
        {activeTab === 'schedule' && (
          <div className="space-y-6 fade-in">
            {/* Slot Duration Configuration */}
            <div className="card p-5">
              <h3 className="text-sm font-bold text-[var(--text)] mb-1">
                Consultation Slot Duration
              </h3>
              <p className="text-xs text-[var(--muted)] mb-4">
                Define the time interval of every booking slot generated for your practice
              </p>

              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setSlotDuration(15)}
                  className={`py-2 px-4 rounded-lg text-xs font-semibold border transition-all ${
                    slotDuration === 15
                      ? 'border-[var(--accent)] bg-[var(--accent)] text-[#1A1A1A] font-bold shadow-md'
                      : 'border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]'
                  }`}
                >
                  15-Minute Slots
                </button>

                <button
                  type="button"
                  onClick={() => setSlotDuration(30)}
                  className={`py-2 px-4 rounded-lg text-xs font-semibold border transition-all ${
                    slotDuration === 30
                      ? 'border-[var(--accent)] bg-[var(--accent)] text-[#1A1A1A] font-bold shadow-md'
                      : 'border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]'
                  }`}
                >
                  30-Minute Slots (Standard)
                </button>
              </div>
            </div>

            {/* Weekly Days Configuration */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text)]">Weekly Working Hours</h3>
                  <p className="text-xs text-[var(--muted)]">
                    Configure your working days and clinic start / end times
                  </p>
                </div>

                <button
                  onClick={handleSaveSchedule}
                  disabled={saveLoading}
                  className="btn btn-primary text-xs gap-1.5 font-bold"
                >
                  <Save size={14} />
                  {saveLoading ? 'Saving…' : 'Save Schedule Changes'}
                </button>
              </div>

              <div className="divide-y divide-[var(--border)]">
                {[1, 2, 3, 4, 5, 6, 0].map((dayIdx) => {
                  const dayConfig = weeklySchedule.find((s) => s.dayOfWeek === dayIdx) || {
                    dayOfWeek: dayIdx,
                    isWorking: false,
                    startTime: '09:00',
                    endTime: '17:00',
                  };

                  return (
                    <div
                      key={dayIdx}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3 w-36">
                        <input
                          type="checkbox"
                          checked={dayConfig.isWorking}
                          onChange={() => handleToggleDay(dayIdx)}
                          className="w-4 h-4 rounded accent-[var(--accent)] cursor-pointer"
                        />
                        <span
                          className={`font-semibold ${
                            dayConfig.isWorking ? 'text-[var(--text)]' : 'text-[var(--muted)]'
                          }`}
                        >
                          {dayNames[dayIdx]}
                        </span>
                      </div>

                      {dayConfig.isWorking ? (
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-[var(--muted)]">From:</span>
                            <input
                              type="time"
                              value={dayConfig.startTime}
                              onChange={(e) => handleHourChange(dayIdx, 'startTime', e.target.value)}
                              className="text-xs py-1 px-2 w-auto"
                            />
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-[var(--muted)]">To:</span>
                            <input
                              type="time"
                              value={dayConfig.endTime}
                              onChange={(e) => handleHourChange(dayIdx, 'endTime', e.target.value)}
                              className="text-xs py-1 px-2 w-auto"
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] italic text-[var(--muted)]">
                          Day Off (No slots generated)
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Blocked Single-Day Leaves */}
        {activeTab === 'leaves' && (
          <div className="space-y-6 fade-in">
            {/* Add Leave Form */}
            <div className="card p-5">
              <h3 className="text-sm font-bold text-[var(--text)] mb-1">
                Block a Single Date (Leave / Vacation / Conference)
              </h3>
              <p className="text-xs text-[var(--muted)] mb-4">
                Patients will not be offered any slots on blocked dates
              </p>

              <form onSubmit={handleAddBlockedDate} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="date"
                  required
                  value={newBlockedDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setNewBlockedDate(e.target.value)}
                  className="text-xs sm:w-48"
                />

                <input
                  type="text"
                  placeholder="Reason (e.g. Medical Conference, Personal Leave)"
                  value={newBlockedReason}
                  onChange={(e) => setNewBlockedReason(e.target.value)}
                  className="text-xs flex-1"
                />

                <button type="submit" className="btn btn-secondary text-xs gap-1.5 shrink-0">
                  <Plus size={14} />
                  Add Blocked Date
                </button>
              </form>
            </div>

            {/* Current Blocked Dates List */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-[var(--text)]">
                  Active Blocked Dates ({blockedDates.length})
                </h3>

                <button
                  onClick={handleSaveSchedule}
                  disabled={saveLoading}
                  className="btn btn-primary text-xs gap-1.5 font-bold"
                >
                  <Save size={14} />
                  {saveLoading ? 'Saving…' : 'Save Changes'}
                </button>
              </div>

              {blockedDates.length === 0 ? (
                <p className="text-xs text-[var(--muted)] py-6 text-center">
                  No blocked dates configured. All normal weekly working days are bookable.
                </p>
              ) : (
                <div className="divide-y divide-[var(--border)]">
                  {blockedDates.map((b) => (
                    <div key={b.date} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-[var(--accent)] mr-3">{b.date}</span>
                        <span className="text-[var(--text)]">{b.reason}</span>
                      </div>

                      <button
                        onClick={() => handleRemoveBlockedDate(b.date)}
                        className="text-[var(--danger)] hover:underline p-1 text-[11px] flex items-center gap-1"
                      >
                        <Trash2 size={13} />
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal: Complete Appointment with Medical Notes */}
        {notesModalAppt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm fade-in">
            <div className="card w-full max-w-md p-6 bg-[var(--card)] border-[var(--border)] shadow-2xl">
              <h3 className="text-base font-bold text-[var(--text)] mb-1">
                Mark Appointment Completed
              </h3>
              <p className="text-xs text-[var(--muted)] mb-4">
                Consultation with {notesModalAppt.patientId?.name}
              </p>

              <div className="mb-4">
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                  Doctor Clinical Notes / Diagnosis (Optional)
                </label>
                <textarea
                  rows={3}
                  value={medicalNotes}
                  onChange={(e) => setMedicalNotes(e.target.value)}
                  placeholder="e.g. ECG normal. Prescribed medication. Follow-up in 3 weeks."
                  className="text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setNotesModalAppt(null)}
                  className="btn btn-ghost text-xs"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleUpdateStatus(notesModalAppt._id, 'completed', medicalNotes)
                  }
                  disabled={statusActionLoading}
                  className="btn btn-primary text-xs"
                >
                  {statusActionLoading ? 'Saving…' : 'Confirm Completed'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
