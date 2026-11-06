import api from './api';

/**
 * EmployeeTaskService - Handles all 10 employee task and sprint workflows:
 * 9. View Team Details
 * 10. View Assigned Tasks
 * 11. Update Task Status
 * 12. Submit Daily Work
 * 13. Upload Documents / Screenshots
 * 14. View Task Feedback
 * 15. Resubmit Tasks
 * 16. View Deadlines
 * 17. View Notifications
 * 18. View My Performance
 */
export const employeeTaskService = {
  // 9. View Team Details
  async getMyTeam() {
    const response = await api.get('/api/employee-tasks/team');
    return response.data;
  },

  // 10. View Assigned Tasks
  async getAssignedTasks(params = {}) {
    const response = await api.get('/api/employee-tasks/tasks', { params });
    return response.data;
  },

  // 11. Update Task Status
  async updateTaskStatus(taskId, { status, progress, notes = '' }) {
    const response = await api.patch(`/api/employee-tasks/tasks/${taskId}/status`, {
      status,
      progress: Number(progress),
      notes,
    });
    return response.data;
  },

  // 12. Submit Daily Work
  async submitDailyWork(payload) {
    const response = await api.post('/api/employee-tasks/daily-work', payload);
    return response.data;
  },

  async getMyDailyWork() {
    const response = await api.get('/api/employee-tasks/daily-work');
    return response.data;
  },

  // 13. Upload Documents / Screenshots & Submit Deliverables
  async uploadAttachment(payload) {
    const response = await api.post('/api/employee-tasks/upload-attachment', payload);
    return response.data;
  },

  async submitDeliverables(taskId, { submission_notes, attachments = [], progress = 100 }) {
    const response = await api.post(`/api/employee-tasks/tasks/${taskId}/submit`, {
      submission_notes,
      attachments,
      progress,
    });
    return response.data;
  },

  // 14. View Task Feedback
  async getTaskFeedback() {
    const response = await api.get('/api/employee-tasks/feedback');
    return response.data;
  },

  // 15. Resubmit Tasks
  async resubmitTask(taskId, { resubmission_notes, attachments = [], progress = 100 }) {
    const response = await api.post(`/api/employee-tasks/tasks/${taskId}/resubmit`, {
      resubmission_notes,
      attachments,
      progress,
    });
    return response.data;
  },

  // 16. View Deadlines
  async getDeadlinesOverview() {
    const response = await api.get('/api/employee-tasks/deadlines');
    return response.data;
  },

  // 17. View Notifications
  async getNotifications() {
    const response = await api.get('/api/employee-tasks/notifications');
    return response.data;
  },

  async markNotificationRead(notificationId) {
    const response = await api.patch(`/api/employee-tasks/notifications/${notificationId}/read`);
    return response.data;
  },

  // 18. View My Performance
  async getMyPerformance() {
    const response = await api.get('/api/employee-tasks/my-performance');
    return response.data;
  },
};

export default employeeTaskService;

