import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, FolderKanban, Users, CheckCircle2, UserCheck, PlusCircle, BarChart3, Activity } from 'lucide-react';
import BrandLogo from '../common/BrandLogo';

export default function HrProjectsSidebar({ onClose, activeTab, onSelectTab }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleSelect = (tabKey) => {
    if (onSelectTab) {
      onSelectTab(tabKey);
    }
    if (onClose) {
      onClose();
    }
  };

  const navSections = [
    {
      title: 'Project Operations',
      items: [
        { label: 'Project Dashboard', key: 'dashboard', icon: FolderKanban },
        { label: 'View Projects', key: 'projects', icon: FolderKanban },
        { label: 'Add New Project', key: 'add-project', icon: PlusCircle },
      ],
    },
    {
      title: 'Team Leadership & Allocation',
      items: [
        { label: 'Approve / Reject Team Leader', key: 'team-leaders', icon: CheckCircle2 },
        { label: 'Assign Team Leaders', key: 'assign-leaders', icon: UserCheck },
        { label: 'Assign Employees', key: 'assign-employees', icon: Users },
        { label: 'Create & Manage Teams', key: 'teams', icon: Users },
      ],
    },
    {
      title: 'Tracking & Analytics',
      items: [
        { label: 'Monitor Project Progress', key: 'progress', icon: Activity },
        { label: 'View Project Reports', key: 'reports', icon: BarChart3 },
      ],
    },
  ];

  return (
    <div className="admin-sidebar-inner">
      {/* Branded Header: Fixed at top of sidebar */}
      <div className="admin-drawer-header admin-sidebar-header">
        <div className="admin-drawer-header-top">
          <div
            style={{ cursor: 'pointer' }}
            onClick={() => handleSelect('dashboard')}
            title="Arshith Connect Project Operations HR"
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
          <h2 className="admin-drawer-title">Project Operations</h2>
          <div className="admin-drawer-subtitle">HR Management</div>
        </div>
      </div>

      {/* Navigation Body */}
      <nav
        className="admin-drawer-menu admin-sidebar-nav"
        aria-label="Project Operations Navigation Links"
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
              const isActive = activeTab === item.key;
              const IconComp = item.icon;

              return (
                <button
                  key={idx}
                  type="button"
                  className={`admin-drawer-item ${isActive ? 'active' : ''}`}
                  onClick={() => handleSelect(item.key)}
                  aria-current={isActive ? 'page' : undefined}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <IconComp size={16} color={isActive ? '#0b3d2b' : '#64748b'} />
                    <span className="admin-drawer-item-label">{item.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </nav>
    </div>
  );
}

