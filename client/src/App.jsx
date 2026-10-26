// client/src/App.jsx
// Root router. Phase 1: only the health check route.
// Phases 5-9 will add auth, patients, doctors, chatbot routes here.

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import HealthCheck from './pages/HealthCheck';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Phase 1 health check */}
        <Route path="/" element={<HealthCheck />} />

        {/* Catch-all — redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
