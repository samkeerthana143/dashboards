import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

/**
 * TeamLeaderProtectedRoute
 * Guards Team Leader portal routes for users with 'team_leader', 'admin', 'hr_projects', or 'hr' roles.
 */
export default function TeamLeaderProtectedRoute() {
  const token = localStorage.getItem('arshith_auth_token');
  const role = localStorage.getItem('arshith_role');

  if (!token) {
    return <Navigate to="/teamlead/login" replace />;
  }

  const allowedRoles = ['team_leader', 'admin', 'hr_projects', 'hr'];
  if (!allowedRoles.includes(role)) {
    return <Navigate to="/teamlead/login" replace />;
  }

  return <Outlet />;
}

