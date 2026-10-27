// client/src/pages/Login.jsx
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import Logo from '../components/Logo';
import { LogIn, AlertCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectPath = location.state?.from?.pathname;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await login(email, password);
      const role = res.data.user.role;
      if (redirectPath) {
        navigate(redirectPath);
      } else if (role === 'doctor') {
        navigate('/doctor/dashboard');
      } else {
        navigate('/patient/appointments');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  function fillDemoAccount(demoEmail, demoPassword) {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg)]">
      <div className="card fade-in w-full max-w-md p-8">
        <div className="flex justify-center mb-6">
          <Logo size="md" />
        </div>

        <h2 className="text-xl font-bold text-center mb-1 text-[var(--text)]">
          Welcome to MediSlot
        </h2>
        <p className="text-xs text-center text-[var(--muted)] mb-6">
          Sign in to access appointment booking and doctor schedules
        </p>

        {error && (
          <div className="alert alert-error mb-4 flex items-center gap-2 text-xs">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--muted)] mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. patient1@medislot.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--muted)] mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full py-2.5 mt-2"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="spinner" />
                <span>Signing in…</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <LogIn size={16} />
                <span>Sign In</span>
              </div>
            )}
          </button>
        </form>

        {/* Quick Demo Credentials */}
        <div className="mt-6 pt-5 border-t border-[var(--border)]">
          <p className="text-[11px] text-center font-medium text-[var(--muted)] mb-2.5 uppercase tracking-wider">
            Quick Demo Accounts (1-Click Fill)
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => fillDemoAccount('patient1@medislot.com', 'password123')}
              className="btn btn-secondary text-left p-2 h-auto flex flex-col items-start"
            >
              <span className="font-semibold text-[var(--text)]">👤 John Doe</span>
              <span className="text-[10px] text-[var(--muted)]">Patient Account</span>
            </button>

            <button
              type="button"
              onClick={() => fillDemoAccount('sarah.jenkins@medislot.com', 'password123')}
              className="btn btn-secondary text-left p-2 h-auto flex flex-col items-start"
            >
              <span className="font-semibold text-[var(--accent)]">🩺 Dr. Jenkins</span>
              <span className="text-[10px] text-[var(--muted)]">Cardiology (Doctor)</span>
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-[var(--muted)] mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-[var(--accent)] font-medium hover:underline">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}
