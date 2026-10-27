// client/src/pages/Register.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import Logo from '../components/Logo';
import { UserPlus, AlertCircle, Stethoscope, User } from 'lucide-react';

export default function Register() {
  const [role, setRole] = useState('patient'); // 'patient' | 'doctor'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');

  // Doctor specific fields
  const [specialty, setSpecialty] = useState('Cardiology');
  const [consultationFee, setConsultationFee] = useState(600);
  const [slotDuration, setSlotDuration] = useState(30);
  const [bio, setBio] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {
        name,
        email,
        password,
        phone,
        role,
      };

      if (role === 'doctor') {
        payload.specialty = specialty;
        payload.consultationFee = Number(consultationFee);
        payload.slotDuration = Number(slotDuration);
        payload.bio = bio;
      }

      const res = await register(payload);
      if (role === 'doctor') {
        navigate('/doctor/dashboard');
      } else {
        navigate('/patient/appointments');
      }
    } catch (err) {
      const msg =
        err.response?.data?.errors?.[0]?.message ||
        err.response?.data?.message ||
        'Registration failed. Please review your input.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg)] py-12">
      <div className="card fade-in w-full max-w-lg p-8">
        <div className="flex justify-center mb-5">
          <Logo size="md" />
        </div>

        <h2 className="text-xl font-bold text-center mb-1 text-[var(--text)]">
          Create Your MediSlot Account
        </h2>
        <p className="text-xs text-center text-[var(--muted)] mb-5">
          Join as a patient to book appointments or as a clinic doctor to manage slots
        </p>

        {/* Role Toggle Switch */}
        <div className="grid grid-cols-2 gap-2 p-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] mb-5">
          <button
            type="button"
            onClick={() => setRole('patient')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded text-xs font-semibold transition-all ${
              role === 'patient'
                ? 'bg-[var(--card)] text-[var(--text)] shadow-sm border border-[var(--border)]'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            <User size={15} />
            Patient
          </button>

          <button
            type="button"
            onClick={() => setRole('doctor')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded text-xs font-semibold transition-all ${
              role === 'doctor'
                ? 'bg-[var(--accent)] text-[#1A1A1A] shadow-sm font-bold'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            <Stethoscope size={15} />
            Doctor / Specialist
          </button>
        </div>

        {error && (
          <div className="alert alert-error mb-4 flex items-center gap-2 text-xs">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-[var(--muted)] mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={role === 'doctor' ? 'Dr. Jane Miller' : 'John Doe'}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 00000"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--muted)] mb-1">
              Password (min 6 characters)
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {/* Doctor-Specific Dynamic Fields */}
          {role === 'doctor' && (
            <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] space-y-3 mt-4 fade-in">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--accent)]">
                <Stethoscope size={15} />
                <span>Doctor Practice Details (Instant Slot Booking Setup)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[var(--muted)] mb-1">
                    Medical Specialty
                  </label>
                  <select
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    className="text-xs"
                  >
                    <option value="Cardiology">Cardiology</option>
                    <option value="Dermatology">Dermatology</option>
                    <option value="Pediatrics">Pediatrics</option>
                    <option value="Neurology">Neurology</option>
                    <option value="Orthopedics">Orthopedics</option>
                    <option value="General Medicine">General Medicine</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[var(--muted)] mb-1">
                    Slot Duration
                  </label>
                  <select
                    value={slotDuration}
                    onChange={(e) => setSlotDuration(Number(e.target.value))}
                    className="text-xs"
                  >
                    <option value={15}>15-minute slots</option>
                    <option value={30}>30-minute slots (Standard)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[var(--muted)] mb-1">
                  Consultation Fee (₹ INR)
                </label>
                <input
                  type="number"
                  min={0}
                  step={50}
                  value={consultationFee}
                  onChange={(e) => setConsultationFee(e.target.value)}
                  placeholder="500"
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[var(--muted)] mb-1">
                  Professional Bio
                </label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Brief summary of clinical experience, board certifications, and treatments..."
                  className="text-xs"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full py-2.5 mt-4"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="spinner" />
                <span>Creating Account…</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <UserPlus size={16} />
                <span>
                  {role === 'doctor' ? 'Register Doctor & Activate Slots' : 'Create Patient Account'}
                </span>
              </div>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-[var(--muted)] mt-5">
          Already registered?{' '}
          <Link to="/login" className="text-[var(--accent)] font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
