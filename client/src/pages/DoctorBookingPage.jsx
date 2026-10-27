// client/src/pages/DoctorBookingPage.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import api from '../services/api';
import Navbar from '../components/Navbar';
import {
  Calendar as CalendarIcon,
  Clock,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  CalendarDays,
  User,
} from 'lucide-react';

export default function DoctorBookingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isPatient } = useAuth();

  const [doctor, setDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    // Tomorrow by default
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });

  const [availability, setAvailability] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [reason, setReason] = useState('General Consultation');

  const [loadingDoctor, setLoadingDoctor] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(null);
  const [bookingError, setBookingError] = useState('');

  // 1. Fetch Doctor Profile
  useEffect(() => {
    async function fetchDoc() {
      setLoadingDoctor(true);
      try {
        const res = await api.get(`/doctors/${id}`);
        setDoctor(res.data.data);
      } catch (err) {
        setBookingError('Doctor profile not found');
      } finally {
        setLoadingDoctor(false);
      }
    }
    fetchDoc();
  }, [id]);

  // 2. Fetch Slots whenever doctor or selectedDate changes
  useEffect(() => {
    async function fetchSlots() {
      if (!id || !selectedDate) return;
      setLoadingSlots(true);
      setSelectedSlot(null);
      setBookingError('');
      setBookingSuccess(null);

      try {
        const res = await api.get(`/doctors/${id}/availability?date=${selectedDate}`);
        setAvailability(res.data.data);
      } catch (err) {
        setBookingError(err.response?.data?.message || 'Failed to fetch doctor availability');
      } finally {
        setLoadingSlots(false);
      }
    }
    fetchSlots();
  }, [id, selectedDate]);

  // 3. Handle Appointment Reservation
  async function handleBook() {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/doctors/${id}/book` } } });
      return;
    }

    if (!isPatient) {
      setBookingError('Only patient accounts can reserve appointments. Please sign in as a patient.');
      return;
    }

    if (!selectedSlot) {
      setBookingError('Please select an available time slot.');
      return;
    }

    setBookingLoading(true);
    setBookingError('');

    try {
      const res = await api.post('/appointments', {
        doctorId: id,
        slotStartTime: selectedSlot.slotStartTime,
        reason,
      });

      setBookingSuccess(res.data.data);
      setSelectedSlot(null);
    } catch (err) {
      const status = err.response?.status;
      if (status === 409) {
        setBookingError('⚡ Concurrency collision: This slot was just reserved by another patient. Slots have been refreshed.');
        // Refresh slots
        const refreshRes = await api.get(`/doctors/${id}/availability?date=${selectedDate}`);
        setAvailability(refreshRes.data.data);
      } else {
        setBookingError(err.response?.data?.message || 'Failed to book appointment.');
      }
    } finally {
      setBookingLoading(false);
    }
  }

  if (loadingDoctor) {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-20 flex flex-col items-center justify-center gap-3">
          <div className="spinner" />
          <span className="text-sm text-[var(--muted)]">Loading doctor profile…</span>
        </div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <Navbar />
        <div className="max-w-md mx-auto px-4 py-20 text-center">
          <h2 className="text-lg font-bold text-[var(--text)] mb-2">Doctor Not Found</h2>
          <Link to="/" className="btn btn-primary text-xs">
            Return to Doctor Directory
          </Link>
        </div>
      </div>
    );
  }

  // Quick Date presets
  const today = new Date();
  const datePresets = [
    { label: 'Today', offset: 0 },
    { label: 'Tomorrow', offset: 1 },
    { label: 'Day After', offset: 2 },
  ].map((p) => {
    const d = new Date(today);
    d.setDate(d.getDate() + p.offset);
    return {
      label: p.label,
      dateStr: d.toISOString().split('T')[0],
      display: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    };
  });

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-20">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6">
        {/* Back navigation */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-[var(--text)] mb-6 transition-colors"
        >
          <ChevronLeft size={16} />
          Back to Doctors
        </Link>

        {/* Doctor Info Card */}
        <div className="card p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1.5">
                <h1 className="text-xl font-bold text-[var(--text)]">{doctor.name}</h1>
                <span className="badge badge-accent">{doctor.specialty}</span>
              </div>
              <p className="text-xs text-[var(--muted)] max-w-2xl leading-relaxed">
                {doctor.bio || 'Consulting physician at MediSlot Clinic.'}
              </p>
            </div>

            <div className="flex sm:flex-col items-end sm:text-right gap-3 sm:gap-1 shrink-0">
              <span className="text-xs text-[var(--muted)]">Consultation Fee</span>
              <span className="text-lg font-bold text-[var(--accent)]">
                ₹{doctor.consultationFee}
              </span>
              <span className="text-[11px] text-[var(--muted)]">
                {doctor.slotDuration}-min consultations
              </span>
            </div>
          </div>
        </div>

        {/* Booking Confirmation Success Banner */}
        {bookingSuccess && (
          <div className="card border-[var(--success)] bg-[rgba(76,175,125,0.08)] p-6 mb-6 fade-in text-center">
            <div className="flex justify-center mb-3 text-[var(--success)]">
              <CheckCircle2 size={36} />
            </div>
            <h3 className="text-base font-bold text-[var(--text)] mb-1">
              Appointment Confirmed!
            </h3>
            <p className="text-xs text-[var(--muted)] mb-4">
              Your appointment with <strong className="text-[var(--text)]">{doctor.name}</strong> on{' '}
              <strong className="text-[var(--accent)]">
                {new Date(bookingSuccess.slotStartTime).toLocaleString('en-US', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </strong>{' '}
              has been successfully booked.
            </p>
            <div className="flex justify-center gap-3">
              <Link to="/patient/appointments" className="btn btn-primary text-xs">
                View My Appointments
              </Link>
              <button
                onClick={() => setBookingSuccess(null)}
                className="btn btn-secondary text-xs"
              >
                Book Another Slot
              </button>
            </div>
          </div>
        )}

        {/* Date Selection Bar */}
        <div className="card p-5 mb-6">
          <h2 className="text-sm font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
            <CalendarDays size={16} className="text-[var(--accent)]" />
            Select Appointment Date
          </h2>

          <div className="flex flex-wrap items-center gap-2.5">
            {datePresets.map((preset) => (
              <button
                key={preset.dateStr}
                onClick={() => setSelectedDate(preset.dateStr)}
                className={`py-2 px-3.5 rounded-lg text-xs font-medium border transition-all ${
                  selectedDate === preset.dateStr
                    ? 'border-[var(--accent)] bg-[rgba(214,198,90,0.12)] text-[var(--accent)]'
                    : 'border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                <div className="font-semibold">{preset.label}</div>
                <div className="text-[10px] opacity-80">{preset.display}</div>
              </button>
            ))}

            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-[var(--muted)]">Custom Date:</span>
              <input
                type="date"
                value={selectedDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-xs py-1.5 px-2.5 w-auto"
              />
            </div>
          </div>
        </div>

        {/* Slot Selection Grid */}
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
              <Clock size={16} className="text-[var(--accent)]" />
              Available Time Slots ({doctor.slotDuration} min)
            </h2>
            {availability?.isWorking && (
              <span className="text-xs text-[var(--muted)]">
                {availability.slots?.length || 0} slots available
              </span>
            )}
          </div>

          {loadingSlots ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2.5 text-[var(--muted)]">
              <div className="spinner" />
              <span className="text-xs">Checking real-time doctor availability…</span>
            </div>
          ) : !availability?.isWorking ? (
            <div className="py-10 text-center text-xs text-[var(--muted)] bg-[var(--surface)] rounded-lg border border-[var(--border)] p-6">
              <AlertCircle size={24} className="mx-auto mb-2 text-[var(--accent)] opacity-80" />
              <p className="font-medium text-[var(--text)] mb-1">Doctor Unavailable on this Date</p>
              <p className="text-[var(--muted)]">
                {availability?.reason || 'Doctor does not practice on this day.'}
              </p>
              <p className="mt-2 text-[11px] text-[var(--accent)]">
                Please pick another date from the calendar above.
              </p>
            </div>
          ) : availability.slots?.length === 0 ? (
            <div className="py-10 text-center text-xs text-[var(--muted)] bg-[var(--surface)] rounded-lg border border-[var(--border)] p-6">
              <Clock size={24} className="mx-auto mb-2 opacity-60" />
              <p className="font-medium text-[var(--text)] mb-1">No Free Slots Remaining</p>
              <p>All appointment slots for this date are fully reserved or have already passed.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
              {availability.slots.map((slot) => {
                const isSelected = selectedSlot?.startTime === slot.startTime;
                return (
                  <button
                    key={slot.startTime}
                    onClick={() => setSelectedSlot(slot)}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all text-center ${
                      isSelected
                        ? 'border-[var(--accent)] bg-[var(--accent)] text-[#1A1A1A] shadow-md scale-[1.02]'
                        : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
                    }`}
                  >
                    <span>{slot.startTime}</span>
                    <span className="block text-[10px] font-normal opacity-75">
                      to {slot.endTime}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Reservation Action Panel */}
        {selectedSlot && (
          <div className="card border-[var(--accent)] bg-[rgba(214,198,90,0.04)] p-6 fade-in">
            <h3 className="text-sm font-bold text-[var(--text)] mb-3">
              Confirm Appointment Details
            </h3>

            {bookingError && (
              <div className="alert alert-error mb-4 flex items-center gap-2 text-xs">
                <AlertCircle size={16} className="shrink-0" />
                <span>{bookingError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 text-xs">
              <div className="p-3 rounded bg-[var(--surface)] border border-[var(--border)]">
                <span className="text-[11px] text-[var(--muted)] block mb-0.5">Doctor</span>
                <span className="font-semibold text-[var(--text)]">{doctor.name}</span>
                <span className="block text-[10px] text-[var(--accent)]">{doctor.specialty}</span>
              </div>

              <div className="p-3 rounded bg-[var(--surface)] border border-[var(--border)]">
                <span className="text-[11px] text-[var(--muted)] block mb-0.5">Date & Time</span>
                <span className="font-semibold text-[var(--text)]">{selectedDate}</span>
                <span className="block text-[10px] text-[var(--muted)]">
                  {selectedSlot.startTime} – {selectedSlot.endTime}
                </span>
              </div>

              <div className="p-3 rounded bg-[var(--surface)] border border-[var(--border)]">
                <span className="text-[11px] text-[var(--muted)] block mb-0.5">Consultation Fee</span>
                <span className="font-semibold text-[var(--accent)] text-sm">
                  ₹{doctor.consultationFee}
                </span>
                <span className="block text-[10px] text-[var(--muted)]">Pay at clinic</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                Reason for Visit (optional)
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Chest pain follow-up, Routine consultation, Skin rash"
                className="text-xs"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setSelectedSlot(null)}
                className="btn btn-ghost text-xs"
              >
                Cancel Selection
              </button>

              <button
                type="button"
                onClick={handleBook}
                disabled={bookingLoading}
                className="btn btn-primary text-xs px-6 py-2.5 font-bold"
              >
                {bookingLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="spinner" />
                    <span>Reserving Slot…</span>
                  </div>
                ) : (
                  <span>Confirm & Book Appointment</span>
                )}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
