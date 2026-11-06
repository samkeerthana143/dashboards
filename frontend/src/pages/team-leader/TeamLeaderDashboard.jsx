import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FolderKanban,
  Users,
  PlusCircle,
  UserCheck,
  Calendar,
  Activity,
  FileText,
  CheckCircle2,
  XCircle,
  RotateCcw,
  BarChart3,
  Search,
  Filter,
  Clock,
  AlertCircle,
  Check,
  RefreshCw,
  Send,
  ArrowRight,
  TrendingUp,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Plus,
  Eye,
} from 'lucide-react';
import Modal from '../../components/common/Modal';
import { teamLeaderService } from '../../services/teamLeaderService';

export default function TeamLeaderDashboard({ activeTab = 'projects', onTabChange }) {
  // Master state
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successToast, setSuccessToast] = useState('');

  // Data states
  const [projects, setProjects] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [workUpdates, setWorkUpdates] = useState([]);
  const [performance, setPerformance] = useState(null);

  // Filters & search
  const [searchQuery, setSearchQuery] = useState('');
  const [taskStatusFilter, setTaskStatusFilter] = useState('ALL');
  const [selectedProjectId, setSelectedProjectId] = useState('ALL');
  const [expandedProjectIds, setExpandedProjectIds] = useState(new Set());

  // Modals state
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [isDeadlineModalOpen, setIsDeadlineModalOpen] = useState(false);
  const [isReworkModalOpen, setIsReworkModalOpen] = useState(false);
  const [isWorkUpdateModalOpen, setIsWorkUpdateModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  // Form states
  const [taskForm, setTaskForm] = useState({
    project_id: '',
    title: '',
    description: '',
    assigned_to: '',
    deadline: '',
    priority: 'High',
    estimated_hours: 8.0,
  });

  const [deadlineForm, setDeadlineForm] = useState({
    deadline: '',
    priority: 'High',
    notes: '',
  });

  const [reworkForm, setReworkForm] = useState({
    rework_notes: '',
    revised_deadline: '',
  });

  const [updateForm, setUpdateForm] = useState({
    project_id: '',
    task_id: '',
    employee_name: '',
    hours_worked: 8,
    summary: '',
    blockers: 'None',
  });

  // Current logged in user info
  const storedUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('arshith_user')) || null;
    } catch {
      return null;
    }
  }, []);
  const leaderName = storedUser?.name || storedUser?.fullName || 'Arshith';
  const leaderEmail = storedUser?.email || 'teamlead@arshith.com';

  const showToast = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 4000);
  };

  // Load all dashboard data
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [projData, teamData, taskData, updateData, perfData] = await Promise.all([
        teamLeaderService.getAssignedProjects(),
        teamLeaderService.getAssignedTeam(),
        teamLeaderService.getTasks(),
        teamLeaderService.getDailyWorkUpdates(),
        teamLeaderService.getTeamPerformance(),
      ]);

      setProjects(projData || []);
      setTeamMembers(teamData || []);
      setTasks(taskData || []);
      setWorkUpdates(updateData || []);
      setPerformance(perfData || null);

      if (projData && projData.length > 0 && !taskForm.project_id) {
        setTaskForm((prev) => ({ ...prev, project_id: projData[0].id }));
        setUpdateForm((prev) => ({ ...prev, project_id: projData[0].id }));
      }
      if (teamData && teamData.length > 0 && !taskForm.assigned_to) {
        setTaskForm((prev) => ({ ...prev, assigned_to: teamData[0].name }));
        setUpdateForm((prev) => ({ ...prev, employee_name: teamData[0].name }));
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || err.message || 'Failed to fetch team leader data.');
    } finally {
      setLoading(false);
    }
  }, [taskForm.project_id, taskForm.assigned_to]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Derived filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchSearch =
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.assigned_to.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.project_name.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus = taskStatusFilter === 'ALL' || t.status.toUpperCase() === taskStatusFilter.toUpperCase();
      const matchProj = selectedProjectId === 'ALL' || t.project_id === selectedProjectId;

      return matchSearch && matchStatus && matchProj;
    });
  }, [tasks, searchQuery, taskStatusFilter, selectedProjectId]);

  // Submitted tasks awaiting review
  const submittedTasks = useMemo(() => {
    return tasks.filter((t) => t.status === 'SUBMITTED' || t.status === 'In Review');
  }, [tasks]);

  // Active rework items
  const reworkTasks = useMemo(() => {
    return tasks.filter((t) => t.status === 'REWORK');
  }, [tasks]);

  // Project & employee filtering for task creation (strictly scoped to project's assigned employees)
  const selectedProjectForTask = useMemo(() => {
    return projects.find((p) => p.id === taskForm.project_id) || projects[0] || null;
  }, [projects, taskForm.project_id]);

  const availableEmployeesForTask = useMemo(() => {
    if (!selectedProjectForTask) return [];
    const rawAssigned = selectedProjectForTask.assigned_employees || [];
    if (rawAssigned.length === 0) return [];

    return rawAssigned.map((empName) => {
      const cleanName = String(empName).trim();
      const matched = teamMembers.find(
        (m) => String(m.name).toLowerCase().trim() === cleanName.toLowerCase()
      );
      return {
        id: matched?.id || cleanName,
        name: cleanName,
        email: matched?.email || '',
        department: matched?.department || selectedProjectForTask.department || 'Operations',
        designation: matched?.designation || 'Project Member',
      };
    });
  }, [selectedProjectForTask, teamMembers]);

  const toggleProjectEmployees = (projId) => {
    setExpandedProjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(projId)) {
        next.delete(projId);
      } else {
        next.add(projId);
      }
      return next;
    });
  };

  const openCreateTaskForProject = (proj, employeeName = '') => {
    const rawAssigned = proj.assigned_employees || [];
    const targetEmp = employeeName || (rawAssigned.length > 0 ? rawAssigned[0] : '');
    setTaskForm({
      project_id: proj.id,
      title: '',
      description: '',
      assigned_to: targetEmp,
      deadline: proj.deadline || '',
      priority: 'High',
      estimated_hours: 8.0,
    });
    setIsCreateTaskModalOpen(true);
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

  const handleProjectSelectInTaskForm = (projId) => {
    const proj = projects.find((p) => p.id === projId);
    const assigned = proj?.assigned_employees || [];
    setTaskForm((prev) => ({
      ...prev,
      project_id: projId,
      assigned_to: assigned.length > 0 ? assigned[0] : '',
    }));
  };

  // -------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------

  // Req 8 & 9: Create & Assign Task
  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      const newTask = await teamLeaderService.createTask(taskForm);
      setTasks((prev) => [newTask, ...prev]);
      setIsCreateTaskModalOpen(false);
      showToast(`Task "${newTask.title}" created & assigned to ${newTask.assigned_to}!`);
      setTaskForm({
        project_id: projects[0]?.id || '',
        title: '',
        description: '',
        assigned_to: teamMembers[0]?.name || '',
        deadline: '',
        priority: 'High',
        estimated_hours: 8.0,
      });
      loadDashboardData();
    } catch (err) {
      alert(err.response?.data?.detail || err.message || 'Failed to create task.');
    }
  };

  // Req 10: Set Task Deadline
  const handleOpenDeadlineModal = (task) => {
    setSelectedTask(task);
    setDeadlineForm({
      deadline: task.deadline || '',
      priority: task.priority || 'High',
      notes: '',
    });
    setIsDeadlineModalOpen(true);
  };

  const handleUpdateDeadline = async (e) => {
    e.preventDefault();
    if (!selectedTask) return;
    try {
      const updated = await teamLeaderService.updateTaskDeadline(selectedTask.id, deadlineForm);
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setIsDeadlineModalOpen(false);
      showToast(`Deadline for "${updated.title}" updated to ${updated.deadline}.`);
    } catch (err) {
      alert(err.response?.data?.detail || err.message || 'Failed to update deadline.');
    }
  };

  // Req 14: Approve Task
  const handleApproveTask = async (task) => {
    if (!window.confirm(`Approve task "${task.title}" submitted by ${task.assigned_to}?`)) return;
    try {
      const updated = await teamLeaderService.reviewTask(task.id, {
        action: 'approve',
        feedback: 'Deliverable inspected and approved by Team Leader.',
      });
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      showToast(`Task "${task.title}" approved successfully!`);
      loadDashboardData();
    } catch (err) {
      alert(err.response?.data?.detail || err.message || 'Failed to approve task.');
    }
  };

  // Req 14: Reject Task
  const handleRejectTask = async (task) => {
    const reason = window.prompt(`Enter rejection reason for "${task.title}":`, 'Deliverables did not pass validation criteria.');
    if (!reason) return;
    try {
      const updated = await teamLeaderService.reviewTask(task.id, {
        action: 'reject',
        feedback: reason,
      });
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      showToast(`Task "${task.title}" marked as rejected.`);
      loadDashboardData();
    } catch (err) {
      alert(err.response?.data?.detail || err.message || 'Failed to reject task.');
    }
  };

  // Req 15: Assign Rework
  const handleOpenReworkModal = (task) => {
    setSelectedTask(task);
    setReworkForm({
      rework_notes: '',
      revised_deadline: task.deadline || '',
    });
    setIsReworkModalOpen(true);
  };

  const handleAssignRework = async (e) => {
    e.preventDefault();
    if (!selectedTask) return;
    try {
      const updated = await teamLeaderService.reviewTask(selectedTask.id, {
        action: 'rework',
        rework_notes: reworkForm.rework_notes,
        revised_deadline: reworkForm.revised_deadline,
      });
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setIsReworkModalOpen(false);
      showToast(`Rework assigned for "${selectedTask.title}". Feedback sent to ${selectedTask.assigned_to}.`);
      loadDashboardData();
    } catch (err) {
      alert(err.response?.data?.detail || err.message || 'Failed to assign rework.');
    }
  };

  // Req 12: Submit Daily Work Update
  const handleSubmitWorkUpdate = async (e) => {
    e.preventDefault();
    try {
      const newUpdate = await teamLeaderService.createDailyWorkUpdate(updateForm);
      setWorkUpdates((prev) => [newUpdate, ...prev]);
      setIsWorkUpdateModalOpen(false);
      showToast(`Daily work update recorded for ${newUpdate.employee_name}!`);
      setUpdateForm({
        project_id: projects[0]?.id || '',
        task_id: '',
        employee_name: teamMembers[0]?.name || '',
        hours_worked: 8,
        summary: '',
        blockers: 'None',
      });
    } catch (err) {
      alert(err.response?.data?.detail || err.message || 'Failed to log daily update.');
    }
  };

  return (
    <div className="admin-dashboard-view admin-main-page animate-fade-in" style={{ paddingBottom: '60px' }}>
      {/* Toast Notification */}
      {successToast && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            zIndex: 3000,
            backgroundColor: '#0b3d2b',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: '10px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.875rem',
            fontWeight: '600',
            animation: 'modalBackdropIn 0.2s ease-out forwards',
          }}
        >
          <CheckCircle2 size={18} color="#4ade80" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Hero Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0b3d2b 0%, #0f766e 100%)',
          borderRadius: '18px',
          padding: '24px 28px',
          color: '#ffffff',
          marginBottom: '24px',
          boxShadow: '0 10px 30px rgba(11, 61, 43, 0.15)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                padding: '3px 10px',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: '700',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              Sprint Leadership Portal
            </span>
            <span style={{ fontSize: '0.8rem', opacity: 0.9 }}>
              Logged in as <strong>{leaderName}</strong> ({leaderEmail})
            </span>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0, letterSpacing: '-0.02em' }}>
            Team Leader Operations Dashboard
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.88rem', opacity: 0.85 }}>
            Delegate sprint tasks, enforce quality control, review submissions & monitor team performance.
          </p>
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setIsCreateTaskModalOpen(true)}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: '#ffffff',
              color: '#0b3d2b',
              fontWeight: '800',
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}
          >
            <PlusCircle size={16} />
            Create Task
          </button>
          <button
            type="button"
            onClick={() => setIsWorkUpdateModalOpen(true)}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.4)',
              backgroundColor: 'rgba(255,255,255,0.15)',
              color: '#ffffff',
              fontWeight: '700',
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <FileText size={16} />
            Log Work Update
          </button>
        </div>
      </div>

      {/* Top 6 KPI Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '14px',
          marginBottom: '24px',
        }}
      >
        {/* KPI 1: Assigned Projects (Req 6) */}
        <div className="admin-stat-card" style={{ padding: '16px 18px', borderLeft: '4px solid #0b3d2b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
              6. Assigned Projects
            </span>
            <FolderKanban size={18} color="#0b3d2b" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0b3d2b' }}>
            {projects.length}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
            Active lead projects
          </div>
        </div>

        {/* KPI 2: Assigned Team (Req 7) */}
        <div className="admin-stat-card" style={{ padding: '16px 18px', borderLeft: '4px solid #0f766e' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
              7. Assigned Team
            </span>
            <Users size={18} color="#0f766e" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0f766e' }}>
            {teamMembers.length}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
            Team members in roster
          </div>
        </div>

        {/* KPI 3: Total Tasks (Req 8, 9) */}
        <div className="admin-stat-card" style={{ padding: '16px 18px', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
              8 & 9. Total Tasks
            </span>
            <Activity size={18} color="#3b82f6" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#1e40af' }}>
            {tasks.length}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
            Delegated deliverables
          </div>
        </div>

        {/* KPI 4: Submitted for Review (Req 13) */}
        <div className="admin-stat-card" style={{ padding: '16px 18px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
              13. Review Queue
            </span>
            <CheckCircle2 size={18} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#b45309' }}>
            {submittedTasks.length}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
            Awaiting TL decision
          </div>
        </div>

        {/* KPI 5: Active Rework (Req 15) */}
        <div className="admin-stat-card" style={{ padding: '16px 18px', borderLeft: '4px solid #ef4444' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
              15. Active Rework
            </span>
            <RotateCcw size={18} color="#ef4444" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#b91c1c' }}>
            {reworkTasks.length}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
            Tasks under revision
          </div>
        </div>

        {/* KPI 6: Team Velocity (Req 16) */}
        <div className="admin-stat-card" style={{ padding: '16px 18px', borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
              16. Completion Rate
            </span>
            <TrendingUp size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#047857' }}>
            {performance?.completion_rate_percentage || 0}%
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
            Team delivery velocity
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '2px solid #e2e8f0',
          marginBottom: '20px',
          overflowX: 'auto',
          paddingBottom: '2px',
        }}
      >
        {[
          { key: 'projects', label: '6. Assigned Projects', icon: FolderKanban },
          { key: 'team', label: '7. Assigned Team', icon: Users },
          { key: 'tasks', label: '8-11. Task Management', icon: Activity },
          { key: 'submitted-tasks', label: `13-15. Review Queue (${submittedTasks.length})`, icon: CheckCircle2 },
          { key: 'work-updates', label: '12. Daily Work Updates', icon: FileText },
          { key: 'performance', label: '16. Team Performance', icon: BarChart3 },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange && onTabChange(tab.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                fontSize: '0.85rem',
                fontWeight: isActive ? '800' : '600',
                color: isActive ? '#0b3d2b' : '#64748b',
                backgroundColor: isActive ? '#ecfdf5' : 'transparent',
                border: 'none',
                borderBottom: isActive ? '3px solid #0b3d2b' : '3px solid transparent',
                borderRadius: '8px 8px 0 0',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* TAB 1: ASSIGNED PROJECTS (REQ 6)                          */}
      {/* ========================================================= */}
      {(activeTab === 'projects' || activeTab === 'dashboard') && (
        <section className="animate-fade-in" style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0b3d2b', margin: 0 }}>
                Assigned Projects Roster
              </h2>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Projects delegated to you as Team Leader by Project HR
              </div>
            </div>
            <button
              type="button"
              onClick={loadDashboardData}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#fff',
                fontSize: '0.8rem',
                color: '#475569',
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={13} />
              Refresh
            </button>
          </div>

          {projects.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
              <FolderKanban size={36} color="#94a3b8" style={{ margin: '0 auto 10px auto' }} />
              <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#475569' }}>No Projects Currently Assigned</div>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
                Project HR will assign new deliverables and teams to your profile.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
              {projects.map((proj) => {
                const progress = parseInt(proj.progress || 0, 10);
                return (
                  <div
                    key={proj.id}
                    className="admin-stat-card"
                    style={{
                      padding: '20px',
                      borderRadius: '16px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            backgroundColor: '#f1f5f9',
                            color: '#475569',
                            fontSize: '0.72rem',
                            fontWeight: '700',
                          }}
                        >
                          {proj.id} &bull; {proj.department || 'Operations'}
                        </span>
                        <span
                          style={{
                            padding: '3px 10px',
                            borderRadius: '999px',
                            fontSize: '0.72rem',
                            fontWeight: '800',
                            backgroundColor:
                              proj.status === 'Completed'
                                ? '#ecfdf5'
                                : proj.status === 'At Risk'
                                ? '#fef2f2'
                                : '#f0fdf4',
                            color:
                              proj.status === 'Completed'
                                ? '#059669'
                                : proj.status === 'At Risk'
                                ? '#dc2626'
                                : '#0b3d2b',
                          }}
                        >
                          {proj.status || 'In Progress'}
                        </span>
                      </div>

                      <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0b3d2b', margin: '0 0 6px 0' }}>
                        {proj.name}
                      </h3>

                      <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0 0 14px 0', lineHeight: '1.4' }}>
                        {proj.description || 'Sprint deliverables and team execution pipeline.'}
                      </p>

                      {/* Progress Bar */}
                      <div style={{ marginBottom: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                          <span>Sprint Progress</span>
                          <span>{progress}%</span>
                        </div>
                        <div style={{ width: '100%', height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${progress}%`,
                              height: '100%',
                              backgroundColor: progress >= 100 ? '#10b981' : '#0b3d2b',
                              transition: 'width 0.3s ease',
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Proposal PDF View Button */}
                    {proj.proposal_pdf && (
                      <div style={{ marginBottom: '12px' }}>
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

                    {/* Footer Info */}
                    <div
                      style={{
                        paddingTop: '12px',
                        borderTop: '1px solid #f1f5f9',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.78rem',
                        color: '#64748b',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={13} />
                        <span>Deadline: <strong>{proj.deadline}</strong></span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Users size={13} />
                        <span>{proj.assigned_employees?.length || 0} Staff</span>
                      </div>
                    </div>

                    {/* Action Bar on Each Project Card: View Assigned Employees & + Add Task */}
                    <div
                      style={{
                        paddingTop: '12px',
                        marginTop: '12px',
                        borderTop: '1px solid #f1f5f9',
                        display: 'flex',
                        gap: '8px',
                        alignItems: 'center',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => toggleProjectEmployees(proj.id)}
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: expandedProjectIds.has(proj.id) ? '#f1f5f9' : '#ffffff',
                          color: '#334155',
                          fontSize: '0.78rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <Users size={14} color="#0f766e" />
                        <span>{expandedProjectIds.has(proj.id) ? 'Hide Team' : 'View Assigned Employees'}</span>
                        {expandedProjectIds.has(proj.id) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>

                      <button
                        type="button"
                        onClick={() => openCreateTaskForProject(proj)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          padding: '8px 14px',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: '#0b3d2b',
                          color: '#ffffff',
                          fontSize: '0.78rem',
                          fontWeight: '800',
                          cursor: 'pointer',
                          boxShadow: '0 2px 6px rgba(11,61,43,0.2)',
                          transition: 'all 0.15s ease',
                        }}
                        title={`Create task directly for project "${proj.name}"`}
                      >
                        <Plus size={14} />
                        <span>+ Add Task</span>
                      </button>
                    </div>

                    {/* Expandable Assigned Employees Tray */}
                    {expandedProjectIds.has(proj.id) && (
                      <div
                        className="animate-fade-in"
                        style={{
                          marginTop: '12px',
                          padding: '12px',
                          borderRadius: '10px',
                          backgroundColor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: '800',
                            color: '#0b3d2b',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            marginBottom: '8px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <span>Assigned Staff ({proj.assigned_employees?.length || 0})</span>
                          <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '500', textTransform: 'none' }}>
                            Click Assign Task to delegate work
                          </span>
                        </div>

                        {(!proj.assigned_employees || proj.assigned_employees.length === 0) ? (
                          <div style={{ padding: '10px', fontSize: '0.78rem', color: '#94a3b8', textAlign: 'center' }}>
                            No employees allocated to this project yet.
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {proj.assigned_employees.map((empName, eIdx) => {
                              const memberDetails = teamMembers.find(
                                (m) => String(m.name).toLowerCase().trim() === String(empName).toLowerCase().trim()
                              );
                              return (
                                <div
                                  key={eIdx}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '7px 10px',
                                    backgroundColor: '#ffffff',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div
                                      style={{
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '50%',
                                        backgroundColor: '#ecfdf5',
                                        color: '#047857',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.72rem',
                                        fontWeight: '800',
                                      }}
                                    >
                                      {empName.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#1e293b' }}>
                                        {empName}
                                      </div>
                                      <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                                        {memberDetails?.designation || 'Staff'} &bull; {memberDetails?.department || proj.department || 'Operations'}
                                      </div>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => openCreateTaskForProject(proj, empName)}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '4px 10px',
                                      borderRadius: '6px',
                                      border: '1px solid #0b3d2b',
                                      backgroundColor: '#0b3d2b',
                                      color: '#ffffff',
                                      fontSize: '0.72rem',
                                      fontWeight: '700',
                                      cursor: 'pointer',
                                    }}
                                    title={`Assign task specifically to ${empName}`}
                                  >
                                    <Plus size={11} />
                                    <span>Assign Task</span>
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ========================================================= */}
      {/* TAB 2: ASSIGNED TEAM (REQ 7)                              */}
      {/* ========================================================= */}
      {activeTab === 'team' && (
        <section className="animate-fade-in" style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0b3d2b', margin: 0 }}>
                Assigned Team Roster
              </h2>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Employees working on deliverables under your leadership
              </div>
            </div>
            <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#0f766e' }}>
              {teamMembers.length} Active Staff Members
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            {teamMembers.map((emp) => (
              <div
                key={emp.id}
                style={{
                  padding: '16px',
                  backgroundColor: '#fff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                }}
              >
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    backgroundColor: '#ecfdf5',
                    color: '#0b3d2b',
                    fontSize: '1.1rem',
                    fontWeight: '800',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid #a7f3d0',
                    flexShrink: 0,
                  }}
                >
                  {emp.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#1e293b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {emp.name}
                    </h4>
                    <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#f0fdf4', color: '#166534', fontWeight: '700' }}>
                      Active
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                    {emp.designation} &bull; {emp.department}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '4px', display: 'flex', gap: '12px' }}>
                    <span>Active Tasks: <strong>{emp.active_tasks || 0}</strong></span>
                    <span>Completed: <strong>{emp.completed_tasks || 0}</strong></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ========================================================= */}
      {/* TAB 3: TASK MANAGEMENT (REQ 8, 9, 10, 11)                 */}
      {/* ========================================================= */}
      {activeTab === 'tasks' && (
        <section className="animate-fade-in" style={{ marginBottom: '28px' }}>
          {/* Controls Bar */}
          <div
            style={{
              padding: '16px',
              backgroundColor: '#fff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              marginBottom: '16px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            {/* Search */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 240px', backgroundColor: '#f8fafc', padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <Search size={16} color="#64748b" />
              <input
                type="text"
                placeholder="Search tasks by title, employee, or project..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.85rem', width: '100%' }}
              />
            </div>

            {/* Status Filter */}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
              <Filter size={15} color="#64748b" />
              {['ALL', 'TODO', 'IN_PROGRESS', 'SUBMITTED', 'REWORK', 'APPROVED'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setTaskStatusFilter(st)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '6px',
                    fontSize: '0.74rem',
                    fontWeight: '700',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: taskStatusFilter === st ? '#0b3d2b' : '#f1f5f9',
                    color: taskStatusFilter === st ? '#fff' : '#475569',
                  }}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setIsCreateTaskModalOpen(true)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#0b3d2b',
                color: '#fff',
                fontWeight: '700',
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <PlusCircle size={15} />
              + Create Task
            </button>
          </div>

          {/* Tasks Table */}
          <div style={{ backgroundColor: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '12px 16px', fontWeight: '700', color: '#475569' }}>Task & Project</th>
                    <th style={{ padding: '12px 16px', fontWeight: '700', color: '#475569' }}>Assigned Employee</th>
                    <th style={{ padding: '12px 16px', fontWeight: '700', color: '#475569' }}>Deadline</th>
                    <th style={{ padding: '12px 16px', fontWeight: '700', color: '#475569' }}>Priority</th>
                    <th style={{ padding: '12px 16px', fontWeight: '700', color: '#475569' }}>Status</th>
                    <th style={{ padding: '12px 16px', fontWeight: '700', color: '#475569', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                        No tasks match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map((t) => (
                      <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: '700', color: '#1e293b' }}>{t.title}</div>
                          <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{t.project_name}</div>
                          {t.rework_notes && (
                            <div style={{ fontSize: '0.72rem', color: '#dc2626', marginTop: '2px', fontWeight: '600' }}>
                              Rework: {t.rework_notes}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: '600', color: '#334155' }}>{t.assigned_to}</div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Calendar size={13} color="#64748b" />
                            <span>{t.deadline}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.72rem',
                              fontWeight: '700',
                              backgroundColor: t.priority === 'High' ? '#fee2e2' : '#fef3c7',
                              color: t.priority === 'High' ? '#b91c1c' : '#b45309',
                            }}
                          >
                            {t.priority}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              padding: '3px 10px',
                              borderRadius: '999px',
                              fontSize: '0.74rem',
                              fontWeight: '800',
                              backgroundColor:
                                t.status === 'APPROVED'
                                  ? '#dcfce7'
                                  : t.status === 'SUBMITTED'
                                  ? '#fef3c7'
                                  : t.status === 'REWORK'
                                  ? '#fee2e2'
                                  : '#f1f5f9',
                              color:
                                t.status === 'APPROVED'
                                  ? '#15803d'
                                  : t.status === 'SUBMITTED'
                                  ? '#b45309'
                                  : t.status === 'REWORK'
                                  ? '#b91c1c'
                                  : '#475569',
                            }}
                          >
                            {t.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenDeadlineModal(t)}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                border: '1px solid #cbd5e1',
                                backgroundColor: '#fff',
                                fontSize: '0.74rem',
                                color: '#475569',
                                cursor: 'pointer',
                              }}
                              title="Update deadline & priority"
                            >
                              Edit Deadline
                            </button>
                            {t.status === 'SUBMITTED' && (
                              <button
                                type="button"
                                onClick={() => handleApproveTask(t)}
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: '4px',
                                  border: 'none',
                                  backgroundColor: '#10b981',
                                  color: '#fff',
                                  fontSize: '0.74rem',
                                  fontWeight: '700',
                                  cursor: 'pointer',
                                }}
                              >
                                Approve
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================= */}
      {/* TAB 4: REVIEW SUBMITTED TASKS & REWORK (REQ 13, 14, 15)   */}
      {/* ========================================================= */}
      {activeTab === 'submitted-tasks' && (
        <section className="animate-fade-in" style={{ marginBottom: '28px' }}>
          <div style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0b3d2b', margin: 0 }}>
              Submitted Tasks Verification Queue
            </h2>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Inspect deliverables submitted by team members, approve completion or assign rework notes
            </div>
          </div>

          {submittedTasks.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
              <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 10px auto' }} />
              <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#334155' }}>
                All Task Submissions Reviewed!
              </div>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
                There are currently no tasks waiting in the inspection queue.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
              {submittedTasks.map((task) => (
                <div
                  key={task.id}
                  style={{
                    backgroundColor: '#fff',
                    borderRadius: '14px',
                    border: '2px solid #fef08a',
                    padding: '20px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.74rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#fef9c3', color: '#854d0e', fontWeight: '800' }}>
                        READY FOR REVIEW
                      </span>
                      <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
                        Due: <strong>{task.deadline}</strong>
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#1e293b', margin: '0 0 6px 0' }}>
                      {task.title}
                    </h3>

                    <div style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '8px' }}>
                      Project: <strong>{task.project_name}</strong>
                    </div>

                    <div
                      style={{
                        padding: '10px 12px',
                        backgroundColor: '#f8fafc',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        fontSize: '0.8rem',
                        color: '#334155',
                        marginBottom: '16px',
                      }}
                    >
                      <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', marginBottom: '2px' }}>
                        SUBMITTED BY: {task.assigned_to}
                      </div>
                      <div>{task.description || 'Sprint deliverable ready for code & quality inspection.'}</div>
                    </div>
                  </div>

                  {/* Action Buttons: Req 14 Approve / Reject, Req 15 Assign Rework */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => handleApproveTask(task)}
                      style={{
                        padding: '9px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: '#10b981',
                        color: '#fff',
                        fontWeight: '700',
                        fontSize: '0.825rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <Check size={14} />
                      14. Approve Task
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRejectTask(task)}
                      style={{
                        padding: '9px',
                        borderRadius: '8px',
                        border: '1px solid #dc2626',
                        backgroundColor: '#fef2f2',
                        color: '#dc2626',
                        fontWeight: '700',
                        fontSize: '0.825rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <XCircle size={14} />
                      14. Reject Task
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenReworkModal(task)}
                      style={{
                        padding: '9px',
                        borderRadius: '8px',
                        border: '1px solid #ef4444',
                        backgroundColor: '#fff',
                        color: '#ef4444',
                        fontWeight: '700',
                        fontSize: '0.825rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <RotateCcw size={14} />
                      15. Assign Rework
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ========================================================= */}
      {/* TAB 5: DAILY WORK UPDATES (REQ 11, 12)                    */}
      {/* ========================================================= */}
      {activeTab === 'work-updates' && (
        <section className="animate-fade-in" style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0b3d2b', margin: 0 }}>
                Daily Work Updates & Activity Logs
              </h2>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Monitor daily hours logged and progress milestones submitted by your workforce
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsWorkUpdateModalOpen(true)}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#0b3d2b',
                color: '#fff',
                fontSize: '0.825rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <PlusCircle size={14} />
              + Log Daily Update
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {workUpdates.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', backgroundColor: '#fff', borderRadius: '12px', color: '#94a3b8', fontSize: '0.85rem' }}>
                No daily work updates logged yet.
              </div>
            ) : (
              workUpdates.map((update) => (
                <div
                  key={update.id}
                  style={{
                    backgroundColor: '#fff',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    padding: '16px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#1e293b' }}>
                        {update.employee_name}
                      </span>
                      <span style={{ fontSize: '0.74rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#f1f5f9', color: '#475569', fontWeight: '600' }}>
                        {update.project_name}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      {update.date} &bull; <strong>{update.hours_worked || 8} hrs logged</strong>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.85rem', color: '#334155', margin: '4px 0 0 0', lineHeight: '1.4' }}>
                    {update.summary}
                  </p>

                  {update.blockers && update.blockers !== 'None' && (
                    <div style={{ fontSize: '0.76rem', color: '#b91c1c', backgroundColor: '#fef2f2', padding: '4px 8px', borderRadius: '4px', alignSelf: 'flex-start', marginTop: '4px' }}>
                      Blocker: {update.blockers}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* ========================================================= */}
      {/* TAB 6: TEAM PERFORMANCE (REQ 16)                          */}
      {/* ========================================================= */}
      {activeTab === 'performance' && (
        <section className="animate-fade-in" style={{ marginBottom: '28px' }}>
          <div style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0b3d2b', margin: 0 }}>
              16. Team Performance Scorecard
            </h2>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Employee task velocity, completion ratios, and rework frequency
            </div>
          </div>

          <div style={{ backgroundColor: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '12px 18px', fontWeight: '700', color: '#475569' }}>Team Member</th>
                    <th style={{ padding: '12px 18px', fontWeight: '700', color: '#475569' }}>Department</th>
                    <th style={{ padding: '12px 18px', fontWeight: '700', color: '#475569' }}>Assigned Tasks</th>
                    <th style={{ padding: '12px 18px', fontWeight: '700', color: '#475569' }}>Completed</th>
                    <th style={{ padding: '12px 18px', fontWeight: '700', color: '#475569' }}>Rework Count</th>
                    <th style={{ padding: '12px 18px', fontWeight: '700', color: '#475569' }}>Velocity Score</th>
                  </tr>
                </thead>
                <tbody>
                  {!performance?.employee_scorecard || performance.employee_scorecard.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                        No performance telemetry gathered yet.
                      </td>
                    </tr>
                  ) : (
                    performance.employee_scorecard.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 18px', fontWeight: '700', color: '#1e293b' }}>
                          {item.employee_name}
                        </td>
                        <td style={{ padding: '12px 18px', color: '#64748b' }}>
                          {item.department} &bull; {item.designation}
                        </td>
                        <td style={{ padding: '12px 18px', fontWeight: '700' }}>
                          {item.total_tasks}
                        </td>
                        <td style={{ padding: '12px 18px', fontWeight: '700', color: '#166534' }}>
                          {item.completed_tasks}
                        </td>
                        <td style={{ padding: '12px 18px', fontWeight: '700', color: item.rework_count > 0 ? '#dc2626' : '#64748b' }}>
                          {item.rework_count}
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          <span
                            style={{
                              padding: '3px 10px',
                              borderRadius: '999px',
                              fontSize: '0.74rem',
                              fontWeight: '800',
                              backgroundColor:
                                item.velocity_rating === 'Top Performer'
                                  ? '#dcfce7'
                                  : item.velocity_rating === 'On Track'
                                  ? '#e0f2fe'
                                  : '#fee2e2',
                              color:
                                item.velocity_rating === 'Top Performer'
                                  ? '#15803d'
                                  : item.velocity_rating === 'On Track'
                                  ? '#0369a1'
                                  : '#b91c1c',
                            }}
                          >
                            {item.velocity_rating} ({item.completion_rate}%)
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: CREATE & ASSIGN TASK (REQ 8, 9, 10)              */}
      {/* ========================================================= */}
      <Modal
        isOpen={isCreateTaskModalOpen}
        onClose={() => setIsCreateTaskModalOpen(false)}
        title="Create & Assign New Task"
        subtitle="Req 8: Create Task &bull; Req 9: Assign Employee &bull; Req 10: Set Deadline"
        maxWidth="540px"
      >
        <form onSubmit={handleCreateTask}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
              Project
            </label>
            <div
              style={{
                padding: '9px 12px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <span style={{ fontWeight: 800, color: '#0b3d2b', fontSize: '0.88rem' }}>
                  {selectedProjectForTask?.name || 'Selected Project'}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '8px' }}>
                  ({selectedProjectForTask?.department || 'Operations'})
                </span>
              </div>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  backgroundColor: '#ecfdf5',
                  color: '#065f46',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  border: '1px solid #a7f3d0',
                }}
              >
                {selectedProjectForTask?.id || ''}
              </span>
            </div>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
              Task Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Implement Face Landmark Mesh Matching"
              value={taskForm.title}
              onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
            />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
              Description & Acceptance Criteria
            </label>
            <textarea
              rows={3}
              placeholder="Detailed sprint expectations, test cases, and deliverables..."
              value={taskForm.description}
              onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                Assign to Employee *
              </label>
              <select
                value={taskForm.assigned_to}
                onChange={(e) => setTaskForm({ ...taskForm, assigned_to: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                required
              >
                {availableEmployeesForTask.length === 0 ? (
                  <option value="" disabled>
                    -- No employees assigned to this project yet --
                  </option>
                ) : (
                  availableEmployeesForTask.map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name} ({m.department || 'Operations'})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                Task Deadline *
              </label>
              <input
                type="date"
                required
                value={taskForm.deadline}
                onChange={(e) => setTaskForm({ ...taskForm, deadline: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                Priority
              </label>
              <select
                value={taskForm.priority}
                onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                Estimated Effort (Hrs)
              </label>
              <input
                type="number"
                step="0.5"
                min="1"
                value={taskForm.estimated_hours}
                onChange={(e) => setTaskForm({ ...taskForm, estimated_hours: parseFloat(e.target.value) || 8 })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setIsCreateTaskModalOpen(false)}
              style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '0.85rem', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', backgroundColor: '#0b3d2b', color: '#fff', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer' }}
            >
              Create & Assign Task
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL 2: SET / UPDATE DEADLINE (REQ 10)                   */}
      {/* ========================================================= */}
      <Modal
        isOpen={isDeadlineModalOpen}
        onClose={() => setIsDeadlineModalOpen(false)}
        title="Set Task Deadline & Priority"
        subtitle={`Task: ${selectedTask?.title || ''}`}
        maxWidth="460px"
      >
        <form onSubmit={handleUpdateDeadline}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
              Target Deadline *
            </label>
            <input
              type="date"
              required
              value={deadlineForm.deadline}
              onChange={(e) => setDeadlineForm({ ...deadlineForm, deadline: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
              Priority Level
            </label>
            <select
              value={deadlineForm.priority}
              onChange={(e) => setDeadlineForm({ ...deadlineForm, priority: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
            >
              <option value="High">High Urgency</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setIsDeadlineModalOpen(false)}
              style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '0.85rem', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', backgroundColor: '#0b3d2b', color: '#fff', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer' }}
            >
              Save Deadline
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL 3: ASSIGN REWORK (REQ 15)                           */}
      {/* ========================================================= */}
      <Modal
        isOpen={isReworkModalOpen}
        onClose={() => setIsReworkModalOpen(false)}
        title="Assign Rework to Employee"
        subtitle={`Task: ${selectedTask?.title || ''} &bull; Assigned: ${selectedTask?.assigned_to || ''}`}
        maxWidth="500px"
      >
        <form onSubmit={handleAssignRework}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
              Rework Feedback & Required Revisions *
            </label>
            <textarea
              rows={4}
              required
              placeholder="State exactly what needs to be improved, refactored, or fixed..."
              value={reworkForm.rework_notes}
              onChange={(e) => setReworkForm({ ...reworkForm, rework_notes: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
              Revised Deadline Date *
            </label>
            <input
              type="date"
              required
              value={reworkForm.revised_deadline}
              onChange={(e) => setReworkForm({ ...reworkForm, revised_deadline: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setIsReworkModalOpen(false)}
              style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '0.85rem', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', backgroundColor: '#dc2626', color: '#fff', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer' }}
            >
              Confirm Rework
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL 4: LOG DAILY WORK UPDATE (REQ 12)                   */}
      {/* ========================================================= */}
      <Modal
        isOpen={isWorkUpdateModalOpen}
        onClose={() => setIsWorkUpdateModalOpen(false)}
        title="Log Daily Work Update"
        subtitle="Record daily hours and work milestones for team members"
        maxWidth="500px"
      >
        <form onSubmit={handleSubmitWorkUpdate}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
              Project *
            </label>
            <select
              value={updateForm.project_id}
              onChange={(e) => setUpdateForm({ ...updateForm, project_id: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
              required
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px', marginBottom: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                Employee Name *
              </label>
              <select
                value={updateForm.employee_name}
                onChange={(e) => setUpdateForm({ ...updateForm, employee_name: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                required
              >
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                Hours Worked
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="24"
                value={updateForm.hours_worked}
                onChange={(e) => setUpdateForm({ ...updateForm, hours_worked: parseFloat(e.target.value) || 8 })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
              Work Summary *
            </label>
            <textarea
              rows={3}
              required
              placeholder="What deliverables were implemented today? Any tests completed?"
              value={updateForm.summary}
              onChange={(e) => setUpdateForm({ ...updateForm, summary: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
              Blockers / Impediments
            </label>
            <input
              type="text"
              placeholder="e.g. None or waiting for API endpoint"
              value={updateForm.blockers}
              onChange={(e) => setUpdateForm({ ...updateForm, blockers: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setIsWorkUpdateModalOpen(false)}
              style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '0.85rem', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', backgroundColor: '#0b3d2b', color: '#fff', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer' }}
            >
              Save Update
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

