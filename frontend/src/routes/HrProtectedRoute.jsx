import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

/**
 * HrProtectedRoute - Guards Human Resources routes
 * Verifies active session with 'hr' or 'admin' role in localStorage.
 * Redirects unauthenticated users to /hr/login.
 */
export default function HrProtectedRoute() {
  const role = localStorage.getItem('arshith_role');
  const user = localStorage.getItem('arshith_user');
  const token = localStorage.getItem('arshith_auth_token');

  if (!role || !user || !token || (role !== 'hr' && role !== 'admin')) {
    return <Navigate to="/hr/login" replace />;
  }

  return <Outlet />;
}

