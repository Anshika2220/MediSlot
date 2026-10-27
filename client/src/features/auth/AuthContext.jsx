// client/src/features/auth/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import api from '../../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('medislot_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [doctor, setDoctor] = useState(() => {
    const saved = localStorage.getItem('medislot_doctor');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('medislot_token'));
  const [loading, setLoading] = useState(true);

  // Validate and refresh session on mount
  useEffect(() => {
    async function verifySession() {
      if (token) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data.data.user);
          setDoctor(res.data.data.doctor);
          localStorage.setItem('medislot_user', JSON.stringify(res.data.data.user));
          if (res.data.data.doctor) {
            localStorage.setItem('medislot_doctor', JSON.stringify(res.data.data.doctor));
          }
        } catch (err) {
          logout();
        }
      }
      setLoading(false);
    }
    verifySession();
  }, []);

  async function login(email, password) {
    const res = await api.post('/auth/login', { email, password });
    const { user: userData, doctor: doctorData, token: jwtToken } = res.data.data;

    setUser(userData);
    setDoctor(doctorData);
    setToken(jwtToken);

    localStorage.setItem('medislot_token', jwtToken);
    localStorage.setItem('medislot_user', JSON.stringify(userData));
    if (doctorData) {
      localStorage.setItem('medislot_doctor', JSON.stringify(doctorData));
    }
    return res.data;
  }

  async function register(registrationData) {
    const res = await api.post('/auth/register', registrationData);
    const { user: userData, doctor: doctorData, token: jwtToken } = res.data.data;

    setUser(userData);
    setDoctor(doctorData);
    setToken(jwtToken);

    localStorage.setItem('medislot_token', jwtToken);
    localStorage.setItem('medislot_user', JSON.stringify(userData));
    if (doctorData) {
      localStorage.setItem('medislot_doctor', JSON.stringify(doctorData));
    }
    return res.data;
  }

  function logout() {
    setUser(null);
    setDoctor(null);
    setToken(null);
    localStorage.removeItem('medislot_token');
    localStorage.removeItem('medislot_user');
    localStorage.removeItem('medislot_doctor');
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        doctor,
        token,
        loading,
        isAuthenticated: !!token,
        isDoctor: user?.role === 'doctor',
        isPatient: user?.role === 'patient',
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
