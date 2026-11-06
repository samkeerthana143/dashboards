import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserCheck,
  Briefcase,
  Users,
  FolderKanban,
  Shield,
  ChevronDown,
  Check,
} from 'lucide-react';

export default function PortalSwitcher({ active }) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const portals = [
    {
      id: 'employee',
      name: 'Employee Portal',
      shortName: 'Employee',
      path: '/login',
      icon: UserCheck,
      description: 'Attendance & Profile',
      color: '#0b3d2b',
      bgColor: '#ecfdf5',
    },
    {
      id: 'teamlead',
      name: 'Team Leader Portal',
      shortName: 'Team Leader',
      path: '/teamlead/login',
      icon: Briefcase,
      description: 'Projects & Tasks Delegation',
      color: '#0b3d2b',
      bgColor: '#ecfdf5',
    },
    {
      id: 'hr',
      name: 'HR Management Portal',
      shortName: 'HR Portal',
      path: '/hr/login',
      icon: Users,
      description: 'HRMS, Payroll & Staff',
      color: '#0f766e',
      bgColor: '#f0fdfa',
    },
    {
      id: 'hr-projects',
      name: 'Project & Operations HR',
      shortName: 'Project HR',
      path: '/hr-projects/login',
      icon: FolderKanban,
      description: 'Sprint & Leader Approvals',
      color: '#0f766e',
      bgColor: '#f0fdfa',
    },
    {
      id: 'admin',
      name: 'Admin Portal',
      shortName: 'Admin',
      path: '/admin/login',
      icon: Shield,
      description: 'Full System Controls',
      color: '#6941c6',
      bgColor: '#f9f5ff',
    },
  ];

  const currentPortal = portals.find((p) => p.id === active) || portals[0];
  const CurrentIcon = currentPortal.icon;

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (path) => {
    setIsOpen(false);
    navigate(path);
  };

  return (
    <div
      ref={dropdownRef}
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        width: '100%',
        marginBottom: '16px',
        position: 'relative',
        zIndex: 50,
      }}
    >
      {/* Dropdown Toggle Trigger Button on one side */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '7px 12px',
          borderRadius: '10px',
          backgroundColor: '#ffffff',
          border: '1px solid #cbd5e1',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          fontSize: '0.82rem',
          fontWeight: '700',
          color: currentPortal.color,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#94a3b8';
          e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.08)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#cbd5e1';
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
        }}
        title="Switch Portal Module"
      >
        <span
          style={{
            width: '20px',
            height: '20px',
            borderRadius: '6px',
            backgroundColor: currentPortal.bgColor,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: currentPortal.color,
          }}
        >
          <CurrentIcon size={12} />
        </span>
        <span>{currentPortal.shortName}</span>
        <ChevronDown
          size={14}
          color="#64748b"
          style={{
            transition: 'transform 0.2s ease',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      {/* Dropdown Menu of all Module Names */}
      {isOpen && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            width: '270px',
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 12px 28px -4px rgba(15, 23, 42, 0.15), 0 4px 10px -2px rgba(15, 23, 42, 0.05)',
            padding: '6px',
            boxSizing: 'border-box',
            animation: 'modalBackdropIn 0.18s ease-out forwards',
            zIndex: 100,
          }}
        >
          <div
            style={{
              padding: '6px 10px 4px 10px',
              fontSize: '0.68rem',
              fontWeight: '800',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: '#94a3b8',
              borderBottom: '1px solid #f1f5f9',
              marginBottom: '4px',
            }}
          >
            Switch Portal Module
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {portals.map((portal) => {
              const isSelected = portal.id === active;
              const IconComp = portal.icon;

              return (
                <button
                  key={portal.id}
                  type="button"
                  role="menuitem"
                  onClick={() => handleSelect(portal.path)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '9px',
                    border: 'none',
                    backgroundColor: isSelected ? portal.bgColor : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = '#f8fafc';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        backgroundColor: portal.bgColor,
                        color: portal.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <IconComp size={14} />
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: '0.825rem',
                          fontWeight: isSelected ? '800' : '600',
                          color: isSelected ? portal.color : '#1e293b',
                          lineHeight: '1.2',
                        }}
                      >
                        {portal.name}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '1px' }}>
                        {portal.description}
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <Check size={15} color={portal.color} style={{ flexShrink: 0 }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
