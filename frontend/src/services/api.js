import axios from 'axios';

/**
 * Arshith Connect - API Service
 * Configured Axios instance ready for future FastAPI backend integration.
 */
// Determine base URL dynamically:
// 1. In browser when served from FastAPI (e.g. port 8000 or production host), use relative '' for zero CORS & origin issues.
// 2. In Vite dev server (e.g. port 5173), Vite proxies /api to port 8000 seamlessly.
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    if (window.location.port === '8000' || !window.location.port) {
      return '';
    }
  }
  return import.meta.env.VITE_API_BASE_URL || '';
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request Interceptor: Attach Auth Token if present and handle FormData boundary
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('arshith_auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // When sending FormData, delete Content-Type so browser/Axios generates multipart/form-data with exact boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
      delete config.headers['content-type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Uniform error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Optional: Redirect to login or dispatch session timeout
      console.warn('API returned 401 Unauthorized.');
    }
    return Promise.reject(error);
  }
);

export { authService } from './authService';
export { attendanceService } from './attendanceService';
export { leaveService } from './leaveService';
export { holidayService } from './holidayService';
export { meetingService } from './meetingService';
export { announcementService } from './announcementService';
export { employeeService } from './employeeService';
export { reportService } from './reportService';
export { teamService } from './teamService';
export { assignmentService } from './assignmentService';
export { workUpdateService } from './workUpdateService';
export { registrationRequestService } from './registrationRequestService';
export { officeTimingService } from './officeTimingService';
export { dashboardService } from './dashboardService';
export { payrollService } from './payrollService';
export { payslipService } from './payslipService';
export { paymentService } from './paymentService';
export { loanService } from './loanService';
export { separationService } from './separationService';
export { recruitmentService } from './recruitmentService';
export { performanceService } from './performanceService';
export { departmentService } from './departmentService';
export { auditService } from './auditService';
export { settingsService } from './settingsService';
export { chatService } from './chatService';
export { projectService } from './projectService';
export { teamLeaderService } from './teamLeaderService';
export { employeeTaskService } from './employeeTaskService';

export default api;

