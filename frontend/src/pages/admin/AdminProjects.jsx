import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import HrProjectsDashboard from '../hr-projects/HrProjectsDashboard';

/**
 * AdminProjects - Project Operations & Team Allocation inside Administrator Portal
 * Mounts the full Project Operations suite within the Admin Portal layout.
 */
export default function AdminProjects({ defaultTab }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Resolve active tab from prop, pathname, or query param
  const resolveActiveTab = () => {
    if (defaultTab) return defaultTab;
    const path = location.pathname.toLowerCase();
    if (path.includes('team-leader')) return 'team-leaders';
    if (path.includes('teams')) return 'teams';
    if (path.includes('progress')) return 'progress';
    if (path.includes('report')) return 'reports';
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam) return tabParam;
    return 'dashboard';
  };

  const handleTabChange = (newTab) => {
    if (newTab === 'team-leaders') {
      navigate('/admin/projects/team-leaders');
    } else if (newTab === 'teams') {
      navigate('/admin/projects/teams');
    } else if (newTab === 'progress') {
      navigate('/admin/projects/progress');
    } else if (newTab === 'reports') {
      navigate('/admin/projects/reports');
    } else {
      navigate('/admin/projects');
    }
  };

  return (
    <div className="admin-projects-admin-wrapper">
      <HrProjectsDashboard
        activeTab={resolveActiveTab()}
        onTabChange={handleTabChange}
      />
    </div>
  );
}

