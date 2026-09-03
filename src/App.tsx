import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PublicHome } from './pages/PublicHome';
import { AdminPage } from './pages/AdminPage';
import { ApprovePage } from './pages/ApprovePage';
import { CheckinPage } from './pages/CheckinPage';
import { LoginPage } from './pages/LoginPage';
import { ProtectedRoute } from './components/shared/ProtectedRoute';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Theatrical Surface */}
        <Route path="/" element={<PublicHome />} />

        {/* Management Portal Authentication */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Administrative Surfaces */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/approve"
          element={
            <ProtectedRoute allowedRoles={['admin', 'approver']}>
              <ApprovePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/checkin"
          element={
            <ProtectedRoute allowedRoles={['admin', 'approver', 'staff']}>
              <CheckinPage />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
