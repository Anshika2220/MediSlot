// client/src/pages/HealthCheck.jsx
import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import api from '../services/api';
import Logo from '../components/Logo';

export default function HealthCheck() {
  const [status, setStatus] = useState('idle'); // idle | loading | ok | error
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  async function check() {
    setStatus('loading');
    setError(null);
    try {
      const res = await api.get('/health');
      setData(res.data);
      setStatus('ok');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }

  useEffect(() => {
    check();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
      <div className="card fade-in w-full max-w-md text-center" style={{ padding: '2.5rem' }}>
        {/* New Polished Logo */}
        <div className="flex justify-center mb-6">
          <Logo size="lg" />
        </div>

        <hr className="divider" />

        {/* Status indicator */}
        <div style={{ margin: '1.5rem 0' }}>
          {status === 'loading' && (
            <div className="flex items-center justify-center gap-3" style={{ color: 'var(--muted)' }}>
              <div className="spinner" />
              <span>Connecting to API…</span>
            </div>
          )}

          {status === 'ok' && (
            <div className="fade-in">
              <div className="flex items-center justify-center gap-2 mb-3" style={{ color: 'var(--success)' }}>
                <CheckCircle size={22} />
                <span style={{ fontWeight: 600 }}>API & Database Connected</span>
              </div>
              <div className="alert alert-success" style={{ textAlign: 'left', fontSize: '0.8rem' }}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                  {JSON.stringify(data, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="fade-in">
              <div className="flex items-center justify-center gap-2 mb-3" style={{ color: 'var(--danger)' }}>
                <XCircle size={22} />
                <span style={{ fontWeight: 600 }}>API unreachable</span>
              </div>
              <div className="alert alert-error" style={{ textAlign: 'left', fontSize: '0.8rem' }}>
                {error}
              </div>
              <p style={{ marginTop: '0.75rem', color: 'var(--muted)', fontSize: '0.8rem' }}>
                Ensure the Express server is running on port 5000.
              </p>
            </div>
          )}
        </div>

        <button
          className="btn btn-secondary"
          onClick={check}
          disabled={status === 'loading'}
          style={{ width: '100%' }}
          id="health-check-btn"
        >
          <RefreshCw size={14} className={status === 'loading' ? 'animate-spin' : ''} />
          {status === 'loading' ? 'Checking…' : 'Recheck Connection'}
        </button>

        <p style={{ marginTop: '1.25rem', color: 'var(--muted)', fontSize: '0.75rem' }}>
          Phase 5: Authentication & Dynamic Doctor Onboarding Active
        </p>
      </div>
    </div>
  );
}
