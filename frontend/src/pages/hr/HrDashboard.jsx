import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  FileText,
  DollarSign,
  CreditCard,
  ChevronRight,
  TrendingUp,
  Users,
  Star,
  RefreshCw,
  FileCheck,
  UserCheck,
  Building,
  UserPlus,
  Briefcase,
  Layers,
} from 'lucide-react';
import AdminStatCard from '../../components/admin/AdminStatCard';
import AdminManagementCard from '../../components/admin/AdminManagementCard';
import { dashboardService } from '../../services/dashboardService';
import { attendanceService } from '../../services/attendanceService';
import payslipService from '../../services/payslipService';
import loanService from '../../services/loanService';
import { authService } from '../../services/authService';

export default function HrDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalPresent: 0,
    wfo: 0,
    wfh: 0,
    late: 0,
    pendingLeaves: 0,
    thisMonthHolidays: 0,
  });

  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [payslipSummary, setPayslipSummary] = useState({
    total_requests: 0,
    pending_requests: 0,
    approved_requests: 0,
  });
  const [loans, setLoans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Dashboard Stats & Recent Attendance
      try {
        const dashData = await dashboardService.getAdminDashboard();
        if (dashData && dashData.stats) {
          setStats(dashData.stats);
        }
        if (dashData && Array.isArray(dashData.recentAttendance) && dashData.recentAttendance.length > 0) {
          setAttendanceRecords(dashData.recentAttendance.slice(0, 5));
        } else {
          const attData = await attendanceService.getRecords();
          setAttendanceRecords(Array.isArray(attData) ? attData.slice(0, 5) : []);
        }
      } catch (dashErr) {
        console.warn('Dashboard stats fallback', dashErr);
      }

      // 2. Payslip Requests Summary
      try {
        const pData = await payslipService.getAdminRequests();
        if (pData) {
          setPayslipSummary(pData.summary || {
            total_requests: pData.requests?.length || 0,
            pending_requests: pData.requests?.filter((r) => r.status === 'PENDING').length || 0,
            approved_requests: pData.requests?.filter((r) => r.status === 'APPROVED').length || 0,
          });
        }
      } catch (pErr) {
        console.warn('Payslips load fallback', pErr);
      }

      // 3. Employee Advances & Loans
      try {
        const lData = await loanService.getLoans();
        setLoans(Array.isArray(lData) ? lData.slice(0, 5) : []);
      } catch (lErr) {
        console.warn('Loans load fallback', lErr);
      }
    } catch (err) {
      console.error('Failed to load HR dashboard data', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const storedUser = authService.getCurrentUser();
  const hrName = storedUser?.name || storedUser?.fullName || 'HR Manager';
  const hrEmail = storedUser?.email || 'hr@arshith.com';

  const pendingAdvancesCount = loans.filter((l) => l.status === 'PENDING').length;
  const activeDisbursedCount = loans.filter((l) => l.status === 'APPROVED' || l.status === 'DISBURSED' || l.status === 'ACTIVE').length;

  return (
    <div className="admin-dashboard-view admin-main-page animate-fade-in">
      {/* Title Header matching Arshith Connect Design */}
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: '700', color: '#0b3d2b', margin: 0, letterSpacing: '-0.3px' }}>
            HR Dashboard
          </h1>
          <div style={{ marginTop: '4px' }}>
            <div style={{ fontSize: '0.925rem', fontWeight: '600', color: '#1e293b' }}>
              {hrName}
            </div>
            <div style={{ fontSize: '0.825rem', color: '#64748b' }}>
              {hrEmail} &bull; <span style={{ color: '#0f766e', fontWeight: '600' }}>Human Resources Management</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={isLoading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 12px',
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            fontSize: '0.8rem',
            fontWeight: '600',
            color: '#334155',
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          }}
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* 1. TODAY'S ATTENDANCE SECTION                             */}
      {/* ========================================================= */}
      <section style={{ marginBottom: '26px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0b3d2b', margin: 0 }}>
            Today's Attendance
          </h2>
          <button
            type="button"
            className="btn-primary-action"
            onClick={() => navigate('/hr/attendance')}
            style={{ height: '32px', fontSize: '0.78rem', padding: '0 10px', backgroundColor: '#0f766e', borderColor: '#0f766e' }}
          >
            <span>Live Attendance Log</span>
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="admin-today-stats-grid">
          {/* Prominent Total Present */}
          <AdminStatCard
            label="TOTAL PRESENT"
            value={stats.totalPresent}
            colorClass="stat-val-present"
            widthClass="full-width"
          />

          {/* 3 Columns: WFO, WFH, LATE */}
          <AdminStatCard
            label="WFO"
            value={stats.wfo}
            colorClass="stat-val-wfo"
            widthClass="one-third"
          />
          <AdminStatCard
            label="WFH"
            value={stats.wfh}
            colorClass="stat-val-wfo"
            widthClass="one-third"
          />
          <AdminStatCard
            label="LATE"
            value={stats.late}
            colorClass="stat-val-late"
            widthClass="one-third"
          />

          {/* 2 Columns: PENDING LEAVES, THIS MONTH HOLIDAYS */}
          <AdminStatCard
            label="PENDING LEAVES"
            value={stats.pendingLeaves}
            colorClass="stat-val-pending"
            widthClass="half-width"
          />
          <AdminStatCard
            label="THIS MONTH HOLIDAYS"
            value={stats.thisMonthHolidays}
            colorClass="stat-val-holiday"
            widthClass="half-width"
          />
        </div>
      </section>

      {/* ========================================================= */}
      {/* 2. ATTENDANCE & LEAVE OPERATIONS CARDS                     */}
      {/* ========================================================= */}
      <section style={{ marginBottom: '26px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0b3d2b', margin: 0 }}>
            Attendance & Leave Operations
          </h2>
        </div>

        <div className="management-cards-grid">
          <AdminManagementCard
            title="Attendance"
            description="Manage employee check-ins & logs"
            icon={CheckCircle}
            colorScheme="green"
            onClick={() => navigate('/hr/attendance')}
          />
          <AdminManagementCard
            title="Leave Management"
            description="Review & approve leave requests"
            icon={CheckCircle}
            colorScheme="green"
            onClick={() => navigate('/hr/leaves')}
          />
          <AdminManagementCard
            title="Holiday Calendar"
            description="Manage company holidays"
            icon={Star}
            colorScheme="orange"
            onClick={() => navigate('/hr/holidays')}
          />
          <AdminManagementCard
            title="Attendance Reports"
            description="Generate & export attendance logs"
            icon={FileText}
            colorScheme="blue"
            onClick={() => navigate('/hr/reports')}
          />
        </div>
      </section>

      {/* ========================================================= */}
      {/* 3. PAYSLIPS & SALARY ADVANCES SECTION                     */}
      {/* ========================================================= */}
      <section style={{ marginBottom: '26px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0b3d2b', margin: 0 }}>
            Payslips & Salary Advances
          </h2>
          <button
            type="button"
            className="btn-primary-action"
            onClick={() => navigate('/hr/payslips')}
            style={{ height: '32px', fontSize: '0.78rem', padding: '0 10px', backgroundColor: '#0f766e', borderColor: '#0f766e' }}
          >
            <span>Manage Payslips</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {/* 4 Operations Cards for Payroll & Advances */}
        <div className="management-cards-grid">
          <AdminManagementCard
            title="Payslip Generation"
            description="Process & generate monthly payslips"
            icon={FileCheck}
            colorScheme="purple"
            onClick={() => navigate('/hr/payslips')}
          />
          <AdminManagementCard
            title="Salary Advances & Loans"
            description="Review employee advance applications"
            icon={CreditCard}
            colorScheme="blue"
            onClick={() => navigate('/hr/loans')}
          />
          <AdminManagementCard
            title="Payroll Engine"
            description="Calculate net salaries & deductions"
            icon={DollarSign}
            colorScheme="green"
            onClick={() => navigate('/hr/payroll')}
          />
          <AdminManagementCard
            title="Salary Structures"
            description="Configure CTC, basic, & allowances"
            icon={TrendingUp}
            colorScheme="orange"
            onClick={() => navigate('/hr/salary-structures')}
          />
        </div>

        {/* Payslip & Advance Stat Summary Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginTop: '14px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '14px 18px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Pending Payslip Requests
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: '800', color: '#b45309', marginTop: '4px' }}>
              {payslipSummary.pending_requests || 0}
            </div>
          </div>

          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '14px 18px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Approved Payslips
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: '800', color: '#15803d', marginTop: '4px' }}>
              {payslipSummary.approved_requests || 0}
            </div>
          </div>

          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '14px 18px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Pending Advance Requests
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: '800', color: '#dc2626', marginTop: '4px' }}>
              {pendingAdvancesCount}
            </div>
          </div>

          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '14px 18px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Active Advance Accounts
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: '800', color: '#0f766e', marginTop: '4px' }}>
              {activeDisbursedCount}
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 4. RECENT ACTIVITY PREVIEWS (ATTENDANCE & ADVANCES)       */}
      {/* ========================================================= */}
      <section style={{ marginBottom: '26px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {/* Recent Attendance Activity Card */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={18} color="#0f766e" />
                <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#0b3d2b', margin: 0 }}>
                  Recent Attendance
                </h3>
              </div>
              <button
                type="button"
                onClick={() => navigate('/hr/attendance')}
                style={{ fontSize: '0.78rem', color: '#0f766e', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                View all &rarr;
              </button>
            </div>

            {attendanceRecords.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                No attendance logs recorded for today yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {attendanceRecords.slice(0, 4).map((rec, idx) => {
                  const empName = rec.employee_name || rec.employeeName || rec.full_name || 'Staff Member';
                  const checkTime = rec.check_in_time || rec.checkInTime || rec.timestamp || 'Today';
                  const isWfh = String(rec.work_mode || rec.workMode || '').toUpperCase().includes('WFH');
                  const isLate = rec.status === 'LATE' || rec.is_late;

                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        backgroundColor: '#f8fafc',
                        borderRadius: '8px',
                        border: '1px solid #f1f5f9',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            backgroundColor: '#0b3d2b',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                          }}
                        >
                          {empName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#1e293b' }}>
                            {empName}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                            {checkTime}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: '700',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            backgroundColor: isWfh ? '#eff6ff' : '#ecfdf5',
                            color: isWfh ? '#1d4ed8' : '#047857',
                          }}
                        >
                          {isWfh ? 'WFH' : 'WFO'}
                        </span>
                        {isLate && (
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: '700',
                              padding: '2px 6px',
                              borderRadius: '6px',
                              backgroundColor: '#fef3c7',
                              color: '#b45309',
                            }}
                          >
                            Late
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Advances & Loans Card */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={18} color="#0f766e" />
                <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#0b3d2b', margin: 0 }}>
                  Recent Advances & Loans
                </h3>
              </div>
              <button
                type="button"
                onClick={() => navigate('/hr/loans')}
                style={{ fontSize: '0.78rem', color: '#0f766e', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Review all &rarr;
              </button>
            </div>

            {loans.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                No active loan or salary advance requests.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {loans.slice(0, 4).map((loan, idx) => {
                  const empName = loan.employee_name || loan.employeeName || 'Employee';
                  const amount = Number(loan.principal_amount || loan.amount || 0).toLocaleString('en-IN');
                  const lType = loan.loan_type || 'Advance';
                  const st = (loan.status || 'PENDING').toUpperCase();

                  let stBg = '#fef3c7';
                  let stColor = '#b45309';
                  if (st === 'APPROVED' || st === 'ACTIVE' || st === 'DISBURSED') {
                    stBg = '#ecfdf5';
                    stColor = '#047857';
                  } else if (st === 'REJECTED') {
                    stBg = '#fee2e2';
                    stColor = '#b91c1c';
                  }

                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        backgroundColor: '#f8fafc',
                        borderRadius: '8px',
                        border: '1px solid #f1f5f9',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#1e293b' }}>
                          {empName}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          {lType} &bull; &#8377;{amount}
                        </div>
                      </div>

                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: '700',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: stBg,
                          color: stColor,
                        }}
                      >
                        {st}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 5. WORKFORCE OPERATIONS CARDS (Matching Theme)            */}
      {/* ========================================================= */}
      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0b3d2b', marginBottom: '12px' }}>
          Workforce & People Operations
        </h2>

        {/* Action Card: Employee Directory */}
        <div
          className="admin-action-card"
          onClick={() => navigate('/hr/employees')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') navigate('/hr/employees'); }}
          style={{ marginBottom: '10px' }}
        >
          <div className="admin-action-card-left">
            <div className="admin-action-avatar" style={{ backgroundColor: '#0f766e' }}>
              E
            </div>
            <div className="admin-action-card-info">
              <h3 className="admin-action-card-title">Employee Directory</h3>
              <p className="admin-action-card-desc">Manage employee profiles, designations, and shifts</p>
            </div>
          </div>
          <div className="admin-action-card-chevron">
            <ChevronRight size={20} />
          </div>
        </div>

        {/* Action Card: Registration Requests */}
        <div
          className="admin-action-card"
          onClick={() => navigate('/hr/registration-requests')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') navigate('/hr/registration-requests'); }}
          style={{ marginBottom: '10px' }}
        >
          <div className="admin-action-card-left">
            <div className="admin-action-avatar" style={{ backgroundColor: '#059669' }}>
              N
            </div>
            <div className="admin-action-card-info">
              <h3 className="admin-action-card-title">New Employee Registrations</h3>
              <p className="admin-action-card-desc">Verify, approve, or reject new employee onboarding requests</p>
            </div>
          </div>
          <div className="admin-action-card-chevron">
            <ChevronRight size={20} />
          </div>
        </div>

        {/* Action Card: Recruitment / ATS */}
        <div
          className="admin-action-card"
          onClick={() => navigate('/hr/recruitment')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') navigate('/hr/recruitment'); }}
          style={{ marginBottom: '10px' }}
        >
          <div className="admin-action-card-left">
            <div className="admin-action-avatar" style={{ backgroundColor: '#4f46e5' }}>
              R
            </div>
            <div className="admin-action-card-info">
              <h3 className="admin-action-card-title">Recruitment & ATS</h3>
              <p className="admin-action-card-desc">Track open job vacancies, applicants, and interviews</p>
            </div>
          </div>
          <div className="admin-action-card-chevron">
            <ChevronRight size={20} />
          </div>
        </div>

        {/* Action Card: Performance Reviews */}
        <div
          className="admin-action-card"
          onClick={() => navigate('/hr/performance')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') navigate('/hr/performance'); }}
          style={{ marginBottom: '10px' }}
        >
          <div className="admin-action-card-left">
            <div className="admin-action-avatar" style={{ backgroundColor: '#d97706' }}>
              P
            </div>
            <div className="admin-action-card-info">
              <h3 className="admin-action-card-title">Performance & Appraisals</h3>
              <p className="admin-action-card-desc">Review staff performance KPIs, goals, and appraisals</p>
            </div>
          </div>
          <div className="admin-action-card-chevron">
            <ChevronRight size={20} />
          </div>
        </div>

        {/* Action Card: Office Timings */}
        <div
          className="admin-action-card"
          onClick={() => navigate('/hr/office-timings')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') navigate('/hr/office-timings'); }}
        >
          <div className="admin-action-card-left">
            <div className="admin-action-avatar" style={{ backgroundColor: '#0284c7' }}>
              T
            </div>
            <div className="admin-action-card-info">
              <h3 className="admin-action-card-title">Office Timings & Shift Hours</h3>
              <p className="admin-action-card-desc">Configure grace periods and shift schedules</p>
            </div>
          </div>
          <div className="admin-action-card-chevron">
            <ChevronRight size={20} />
          </div>
        </div>
      </section>
    </div>
  );
}
