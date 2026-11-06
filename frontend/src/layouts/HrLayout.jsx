import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import HrNavbar from '../components/hr/HrNavbar';
import HrSidebar from '../components/hr/HrSidebar';
import '../styles/global.css';
import '../styles/admin.css';
import '../styles/responsive.css';

/**
 * HrLayout - Human Resources Application Shell
 * Uses the exact same two-column viewport layout, slide-out drawer, and styling as AdminLayout.
 */
export default function HrLayout() {
  const location = useLocation();
  const mainAreaRef = useRef(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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

  const isMainPage = location.pathname === '/hr' || location.pathname === '/hr/dashboard';

  return (
    <div className={`admin-portal-wrapper admin-layout ${isMainPage ? 'admin-main-page-active' : ''}`}>
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
        aria-label="Human Resources Navigation Drawer"
        role="dialog"
        aria-modal={isDrawerOpen}
      >
        <HrSidebar onClose={() => setIsDrawerOpen(false)} />
      </aside>

      {/* Main Content Area: Independently Scrollable Container */}
      <div
        ref={mainAreaRef}
        className={`admin-main-area admin-main ${isMainPage ? 'admin-main-page-wrapper' : ''}`}
        id="hr-main-scroll-container"
      >
        {/* Dedicated Admin/HR Portal Main Page Background Layer */}
        {isMainPage ? (
          <div className="admin-main-page-bg" aria-hidden="true" />
        ) : (
          <div className="dashboard-bg-decoration" />
        )}

        {/* Sticky Header within Main Area */}
        <div className="admin-header-wrapper admin-header">
          <div className="admin-header-container">
            <HrNavbar onToggleSidebar={toggleSidebar} />
          </div>
        </div>

        {/* Independently Scrollable Content Container */}
        <div className="dashboard-container admin-content">
          <main className="admin-page-content animate-fade-in" key={location.pathname}>
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
