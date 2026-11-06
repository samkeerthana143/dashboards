import api from './api';

/**
 * ProjectService - Project Lifecycle, Team Allocation, & Progress Monitoring
 * Connects directly to FastAPI /api/projects endpoints.
 */
export const projectService = {
  // 5. View Projects
  async getProjects(params = {}) {
    const response = await api.get('/api/projects', { params });
    return response.data;
  },

  async getProject(id) {
    const response = await api.get(`/api/projects/${id}`);
    return response.data;
  },

  // 4. Add Project
  async createProject(projectData) {
    const response = await api.post('/api/projects', projectData);
    return response.data;
  },

  // 6. Edit Project
  async updateProject(id, projectData) {
    const response = await api.put(`/api/projects/${id}`, projectData);
    return response.data;
  },

  // 6. Delete Project
  async deleteProject(id) {
    const response = await api.delete(`/api/projects/${id}`);
    return response.data;
  },

  // Approved Team Leaders & Employees for strict assignment gating
  async getApprovedLeaders() {
    const response = await api.get('/api/projects/approved-leaders');
    return response.data;
  },

  async getApprovedEmployees() {
    const response = await api.get('/api/projects/approved-employees');
    return response.data;
  },

  // 2. Approve / Reject Team Leader
  async getTeamLeaderApprovals() {
    const response = await api.get('/api/projects/team-leaders/approvals');
    return response.data;
  },

  async updateTeamLeaderApproval(projectId, { approval_status, remarks = '' }) {
    const response = await api.patch(`/api/projects/${projectId}/team-leader-approval`, {
      approval_status,
      remarks,
    });
    return response.data;
  },

  // 7. Assign Team Leaders
  async assignTeamLeader(projectId, { leader_name, leader_id = null, remarks = '' }) {
    const response = await api.post(`/api/projects/${projectId}/team-leader`, {
      leader_name,
      leader_id,
      remarks,
    });
    return response.data;
  },

  // 8. Assign Employees
  async assignEmployees(projectId, employees) {
    const response = await api.post(`/api/projects/${projectId}/assign-employees`, {
      employees: Array.isArray(employees) ? employees : [employees],
    });
    return response.data;
  },

  // 10. Monitor Project Progress
  async updateProgress(projectId, { progress, status = null, milestone_note = '' }) {
    const response = await api.patch(`/api/projects/${projectId}/progress`, {
      progress: parseInt(progress, 10),
      status,
      milestone_note,
    });
    return response.data;
  },

  // 11. View Project Reports
  async getReportsSummary() {
    const response = await api.get('/api/projects/reports/summary');
    return response.data;
  },
};

export default projectService;

