// client/src/components/Navbar.jsx
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import Logo from './Logo';
import { LogOut, Calendar, Stethoscope, User, PlusCircle } from 'lucide-react';

export default function Navbar() {
  const { user, isAuthenticated, isDoctor, isPatient, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <nav
      className="sticky top-0 z-40 w-full border-b backdrop-blur-md"
      style={{
        backgroundColor: 'rgba(34, 34, 34, 0.85)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2">
          <Logo size="sm" showSubtitle={false} />
        </Link>

        {/* Center Navigation Links */}
        <div className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link
            to="/"
            className="text-[var(--muted)] hover:text-[var(--text)] transition-colors"
          >
            Find Doctors
          </Link>

          {isAuthenticated && isPatient && (
            <Link
              to="/patient/appointments"
              className="flex items-center gap-1.5 text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
            >
              <Calendar size={16} />
              My Appointments
            </Link>
          )}

          {isAuthenticated && isDoctor && (
            <Link
              to="/doctor/dashboard"
              className="flex items-center gap-1.5 text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
            >
              <Stethoscope size={16} />
              Doctor Dashboard
            </Link>
          )}
        </div>

        {/* Right Action / Auth Controls */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              {/* Role badge */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--border)] bg-[var(--card)] text-xs">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: isDoctor ? 'var(--accent)' : 'var(--success)',
                  }}
                />
                <span className="font-medium text-[var(--text)]">{user.name}</span>
                <span
                  className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: isDoctor
                      ? 'rgba(214, 198, 90, 0.15)'
                      : 'rgba(76, 175, 125, 0.15)',
                    color: isDoctor ? 'var(--accent)' : 'var(--success)',
                  }}
                >
                  {user.role}
                </span>
              </div>

              {/* Logout button */}
              <button
                onClick={handleLogout}
                className="btn btn-secondary text-xs px-3 py-1.5"
                title="Log out"
              >
                <LogOut size={14} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="btn btn-ghost text-xs px-3 py-1.5">
                Sign In
              </Link>
              <Link to="/register" className="btn btn-primary text-xs px-3.5 py-1.5">
                <PlusCircle size={14} />
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
