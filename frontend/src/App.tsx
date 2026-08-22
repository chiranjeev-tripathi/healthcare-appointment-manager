import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/auth.store';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';

// Pages
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { DoctorSearch } from './pages/patient/DoctorSearch';
import { BookingFlow } from './pages/patient/BookingFlow';
import { MyAppointments } from './pages/patient/MyAppointments';
import { DoctorDashboard } from './pages/doctor/Dashboard';
import { DoctorAppointmentDetail } from './pages/doctor/AppointmentDetail';
import { LeaveManagement } from './pages/doctor/LeaveManagement';
import { DoctorManagement } from './pages/admin/DoctorManagement';
import { SystemHealth } from './pages/admin/SystemHealth';
import { AllAppointments } from './pages/admin/AllAppointments';

export const App = () => {
  const { user } = useAuthStore();

  const getRootRedirect = () => {
    if (!user) return '/login';
    switch (user.role) {
      case 'PATIENT': return '/patient/doctors';
      case 'DOCTOR': return '/doctor/dashboard';
      case 'ADMIN': return '/admin/doctors';
      default: return '/login';
    }
  };

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      <Route path="/" element={<Navigate to={getRootRedirect()} replace />} />
      
      {/* Patient Routes */}
      <Route element={<ProtectedRoute allowedRoles={['PATIENT']} />}>
        <Route path="/patient/doctors" element={<Layout><DoctorSearch /></Layout>} />
        <Route path="/patient/book/:doctorId" element={<Layout><BookingFlow /></Layout>} />
        <Route path="/patient/appointments" element={<Layout><MyAppointments /></Layout>} />
      </Route>

      {/* Doctor Routes */}
      <Route element={<ProtectedRoute allowedRoles={['DOCTOR']} />}>
        <Route path="/doctor/dashboard" element={<Layout><DoctorDashboard /></Layout>} />
        <Route path="/doctor/appointments/:id" element={<Layout><DoctorAppointmentDetail /></Layout>} />
        <Route path="/doctor/leave" element={<Layout><LeaveManagement /></Layout>} />
      </Route>

      {/* Admin Routes */}
      <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
        <Route path="/admin/doctors" element={<Layout><DoctorManagement /></Layout>} />
        <Route path="/admin/health" element={<Layout><SystemHealth /></Layout>} />
        <Route path="/admin/appointments" element={<Layout><AllAppointments /></Layout>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
