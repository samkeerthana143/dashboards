import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import EmployeeLayout from '../layouts/EmployeeLayout';
import AdminLayout from '../layouts/AdminLayout';
import HrLayout from '../layouts/HrLayout';
import HrProjectsLayout from '../layouts/HrProjectsLayout';
import TeamLeaderLayout from '../layouts/TeamLeaderLayout';

// Protected Route Guards
import EmployeeProtectedRoute from './EmployeeProtectedRoute';
import AdminProtectedRoute from './AdminProtectedRoute';
import HrProtectedRoute from './HrProtectedRoute';
import HrProjectsProtectedRoute from './HrProjectsProtectedRoute';
import TeamLeaderProtectedRoute from './TeamLeaderProtectedRoute';

// Public Auth Pages
import EmployeeLogin from '../pages/auth/EmployeeLogin';
import EmployeeRegister from '../pages/auth/EmployeeRegister';
import AdminLogin from '../pages/auth/AdminLogin';
import HrLogin from '../pages/auth/HrLogin';
import HrProjectsLogin from '../pages/auth/HrProjectsLogin';
import TeamLeaderLogin from '../pages/auth/TeamLeaderLogin';
import TeamLeaderRegister from '../pages/auth/TeamLeaderRegister';

// HR Portal Pages
import HrDashboard from '../pages/hr/HrDashboard';

// Employee Portal Pages
import EmployeeDashboard from '../pages/employee/EmployeeDashboard';
import EmployeeAttendance from '../pages/employee/EmployeeAttendance';
import EmployeeLeave from '../pages/employee/EmployeeLeave';
import EmployeeHolidays from '../pages/employee/EmployeeHolidays';
import EmployeeMeetings from '../pages/employee/EmployeeMeetings';
import EmployeeAnnouncements from '../pages/employee/EmployeeAnnouncements';
import EmployeeProfile from '../pages/employee/EmployeeProfile';
import EmployeeWorkAssignments from '../pages/employee/EmployeeWorkAssignments';
import EmployeeWorkUpdates from '../pages/employee/EmployeeWorkUpdates';
import EmployeeChat from '../pages/employee/EmployeeChat';
// Admin Portal Pages (Canonical 15 Modules)
import AdminDashboard from '../pages/admin/AdminDashboard';
import AdminAttendance from '../pages/admin/AdminAttendance';
import AdminLeaveManagement from '../pages/admin/AdminLeaveManagement';
import AdminHolidayManagement from '../pages/admin/AdminHolidayManagement';
import AdminMeetingManagement from '../pages/admin/AdminMeetingManagement';
import AdminAnnouncements from '../pages/admin/AdminAnnouncements';
import AdminEmployees from '../pages/admin/AdminEmployees';
import AdminEmployeeList from '../pages/admin/AdminEmployeeList';
import AdminTeams from '../pages/admin/AdminTeams';
import AdminWorkAssignments from '../pages/admin/AdminWorkAssignments';
import AdminWorkUpdates from '../pages/admin/AdminWorkUpdates';
import AdminRegistrationRequests from '../pages/admin/AdminRegistrationRequests';
import AdminOfficeTimings from '../pages/admin/AdminOfficeTimings';
import AdminAttendanceReports from '../pages/admin/AdminAttendanceReports';
import AdminManagement from '../pages/admin/AdminManagement';

// Complete HRMS Modules (Payroll, Finance, HR Operations)
import AdminPayroll from '../pages/admin/AdminPayroll';
import AdminSalaryStructures from '../pages/admin/AdminSalaryStructures';
import AdminPayslips from '../pages/admin/AdminPayslips';
import AdminPayments from '../pages/admin/AdminPayments';
import AdminLoans from '../pages/admin/AdminLoans';
import AdminSeparation from '../pages/admin/AdminSeparation';
import AdminRecruitment from '../pages/admin/AdminRecruitment';
import AdminPerformance from '../pages/admin/AdminPerformance';
import AdminDepartments from '../pages/admin/AdminDepartments';
import AdminAuditLogs from '../pages/admin/AdminAuditLogs';
import AdminSettings from '../pages/admin/AdminSettings';
import AdminChat from '../pages/admin/AdminChat';
import AdminProjects from '../pages/admin/AdminProjects';

// Employee Self-Service HRMS Extensions
import EmployeePayslips from '../pages/employee/EmployeePayslips';
import EmployeeLoans from '../pages/employee/EmployeeLoans';
import EmployeePerformance from '../pages/employee/EmployeePerformance';
import EmployeeResignation from '../pages/employee/EmployeeResignation';

// 404 Not Found
import NotFound from '../pages/NotFound';

/**
 * AppRoutes - Master Application Route Configuration
 * Strict separation of public auth, employee portal, and admin portal.
 */
export default function AppRoutes() {
  return (
    <Routes>
      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Public Authentication Routes */}
      <Route path="/login" element={<EmployeeLogin />} />
      <Route path="/register" element={<EmployeeRegister />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/hr/login" element={<HrLogin />} />
      <Route path="/hr-projects/login" element={<HrProjectsLogin />} />
      <Route path="/teamlead/login" element={<TeamLeaderLogin />} />
      <Route path="/teamlead/register" element={<TeamLeaderRegister />} />

      {/* Team Leader Portal Routes (Guarded by TeamLeaderProtectedRoute) */}
      <Route element={<TeamLeaderProtectedRoute />}>
        <Route path="/teamlead" element={<TeamLeaderLayout />} />
        <Route path="/teamlead/dashboard" element={<TeamLeaderLayout />} />
      </Route>

      {/* Project & Operations HR Portal Routes */}
      <Route element={<HrProjectsProtectedRoute />}>
        <Route path="/hr-projects" element={<HrProjectsLayout />} />
        <Route path="/hr-projects/dashboard" element={<HrProjectsLayout />} />
      </Route>

      {/* Human Resources Portal Routes (Guarded by HrProtectedRoute) */}
      <Route element={<HrProtectedRoute />}>
        <Route path="/hr" element={<HrLayout />}>
          <Route index element={<Navigate to="/hr/dashboard" replace />} />
          <Route path="dashboard" element={<HrDashboard />} />

          {/* Attendance Tracking & Reports */}
          <Route path="attendance" element={<AdminAttendance />} />
          <Route path="reports" element={<AdminAttendanceReports />} />
          <Route path="attendance-reports" element={<AdminAttendanceReports />} />
          <Route path="leaves" element={<AdminLeaveManagement />} />
          <Route path="leave-management" element={<AdminLeaveManagement />} />
          <Route path="holidays" element={<AdminHolidayManagement />} />
          <Route path="holiday-management" element={<AdminHolidayManagement />} />
          <Route path="office-timings" element={<AdminOfficeTimings />} />

          {/* Payslips, Payroll, & Advances */}
          <Route path="payslips" element={<AdminPayslips />} />
          <Route path="loans" element={<AdminLoans />} />
          <Route path="payroll" element={<AdminPayroll />} />
          <Route path="salary-structures" element={<AdminSalaryStructures />} />
          <Route path="payments" element={<AdminPayments />} />

          {/* Workforce Operations */}
          <Route path="employees" element={<AdminEmployees />} />
          <Route path="employees/list" element={<AdminEmployeeList />} />
          <Route path="employee-list" element={<AdminEmployeeList />} />
          <Route path="registration-requests" element={<AdminRegistrationRequests />} />
          <Route path="recruitment" element={<AdminRecruitment />} />
          <Route path="performance" element={<AdminPerformance />} />
          <Route path="separation" element={<AdminSeparation />} />
          <Route path="chat" element={<AdminChat />} />
          <Route path="meetings" element={<AdminMeetingManagement />} />
          <Route path="announcements" element={<AdminAnnouncements />} />
        </Route>
      </Route>

      {/* Employee Portal Routes (Guarded by EmployeeProtectedRoute) */}
      <Route element={<EmployeeProtectedRoute />}>
        <Route path="/employee" element={<EmployeeLayout />}>
          <Route index element={<Navigate to="/employee/dashboard" replace />} />
          <Route path="dashboard" element={<EmployeeDashboard />} />
          <Route path="attendance" element={<EmployeeAttendance />} />
          <Route path="leaves" element={<EmployeeLeave />} />
          <Route path="holidays" element={<EmployeeHolidays />} />
          <Route path="meetings" element={<EmployeeMeetings />} />
          <Route path="announcements" element={<EmployeeAnnouncements />} />
          <Route path="profile" element={<EmployeeProfile />} />
          <Route path="assignments" element={<EmployeeWorkAssignments />} />
          <Route path="updates" element={<EmployeeWorkUpdates />} />
          <Route path="chat" element={<EmployeeChat />} />
          {/* Employee Self-Service HRMS Extensions */}
          <Route path="payslips" element={<EmployeePayslips />} />
          <Route path="loans" element={<EmployeeLoans />} />
          <Route path="performance" element={<EmployeePerformance />} />
          <Route path="resignation" element={<EmployeeResignation />} />
        </Route>
      </Route>

      {/* Administrator Portal Routes (Guarded by AdminProtectedRoute) */}
      <Route element={<AdminProtectedRoute />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="attendance" element={<AdminAttendance />} />
          <Route path="leaves" element={<AdminLeaveManagement />} />
          <Route path="leave-management" element={<AdminLeaveManagement />} />
          <Route path="holidays" element={<AdminHolidayManagement />} />
          <Route path="holiday-management" element={<AdminHolidayManagement />} />
          <Route path="meetings" element={<AdminMeetingManagement />} />
          <Route path="meeting-management" element={<AdminMeetingManagement />} />
          <Route path="announcements" element={<AdminAnnouncements />} />
          <Route path="employees" element={<AdminEmployees />} />
          <Route path="employees/list" element={<AdminEmployeeList />} />
          <Route path="employee-list" element={<AdminEmployeeList />} />
          <Route path="teams" element={<AdminTeams />} />
          <Route path="chat" element={<AdminChat />} />
          <Route path="teams/chat" element={<AdminChat />} />
          <Route path="assignments" element={<AdminWorkAssignments />} />
          <Route path="work-assignments" element={<AdminWorkAssignments />} />
          <Route path="updates" element={<AdminWorkUpdates />} />
          <Route path="work-updates" element={<AdminWorkUpdates />} />
          <Route path="registration-requests" element={<AdminRegistrationRequests />} />
          <Route path="office-timings" element={<AdminOfficeTimings />} />
          <Route path="reports" element={<AdminAttendanceReports />} />
          <Route path="attendance-reports" element={<AdminAttendanceReports />} />
          <Route path="management" element={<AdminManagement />} />
          
          {/* Project HR & Operations Routes */}
          <Route path="projects" element={<AdminProjects defaultTab="dashboard" />} />
          <Route path="projects/dashboard" element={<AdminProjects defaultTab="dashboard" />} />
          <Route path="projects/team-leaders" element={<AdminProjects defaultTab="team-leaders" />} />
          <Route path="projects/allocation" element={<AdminProjects defaultTab="dashboard" />} />
          <Route path="projects/progress" element={<AdminProjects defaultTab="progress" />} />
          <Route path="projects/reports" element={<AdminProjects defaultTab="reports" />} />
          <Route path="projects/teams" element={<AdminProjects defaultTab="teams" />} />

          {/* Complete HRMS Routes */}
          <Route path="payroll" element={<AdminPayroll />} />
          <Route path="salary-structures" element={<AdminSalaryStructures />} />
          <Route path="payslips" element={<AdminPayslips />} />
          <Route path="payments" element={<AdminPayments />} />
          <Route path="loans" element={<AdminLoans />} />
          <Route path="separation" element={<AdminSeparation />} />
          <Route path="recruitment" element={<AdminRecruitment />} />
          <Route path="performance" element={<AdminPerformance />} />
          <Route path="departments" element={<AdminDepartments />} />
          <Route path="audit" element={<AdminAuditLogs />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
      </Route>

      {/* Catch-all 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
