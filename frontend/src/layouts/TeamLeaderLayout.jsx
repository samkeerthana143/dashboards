import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import TeamLeaderNavbar from '../components/team-leader/TeamLeaderNavbar';
import TeamLeaderSidebar from '../components/team-leader/TeamLeaderSidebar';
import TeamLeaderDashboard from '../pages/team-leader/TeamLeaderDashboard';
import '../styles/global.css';
import '../styles/admin.css';
import '../styles/responsive.css';

/**
 * TeamLeaderLayout - Master Shell for Team Leader Portal
 * Houses top navbar, slide-out drawer, and mounts the 11 Team Leader modules.
 */
export default function TeamLeaderLayout() {
  const location = useLocation();
  const mainAreaRef = useRef(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('projects');

  // Close drawer and reset main area scroll on route change
  useEffect(() => {
    setIsDrawerOpen(false);
    if (mainAreaRef.current) {
      mainAreaRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isDrawerOpen) {
        setIsDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen]);

  // Lock body scroll while drawer is open
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isDrawerOpen]);

  const toggleSidebar = useCallback(() => {
    setIsDrawerOpen((prev) => !prev);
  }, []);

  const handleSelectTab = (tabKey) => {
    setActiveTab(tabKey);
    setIsDrawerOpen(false);
    if (mainAreaRef.current) {
      mainAreaRef.current.scrollTop = 0;
    }
  };

  return (
    <div className="admin-portal-wrapper admin-layout admin-main-page-active">
      {/* Mobile / Desktop Drawer Backdrop Overlay */}
      {isDrawerOpen && (
        <div
          className="admin-nav-backdrop"
          onClick={() => setIsDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Single Unified Slide-Out Navigation Drawer */}
      <aside
        className={`admin-nav-drawer admin-mobile-drawer ${isDrawerOpen ? 'open' : ''}`}
        aria-label="Team Leader Navigation Drawer"
        role="dialog"
        aria-modal={isDrawerOpen}
      >
        <TeamLeaderSidebar
          onClose={() => setIsDrawerOpen(false)}
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
        />
      </aside>

      {/* Main Content Area */}
      <div
        ref={mainAreaRef}
        className="admin-main-area admin-main admin-main-page-wrapper"
        id="team-leader-main-scroll-container"
      >
        {/* Dedicated Portal Main Page Background Layer */}
        <div className="admin-main-page-bg" aria-hidden="true" />

        {/* Sticky Header within Main Area */}
        <div className="admin-header-wrapper admin-header">
          <div className="admin-header-container">
            <TeamLeaderNavbar onToggleSidebar={toggleSidebar} />
          </div>
        </div>

        {/* Content Container */}
        <div className="dashboard-container admin-content">
          <main className="admin-page-content animate-fade-in">
            <TeamLeaderDashboard
              activeTab={activeTab}
              onTabChange={(t) => setActiveTab(t)}
            />
          </main>
        </div>
      </div>
    </div>
  );
}

