// client/src/pages/PatientDashboard.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import api from '../services/api';
import Navbar from '../components/Navbar';
import BookingAssistant from '../features/chatbot/BookingAssistant';
import {
  Calendar,
  Clock,
  User,
  AlertCircle,
  XCircle,
  RotateCcw,
  CheckCircle2,
  CalendarDays,
  Plus,
} from 'lucide-react';

export default function PatientDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState({ upcoming: [], past: [], total: 0 });
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'past'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Reschedule state
  const [reschedulingAppt, setReschedulingAppt] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [rescheduleSlots, setRescheduleSlots] = useState([]);
  const [selectedRescheduleSlot, setSelectedRescheduleSlot] = useState(null);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [rescheduleSlotsLoading, setRescheduleSlotsLoading] = useState(false);
  const [rescheduleError, setRescheduleError] = useState('');

  async function fetchAppointments() {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/appointments/my');
      setData(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAppointments();
  }, []);

  // Fetch slots when rescheduling modal is open
  useEffect(() => {
    if (!reschedulingAppt || !rescheduleDate) return;
    async function fetchDocSlots() {
      setRescheduleSlotsLoading(true);
      setRescheduleError('');
      setSelectedRescheduleSlot(null);
      try {
        const docId = reschedulingAppt.doctorId._id || reschedulingAppt.doctorId;
        const res = await api.get(`/doctors/${docId}/availability?date=${rescheduleDate}`);
        setRescheduleSlots(res.data.data.slots || []);
      } catch (err) {
        setRescheduleError('Failed to load slots for this date');
      } finally {
        setRescheduleSlotsLoading(false);
      }
    }
    fetchDocSlots();
  }, [reschedulingAppt, rescheduleDate]);

  async function handleCancel(apptId) {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    setError('');
    setSuccessMsg('');
    try {
      await api.patch(`/appointments/${apptId}/cancel`, {
        reason: 'Cancelled by patient from dashboard',
      });
      setSuccessMsg('Appointment cancelled successfully. The slot has been freed.');
      fetchAppointments();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel appointment');
    }
  }

  async function handleConfirmReschedule() {
    if (!selectedRescheduleSlot) return;
    setRescheduleLoading(true);
    setRescheduleError('');
    try {
      await api.patch(`/appointments/${reschedulingAppt._id}/reschedule`, {
        newSlotStartTime: selectedRescheduleSlot.slotStartTime,
        reason: 'Rescheduled by patient from dashboard',
      });
      setSuccessMsg('Appointment successfully rescheduled to new time slot.');
      setReschedulingAppt(null);
      fetchAppointments();
    } catch (err) {
      setRescheduleError(err.response?.data?.message || 'Failed to reschedule appointment');
    } finally {
      setRescheduleLoading(false);
    }
  }

  // Check if fewer than 2 hours remain
  function isWithinTwoHours(slotStartTime) {
    const diffMs = new Date(slotStartTime).getTime() - Date.now();
    return diffMs < 2 * 60 * 60 * 1000;
  }

  const listToRender = activeTab === 'upcoming' ? data.upcoming : data.past;

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-20">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text)] mb-1">
              Patient Appointments
            </h1>
            <p className="text-xs text-[var(--muted)]">
              Welcome back, <span className="text-[var(--text)] font-semibold">{user?.name}</span>. Manage your clinic bookings below.
            </p>
          </div>

          <Link to="/" className="btn btn-primary text-xs gap-1.5 self-start sm:self-auto">
            <Plus size={15} />
            Book New Appointment
          </Link>
        </div>

        {/* Global Alerts */}
        {error && (
          <div className="alert alert-error mb-6 flex items-center gap-2 text-xs fade-in">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="alert alert-success mb-6 flex items-center gap-2 text-xs fade-in">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <BookingAssistant onBookingComplete={fetchAppointments} />

        {/* Tabs */}
        <div className="flex items-center gap-3 border-b border-[var(--border)] mb-6">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`pb-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'upcoming'
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            <Calendar size={14} />
            Upcoming ({data.upcoming?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('past')}
            className={`pb-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'past'
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            <Clock size={14} />
            Past History ({data.past?.length || 0})
          </button>
        </div>

        {/* Appointments List */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-[var(--muted)]">
            <div className="spinner" />
            <span className="text-xs">Loading appointments…</span>
          </div>
        ) : listToRender.length === 0 ? (
          <div className="card text-center py-16 px-4">
            <CalendarDays size={36} className="mx-auto mb-3 text-[var(--muted)] opacity-50" />
            <h3 className="text-sm font-semibold text-[var(--text)] mb-1">
              No {activeTab} appointments found
            </h3>
            <p className="text-xs text-[var(--muted)] mb-5 max-w-sm mx-auto">
              {activeTab === 'upcoming'
                ? 'You do not have any upcoming visits scheduled. Browse doctors to book a slot.'
                : 'Your past completed and cancelled appointment history will appear here.'}
            </p>
            {activeTab === 'upcoming' && (
              <Link to="/" className="btn btn-primary text-xs">
                Find Doctors
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3.5">
            {listToRender.map((appt) => {
              const locked = isWithinTwoHours(appt.slotStartTime);
              const doctorName = appt.doctorId?.name || 'Doctor';
              const specialty = appt.doctorId?.specialty || 'General';
              const fee = appt.doctorId?.consultationFee || 500;
              const dateStr = new Date(appt.slotStartTime).toLocaleDateString('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              });
              const timeStr = new Date(appt.slotStartTime).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div key={appt._id} className="card p-5 transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Left: Doctor & Date details */}
                    <div>
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <span className="font-bold text-sm text-[var(--text)]">{doctorName}</span>
                        <span className="badge badge-accent">{specialty}</span>
                        <span
                          className={`badge ${
                            appt.status === 'booked'
                              ? 'badge-info'
                              : appt.status === 'completed'
                              ? 'badge-success'
                              : 'badge-danger'
                          }`}
                        >
                          {appt.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--muted)]">
                        <span className="flex items-center gap-1 text-[var(--text)] font-medium">
                          <Calendar size={13} className="text-[var(--accent)]" />
                          {dateStr}
                        </span>
                        <span className="flex items-center gap-1 text-[var(--text)] font-medium">
                          <Clock size={13} className="text-[var(--accent)]" />
                          {timeStr}
                        </span>
                        <span>₹{fee} Fee</span>
                        {appt.reason && (
                          <span className="text-[11px] italic text-[var(--muted)]">
                            "{appt.reason}"
                          </span>
                        )}
                      </div>

                      {appt.cancellationReason && (
                        <p className="text-[11px] text-[var(--danger)] mt-2">
                          Cancellation reason: {appt.cancellationReason}
                        </p>
                      )}

                      {appt.notes && (
                        <p className="text-[11px] text-[var(--success)] mt-2">
                          Doctor Notes: {appt.notes}
                        </p>
                      )}
                    </div>

                    {/* Right: Actions (Cancel / Reschedule) */}
                    {appt.status === 'booked' && (
                      <div className="flex sm:flex-col items-end gap-2 shrink-0">
                        {locked ? (
                          <span className="text-[10px] text-[var(--danger)] italic max-w-[160px] text-right">
                            🔒 Modifying locked: less than 2 hours to appointment
                          </span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setReschedulingAppt(appt)}
                              className="btn btn-secondary text-xs px-2.5 py-1.5"
                            >
                              <RotateCcw size={13} />
                              Reschedule
                            </button>
                            <button
                              onClick={() => handleCancel(appt._id)}
                              className="btn btn-danger text-xs px-2.5 py-1.5"
                            >
                              <XCircle size={13} />
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Reschedule Modal */}
        {reschedulingAppt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm fade-in">
            <div className="card w-full max-w-lg p-6 bg-[var(--card)] border-[var(--border)] shadow-2xl">
              <h3 className="text-base font-bold text-[var(--text)] mb-1">
                Reschedule Appointment
              </h3>
              <p className="text-xs text-[var(--muted)] mb-4">
                Select a new date and time with {reschedulingAppt.doctorId?.name}
              </p>

              {rescheduleError && (
                <div className="alert alert-error mb-4 text-xs">
                  {rescheduleError}
                </div>
              )}

              <div className="mb-4">
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                  Choose New Date
                </label>
                <input
                  type="date"
                  value={rescheduleDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="mb-6">
                <label className="block text-xs font-medium text-[var(--muted)] mb-2">
                  Select New Available Time Slot
                </label>

                {rescheduleSlotsLoading ? (
                  <div className="py-6 flex items-center justify-center gap-2 text-xs text-[var(--muted)]">
                    <div className="spinner" />
                    <span>Loading available slots…</span>
                  </div>
                ) : rescheduleSlots.length === 0 ? (
                  <p className="text-xs text-[var(--muted)] py-4 text-center bg-[var(--surface)] rounded border border-[var(--border)]">
                    No slots available on this date. Please pick another day.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                    {rescheduleSlots.map((slot) => {
                      const isSel = selectedRescheduleSlot?.startTime === slot.startTime;
                      return (
                        <button
                          key={slot.startTime}
                          onClick={() => setSelectedRescheduleSlot(slot)}
                          className={`py-2 px-2 rounded text-xs font-medium border transition-all ${
                            isSel
                              ? 'border-[var(--accent)] bg-[var(--accent)] text-[#1A1A1A] font-bold'
                              : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:border-[var(--accent)]'
                          }`}
                        >
                          {slot.startTime}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setReschedulingAppt(null)}
                  className="btn btn-ghost text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReschedule}
                  disabled={!selectedRescheduleSlot || rescheduleLoading}
                  className="btn btn-primary text-xs"
                >
                  {rescheduleLoading ? 'Rescheduling…' : 'Confirm New Slot'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
