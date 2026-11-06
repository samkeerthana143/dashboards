import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Users,
  UserCheck,
  RotateCcw,
  UploadCloud,
  FileText,
  Image as ImageIcon,
  MessageSquare,
  Send,
  Award,
  TrendingUp,
  Bell,
  Search,
  Filter,
  Check,
  ExternalLink,
  Trash2,
  Eye,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Modal from '../../components/common/Modal';
import { employeeTaskService } from '../../services/employeeTaskService';

export default function EmployeeWorkAssignments() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'tasks';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [tasks, setTasks] = useState([]);
  const [teamData, setTeamData] = useState(null);
  const [dailyUpdates, setDailyUpdates] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [performance, setPerformance] = useState(null);
  const [deadlinesData, setDeadlinesData] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Filters for Tasks tab
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal 1: Update Status
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedTaskForStatus, setSelectedTaskForStatus] = useState(null);
  const [newStatus, setNewStatus] = useState('IN_PROGRESS');
  const [newProgress, setNewProgress] = useState(50);
  const [statusNotes, setStatusNotes] = useState('');

  // Modal 2: Submit Deliverables & Proof
  const [deliverablesModalOpen, setDeliverablesModalOpen] = useState(false);
  const [selectedTaskForDeliverables, setSelectedTaskForDeliverables] = useState(null);
  const [deliverableNotes, setDeliverableNotes] = useState('');
  const [deliverableAttachments, setDeliverableAttachments] = useState([]);

  // Modal 3: Resubmit Task after Rework
  const [resubmitModalOpen, setResubmitModalOpen] = useState(false);
  const [selectedTaskForResubmit, setSelectedTaskForResubmit] = useState(null);
  const [resubmitNotes, setResubmitNotes] = useState('');
  const [resubmitAttachments, setResubmitAttachments] = useState([]);
  const [resubmitProgress, setResubmitProgress] = useState(100);

  // Daily Work Form State
  const [dailyForm, setDailyForm] = useState({
    date: new Date().toISOString().split('T')[0],
    taskId: '',
    hours: 8.0,
    summary: '',
    blockers: '',
    attachments: [],
  });

  // Keep active tab synced with query param
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  const handleSelectTab = (tabKey) => {
    setActiveTab(tabKey);
    setSearchParams({ tab: tabKey });
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4500);
  };

  // Fetch all employee tasks & sprint details
  const fetchAllData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [tasksRes, teamRes, dailyRes, notifRes, perfRes, deadRes] = await Promise.allSettled([
        employeeTaskService.getAssignedTasks(),
        employeeTaskService.getMyTeam(),
        employeeTaskService.getMyDailyWork(),
        employeeTaskService.getNotifications(),
        employeeTaskService.getMyPerformance(),
        employeeTaskService.getDeadlinesOverview(),
      ]);

      if (tasksRes.status === 'fulfilled') setTasks(Array.isArray(tasksRes.value) ? tasksRes.value : []);
      if (teamRes.status === 'fulfilled') setTeamData(teamRes.value || null);
      if (dailyRes.status === 'fulfilled') setDailyUpdates(Array.isArray(dailyRes.value) ? dailyRes.value : []);
      if (notifRes.status === 'fulfilled') setNotifications(Array.isArray(notifRes.value) ? notifRes.value : []);
      if (perfRes.status === 'fulfilled') setPerformance(perfRes.value || null);
      if (deadRes.status === 'fulfilled') setDeadlinesData(deadRes.value || null);
    } catch (err) {
      console.warn('Failed to load employee task workspace', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Handle local file selection to base64 attachment
  const handleFileUpload = (e, targetSetter) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const attachObj = {
          id: `ATT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          file_name: file.name,
          file_type: file.type || 'application/octet-stream',
          data_url: reader.result,
          size_kb: Math.round(file.size / 1024),
          uploaded_at: new Date().toISOString(),
        };
        targetSetter((prev) => [...prev, attachObj]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  // Action: Open Status Modal
  const openStatusModal = (task) => {
    setSelectedTaskForStatus(task);
    setNewStatus(task.status === 'TODO' ? 'IN_PROGRESS' : task.status);
    setNewProgress(task.progress || 0);
    setStatusNotes('');
    setStatusModalOpen(true);
  };

  // Action: Save Task Status (Req 11)
  const handleSaveStatus = async (e) => {
    e.preventDefault();
    if (!selectedTaskForStatus) return;
    try {
      setIsSubmitting(true);
      await employeeTaskService.updateTaskStatus(selectedTaskForStatus.id, {
        status: newStatus,
        progress: Number(newProgress),
        notes: statusNotes,
      });
      showToast(`Status updated for task "${selectedTaskForStatus.title}".`);
      setStatusModalOpen(false);
      fetchAllData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update task status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Action: Open Deliverables Modal (Req 12, 13)
  const openDeliverablesModal = (task) => {
    setSelectedTaskForDeliverables(task);
    setDeliverableNotes('');
    setDeliverableAttachments([]);
    setDeliverablesModalOpen(true);
  };

  // Action: Submit Deliverables & Proof (Req 12, 13)
  const handleSubmitDeliverables = async (e) => {
    e.preventDefault();
    if (!selectedTaskForDeliverables) return;
    if (!deliverableNotes.trim()) {
      alert('Please enter a brief summary of the deliverable work completed.');
      return;
    }
    try {
      setIsSubmitting(true);
      await employeeTaskService.submitDeliverables(selectedTaskForDeliverables.id, {
        submission_notes: deliverableNotes.trim(),
        attachments: deliverableAttachments,
        progress: 100,
      });
      showToast(`Deliverables submitted for "${selectedTaskForDeliverables.title}". Sent to Team Leader for review.`);
      setDeliverablesModalOpen(false);
      fetchAllData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to submit deliverables.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Action: Open Resubmit Modal (Req 15)
  const openResubmitModal = (task) => {
    setSelectedTaskForResubmit(task);
    setResubmitNotes('');
    setResubmitAttachments([]);
    setResubmitProgress(100);
    setResubmitModalOpen(true);
  };

  // Action: Resubmit Task after Rework (Req 15)
  const handleResubmitTask = async (e) => {
    e.preventDefault();
    if (!selectedTaskForResubmit) return;
    if (!resubmitNotes.trim()) {
      alert('Please explain the modifications and fixes made for rework.');
      return;
    }
    try {
      setIsSubmitting(true);
      await employeeTaskService.resubmitTask(selectedTaskForResubmit.id, {
        resubmission_notes: resubmitNotes.trim(),
        attachments: resubmitAttachments,
        progress: Number(resubmitProgress),
      });
      showToast(`Task "${selectedTaskForResubmit.title}" resubmitted to Team Leader review queue.`);
      setResubmitModalOpen(false);
      fetchAllData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to resubmit task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Action: Submit Daily Work Report (Req 12, 13)
  const handleSubmitDailyWork = async (e) => {
    e.preventDefault();
    if (!dailyForm.summary.trim()) {
      alert('Please provide a summary of the work completed today.');
      return;
    }
    try {
      setIsSubmitting(true);
      const chosenTask = tasks.find((t) => t.id === dailyForm.taskId);
      await employeeTaskService.submitDailyWork({
        date: dailyForm.date,
        project_id: teamData?.project?.id || 'PRJ-101',
        project_name: teamData?.project?.name || 'Sprint Project',
        task_id: dailyForm.taskId || (chosenTask ? chosenTask.id : ''),
        task_title: chosenTask ? chosenTask.title : 'Sprint Core Development',
        hours_worked: Number(dailyForm.hours),
        summary: dailyForm.summary.trim(),
        blockers: dailyForm.blockers.trim() || 'None',
        attachments: dailyForm.attachments,
      });
      showToast('Daily work report submitted successfully!');
      setDailyForm({
        date: new Date().toISOString().split('T')[0],
        taskId: '',
        hours: 8.0,
        summary: '',
        blockers: '',
        attachments: [],
      });
      fetchAllData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to submit daily work report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Action: Mark Notification Read (Req 17)
  const handleMarkNotificationRead = async (notifId) => {
    try {
      await employeeTaskService.markNotificationRead(notifId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.warn('Could not mark notification read', err);
    }
  };

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
      if (priorityFilter !== 'ALL' && t.priority?.toUpperCase() !== priorityFilter.toUpperCase()) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = t.title?.toLowerCase().includes(query);
        const matchesDesc = t.description?.toLowerCase().includes(query);
        const matchesTL = t.team_leader_name?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc && !matchesTL) return false;
      }
      return true;
    });
  }, [tasks, statusFilter, priorityFilter, searchQuery]);

  const reworkCount = useMemo(() => tasks.filter((t) => t.status === 'REWORK').length, [tasks]);
  const unreadNotifsCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '48px' }}>
      {/* Toast Alert Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            zIndex: 9999,
            backgroundColor: '#047857',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(4, 120, 87, 0.35)',
            fontSize: '0.875rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            animation: 'fadeInSlide 0.25s ease-out',
          }}
        >
          <CheckCircle2 size={18} />
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <PageHeader
        title="Employee Sprint & Task Operations"
        subtitle="End-to-end task execution, deadline management, daily updates, deliverables, and performance tracking"
        breadcrumb={[{ label: 'Portal', path: '/employee/dashboard' }, { label: 'Tasks & Sprints' }]}
        showBack={true}
      />

      {/* Workspace Navigation Tabs (Covering all 10 Features) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '10px',
          marginBottom: '24px',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        {[
          { key: 'tasks', label: 'Assigned Tasks', count: tasks.length, icon: Briefcase },
          {
            key: 'deadlines',
            label: 'Deadlines & Milestones',
            count: deadlinesData?.overdue_count ? `⚠️ ${deadlinesData.overdue_count}` : null,
            icon: Clock,
          },
          { key: 'daily-work', label: 'Submit Daily Work', icon: Send },
          {
            key: 'feedback',
            label: 'Task Feedback & Rework',
            count: reworkCount > 0 ? `${reworkCount} Rework` : null,
            badgeColor: reworkCount > 0 ? '#dc2626' : undefined,
            icon: RotateCcw,
          },
          { key: 'team', label: 'My Team Details', icon: Users },
          {
            key: 'notifications',
            label: 'Notifications',
            count: unreadNotifsCount > 0 ? unreadNotifsCount : null,
            badgeColor: '#F04491',
            icon: Bell,
          },
          { key: 'performance', label: 'My Performance', icon: Award },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleSelectTab(tab.key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                borderRadius: '10px',
                fontSize: '0.85rem',
                fontWeight: isActive ? 700 : 600,
                color: isActive ? '#0b3d2b' : '#64748b',
                backgroundColor: isActive ? '#e6f4ea' : '#ffffff',
                border: isActive ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.18s ease',
              }}
            >
              <Icon size={16} color={isActive ? '#0b3d2b' : '#64748b'} />
              <span>{tab.label}</span>
              {tab.count !== null && tab.count !== undefined && (
                <span
                  style={{
                    backgroundColor: tab.badgeColor || (isActive ? '#0b3d2b' : '#e2e8f0'),
                    color: tab.badgeColor ? '#ffffff' : (isActive ? '#ffffff' : '#475569'),
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '10px',
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: 10. ASSIGNED TASKS & STATUS UPDATES (Req 10 & 11)                   */}
      {/* ========================================================================= */}
      {activeTab === 'tasks' && (
        <div className="animate-fade-in">
          {/* Filter Bar */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '16px 20px',
              border: '1px solid #e2e8f0',
              marginBottom: '20px',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '14px',
            }}
          >
            {/* Search Input */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                padding: '8px 14px',
                flex: '1 1 260px',
              }}
            >
              <Search size={16} color="#64748b" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search assigned tasks by title, lead, or details..."
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontSize: '0.85rem',
                  color: '#1e293b',
                  width: '100%',
                }}
              />
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Status:
              </span>
              {['ALL', 'TODO', 'IN_PROGRESS', 'SUBMITTED', 'REWORK', 'APPROVED'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: statusFilter === st ? 700 : 500,
                    backgroundColor: statusFilter === st ? '#0b3d2b' : '#f1f5f9',
                    color: statusFilter === st ? '#ffffff' : '#475569',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}

              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginLeft: '8px' }}>
                Priority:
              </span>
              {['ALL', 'HIGH', 'MEDIUM'].map((pr) => (
                <button
                  key={pr}
                  type="button"
                  onClick={() => setPriorityFilter(pr)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: priorityFilter === pr ? 700 : 500,
                    backgroundColor: priorityFilter === pr ? '#0b3d2b' : '#f1f5f9',
                    color: priorityFilter === pr ? '#ffffff' : '#475569',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {pr}
                </button>
              ))}
            </div>
          </div>

          {/* Tasks Grid */}
          {filteredTasks.length === 0 ? (
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                padding: '48px 24px',
                textAlign: 'center',
                border: '1px dashed #cbd5e1',
                color: '#64748b',
              }}
            >
              <Briefcase size={44} color="#94a3b8" style={{ margin: '0 auto 12px auto' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0b3d2b', marginBottom: '4px' }}>
                No Tasks Match Selected Filters
              </h3>
              <p style={{ fontSize: '0.85rem', margin: 0 }}>
                Adjust search queries or filters above to view tasks.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
              {filteredTasks.map((task) => {
                const isRework = task.status === 'REWORK';
                const isApproved = task.status === 'APPROVED';
                const isSubmitted = task.status === 'SUBMITTED';

                return (
                  <div
                    key={task.id}
                    style={{
                      backgroundColor: '#ffffff',
                      border: isRework ? '2px solid #f97316' : '1px solid #e2e8f0',
                      borderRadius: '18px',
                      padding: '22px',
                      boxShadow: isRework ? '0 8px 24px rgba(249, 115, 22, 0.12)' : '0 2px 8px rgba(0, 0, 0, 0.03)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                      position: 'relative',
                    }}
                  >
                    {/* Top Badges */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              color: task.priority === 'High' ? '#dc2626' : '#2563eb',
                              backgroundColor: task.priority === 'High' ? '#fef2f2' : '#eff6ff',
                              padding: '3px 8px',
                              borderRadius: '20px',
                            }}
                          >
                            {task.priority || 'Medium'} Priority
                          </span>

                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '3px 9px',
                              borderRadius: '20px',
                              backgroundColor:
                                task.status === 'APPROVED' ? '#ecfdf5' :
                                task.status === 'REWORK' ? '#fff7ed' :
                                task.status === 'SUBMITTED' ? '#eff6ff' : '#f8fafc',
                              color:
                                task.status === 'APPROVED' ? '#047857' :
                                task.status === 'REWORK' ? '#c2410c' :
                                task.status === 'SUBMITTED' ? '#1d4ed8' : '#475569',
                              border: `1px solid ${
                                task.status === 'APPROVED' ? '#a7f3d0' :
                                task.status === 'REWORK' ? '#fdba74' :
                                task.status === 'SUBMITTED' ? '#bfdbfe' : '#e2e8f0'
                              }`,
                            }}
                          >
                            {task.status.replace('_', ' ')}
                          </span>
                        </div>

                        {/* Deadline Urgency Badge (Req 16) */}
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            color:
                              task.urgency_level === 'critical' ? '#dc2626' :
                              task.urgency_level === 'warning' ? '#d97706' :
                              task.urgency_level === 'success' ? '#047857' : '#64748b',
                            backgroundColor:
                              task.urgency_level === 'critical' ? '#fee2e2' :
                              task.urgency_level === 'warning' ? '#fef3c7' :
                              task.urgency_level === 'success' ? '#dcfce7' : '#f1f5f9',
                            padding: '3px 9px',
                            borderRadius: '12px',
                          }}
                        >
                          <Clock size={12} />
                          {task.urgency_badge}
                        </span>
                      </div>

                      {/* Project Subtitle & Task Title */}
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginBottom: '4px' }}>
                        {task.project_name || 'Mobile Platform Sprint'} &bull; Task #{task.id}
                      </div>

                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0b3d2b', marginBottom: '8px', lineHeight: 1.35 }}>
                        {task.title}
                      </h3>

                      <p style={{ fontSize: '0.84rem', color: '#475569', lineHeight: 1.45, marginBottom: '16px' }}>
                        {task.description || 'Deliver Sprint deliverable adhering to architecture and quality guidelines.'}
                      </p>

                      {/* Prominent Rework Alert Banner (Req 14, 15) */}
                      {isRework && (
                        <div
                          style={{
                            backgroundColor: '#fff7ed',
                            border: '1px solid #fdba74',
                            borderRadius: '12px',
                            padding: '12px 14px',
                            marginBottom: '16px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#c2410c', fontWeight: 700, fontSize: '0.8rem', marginBottom: '4px' }}>
                            <AlertTriangle size={15} />
                            Rework Requested by {task.team_leader_name || 'Team Leader'}:
                          </div>
                          <p style={{ fontSize: '0.8rem', color: '#9a3412', margin: 0, lineHeight: 1.4 }}>
                            {task.rework_notes || 'Please revise deliverables according to team guidelines.'}
                          </p>
                        </div>
                      )}

                      {/* Approved Feedback Note (Req 14) */}
                      {isApproved && task.feedback && (
                        <div
                          style={{
                            backgroundColor: '#f0fdf4',
                            border: '1px solid #bbf7d0',
                            borderRadius: '12px',
                            padding: '12px 14px',
                            marginBottom: '16px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#15803d', fontWeight: 700, fontSize: '0.8rem', marginBottom: '4px' }}>
                            <CheckCircle2 size={15} />
                            Leader Review Feedback:
                          </div>
                          <p style={{ fontSize: '0.8rem', color: '#166534', margin: 0, lineHeight: 1.4 }}>
                            {task.feedback}
                          </p>
                        </div>
                      )}

                      {/* Attachments Preview (Req 13) */}
                      {task.attachments && task.attachments.length > 0 && (
                        <div style={{ marginBottom: '16px' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                            Deliverable Attachments ({task.attachments.length}):
                          </span>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                            {task.attachments.map((att, aIdx) => (
                              <div
                                key={aIdx}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  backgroundColor: '#f8fafc',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: '8px',
                                  padding: '4px 8px',
                                  fontSize: '0.72rem',
                                  color: '#334155',
                                }}
                              >
                                {att.file_type?.includes('image') ? (
                                  <ImageIcon size={13} color="#0f766e" />
                                ) : (
                                  <FileText size={13} color="#2563eb" />
                                )}
                                <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {att.file_name || `File-${aIdx + 1}`}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Progress Slider Display & Actions */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                        <span>Progress</span>
                        <span style={{ color: '#0b3d2b' }}>{task.progress}%</span>
                      </div>
                      <div
                        style={{
                          width: '100%',
                          height: '8px',
                          backgroundColor: '#e2e8f0',
                          borderRadius: '10px',
                          overflow: 'hidden',
                          marginBottom: '16px',
                        }}
                      >
                        <div
                          style={{
                            width: `${task.progress}%`,
                            height: '100%',
                            backgroundColor: isApproved ? '#10b981' : isRework ? '#f97316' : '#0b3d2b',
                            borderRadius: '10px',
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>

                      {/* Lead Info & Due Date */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', marginBottom: '14px' }}>
                        <span>Lead: <strong style={{ color: '#1e293b' }}>{task.team_leader_name || 'Team Lead'}</strong></span>
                        <span>Due: <strong style={{ color: '#1e293b' }}>{task.deadline || 'Upcoming'}</strong></span>
                      </div>

                      {/* Action Buttons (Req 11, 12, 13, 15) */}
                      <div style={{ display: 'grid', gridTemplateColumns: isRework ? '1fr' : '1fr 1fr', gap: '8px' }}>
                        {isRework ? (
                          <button
                            type="button"
                            onClick={() => openResubmitModal(task)}
                            style={{
                              backgroundColor: '#c2410c',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '10px',
                              padding: '10px 14px',
                              fontSize: '0.85rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              boxShadow: '0 4px 12px rgba(194, 65, 12, 0.25)',
                            }}
                          >
                            <RotateCcw size={15} />
                            Resubmit Task Deliverables
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => openStatusModal(task)}
                              disabled={isApproved}
                              style={{
                                backgroundColor: isApproved ? '#f1f5f9' : '#f8fafc',
                                color: isApproved ? '#94a3b8' : '#0b3d2b',
                                border: '1px solid #cbd5e1',
                                borderRadius: '10px',
                                padding: '8px 12px',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                cursor: isApproved ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '5px',
                              }}
                            >
                              Update Status
                            </button>

                            <button
                              type="button"
                              onClick={() => openDeliverablesModal(task)}
                              disabled={isApproved}
                              style={{
                                backgroundColor: isApproved ? '#ecfdf5' : '#0b3d2b',
                                color: isApproved ? '#047857' : '#ffffff',
                                border: 'none',
                                borderRadius: '10px',
                                padding: '8px 12px',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                cursor: isApproved ? 'default' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '5px',
                              }}
                            >
                              {isApproved ? (
                                <>
                                  <Check size={14} /> Approved
                                </>
                              ) : isSubmitted ? (
                                <>
                                  <Clock size={14} /> In Review
                                </>
                              ) : (
                                <>
                                  <UploadCloud size={14} /> Submit Deliverable
                                </>
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: 16. VIEW DEADLINES (Req 16)                                        */}
      {/* ========================================================================= */}
      {activeTab === 'deadlines' && (
        <div className="animate-fade-in">
          {/* Urgency Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid #fee2e2', borderLeft: '5px solid #dc2626' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' }}>Overdue Tasks</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#991b1b', marginTop: '4px' }}>
                {deadlinesData?.overdue_count || 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>Require immediate submission</div>
            </div>

            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid #fef3c7', borderLeft: '5px solid #d97706' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#d97706', textTransform: 'uppercase' }}>Due Today</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#92400e', marginTop: '4px' }}>
                {deadlinesData?.due_today_count || 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>Submission deadline tonight</div>
            </div>

            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid #fef9c3', borderLeft: '5px solid #eab308' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ca8a04', textTransform: 'uppercase' }}>Due This Week</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#854d0e', marginTop: '4px' }}>
                {deadlinesData?.due_this_week_count || 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>Upcoming milestones</div>
            </div>

            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid #dcfce7', borderLeft: '5px solid #10b981' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#047857', textTransform: 'uppercase' }}>Completed On-Time</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#065f46', marginTop: '4px' }}>
                {deadlinesData?.completed_count || 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>Verified deliverables</div>
            </div>
          </div>

          {/* Detailed Timeline Table */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '18px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0b3d2b', marginBottom: '16px' }}>
              Sprint Deliverables Timeline & Urgency
            </h3>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#64748b', textAlign: 'left' }}>
                    <th style={{ padding: '12px 14px' }}>Task Name</th>
                    <th style={{ padding: '12px 14px' }}>Project</th>
                    <th style={{ padding: '12px 14px' }}>Deadline</th>
                    <th style={{ padding: '12px 14px' }}>Urgency Badge</th>
                    <th style={{ padding: '12px 14px' }}>Status</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((t) => (
                    <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px', fontWeight: 700, color: '#1e293b' }}>
                        {t.title}
                      </td>
                      <td style={{ padding: '14px', color: '#64748b' }}>
                        {t.project_name || 'Sprint Project'}
                      </td>
                      <td style={{ padding: '14px', color: '#334155', fontWeight: 600 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={14} color="#0f766e" />
                          {t.deadline || 'Upcoming'}
                        </span>
                      </td>
                      <td style={{ padding: '14px' }}>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '3px 9px',
                            borderRadius: '12px',
                            color:
                              t.urgency_level === 'critical' ? '#dc2626' :
                              t.urgency_level === 'warning' ? '#d97706' :
                              t.urgency_level === 'success' ? '#047857' : '#64748b',
                            backgroundColor:
                              t.urgency_level === 'critical' ? '#fee2e2' :
                              t.urgency_level === 'warning' ? '#fef3c7' :
                              t.urgency_level === 'success' ? '#dcfce7' : '#f1f5f9',
                          }}
                        >
                          {t.urgency_badge}
                        </span>
                      </td>
                      <td style={{ padding: '14px' }}>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '20px',
                            backgroundColor: t.status === 'APPROVED' ? '#ecfdf5' : '#f1f5f9',
                            color: t.status === 'APPROVED' ? '#047857' : '#475569',
                          }}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => {
                            if (t.status === 'REWORK') openResubmitModal(t);
                            else openDeliverablesModal(t);
                          }}
                          style={{
                            backgroundColor: '#0b3d2b',
                            color: '#ffffff',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Deliverables
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: 12. SUBMIT DAILY WORK & 13. UPLOAD SCREENSHOTS (Req 12 & 13)       */}
      {/* ========================================================================= */}
      {activeTab === 'daily-work' && (
        <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 420px) 1fr', gap: '24px' }}>
          {/* Left Form: Submit Daily Work Update */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '18px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0b3d2b', marginBottom: '4px' }}>
              Submit Daily Work Standup
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '20px' }}>
              Log hours, work deliverables, blockers, and screenshot proof for today's sprint.
            </p>

            <form onSubmit={handleSubmitDailyWork} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Date of Work *
                </label>
                <input
                  type="date"
                  value={dailyForm.date}
                  onChange={(e) => setDailyForm({ ...dailyForm, date: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    color: '#1e293b',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Select Associated Task *
                </label>
                <select
                  value={dailyForm.taskId}
                  onChange={(e) => setDailyForm({ ...dailyForm, taskId: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    color: '#1e293b',
                    boxSizing: 'border-box',
                    backgroundColor: '#ffffff',
                  }}
                >
                  <option value="">General Project Standup (PRJ-101)</option>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({t.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Hours Worked * (0.5 to 16.0 hrs)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="24"
                  value={dailyForm.hours}
                  onChange={(e) => setDailyForm({ ...dailyForm, hours: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    color: '#1e293b',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Work Summary & Deliverables *
                </label>
                <textarea
                  rows={4}
                  value={dailyForm.summary}
                  onChange={(e) => setDailyForm({ ...dailyForm, summary: e.target.value })}
                  placeholder="Detail key components created, test cases verified, or PRs submitted today..."
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    color: '#1e293b',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Blockers or Dependencies (Optional)
                </label>
                <input
                  type="text"
                  value={dailyForm.blockers}
                  onChange={(e) => setDailyForm({ ...dailyForm, blockers: e.target.value })}
                  placeholder="e.g. Waiting on API credentials or QA sign-off"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    color: '#1e293b',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Upload Screenshots / Documents (Req 13) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Upload Proof Screenshots or Docs (Req 13)
                </label>
                <div
                  style={{
                    border: '2px dashed #cbd5e1',
                    borderRadius: '12px',
                    padding: '16px',
                    textAlign: 'center',
                    backgroundColor: '#f8fafc',
                    cursor: 'pointer',
                  }}
                  onClick={() => document.getElementById('daily-file-input')?.click()}
                >
                  <UploadCloud size={24} color="#0b3d2b" style={{ margin: '0 auto 6px auto' }} />
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0b3d2b' }}>
                    Click to attach screenshots / documents
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    PNG, JPG, PDF, WEBP up to 10MB
                  </div>
                  <input
                    id="daily-file-input"
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.txt"
                    style={{ display: 'none' }}
                    onChange={(e) => handleFileUpload(e, (fn) => setDailyForm((prev) => ({ ...prev, attachments: fn(prev.attachments) })))}
                  />
                </div>

                {/* Attachment Previews */}
                {dailyForm.attachments.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                    {dailyForm.attachments.map((att, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          backgroundColor: '#ecfdf5',
                          border: '1px solid #a7f3d0',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontSize: '0.75rem',
                        }}
                      >
                        <ImageIcon size={13} color="#047857" />
                        <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {att.file_name}
                        </span>
                        <button
                          type="button"
                          onClick={() => setDailyForm((prev) => ({ ...prev, attachments: prev.attachments.filter((_, i) => i !== idx) }))}
                          style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626' }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  backgroundColor: '#0b3d2b',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px 18px',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginTop: '8px',
                }}
              >
                <Send size={16} />
                {isSubmitting ? 'Submitting Report...' : 'Submit Daily Work Update'}
              </button>
            </form>
          </div>

          {/* Right Column: Historical Daily Submissions */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '18px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0b3d2b', marginBottom: '16px' }}>
              My Daily Work Logs & Standup History
            </h3>

            {dailyUpdates.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                <Clock size={36} color="#94a3b8" style={{ margin: '0 auto 10px auto' }} />
                <p>No daily updates logged yet. Submit your first update using the form on the left.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {dailyUpdates.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      border: '1px solid #f1f5f9',
                      borderRadius: '14px',
                      padding: '16px',
                      backgroundColor: '#f8fafc',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700, color: '#0b3d2b', fontSize: '0.9rem' }}>
                          {item.date}
                        </span>
                        <span style={{ fontSize: '0.72rem', backgroundColor: '#e2e8f0', color: '#334155', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                          {item.hours_worked} hrs
                        </span>
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#047857', backgroundColor: '#ecfdf5', padding: '2px 8px', borderRadius: '10px' }}>
                        {item.status || 'Submitted'}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      Task: {item.task_title || 'Sprint General Work'}
                    </div>

                    <p style={{ fontSize: '0.83rem', color: '#1e293b', margin: '0 0 10px 0', lineHeight: 1.45 }}>
                      {item.summary}
                    </p>

                    {item.blockers && item.blockers !== 'None' && (
                      <div style={{ fontSize: '0.75rem', color: '#b45309', backgroundColor: '#fffbeb', padding: '6px 10px', borderRadius: '8px', marginBottom: '8px' }}>
                        <strong>Blocker:</strong> {item.blockers}
                      </div>
                    )}

                    {/* Attachments */}
                    {item.attachments && item.attachments.length > 0 && (
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                        {item.attachments.map((att, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              backgroundColor: '#ffffff',
                              border: '1px solid #cbd5e1',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                            }}
                          >
                            <ImageIcon size={12} color="#0f766e" />
                            <span>{att.file_name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: 14. VIEW TASK FEEDBACK & 15. RESUBMIT TASKS (Req 14 & 15)          */}
      {/* ========================================================================= */}
      {activeTab === 'feedback' && (
        <div className="animate-fade-in">
          <div style={{ backgroundColor: '#ffffff', borderRadius: '18px', padding: '24px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0b3d2b', marginBottom: '6px' }}>
              Team Leader Feedback & Quality Assurance Reviews
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
              Inspect review verdicts, praise notes, and rework instructions provided by your Team Leader.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
            {tasks
              .filter((t) => t.feedback || t.rework_notes || t.status === 'REWORK' || t.status === 'APPROVED')
              .map((t) => {
                const isRework = t.status === 'REWORK';
                const isApproved = t.status === 'APPROVED';

                return (
                  <div
                    key={t.id}
                    style={{
                      backgroundColor: '#ffffff',
                      border: isRework ? '2px solid #ea580c' : '1px solid #e2e8f0',
                      borderRadius: '16px',
                      padding: '20px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            padding: '3px 10px',
                            borderRadius: '20px',
                            backgroundColor: isRework ? '#fff7ed' : '#ecfdf5',
                            color: isRework ? '#c2410c' : '#047857',
                            border: `1px solid ${isRework ? '#fdba74' : '#a7f3d0'}`,
                          }}
                        >
                          {isRework ? 'REWORK REQUESTED' : 'APPROVED VERIFIED'}
                        </span>

                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          Lead: <strong>{t.team_leader_name || 'Team Leader'}</strong>
                        </span>
                      </div>

                      <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#0b3d2b', marginBottom: '8px' }}>
                        {t.title}
                      </h4>

                      {/* Rework or Feedback Box */}
                      {isRework ? (
                        <div
                          style={{
                            backgroundColor: '#fff7ed',
                            border: '1px solid #fdba74',
                            borderRadius: '12px',
                            padding: '14px',
                            marginBottom: '16px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#c2410c', fontWeight: 700, fontSize: '0.8rem', marginBottom: '6px' }}>
                            <AlertCircle size={15} />
                            Rework Action Required:
                          </div>
                          <p style={{ fontSize: '0.825rem', color: '#9a3412', margin: 0, lineHeight: 1.45 }}>
                            {t.rework_notes || 'Adjust deliverable edge cases before resubmitting.'}
                          </p>
                        </div>
                      ) : (
                        <div
                          style={{
                            backgroundColor: '#f0fdf4',
                            border: '1px solid #bbf7d0',
                            borderRadius: '12px',
                            padding: '14px',
                            marginBottom: '16px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#15803d', fontWeight: 700, fontSize: '0.8rem', marginBottom: '6px' }}>
                            <CheckCircle2 size={15} />
                            Feedback & Praise:
                          </div>
                          <p style={{ fontSize: '0.825rem', color: '#166534', margin: 0, lineHeight: 1.45 }}>
                            {t.feedback || 'Deliverable passed inspection and QA testing.'}
                          </p>
                        </div>
                      )}
                    </div>

                    {isRework && (
                      <button
                        type="button"
                        onClick={() => openResubmitModal(t)}
                        style={{
                          backgroundColor: '#c2410c',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '10px',
                          padding: '10px 14px',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                      >
                        <RotateCcw size={15} />
                        Resubmit Task Deliverables (Req 15)
                      </button>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: 9. VIEW TEAM DETAILS (Req 9)                                       */}
      {/* ========================================================================= */}
      {activeTab === 'team' && (
        <div className="animate-fade-in">
          {/* Active Project Banner / Empty State */}
          {!teamData?.project ? (
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '20px',
                padding: '48px 24px',
                textAlign: 'center',
                border: '1px dashed #cbd5e1',
                color: '#64748b',
                marginBottom: '28px',
              }}
            >
              <Briefcase size={48} color="#94a3b8" style={{ margin: '0 auto 12px auto' }} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0b3d2b', marginBottom: '6px' }}>
                No Project Assigned Yet
              </h3>
              <p style={{ fontSize: '0.875rem', maxWidth: '520px', margin: '0 auto', lineHeight: 1.5 }}>
                You have not yet been assigned to a project sprint by Project HR. Once assigned, your project deliverables, team leader contact, and sprint teammates will appear here.
              </p>
            </div>
          ) : (
            <>
              {/* Active Project Banner */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #064e3b 0%, #0f766e 100%)',
                  borderRadius: '20px',
                  padding: '28px 32px',
                  color: '#ffffff',
                  marginBottom: '28px',
                  boxShadow: '0 8px 24px rgba(11, 61, 43, 0.2)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <span
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        backdropFilter: 'blur(6px)',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {teamData?.team_name || 'Project Sprint Team'}
                    </span>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '10px 0 6px 0' }}>
                      {teamData.project.name}
                    </h2>
                    <p style={{ fontSize: '0.875rem', opacity: 0.9, maxWidth: '650px', lineHeight: 1.5, margin: 0 }}>
                      {teamData.project.description || 'Sprint deliverable execution and milestones.'}
                    </p>

                    {/* Proposal PDF View Button */}
                    {teamData.project.proposal_pdf && (
                      <div style={{ marginTop: '12px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            const pdfData = teamData.project.proposal_pdf;
                            const pdfName = teamData.project.proposal_pdf_name || `${teamData.project.name} - Proposal.pdf`;
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
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 14px',
                            borderRadius: '8px',
                            backgroundColor: '#ffffff',
                            color: '#064e3b',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            border: 'none',
                            cursor: 'pointer',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          }}
                        >
                          <FileText size={14} color="#e11d48" />
                          <span>View Project Proposal PDF</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', opacity: 0.8, textTransform: 'uppercase', fontWeight: 700 }}>
                      Sprint Deadline
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, marginTop: '2px' }}>
                      {teamData.project.deadline || '--'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Team Leader Profile Card */}
              {teamData.team_leader && (
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '18px',
                    padding: '24px',
                    border: '1px solid #e2e8f0',
                    marginBottom: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '20px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      backgroundColor: '#0b3d2b',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.5rem',
                      fontWeight: 800,
                      flexShrink: 0,
                    }}
                  >
                    {teamData.team_leader.name?.charAt(0) || 'L'}
                  </div>

                  <div style={{ flex: '1 1 300px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0b3d2b', margin: 0 }}>
                        {teamData.team_leader.name}
                      </h3>
                      <span style={{ backgroundColor: '#ecfdf5', color: '#047857', fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '12px' }}>
                        Assigned Team Leader
                      </span>
                    </div>
                    <p style={{ fontSize: '0.825rem', color: '#64748b', margin: '0 0 6px 0' }}>
                      {teamData.team_leader.specialization || 'Technical Leadership'} &bull; {teamData.team_leader.department || 'Engineering'}
                    </p>
                    <div style={{ fontSize: '0.8rem', color: '#334155', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                      <span>Email: <strong>{teamData.team_leader.email || '--'}</strong></span>
                      <span>Phone: <strong>{teamData.team_leader.phone || '--'}</strong></span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Teammates Roster */}
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0b3d2b', marginBottom: '16px' }}>
            Sprint Teammates & Colleagues ({teamData?.teammates?.length || 0})
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {(teamData?.teammates || []).map((member, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  padding: '18px',
                  border: member.is_current_user ? '2px solid #10b981' : '1px solid #e2e8f0',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    backgroundColor: member.is_current_user ? '#10b981' : '#0f766e',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '1rem',
                    flexShrink: 0,
                  }}
                >
                  {member.name?.charAt(0) || 'E'}
                </div>

                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <h4 style={{ fontSize: '0.925rem', fontWeight: 700, color: '#1e293b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {member.name}
                    </h4>
                    {member.is_current_user && (
                      <span style={{ fontSize: '0.65rem', backgroundColor: '#ecfdf5', color: '#047857', fontWeight: 800, padding: '1px 6px', borderRadius: '8px' }}>
                        YOU
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                    {member.designation || 'Software Engineer'} &bull; {member.department || 'Engineering'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
                    {member.email}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: 17. VIEW NOTIFICATIONS (Req 17)                                    */}
      {/* ========================================================================= */}
      {activeTab === 'notifications' && (
        <div className="animate-fade-in">
          <div style={{ backgroundColor: '#ffffff', borderRadius: '18px', padding: '24px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0b3d2b', marginBottom: '6px' }}>
              In-App Task Notifications & Alerts
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
              Live updates on newly assigned tasks, rework notices, approval notifications, and approaching deadlines.
            </p>
          </div>

          {notifications.length === 0 ? (
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '40px', textAlign: 'center', color: '#64748b' }}>
              <Bell size={40} color="#94a3b8" style={{ margin: '0 auto 10px auto' }} />
              <p>No new notifications. You are completely up to date!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  style={{
                    backgroundColor: notif.is_read ? '#ffffff' : '#f0fdf4',
                    border: notif.is_read ? '1px solid #e2e8f0' : '1px solid #86efac',
                    borderRadius: '14px',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '14px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundColor: notif.urgency === 'critical' ? '#fee2e2' : '#ecfdf5',
                        color: notif.urgency === 'critical' ? '#dc2626' : '#047857',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Bell size={18} />
                    </div>

                    <div>
                      <h4 style={{ fontSize: '0.925rem', fontWeight: 700, color: '#0b3d2b', margin: '0 0 4px 0' }}>
                        {notif.title}
                      </h4>
                      <p style={{ fontSize: '0.825rem', color: '#475569', margin: 0, lineHeight: 1.45 }}>
                        {notif.message}
                      </p>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px', display: 'inline-block' }}>
                        {notif.created_at ? new Date(notif.created_at).toLocaleString() : 'Recent'}
                      </span>
                    </div>
                  </div>

                  {!notif.is_read && (
                    <button
                      type="button"
                      onClick={() => handleMarkNotificationRead(notif.id)}
                      style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: '#475569',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Mark Read
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: 18. VIEW MY PERFORMANCE (Req 18)                                   */}
      {/* ========================================================================= */}
      {activeTab === 'performance' && (
        <div className="animate-fade-in">
          {/* Hero Scorecard */}
          <div
            style={{
              background: 'linear-gradient(135deg, #0b3d2b 0%, #0f766e 60%, #10b981 100%)',
              borderRadius: '20px',
              padding: '28px 32px',
              color: '#ffffff',
              marginBottom: '24px',
              boxShadow: '0 10px 25px rgba(11, 61, 43, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '20px',
            }}
          >
            <div>
              <span
                style={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(6px)',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}
              >
                Personal Performance Scorecard
              </span>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '8px 0 4px 0' }}>
                {performance?.employee_name || 'Staff Member'}
              </h2>
              <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                ID: {performance?.employee_id || 'EMP-1001'} &bull; Sprint Velocity Rating
              </div>
            </div>

            <div style={{ textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.15)', padding: '16px 24px', borderRadius: '16px' }}>
              <div style={{ fontSize: '2.4rem', fontWeight: 900 }}>
                {performance?.velocity_score || 9.6}
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {performance?.performance_badge || 'Top Performer'}
              </div>
            </div>
          </div>

          {/* Metric Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px', marginBottom: '28px' }}>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Completion Rate</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0b3d2b', marginTop: '6px' }}>
                {performance?.completion_rate || 90}%
              </div>
              <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '4px', fontWeight: 600 }}>
                {performance?.approved_tasks || 0} of {performance?.total_tasks || 0} tasks approved
              </div>
            </div>

            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>On-Time Delivery</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f766e', marginTop: '6px' }}>
                {performance?.on_time_rate || 95}%
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>Delivered on or before deadline</div>
            </div>

            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Rework Rate</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: performance?.rework_rate > 10 ? '#ea580c' : '#10b981', marginTop: '6px' }}>
                {performance?.rework_rate || 0}%
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                {performance?.rework_tasks || 0} tasks returned for fixes
              </div>
            </div>

            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Hours Logged</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#2563eb', marginTop: '6px' }}>
                {performance?.total_hours_logged || 38.5}h
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>Cumulative standup work</div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: 11. UPDATE TASK STATUS (Req 11)                                  */}
      {/* ========================================================================= */}
      <Modal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title="Update Task Status & Progress"
        subtitle={selectedTaskForStatus ? `Task #${selectedTaskForStatus.id}: ${selectedTaskForStatus.title}` : ''}
        maxWidth="500px"
      >
        <form onSubmit={handleSaveStatus} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              Execution Status *
            </label>
            <select
              value={newStatus}
              onChange={(e) => {
                setNewStatus(e.target.value);
                if (e.target.value === 'SUBMITTED') setNewProgress(100);
              }}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '0.9rem',
                color: '#1e293b',
                backgroundColor: '#ffffff',
                boxSizing: 'border-box',
              }}
            >
              <option value="TODO">TODO (Not Started)</option>
              <option value="IN_PROGRESS">IN_PROGRESS (Currently Developing)</option>
              <option value="SUBMITTED">SUBMITTED (Ready for Team Leader Review)</option>
            </select>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              <span>Completion Progress Percentage</span>
              <span style={{ color: '#0b3d2b', fontSize: '0.9rem' }}>{newProgress}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={newProgress}
              onChange={(e) => setNewProgress(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#0b3d2b', cursor: 'pointer' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              Progress Update Notes (Optional)
            </label>
            <textarea
              rows={3}
              value={statusNotes}
              onChange={(e) => setStatusNotes(e.target.value)}
              placeholder="e.g. Backend auth endpoints tested with Postman; UI mockups wired up."
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                color: '#1e293b',
                boxSizing: 'border-box',
                resize: 'vertical',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <button
              type="button"
              onClick={() => setStatusModalOpen(false)}
              style={{
                padding: '10px 16px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                backgroundColor: '#0b3d2b',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              {isSubmitting ? 'Saving...' : 'Update Status'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: 12 & 13. SUBMIT DELIVERABLES & PROOF SCREENSHOTS                 */}
      {/* ========================================================================= */}
      <Modal
        isOpen={deliverablesModalOpen}
        onClose={() => setDeliverablesModalOpen(false)}
        title="Submit Deliverables & Proof of Work"
        subtitle={selectedTaskForDeliverables ? `Task #${selectedTaskForDeliverables.id}: ${selectedTaskForDeliverables.title}` : ''}
        maxWidth="540px"
      >
        <form onSubmit={handleSubmitDeliverables} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              Work Summary & Deliverable Notes *
            </label>
            <textarea
              rows={4}
              value={deliverableNotes}
              onChange={(e) => setDeliverableNotes(e.target.value)}
              placeholder="Detail deliverables ready for inspection: code PR link, features completed, and verification steps."
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                color: '#1e293b',
                boxSizing: 'border-box',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Upload Attachments / Screenshots (Req 13) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              Attach Proof Documents or Screenshots (Req 13)
            </label>
            <div
              style={{
                border: '2px dashed #cbd5e1',
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
                backgroundColor: '#f8fafc',
                cursor: 'pointer',
              }}
              onClick={() => document.getElementById('deliverable-file-input')?.click()}
            >
              <UploadCloud size={24} color="#0b3d2b" style={{ margin: '0 auto 6px auto' }} />
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0b3d2b' }}>
                Upload Screenshot Proof or Document
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>PNG, JPG, PDF up to 10MB</div>
              <input
                id="deliverable-file-input"
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx"
                style={{ display: 'none' }}
                onChange={(e) => handleFileUpload(e, setDeliverableAttachments)}
              />
            </div>

            {/* Previews */}
            {deliverableAttachments.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                {deliverableAttachments.map((att, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: '#ecfdf5',
                      border: '1px solid #a7f3d0',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                    }}
                  >
                    <ImageIcon size={13} color="#047857" />
                    <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {att.file_name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setDeliverableAttachments((prev) => prev.filter((_, i) => i !== idx))}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626' }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <button
              type="button"
              onClick={() => setDeliverablesModalOpen(false)}
              style={{
                padding: '10px 16px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                backgroundColor: '#0b3d2b',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              {isSubmitting ? 'Submitting...' : 'Submit to Team Leader'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: 15. RESUBMIT TASK AFTER REWORK (Req 15)                          */}
      {/* ========================================================================= */}
      <Modal
        isOpen={resubmitModalOpen}
        onClose={() => setResubmitModalOpen(false)}
        title="Resubmit Task After Rework"
        subtitle={selectedTaskForResubmit ? `Task #${selectedTaskForResubmit.id}: ${selectedTaskForResubmit.title}` : ''}
        maxWidth="540px"
      >
        <form onSubmit={handleResubmitTask} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Highlighted Team Leader Rework Notes */}
          <div
            style={{
              backgroundColor: '#fff7ed',
              border: '1px solid #fdba74',
              borderRadius: '12px',
              padding: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#c2410c', fontWeight: 800, fontSize: '0.8rem', marginBottom: '4px' }}>
              <AlertTriangle size={15} />
              Leader Rework Instructions:
            </div>
            <p style={{ fontSize: '0.825rem', color: '#9a3412', margin: 0, lineHeight: 1.45 }}>
              {selectedTaskForResubmit?.rework_notes || 'Please resolve review comments and update deliverables.'}
            </p>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              Resubmission Notes & Modifications Made *
            </label>
            <textarea
              rows={4}
              value={resubmitNotes}
              onChange={(e) => setResubmitNotes(e.target.value)}
              placeholder="Describe the fixes applied according to the Team Leader's instructions..."
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                color: '#1e293b',
                boxSizing: 'border-box',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Upload Revised Attachments (Req 13) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              Upload Revised Proof Screenshots / Deliverables (Req 13)
            </label>
            <div
              style={{
                border: '2px dashed #cbd5e1',
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
                backgroundColor: '#f8fafc',
                cursor: 'pointer',
              }}
              onClick={() => document.getElementById('resubmit-file-input')?.click()}
            >
              <UploadCloud size={24} color="#0b3d2b" style={{ margin: '0 auto 6px auto' }} />
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0b3d2b' }}>
                Attach Updated Screenshots
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>PNG, JPG, PDF up to 10MB</div>
              <input
                id="resubmit-file-input"
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx"
                style={{ display: 'none' }}
                onChange={(e) => handleFileUpload(e, setResubmitAttachments)}
              />
            </div>

            {/* Previews */}
            {resubmitAttachments.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                {resubmitAttachments.map((att, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: '#fff7ed',
                      border: '1px solid #fed7aa',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                    }}
                  >
                    <ImageIcon size={13} color="#ea580c" />
                    <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {att.file_name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setResubmitAttachments((prev) => prev.filter((_, i) => i !== idx))}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626' }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <button
              type="button"
              onClick={() => setResubmitModalOpen(false)}
              style={{
                padding: '10px 16px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                backgroundColor: '#c2410c',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              {isSubmitting ? 'Resubmitting...' : 'Resubmit to Team Leader'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
