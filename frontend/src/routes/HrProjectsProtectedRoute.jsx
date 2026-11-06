import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

/**
 * HrProjectsProtectedRoute - Guards Project & Team Operations HR routes
 * Verifies active session with 'hr_projects', 'admin', or 'hr' role.
 * Redirects unauthenticated users to /hr-projects/login.
 */
export default function HrProjectsProtectedRoute() {
  const role = localStorage.getItem('arshith_role');
  const user = localStorage.getItem('arshith_user');
  const token = localStorage.getItem('arshith_auth_token');

  if (!role || !user || !token || (role !== 'hr_projects' && role !== 'admin' && role !== 'hr')) {
    return <Navigate to="/hr-projects/login" replace />;
  }

  return <Outlet />;
}

