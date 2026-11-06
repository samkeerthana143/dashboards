import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  FolderKanban,
  Users,
  PlusCircle,
  UserCheck,
  Calendar,
  Activity,
  FileText,
  CheckCircle2,
  RotateCcw,
  BarChart3,
  Sparkles,
} from 'lucide-react';
import BrandLogo from '../common/BrandLogo';

export default function TeamLeaderSidebar({ onClose, activeTab, onSelectTab }) {
  const navigate = useNavigate();

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
      title: 'Project & Team Allocation',
      items: [
        { label: 'View Assigned Projects', key: 'projects', icon: FolderKanban },
        { label: 'View Assigned Team', key: 'team', icon: Users },
      ],
    },
    {
      title: 'Task Delegation & Deadlines',
      items: [
        { label: 'Create Tasks', key: 'create-task', icon: PlusCircle },
        { label: 'Assign Tasks to Employees', key: 'tasks', icon: UserCheck },
        { label: 'Set Task Deadlines', key: 'deadlines', icon: Calendar },
        { label: 'Monitor Employee Work', key: 'monitor-work', icon: Activity },
      ],
    },
    {
      title: 'Review & Quality Assurance',
      items: [
        { label: 'View Daily Work Updates', key: 'work-updates', icon: FileText },
        { label: 'Review Submitted Tasks', key: 'submitted-tasks', icon: CheckCircle2 },
        { label: 'Approve / Reject Tasks', key: 'task-review', icon: CheckCircle2 },
        { label: 'Assign Rework', key: 'rework', icon: RotateCcw },
      ],
    },
    {
      title: 'Analytics & Delivery',
      items: [
        { label: 'Monitor Team Performance', key: 'performance', icon: BarChart3 },
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
            onClick={() => handleSelect('projects')}
            title="Arshith Connect Team Leader Portal"
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
          <h2 className="admin-drawer-title" style={{ color: '#0b3d2b' }}>Team Leadership</h2>
          <div className="admin-drawer-subtitle">Task Delegation & Execution</div>
        </div>
      </div>

      {/* Navigation Body */}
      <nav
        className="admin-drawer-menu admin-sidebar-nav"
        aria-label="Team Leader Navigation Links"
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

