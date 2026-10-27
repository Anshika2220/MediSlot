// client/src/pages/Home.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import Navbar from '../components/Navbar';
import {
  Stethoscope,
  Calendar,
  Clock,
  ShieldCheck,
  ChevronRight,
  Search,
  Sparkles,
  UserCheck,
} from 'lucide-react';

export default function Home() {
  const [doctors, setDoctors] = useState([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const specialties = [
    'All',
    'Cardiology',
    'Dermatology',
    'Pediatrics',
    'Neurology',
    'Orthopedics',
  ];

  useEffect(() => {
    async function fetchDoctors() {
      setLoading(true);
      try {
        const url =
          selectedSpecialty === 'All'
            ? '/doctors'
            : `/doctors?specialty=${encodeURIComponent(selectedSpecialty)}`;
        const res = await api.get(url);
        setDoctors(res.data.data || []);
      } catch (err) {
        console.error('Failed to load doctors', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDoctors();
  }, [selectedSpecialty]);

  const filteredDoctors = doctors.filter((doc) =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.specialty.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-24">
      <Navbar />

      {/* Hero Section */}
      <section className="border-b border-[var(--border)] py-16 px-4 sm:px-6 lg:px-8 text-center relative overflow-hidden">
        <div className="max-w-3xl mx-auto fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--muted)] mb-5">
            <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
            <span>MediSlot 2.0 • Real-Time Slot Engine & Concurrency Guard</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[var(--text)] mb-4 leading-tight">
            Clinic Appointments, <br className="hidden sm:inline" />
            <span style={{ color: 'var(--accent)' }}>Without the Wait.</span>
          </h1>

          <p className="text-sm sm:text-base text-[var(--muted)] max-w-xl mx-auto mb-8 leading-relaxed">
            Browse verified medical specialists, view 100% accurate live slots,
            and book in seconds with atomic double-booking protection.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-[var(--muted)]">
              <ShieldCheck size={15} className="text-[var(--accent)]" />
              Guaranteed Zero Collisions
            </span>
            <span className="text-[var(--border)]">•</span>
            <span className="flex items-center gap-1.5 text-[var(--muted)]">
              <Clock size={15} className="text-[var(--accent)]" />
              15 & 30-min Exact Slots
            </span>
            <span className="text-[var(--border)]">•</span>
            <span className="flex items-center gap-1.5 text-[var(--muted)]">
              <Sparkles size={15} className="text-[var(--accent)]" />
              AI Assistant Ready
            </span>
          </div>
        </div>
      </section>

      {/* Doctor Discovery Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-[var(--text)] mb-1">
              Find a Clinic Specialist
            </h2>
            <p className="text-xs text-[var(--muted)]">
              Filter by medical specialty or search by doctor name
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
            />
            <input
              type="text"
              placeholder="Search doctor or specialty…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.4rem' }}
            />
          </div>
        </div>

        {/* Specialty Filter Pills */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-4 mb-8">
          {specialties.map((spec) => {
            const isActive = selectedSpecialty === spec;
            return (
              <button
                key={spec}
                type="button"
                onClick={() => setSelectedSpecialty(spec)}
                className={`filter-pill ${isActive ? 'active' : ''}`}
              >
                {spec}
              </button>
            );
          })}
        </div>

        {/* Doctors Grid */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 text-[var(--muted)]">
            <div className="spinner" />
            <span className="text-xs">Fetching active doctor schedules…</span>
          </div>
        ) : filteredDoctors.length === 0 ? (
          <div className="card text-center py-20 px-4">
            <Stethoscope size={36} className="mx-auto mb-3 text-[var(--muted)] opacity-50" />
            <h3 className="text-sm font-semibold text-[var(--text)] mb-1">
              No doctors found in this category
            </h3>
            <p className="text-xs text-[var(--muted)] max-w-sm mx-auto mb-4">
              Try choosing another specialty tab or registering a new clinic specialist.
            </p>
            <button
              onClick={() => setSelectedSpecialty('All')}
              className="btn btn-secondary text-xs"
            >
              Show All Doctors
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDoctors.map((doc) => (
              <div
                key={doc._id}
                className="card p-6 flex flex-col justify-between hover:border-[var(--accent)] transition-all group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className="font-bold text-base text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">
                        {doc.name}
                      </h3>
                      <span className="badge badge-accent mt-1">{doc.specialty}</span>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs text-[var(--muted)] block">Fee</span>
                      <span className="text-base font-extrabold text-[var(--accent)]">
                        ₹{doc.consultationFee}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-[var(--muted)] line-clamp-2 leading-relaxed mb-6">
                    {doc.bio || 'Consulting specialist at MediSlot Clinic.'}
                  </p>
                </div>

                <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between">
                  <div className="text-[11px] text-[var(--muted)] flex items-center gap-2">
                    <Clock size={13} className="text-[var(--accent)]" />
                    <span>{doc.slotDuration}-min slots</span>
                    <span>•</span>
                    <span>{doc.experienceYears || 5} yrs</span>
                  </div>

                  <Link
                    to={`/doctors/${doc._id}/book`}
                    className="btn btn-primary text-xs px-3.5 py-1.5 gap-1 group-hover:scale-105"
                  >
                    <span>Book Slot</span>
                    <ChevronRight size={13} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Clinic Doctor Registration Banner (Centered beneath grid) */}
        <div className="mt-16 max-w-2xl mx-auto">
          <div className="card p-8 border-[var(--border)] bg-[var(--surface)] text-center">
            <UserCheck size={32} className="mx-auto mb-3 text-[var(--accent)]" />
            <h3 className="text-base font-bold text-[var(--text)] mb-1">
              Are you a Doctor or Clinic Specialist?
            </h3>
            <p className="text-xs text-[var(--muted)] mb-5 max-w-md mx-auto">
              Register your practice on MediSlot. Set your consultation fee, 15 or 30-minute slot durations, and start receiving bookings today.
            </p>
            <Link to="/register" className="btn btn-secondary text-xs">
              Onboard as a Doctor
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
