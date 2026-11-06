import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import BrandLogo from '../common/BrandLogo';
import { chatService } from '../../services/chatService';

/**
 * HrSidebar - Human Resources Navigation Sidebar & Drawer
 * Uses the exact same UI structure and CSS classes as AdminSidebar for identical styling and behavior.
 */
export default function HrSidebar({ onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const fetchUnread = async () => {
      try {
        const count = await chatService.getUnreadCount();
        if (isMounted) setUnreadCount(count);
      } catch {}
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 8000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const navSections = [
    {
      title: 'Core Operations',
      items: [
        { label: 'HR Dashboard', path: '/hr/dashboard', aliases: ['/hr', '/hr/dashboard'] },
        { label: 'Attendance Tracking', path: '/hr/attendance', aliases: ['/hr/attendance'] },
        { label: 'Attendance Reports', path: '/hr/reports', aliases: ['/hr/reports', '/hr/attendance-reports'] },
        { label: 'Leave Management', path: '/hr/leaves', aliases: ['/hr/leaves', '/hr/leave-management'] },
        { label: 'Holiday Management', path: '/hr/holidays', aliases: ['/hr/holidays', '/hr/holiday-management'] },
        { label: 'Office Timings', path: '/hr/office-timings', aliases: ['/hr/office-timings'] },
      ],
    },
    {
      title: 'Payroll & Finance',
      items: [
        { label: 'Payslip Generation', path: '/hr/payslips', aliases: ['/hr/payslips'] },
        { label: 'Salary Advances & Loans', path: '/hr/loans', aliases: ['/hr/loans'] },
        { label: 'Payroll Engine', path: '/hr/payroll', aliases: ['/hr/payroll'] },
        { label: 'Salary Structures', path: '/hr/salary-structures', aliases: ['/hr/salary-structures'] },
        { label: 'Salary Payments', path: '/hr/payments', aliases: ['/hr/payments'] },
      ],
    },
    {
      title: 'Workforce Operations',
      items: [
        { label: 'Employee Directory', path: '/hr/employees', aliases: ['/hr/employees', '/hr/employees/list'] },
        { label: 'Registration Requests', path: '/hr/registration-requests', aliases: ['/hr/registration-requests'] },
        { label: 'Recruitment & ATS', path: '/hr/recruitment', aliases: ['/hr/recruitment'] },
        { label: 'Performance Appraisals', path: '/hr/performance', aliases: ['/hr/performance'] },
        { label: 'Resignation & Settlement', path: '/hr/separation', aliases: ['/hr/separation'] },
        { label: 'Teams Chat', path: '/hr/chat', aliases: ['/hr/chat'], isChat: true },
      ],
    },
  ];

  const handleSelectRoute = (path) => {
    navigate(path);
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="admin-sidebar-inner">
      {/* Branded Header: Fixed at top of sidebar, never scrolls */}
      <div className="admin-drawer-header admin-sidebar-header">
        <div className="admin-drawer-header-top">
          <div
            style={{ cursor: 'pointer' }}
            onClick={() => handleSelectRoute('/hr/dashboard')}
            title="Arshith Connect Human Resources Portal"
          >
            <BrandLogo size="compact" />
          </div>

          {onClose && (
            <button
              type="button"
              className="admin-drawer-close-btn"
              onClick={onClose}
              aria-label="Close navigation drawer"
            >
              <X size={20} />
            </button>
          )}
        </div>

        <div className="admin-drawer-branding-titles">
          <h2 className="admin-drawer-title">Human Resources</h2>
          <div className="admin-drawer-subtitle">HR Management</div>
        </div>
      </div>

      {/* Pure White Drawer Body with Navigation Sections and Smooth Independent Internal Scrolling */}
      <nav
        className="admin-drawer-menu admin-sidebar-nav"
        aria-label="Human Resources Navigation Links"
        style={{ paddingBottom: '32px' }}
      >
        {navSections.map((section, sIdx) => (
          <div key={sIdx} className="admin-drawer-section" style={{ marginBottom: '14px' }}>
            <div
              style={{
                padding: '10px 20px 4px 20px',
                fontSize: '0.68rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#64748b',
              }}
            >
              {section.title}
            </div>
            {section.items.map((item, idx) => {
              const isActive =
                item.aliases.some((alias) => location.pathname === alias) ||
                location.pathname === item.path;

              return (
                <button
                  key={idx}
                  type="button"
                  className={`admin-drawer-item ${isActive ? 'active' : ''}`}
                  onClick={() => handleSelectRoute(item.path)}
                  aria-current={isActive ? 'page' : undefined}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}
                >
                  <span className="admin-drawer-item-label">{item.label}</span>
                  {item.isChat && unreadCount > 0 && (
                    <span
                      style={{
                        backgroundColor: '#F04491',
                        color: '#ffffff',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '1px 7px',
                        borderRadius: '10px',
                        marginLeft: 'auto',
                      }}
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>
    </div>
  );
}
