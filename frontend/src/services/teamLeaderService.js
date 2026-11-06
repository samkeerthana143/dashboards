import api from './api';

/**
 * TeamLeaderService - Handles Team Leader registration, login,
 * project view, team management, task assignments, review/rework,
 * daily updates, and performance monitoring.
 */
export const teamLeaderService = {
  // 4. Registration
  async register(data) {
    const response = await api.post('/api/teamlead/register', data);
    return response.data;
  },

  // 5. Login
  async login(credentials) {
    const response = await api.post('/api/teamlead/login', credentials);
    const { access_token, role, user } = response.data;
    if (access_token) {
      localStorage.setItem('arshith_auth_token', access_token);
      localStorage.setItem('arshith_role', 'team_leader');
      localStorage.setItem('arshith_user', JSON.stringify(user));
    }
    return response.data;
  },

  // Project HR candidate management
  async getCandidates() {
    const response = await api.get('/api/teamlead/candidates');
    return response.data;
  },

  async updateCandidateApproval(candidateId, { approval_status, remarks = '' }) {
    const response = await api.patch(`/api/teamlead/candidates/${candidateId}/approval`, {
      approval_status,
      remarks,
    });
    return response.data;
  },

  async getApprovedLeaders() {
    const response = await api.get('/api/teamlead/approved');
    return response.data;
  },

  // 6. View Assigned Projects
  async getAssignedProjects() {
    const response = await api.get('/api/teamlead/projects');
    return response.data;
  },

  // 7. View Assigned Team
  async getAssignedTeam() {
    const response = await api.get('/api/teamlead/team');
    return response.data;
  },

  // 8, 9, 10, 11. Tasks
  async getTasks(params = {}) {
    const response = await api.get('/api/teamlead/tasks', { params });
    return response.data;
  },

  async createTask(data) {
    const response = await api.post('/api/teamlead/tasks', data);
    return response.data;
  },

  async updateTaskDeadline(taskId, { deadline, priority = null, notes = '' }) {
    const response = await api.patch(`/api/teamlead/tasks/${taskId}/deadline`, {
      deadline,
      priority,
      notes,
    });
    return response.data;
  },

  // 12. View Daily Work Updates
  async getDailyWorkUpdates(params = {}) {
    const response = await api.get('/api/teamlead/work-updates', { params });
    return response.data;
  },

  async createDailyWorkUpdate(data) {
    const response = await api.post('/api/teamlead/work-updates', data);
    return response.data;
  },

  // 13. Review Submitted Tasks
  async getSubmittedTasks() {
    const response = await api.get('/api/teamlead/submitted-tasks');
    return response.data;
  },

  // 14. Approve / Reject Tasks & 15. Assign Rework
  async reviewTask(taskId, { action, feedback = '', rework_notes = '', revised_deadline = null }) {
    const response = await api.patch(`/api/teamlead/tasks/${taskId}/review`, {
      action,
      feedback,
      rework_notes,
      revised_deadline,
    });
    return response.data;
  },

  // 16. Monitor Team Performance
  async getTeamPerformance() {
    const response = await api.get('/api/teamlead/performance');
    return response.data;
  },
};

