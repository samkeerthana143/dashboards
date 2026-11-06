import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, MessageSquare, Briefcase } from 'lucide-react';
import BrandLogo from '../common/BrandLogo';
import { chatService } from '../../services/chatService';

export default function TeamLeaderNavbar({ onToggleSidebar }) {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('arshith_role');
    localStorage.removeItem('arshith_user');
    localStorage.removeItem('arshith_auth_token');
    navigate('/teamlead/login');
  }, [navigate]);

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

  const storedUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('arshith_user')) || null;
    } catch {
      return null;
    }
  })();
  const tlName = storedUser?.name || storedUser?.fullName || 'Team Leader';
  const tlEmail = storedUser?.email || 'teamlead@arshith.com';

  return (
    <header className="portal-navbar">
      <div className="portal-nav-left">
        <button
          type="button"
          className="nav-hamburger-btn"
          onClick={onToggleSidebar}
          aria-label="Toggle Team Leader navigation menu"
          title="Toggle Navigation Menu"
        >
          <span className="hamburger-line" />
          <span className="hamburger-line" />
          <span className="hamburger-line" />
        </button>
      </div>

      <div
        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
        onClick={() => navigate('/teamlead/dashboard')}
        title="Arshith Connect Team Leader Portal"
      >
        <BrandLogo size="medium" />
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: '#ecfdf5',
            color: '#0b3d2b',
            border: '1px solid #a7f3d0',
            padding: '2px 8px',
            borderRadius: '999px',
            fontSize: '0.72rem',
            fontWeight: '800',
            letterSpacing: '0.04em',
          }}
        >
          <Briefcase size={11} />
          TEAM LEADER
        </span>
      </div>

      <div className="portal-nav-right">
        {/* Teams Chat Button with Floating Badge */}
        <button
          type="button"
          onClick={() => navigate('/employee/chat')}
          className="navbar-team-chat-btn"
          title={`Teams Chat${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
          aria-label="Teams Chat"
        >
          <MessageSquare size={18} />
          {unreadCount > 0 && (
            <span className="navbar-chat-badge">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        <div className="user-profile-badge" title={`${tlName} (${tlEmail})`}>
          <div className="user-avatar" style={{ backgroundColor: '#0b3d2b' }}>
            {tlName.charAt(0).toUpperCase()}
          </div>
          <div className="user-info-text">
            <div className="user-name">{tlName}</div>
            <div className="user-role">Team Leader</div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          style={{
            padding: '7px 11px',
            borderRadius: '8px',
            backgroundColor: '#fee2e2',
            color: '#dc2626',
            fontSize: '0.8rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            border: 'none',
            cursor: 'pointer',
            transition: 'background-color 0.15s ease',
          }}
          title="Sign out of Team Leader session"
        >
          <LogOut size={14} />
          <span className="navbar-logout-text">Logout</span>
        </button>
      </div>
    </header>
  );
}

