import React, { useState, useEffect, useCallback } from 'react';
import {
  FolderKanban,
  CheckCircle2,
  XCircle,
  Plus,
  Users,
  UserCheck,
  Activity,
  BarChart3,
  Edit,
  Trash2,
  Calendar,
  AlertCircle,
  Clock,
  ShieldCheck,
  Search,
  Filter,
  Check,
  X,
  ChevronRight,
  TrendingUp,
  FileText,
  UserPlus,
  Layers,
} from 'lucide-react';
import AdminStatCard from '../../components/admin/AdminStatCard';
import Modal from '../../components/common/Modal';
import projectService from '../../services/projectService';
import teamService from '../../services/teamService';
import { employeeService } from '../../services/employeeService';
import { authService } from '../../services/authService';

export default function HrProjectsDashboard({ activeTab = 'dashboard', onTabChange }) {
  const [currentTab, setCurrentTab] = useState(activeTab);
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [approvedLeaders, setApprovedLeaders] = useState([]);
  const [approvedEmployees, setApprovedEmployees] = useState([]);
  const [leaderApprovals, setLeaderApprovals] = useState([]);
  const [reportsSummary, setReportsSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAssignLeaderModalOpen, setIsAssignLeaderModalOpen] = useState(false);
  const [isAssignEmployeeModalOpen, setIsAssignEmployeeModalOpen] = useState(false);
  const [isCreateTeamModalOpen, setIsCreateTeamModalOpen] = useState(false);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  // Form states
  const [projectForm, setProjectForm] = useState({
    name: '',
    description: '',
    department: 'Operations',
    team_name: 'Core Team',
    team_leader: '',
    assigned_employees: [],
    deadline: '',
    priority: 'High',
    status: 'In Progress',
    progress: 0,
    proposal_pdf: '',
    proposal_pdf_name: '',
  });

  const handleProposalPdfUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Please upload a valid PDF document (.pdf).');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      alert('PDF file size exceeds 15MB limit.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setProjectForm((prev) => ({
        ...prev,
        proposal_pdf: ev.target.result,
        proposal_pdf_name: file.name,
      }));
    };
    reader.readAsDataURL(file);
  };

  const openPdfViewer = (pdfData, pdfName = 'Project_Proposal.pdf') => {
    if (!pdfData) return;
    if (pdfData.startsWith('data:application/pdf') || pdfData.startsWith('data:')) {
      const pdfWindow = window.open('', '_blank');
      if (pdfWindow) {
        pdfWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${pdfName}</title>
              <style>
                body, html { margin: 0; padding: 0; height: 100%; overflow: hidden; background: #525659; font-family: system-ui, -apple-system, sans-serif; }
                .topbar { display: flex; align-items: center; justify-content: space-between; background: #0b3d2b; color: #ffffff; padding: 10px 18px; box-shadow: 0 2px 8px rgba(0,0,0,0.25); }
                .topbar .title { font-size: 14px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
                .topbar a.download-btn { background: #0f766e; color: #ffffff; padding: 6px 14px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 700; transition: background 0.15s; }
                .topbar a.download-btn:hover { background: #14b8a6; }
                iframe { border: none; width: 100%; height: calc(100% - 48px); }
              </style>
            </head>
            <body>
              <div class="topbar">
                <div class="title">📄 ${pdfName}</div>
                <a class="download-btn" href="${pdfData}" download="${pdfName}">⬇ Download Proposal PDF</a>
              </div>
              <iframe src="${pdfData}" type="application/pdf"></iframe>
            </body>
          </html>
        `);
        pdfWindow.document.close();
      } else {
        window.open(pdfData, '_blank');
      }
    } else {
      window.open(pdfData, '_blank');
    }
  };

  const [teamForm, setTeamForm] = useState({
    teamName: '',
    department: 'Engineering',
    description: '',
    leader: '',
  });

  const [selectedLeaderName, setSelectedLeaderName] = useState('');
  const [selectedEmployeesList, setSelectedEmployeesList] = useState([]);
  const [progressInput, setProgressInput] = useState(0);
  const [statusInput, setStatusInput] = useState('In Progress');

  // Sync with prop if passed
  useEffect(() => {
    if (activeTab) {
      setCurrentTab(activeTab);
    }
  }, [activeTab]);

  const switchTab = (tab) => {
    setCurrentTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [projList, teamList, empList, leaders, reports, appLeaders, appEmps] = await Promise.allSettled([
        projectService.getProjects(),
        teamService.getTeams(),
        employeeService.getEmployees(),
        projectService.getTeamLeaderApprovals(),
        projectService.getReportsSummary(),
        projectService.getApprovedLeaders(),
        projectService.getApprovedEmployees(),
      ]);

      if (projList.status === 'fulfilled') setProjects(projList.value || []);
      if (teamList.status === 'fulfilled') setTeams(teamList.value || []);
      if (empList.status === 'fulfilled') setEmployees(empList.value || []);
      if (leaders.status === 'fulfilled') setLeaderApprovals(leaders.value || []);
      if (reports.status === 'fulfilled') setReportsSummary(reports.value || null);
      if (appLeaders.status === 'fulfilled') setApprovedLeaders(appLeaders.value || []);
      if (appEmps.status === 'fulfilled') setApprovedEmployees(appEmps.value || []);
    } catch (err) {
      console.error('Failed to load project operations data', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Current logged in HR User
  const storedUser = authService.getCurrentUser();
  const hrName = storedUser?.name || storedUser?.fullName || 'Project HR Lead';
  const hrEmail = storedUser?.email || 'project.hr@arshith.com';

  // Calculations
  const totalProjectsCount = projects.length;
  const completedProjectsCount = projects.filter((p) => p.status === 'Completed' || p.progress >= 100).length;
  const inProgressCount = projects.filter((p) => p.status === 'In Progress' || p.status === 'On Track').length;
  const pendingApprovalsCount = leaderApprovals.filter((l) => l.approval_status === 'PENDING').length;
  const totalTeamsCount = teams.length;
  const avgProgress = totalProjectsCount > 0
    ? Math.round(projects.reduce((acc, p) => acc + (p.progress || 0), 0) / totalProjectsCount)
    : 0;

  // Filtered projects
  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.team_leader && p.team_leader.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || p.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  // =========================================================================
  // Handlers
  // =========================================================================

  // 4. Add Project
  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!projectForm.name || !projectForm.deadline) return;
    if (!projectForm.team_leader) {
      alert('Please select a registered and Admin-approved Team Leader.');
      return;
    }

    try {
      await projectService.createProject({
        ...projectForm,
        progress: parseInt(projectForm.progress || 0, 10),
      });
      setIsAddModalOpen(false);
      setProjectForm({
        name: '',
        description: '',
        department: 'Operations',
        team_name: 'Core Team',
        team_leader: '',
        assigned_employees: [],
        deadline: '',
        priority: 'High',
        status: 'In Progress',
        progress: 0,
        proposal_pdf: '',
        proposal_pdf_name: '',
      });
      await loadAllData();
    } catch (err) {
      alert(err.response?.data?.detail || err.message || 'Failed to create project');
    }
  };

  // 6. Edit Project
  const handleOpenEdit = (proj) => {
    setSelectedProject(proj);
    setProjectForm({
      name: proj.name,
      description: proj.description || '',
      department: proj.department || 'Operations',
      team_name: proj.team_name || 'Core Team',
      team_leader: proj.team_leader || '',
      deadline: proj.deadline || '',
      priority: proj.priority || 'High',
      status: proj.status || 'In Progress',
      progress: proj.progress || 0,
      proposal_pdf: proj.proposal_pdf || '',
      proposal_pdf_name: proj.proposal_pdf_name || '',
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateProject = async (e) => {
    e.preventDefault();
    if (!selectedProject) return;

    try {
      await projectService.updateProject(selectedProject.id, {
        ...projectForm,
        progress: parseInt(projectForm.progress || 0, 10),
      });
      setIsEditModalOpen(false);
      setSelectedProject(null);
      await loadAllData();
    } catch (err) {
      alert(err.message || 'Failed to update project');
    }
  };

  // 6. Delete Project
  const handleDeleteProject = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete project "${name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await projectService.deleteProject(id);
      await loadAllData();
    } catch (err) {
      alert(err.message || 'Failed to delete project');
    }
  };

  // 2. Approve / Reject Team Leader
  const handleLeaderApproval = async (approvalItem, approval_status) => {
    try {
      const targetId = approvalItem.candidate_id || approvalItem.id || approvalItem.project_id;
      if (targetId) {
        await projectService.updateTeamLeaderApproval(targetId, {
          approval_status,
          remarks: `Decision by ${hrName}`,
        });
      }
      await loadAllData();
    } catch (err) {
      alert(err.message || 'Failed to update team leader status');
    }
  };

  // 7. Assign Team Leader
  const handleOpenAssignLeader = (proj) => {
    setSelectedProject(proj);
    setSelectedLeaderName(proj.team_leader && proj.team_leader !== 'Unassigned' ? proj.team_leader : '');
    setIsAssignLeaderModalOpen(true);
  };

  const handleSaveAssignLeader = async (e) => {
    e.preventDefault();
    if (!selectedProject || !selectedLeaderName) return;

    try {
      await projectService.assignTeamLeader(selectedProject.id, {
        leader_name: selectedLeaderName,
        remarks: `Assigned by ${hrName}`,
      });
      setIsAssignLeaderModalOpen(false);
      setSelectedProject(null);
      await loadAllData();
    } catch (err) {
      alert(err.message || 'Failed to assign team leader');
    }
  };

  // 8. Assign Employees
  const handleOpenAssignEmployees = (proj) => {
    setSelectedProject(proj);
    setSelectedEmployeesList(proj.assigned_employees || []);
    setIsAssignEmployeeModalOpen(true);
  };

  const toggleEmployeeSelection = (empName) => {
    setSelectedEmployeesList((prev) =>
      prev.includes(empName) ? prev.filter((e) => e !== empName) : [...prev, empName]
    );
  };

  const handleSaveAssignEmployees = async () => {
    if (!selectedProject) return;
    try {
      await projectService.assignEmployees(selectedProject.id, selectedEmployeesList);
      setIsAssignEmployeeModalOpen(false);
      setSelectedProject(null);
      await loadAllData();
    } catch (err) {
      alert(err.message || 'Failed to assign employees');
    }
  };

  // 10. Monitor Project Progress
  const handleOpenProgress = (proj) => {
    setSelectedProject(proj);
    setProgressInput(proj.progress || 0);
    setStatusInput(proj.status || 'In Progress');
    setIsProgressModalOpen(true);
  };

  const handleSaveProgress = async (e) => {
    e.preventDefault();
    if (!selectedProject) return;

    try {
      await projectService.updateProgress(selectedProject.id, {
        progress: progressInput,
        status: statusInput,
      });
      setIsProgressModalOpen(false);
      setSelectedProject(null);
      await loadAllData();
    } catch (err) {
      alert(err.message || 'Failed to update project progress');
    }
  };

  // 9. Create Team
  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!teamForm.teamName.trim()) return;

    try {
      await teamService.createTeam({
        teamName: teamForm.teamName.trim(),
        department: teamForm.department,
        description: teamForm.description,
        leader: teamForm.leader || null,
        members: teamForm.leader ? [teamForm.leader] : [],
      });
      setIsCreateTeamModalOpen(false);
      setTeamForm({ teamName: '', department: 'Engineering', description: '', leader: '' });
      await loadAllData();
    } catch (err) {
      alert(err.message || 'Failed to create team');
    }
  };

  return (
    <div className="admin-dashboard-view admin-main-page animate-fade-in" style={{ paddingBottom: '40px' }}>
      {/* ========================================================= */}
      {/* Header Banner                                            */}
      {/* ========================================================= */}
      <div style={{ marginBottom: '22px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: '700', color: '#0b3d2b', margin: 0, letterSpacing: '-0.3px' }}>
            Project & Operations HR Dashboard
          </h1>
          <div style={{ marginTop: '4px' }}>
            <div style={{ fontSize: '0.925rem', fontWeight: '600', color: '#1e293b' }}>
              {hrName}
            </div>
            <div style={{ fontSize: '0.825rem', color: '#64748b' }}>
              {hrEmail} &bull; <span style={{ color: '#0f766e', fontWeight: '600' }}>Project Allocation & Team Leadership</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: '#0b3d2b',
              color: '#ffffff',
              borderRadius: '8px',
              border: 'none',
              fontSize: '0.825rem',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(11, 61, 43, 0.2)',
            }}
          >
            <Plus size={15} />
            <span>Add Project</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCreateTeamModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: '#ffffff',
              color: '#0b3d2b',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.825rem',
              fontWeight: '700',
              cursor: 'pointer',
            }}
          >
            <Users size={15} />
            <span>Create Team</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 6 KPI Metric Cards (Matching Admin Stat Card Design)      */}
      {/* ========================================================= */}
      <section style={{ marginBottom: '24px' }}>
        <div className="admin-today-stats-grid">
          <AdminStatCard
            label="TOTAL PROJECTS"
            value={totalProjectsCount}
            colorClass="stat-val-present"
            widthClass="full-width"
          />
          <AdminStatCard
            label="IN PROGRESS"
            value={inProgressCount}
            colorClass="stat-val-wfo"
            widthClass="one-third"
          />
          <AdminStatCard
            label="COMPLETED"
            value={completedProjectsCount}
            colorClass="stat-val-present"
            widthClass="one-third"
          />
          <AdminStatCard
            label="AVG PROGRESS"
            value={`${avgProgress}%`}
            colorClass="stat-val-late"
            widthClass="one-third"
          />
          <AdminStatCard
            label="PENDING TL APPROVALS"
            value={pendingApprovalsCount}
            colorClass="stat-val-pending"
            widthClass="half-width"
          />
          <AdminStatCard
            label="ACTIVE TEAMS"
            value={totalTeamsCount}
            colorClass="stat-val-holiday"
            widthClass="half-width"
          />
        </div>
      </section>

      {/* ========================================================= */}
      {/* Interactive Tabs Selector (Matching Navigation List)     */}
      {/* ========================================================= */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          paddingBottom: '8px',
          marginBottom: '20px',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        {[
          { key: 'dashboard', label: 'All Projects', icon: FolderKanban },
          { key: 'team-leaders', label: `Team Leader Approvals (${pendingApprovalsCount})`, icon: CheckCircle2 },
          { key: 'teams', label: `Teams Management (${totalTeamsCount})`, icon: Users },
          { key: 'progress', label: 'Monitor Progress', icon: Activity },
          { key: 'reports', label: 'Project Reports', icon: BarChart3 },
        ].map((tab) => {
          const isActive = currentTab === tab.key;
          const IconC = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => switchTab(tab.key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 16px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: isActive ? '700' : '600',
                color: isActive ? '#0b3d2b' : '#64748b',
                backgroundColor: isActive ? '#e6f4ea' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              <IconC size={16} color={isActive ? '#0b3d2b' : '#64748b'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* TAB 1: ALL PROJECTS (VIEW, ADD, EDIT, DELETE, ALLOCATE)   */}
      {/* ========================================================= */}
      {(currentTab === 'dashboard' || currentTab === 'projects') && (
        <section>
          {/* Controls Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '260px' }}>
              <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search project by title, leader, or department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 36px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Filter size={15} color="#64748b" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: '7px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.825rem',
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  fontWeight: '600',
                  outline: 'none',
                }}
              >
                <option value="ALL">All Statuses</option>
                <option value="Planning">Planning</option>
                <option value="In Progress">In Progress</option>
                <option value="On Track">On Track</option>
                <option value="At Risk">At Risk</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>

          {/* Projects Grid */}
          {filteredProjects.length === 0 ? (
            <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '40px 20px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
              <FolderKanban size={40} color="#cbd5e1" style={{ margin: '0 auto 10px' }} />
              <h3 style={{ fontSize: '1rem', color: '#334155', margin: '0 0 4px' }}>No Projects Found</h3>
              <p style={{ fontSize: '0.825rem', color: '#64748b', margin: 0 }}>
                Click "+ Add Project" above to create your first operational sprint.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
              {filteredProjects.map((proj) => {
                const isLeaderApproved = proj.team_leader_approval_status === 'APPROVED';
                const isCompleted = proj.status === 'Completed' || proj.progress >= 100;

                return (
                  <div
                    key={proj.id}
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '14px',
                      border: '1px solid #e2e8f0',
                      padding: '18px',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      {/* Top Badges */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#64748b', letterSpacing: '0.5px' }}>
                          {proj.id}
                        </span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: '700',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              backgroundColor: proj.priority === 'High' ? '#fee2e2' : '#fef3c7',
                              color: proj.priority === 'High' ? '#b91c1c' : '#b45309',
                            }}
                          >
                            {proj.priority} Priority
                          </span>
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: '700',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              backgroundColor: isCompleted ? '#ecfdf5' : '#eff6ff',
                              color: isCompleted ? '#047857' : '#1d4ed8',
                            }}
                          >
                            {proj.status}
                          </span>
                        </div>
                      </div>

                      {/* Title & Description */}
                      <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#0b3d2b', margin: '0 0 6px' }}>
                        {proj.name}
                      </h3>
                      <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 14px', lineHeight: '1.4' }}>
                        {proj.description || 'No detailed project brief provided.'}
                      </p>

                      {/* Team & Leader */}
                      <div style={{ backgroundColor: '#f8fafc', borderRadius: '8px', padding: '10px 12px', marginBottom: '14px', border: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
                            Team Leader
                          </span>
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: '700',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              backgroundColor: isLeaderApproved ? '#dcfce7' : '#fef3c7',
                              color: isLeaderApproved ? '#15803d' : '#b45309',
                            }}
                          >
                            {proj.team_leader_approval_status || 'PENDING'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#1e293b' }}>
                          {proj.team_leader || 'Unassigned'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                          Team: <strong>{proj.team_name || 'Core Operations'}</strong> &bull; Dept: {proj.department}
                        </div>
                      </div>

                      {/* Progress Bar (Monitor Project Progress) */}
                      <div style={{ marginBottom: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: '600', marginBottom: '4px' }}>
                          <span style={{ color: '#475569' }}>Completion Progress</span>
                          <span style={{ color: '#0b3d2b', fontWeight: '800' }}>{proj.progress}%</span>
                        </div>
                        <div style={{ width: '100%', height: '7px', backgroundColor: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${proj.progress}%`,
                              height: '100%',
                              backgroundColor: isCompleted ? '#10b981' : '#0f766e',
                              borderRadius: '999px',
                              transition: 'width 0.3s ease',
                            }}
                          />
                        </div>
                      </div>

                      {/* Assigned Employees */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', marginBottom: '12px' }}>
                        <span>
                          👥 <strong>{proj.assigned_employees?.length || 0}</strong> Assigned Employees
                        </span>
                        <span>
                          📅 Due: <strong>{proj.deadline}</strong>
                        </span>
                      </div>

                      {/* Proposal PDF Action Button */}
                      {proj.proposal_pdf && (
                        <div style={{ marginBottom: '14px' }}>
                          <button
                            type="button"
                            onClick={() => openPdfViewer(proj.proposal_pdf, proj.proposal_pdf_name || `${proj.name} - Proposal.pdf`)}
                            style={{
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              border: '1px solid #fecdd3',
                              backgroundColor: '#fff1f2',
                              color: '#be123c',
                              fontSize: '0.78rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              boxShadow: '0 1px 2px rgba(225, 29, 72, 0.06)',
                            }}
                            title={`Open ${proj.proposal_pdf_name || 'Project Proposal PDF'}`}
                          >
                            <FileText size={15} color="#e11d48" />
                            <span>View Proposal PDF</span>
                            {proj.proposal_pdf_name && (
                              <span style={{ fontSize: '0.7rem', color: '#9f1239', maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                ({proj.proposal_pdf_name})
                              </span>
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons Toolbar */}
                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => handleOpenAssignLeader(proj)}
                        style={{
                          flex: 1,
                          padding: '6px 10px',
                          borderRadius: '6px',
                          backgroundColor: '#f0fdf4',
                          color: '#166534',
                          border: '1px solid #bbf7d0',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                        }}
                      >
                        Assign Leader
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenAssignEmployees(proj)}
                        style={{
                          flex: 1,
                          padding: '6px 10px',
                          borderRadius: '6px',
                          backgroundColor: '#eff6ff',
                          color: '#1d4ed8',
                          border: '1px solid #bfdbfe',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                        }}
                      >
                        Assign Staff
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenProgress(proj)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          backgroundColor: '#faf5ff',
                          color: '#6b21a8',
                          border: '1px solid #e9d5ff',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                        }}
                      >
                        Progress
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(proj)}
                        style={{
                          padding: '6px',
                          borderRadius: '6px',
                          backgroundColor: '#ffffff',
                          color: '#475569',
                          border: '1px solid #cbd5e1',
                          cursor: 'pointer',
                        }}
                        title="Edit Project"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProject(proj.id, proj.name)}
                        style={{
                          padding: '6px',
                          borderRadius: '6px',
                          backgroundColor: '#ffffff',
                          color: '#dc2626',
                          border: '1px solid #fecaca',
                          cursor: 'pointer',
                        }}
                        title="Delete Project"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ========================================================= */}
      {/* TAB 2: APPROVE / REJECT TEAM LEADER (REQ 2)               */}
      {/* ========================================================= */}
      {currentTab === 'team-leaders' && (
        <section style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '20px' }}>
          <div style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0b3d2b', margin: '0 0 4px' }}>
              Team Leader Approvals & Reviews
            </h2>
            <p style={{ fontSize: '0.825rem', color: '#64748b', margin: 0 }}>
              Verify and approve nominated Team Leaders across departments before operational delegation.
            </p>
          </div>

          {leaderApprovals.length === 0 ? (
            <div style={{ padding: '30px 0', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
              No team leaders currently registered or pending approval.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '10px 14px', fontWeight: '700' }}>Team Leader & Contact</th>
                    <th style={{ padding: '10px 14px', fontWeight: '700' }}>Department & Role</th>
                    <th style={{ padding: '10px 14px', fontWeight: '700' }}>Specialization</th>
                    <th style={{ padding: '10px 14px', fontWeight: '700' }}>Project Allocation</th>
                    <th style={{ padding: '10px 14px', fontWeight: '700' }}>Status</th>
                    <th style={{ padding: '10px 14px', fontWeight: '700', textAlign: 'right' }}>Decisions</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderApprovals.map((leader, i) => {
                    const st = leader.approval_status || 'PENDING';
                    const isApproved = st === 'APPROVED';
                    const isRejected = st === 'REJECTED';

                    return (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 14px', color: '#1e293b' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                backgroundColor: isApproved ? '#0b3d2b' : isRejected ? '#ef4444' : '#f59e0b',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.8rem',
                                fontWeight: '700',
                                flexShrink: 0,
                              }}
                            >
                              {leader.leader_name?.charAt(0) || 'L'}
                            </div>
                            <div>
                              <div style={{ fontWeight: '700' }}>{leader.leader_name}</div>
                              <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                                {leader.email && leader.email !== '--' ? leader.email : leader.leader_id || 'ID Pending'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: '600', color: '#334155' }}>{leader.department}</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{leader.experience_years || '3+ Yrs Exp'}</div>
                        </td>
                        <td style={{ padding: '12px 14px', color: '#475569', fontSize: '0.8rem' }}>
                          {leader.specialization || 'Technical Leadership'}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#334155', fontWeight: '500' }}>
                          {leader.project_name || leader.team_name || 'Unassigned Candidate'}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: '700',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              backgroundColor: isApproved ? '#dcfce7' : isRejected ? '#fee2e2' : '#fef3c7',
                              color: isApproved ? '#15803d' : isRejected ? '#b91c1c' : '#b45309',
                            }}
                          >
                            {st}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            {!isApproved && (
                              <button
                                type="button"
                                onClick={() => handleLeaderApproval(leader, 'APPROVED')}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  backgroundColor: '#16a34a',
                                  color: '#fff',
                                  border: 'none',
                                  fontSize: '0.75rem',
                                  fontWeight: '700',
                                  cursor: 'pointer',
                                }}
                              >
                                <Check size={13} />
                                <span>Approve</span>
                              </button>
                            )}
                            {!isRejected && (
                              <button
                                type="button"
                                onClick={() => handleLeaderApproval(leader, 'REJECTED')}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  backgroundColor: '#ef4444',
                                  color: '#fff',
                                  border: 'none',
                                  fontSize: '0.75rem',
                                  fontWeight: '700',
                                  cursor: 'pointer',
                                }}
                              >
                                <X size={13} />
                                <span>Reject</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* ========================================================= */}
      {/* TAB 3: CREATE & MANAGE TEAMS (REQ 9)                      */}
      {/* ========================================================= */}
      {currentTab === 'teams' && (
        <section style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0b3d2b', margin: '0 0 4px' }}>
                Teams & Department Allocation
              </h2>
              <p style={{ fontSize: '0.825rem', color: '#64748b', margin: 0 }}>
                Manage departmental workgroups, team leaders, and staff membership.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsCreateTeamModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 12px',
                backgroundColor: '#0b3d2b',
                color: '#fff',
                borderRadius: '8px',
                border: 'none',
                fontSize: '0.8rem',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              <Plus size={14} />
              <span>Create New Team</span>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
            {teams.map((t) => (
              <div
                key={t.id || t.name}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '16px',
                  backgroundColor: '#f8fafc',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#0b3d2b', margin: 0 }}>
                    {t.name || t.teamName}
                  </h3>
                  <span style={{ fontSize: '0.7rem', fontWeight: '700', padding: '2px 7px', borderRadius: '6px', backgroundColor: '#e0e7ff', color: '#3730a3' }}>
                    {t.department || 'Operations'}
                  </span>
                </div>
                <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0 0 10px' }}>
                  {t.description || 'General workforce team.'}
                </p>
                <div style={{ fontSize: '0.8rem', color: '#334155', marginBottom: '4px' }}>
                  <strong>Leader:</strong> {t.leader || 'Unassigned'}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  <strong>Members:</strong> {t.memberCount || t.members?.length || 0} employees
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ========================================================= */}
      {/* TAB 4: MONITOR PROJECT PROGRESS (REQ 10)                  */}
      {/* ========================================================= */}
      {currentTab === 'progress' && (
        <section style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '20px' }}>
          <div style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0b3d2b', margin: '0 0 4px' }}>
              Live Project Progress Tracker
            </h2>
            <p style={{ fontSize: '0.825rem', color: '#64748b', margin: 0 }}>
              Adjust and monitor milestone completion percentages, health indicators, and delivery velocity.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {projects.map((proj) => (
              <div
                key={proj.id}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '14px 18px',
                  backgroundColor: '#f8fafc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ minWidth: '220px' }}>
                  <div style={{ fontSize: '0.925rem', fontWeight: '700', color: '#0b3d2b' }}>
                    {proj.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Leader: <strong>{proj.team_leader}</strong> &bull; Due: {proj.deadline}
                  </div>
                </div>

                <div style={{ flex: 1, minWidth: '220px', maxWidth: '400px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>
                    <span>{proj.status}</span>
                    <span>{proj.progress}%</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${proj.progress}%`,
                        height: '100%',
                        backgroundColor: proj.progress >= 100 ? '#10b981' : '#0f766e',
                        borderRadius: '999px',
                      }}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenProgress(proj)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    backgroundColor: '#0b3d2b',
                    color: '#fff',
                    border: 'none',
                    fontSize: '0.78rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  Update %
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ========================================================= */}
      {/* TAB 5: VIEW PROJECT REPORTS (REQ 11)                      */}
      {/* ========================================================= */}
      {currentTab === 'reports' && (
        <section style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0b3d2b', margin: '0 0 4px' }}>
                Comprehensive Project Operations Report
              </h2>
              <p style={{ fontSize: '0.825rem', color: '#64748b', margin: 0 }}>
                Executive summary of project velocity, department distributions, and leadership readiness.
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
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
              }}
            >
              <FileText size={14} />
              <span>Print Report</span>
            </button>
          </div>

          {/* Metrics Overview Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '22px' }}>
            <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Delivery Rate</div>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#16a34a', marginTop: '2px' }}>
                {totalProjectsCount > 0 ? `${Math.round((completedProjectsCount / totalProjectsCount) * 100)}%` : '0%'}
              </div>
            </div>
            <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Active Workforce</div>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0f766e', marginTop: '2px' }}>
                {reportsSummary?.total_assigned_workforce || employees.length}
              </div>
            </div>
            <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Vetted Leaders</div>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#6366f1', marginTop: '2px' }}>
                {leaderApprovals.filter((l) => l.approval_status === 'APPROVED').length}
              </div>
            </div>
            <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>In Progress Velocity</div>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0b3d2b', marginTop: '2px' }}>
                {avgProgress}%
              </div>
            </div>
          </div>

          {/* Department Breakdown */}
          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#0b3d2b', marginBottom: '10px' }}>
              Departmental Distribution
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
              {Object.entries(reportsSummary?.department_distribution || { Engineering: 2, Operations: 1 }).map(([dept, cnt]) => (
                <div key={dept} style={{ padding: '10px 14px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#1e293b' }}>{dept}</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#0f766e' }}>{cnt} projects</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: ADD PROJECT (REQ 4)                               */}
      {/* ========================================================= */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Project"
        subtitle="Configure sprint deliverables, assign leader & team"
        maxWidth="540px"
      >
        <form onSubmit={handleCreateProject}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
              Project Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. AI Workforce Facial Verification"
              value={projectForm.name}
              onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
            />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
              Description / Deliverables
            </label>
            <textarea
              rows={3}
              placeholder="Summarize project scope, deliverables, and goals..."
              value={projectForm.description}
              onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                Project Proposal PDF
              </label>
              {!projectForm.proposal_pdf ? (
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px dashed #cbd5e1',
                    backgroundColor: '#f8fafc',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    color: '#0f766e',
                    fontWeight: '600',
                    height: '42px',
                    boxSizing: 'border-box',
                    transition: 'all 0.15s ease',
                  }}
                  title="Upload project proposal in PDF format"
                >
                  <FileText size={16} color="#e11d48" />
                  <span>Upload Proposal PDF</span>
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    style={{ display: 'none' }}
                    onChange={handleProposalPdfUpload}
                  />
                </label>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: '1px solid #fecdd3',
                    backgroundColor: '#fff1f2',
                    height: '42px',
                    boxSizing: 'border-box',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                    <FileText size={16} color="#e11d48" />
                    <span
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: '700',
                        color: '#be123c',
                        maxWidth: '140px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={projectForm.proposal_pdf_name}
                    >
                      {projectForm.proposal_pdf_name || 'Proposal.pdf'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setProjectForm({ ...projectForm, proposal_pdf: '', proposal_pdf_name: '' })}
                    style={{
                      border: 'none',
                      background: 'none',
                      color: '#be123c',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: '800',
                      padding: '2px 4px',
                    }}
                    title="Remove PDF"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                Deadline Date *
              </label>
              <input
                type="date"
                required
                value={projectForm.deadline}
                onChange={(e) => setProjectForm({ ...projectForm, deadline: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                Assigned Team Leader *
              </label>
              <select
                required
                value={projectForm.team_leader}
                onChange={(e) => setProjectForm({ ...projectForm, team_leader: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
              >
                <option value="">-- Select Approved Team Leader --</option>
                {approvedLeaders.map((tl) => (
                  <option key={tl.id} value={tl.name}>
                    {tl.name} ({tl.department || 'Engineering'}) &bull; ID: {tl.id}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                Priority
              </label>
              <select
                value={projectForm.priority}
                onChange={(e) => setProjectForm({ ...projectForm, priority: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          {/* Employee Selection Section: Displays only registered and approved employees */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#334155' }}>
                Assign Approved Employees (Multi-Select)
              </label>
              <span style={{ fontSize: '0.74rem', color: '#0f766e', fontWeight: '700' }}>
                {projectForm.assigned_employees?.length || 0} selected
              </span>
            </div>
            <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px', backgroundColor: '#f8fafc' }}>
              {approvedEmployees.length === 0 ? (
                <div style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
                  No approved employees found.
                </div>
              ) : (
                approvedEmployees.map((emp) => {
                  const empName = emp.name || emp.fullName || emp.full_name;
                  const isChecked = projectForm.assigned_employees?.includes(empName);
                  return (
                    <div
                      key={emp.id}
                      onClick={() => {
                        const current = projectForm.assigned_employees || [];
                        const updated = current.includes(empName)
                          ? current.filter((x) => x !== empName)
                          : [...current, empName];
                        setProjectForm({ ...projectForm, assigned_employees: updated });
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        backgroundColor: isChecked ? '#f0fdf4' : 'transparent',
                        cursor: 'pointer',
                        marginBottom: '3px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '4px',
                            border: isChecked ? 'none' : '1px solid #cbd5e1',
                            backgroundColor: isChecked ? '#0b3d2b' : '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                          }}
                        >
                          {isChecked && <Check size={12} />}
                        </div>
                        <div>
                          <span style={{ fontSize: '0.825rem', fontWeight: 600, color: '#1e293b' }}>
                            {empName}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#64748b', marginLeft: '6px' }}>
                            ({emp.designation || 'Staff'} &bull; {emp.department})
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '0.85rem', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', backgroundColor: '#0b3d2b', color: '#fff', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer' }}
            >
              Create Project
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL 2: EDIT PROJECT (REQ 6)                              */}
      {/* ========================================================= */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Project: ${selectedProject?.name || ''}`}
        subtitle="Update project scope, health status, and velocity"
        maxWidth="540px"
      >
        <form onSubmit={handleUpdateProject}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
              Project Name
            </label>
            <input
              type="text"
              required
              value={projectForm.name}
              onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
            />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
              Description
            </label>
            <textarea
              rows={2}
              value={projectForm.description}
              onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                Status
              </label>
              <select
                value={projectForm.status}
                onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
              >
                <option value="Planning">Planning</option>
                <option value="In Progress">In Progress</option>
                <option value="On Track">On Track</option>
                <option value="At Risk">At Risk</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                Progress ({projectForm.progress}%)
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={projectForm.progress}
                onChange={(e) => setProjectForm({ ...projectForm, progress: e.target.value })}
                style={{ width: '100%', marginTop: '8px' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
              Project Proposal PDF
            </label>
            {!projectForm.proposal_pdf ? (
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px dashed #cbd5e1',
                  backgroundColor: '#f8fafc',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  color: '#0f766e',
                  fontWeight: '600',
                  height: '42px',
                  boxSizing: 'border-box',
                }}
              >
                <FileText size={16} color="#e11d48" />
                <span>Upload Proposal PDF</span>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  style={{ display: 'none' }}
                  onChange={handleProposalPdfUpload}
                />
              </label>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: '1px solid #fecdd3',
                  backgroundColor: '#fff1f2',
                  height: '42px',
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                  <FileText size={16} color="#e11d48" />
                  <span
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: '700',
                      color: '#be123c',
                      maxWidth: '180px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={projectForm.proposal_pdf_name}
                  >
                    {projectForm.proposal_pdf_name || 'Proposal.pdf'}
                  </span>
                  <button
                    type="button"
                    onClick={() => openPdfViewer(projectForm.proposal_pdf, projectForm.proposal_pdf_name)}
                    style={{
                      fontSize: '0.7rem',
                      color: '#0284c7',
                      backgroundColor: '#e0f2fe',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: '700',
                    }}
                  >
                    View
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setProjectForm({ ...projectForm, proposal_pdf: '', proposal_pdf_name: '' })}
                  style={{
                    border: 'none',
                    background: 'none',
                    color: '#be123c',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                  }}
                  title="Remove PDF"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '0.85rem', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', backgroundColor: '#0b3d2b', color: '#fff', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer' }}
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL 3: ASSIGN TEAM LEADER (REQ 7)                       */}
      {/* ========================================================= */}
      <Modal
        isOpen={isAssignLeaderModalOpen}
        onClose={() => setIsAssignLeaderModalOpen(false)}
        title="Assign Team Leader"
        subtitle={`Project: ${selectedProject?.name || ''}`}
        maxWidth="460px"
      >
        <form onSubmit={handleSaveAssignLeader}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
              Select Approved Team Leader *
            </label>
            <select
              required
              value={selectedLeaderName}
              onChange={(e) => setSelectedLeaderName(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
            >
              <option value="">-- Choose Approved Team Leader --</option>
              {approvedLeaders.map((tl) => (
                <option key={tl.id} value={tl.name}>
                  {tl.name} ({tl.department || 'Engineering'}) &bull; ID: {tl.id}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setIsAssignLeaderModalOpen(false)}
              style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '0.85rem', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', backgroundColor: '#0b3d2b', color: '#fff', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer' }}
            >
              Assign Leader
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL 4: ASSIGN EMPLOYEES (REQ 8)                         */}
      {/* ========================================================= */}
      <Modal
        isOpen={isAssignEmployeeModalOpen}
        onClose={() => setIsAssignEmployeeModalOpen(false)}
        title="Assign Staff Members"
        subtitle={`Project: ${selectedProject?.name || ''}`}
        maxWidth="520px"
      >
        <div style={{ maxHeight: '340px', overflowY: 'auto', marginBottom: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px' }}>
          {approvedEmployees.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
              No registered and approved employees found.
            </div>
          ) : (
            approvedEmployees.map((emp) => {
              const empName = emp.name || emp.fullName || emp.full_name || 'Staff Member';
              const isChecked = selectedEmployeesList.includes(empName);

              return (
                <div
                  key={emp.id || emp.employee_id}
                  onClick={() => toggleEmployeeSelection(empName)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    backgroundColor: isChecked ? '#f0fdf4' : 'transparent',
                    cursor: 'pointer',
                    marginBottom: '4px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '4px',
                        border: isChecked ? 'none' : '1px solid #cbd5e1',
                        backgroundColor: isChecked ? '#0b3d2b' : '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                      }}
                    >
                      {isChecked && <Check size={14} />}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#1e293b' }}>
                        {empName}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        {emp.designation || 'Staff'} &bull; {emp.department || 'Operations'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600' }}>
            {selectedEmployeesList.length} staff selected
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setIsAssignEmployeeModalOpen(false)}
              style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '0.85rem', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAssignEmployees}
              style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', backgroundColor: '#0b3d2b', color: '#fff', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer' }}
            >
              Save Assignments
            </button>
          </div>
        </div>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL 5: CREATE TEAM (REQ 9)                              */}
      {/* ========================================================= */}
      <Modal
        isOpen={isCreateTeamModalOpen}
        onClose={() => setIsCreateTeamModalOpen(false)}
        title="Create New Team"
        subtitle="Group departmental employees under designated leadership"
        maxWidth="480px"
      >
        <form onSubmit={handleCreateTeam}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
              Team Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. AI & Innovation Squad"
              value={teamForm.teamName}
              onChange={(e) => setTeamForm({ ...teamForm, teamName: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
            />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
              Department
            </label>
            <select
              value={teamForm.department}
              onChange={(e) => setTeamForm({ ...teamForm, department: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
            >
              <option value="Engineering">Engineering</option>
              <option value="Operations">Operations</option>
              <option value="Design">Design</option>
              <option value="Marketing">Marketing</option>
            </select>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
              Team Leader
            </label>
            <input
              type="text"
              placeholder="e.g. Arshith"
              value={teamForm.leader}
              onChange={(e) => setTeamForm({ ...teamForm, leader: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setIsCreateTeamModalOpen(false)}
              style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '0.85rem', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', backgroundColor: '#0b3d2b', color: '#fff', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer' }}
            >
              Create Team
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL 6: UPDATE PROGRESS (REQ 10)                         */}
      {/* ========================================================= */}
      <Modal
        isOpen={isProgressModalOpen}
        onClose={() => setIsProgressModalOpen(false)}
        title="Update Project Progress"
        subtitle={`Project: ${selectedProject?.name || ''}`}
        maxWidth="440px"
      >
        <form onSubmit={handleSaveProgress}>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: '700', marginBottom: '6px' }}>
              <span>Completion Rate</span>
              <span style={{ color: '#0b3d2b' }}>{progressInput}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={progressInput}
              onChange={(e) => setProgressInput(parseInt(e.target.value, 10))}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
              Status Indicator
            </label>
            <select
              value={statusInput}
              onChange={(e) => setStatusInput(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
            >
              <option value="Planning">Planning</option>
              <option value="In Progress">In Progress</option>
              <option value="On Track">On Track</option>
              <option value="At Risk">At Risk</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setIsProgressModalOpen(false)}
              style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '0.85rem', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', backgroundColor: '#0b3d2b', color: '#fff', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer' }}
            >
              Save Progress
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

