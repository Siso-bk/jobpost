import axios from 'axios';

const API_BASE_URL =
  typeof window === 'undefined'
    ? process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL || 'http://localhost:5000/api'
    : '/api';

export const api = axios.create({ baseURL: API_BASE_URL, withCredentials: true });

function getCookie(name: string) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

let csrfWarmup: Promise<void> | null = null;

async function ensureCsrfCookie() {
  if (typeof document === 'undefined') return;
  if (getCookie('csrfToken')) return;
  if (!csrfWarmup) {
    csrfWarmup = api
      .get('/health')
      .then(() => undefined)
      .catch(() => undefined)
      .finally(() => {
        csrfWarmup = null;
      });
  }
  await csrfWarmup;
}

// With cookie-based auth, send CSRF header for mutating requests.
api.interceptors.request.use(async (config) => {
  const method = (config.method || 'get').toLowerCase();
  const isUnsafe = !['get', 'head', 'options'].includes(method);
  if (isUnsafe) {
    await ensureCsrfCookie();
    const token = getCookie('csrfToken');
    if (token) {
      config.headers = config.headers || {};
      config.headers['x-csrf-token'] = token;
    }
  }
  return config;
});

export const authService = {
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  paiSignup: (email: string) => api.post('/auth/pai-signup', { email }),
  paiSignupVerify: (email: string, code: string) =>
    api.post('/auth/pai-signup/verify', { email, code }),
  paiSignupComplete: (payload: {
    preToken: string;
    name: string;
    handle: string;
    password: string;
    role: string;
  }) => api.post('/auth/pai-signup/complete', payload),
  paiLogin: (email: string, password: string) => api.post('/auth/pai-login', { email, password }),
  paiResend: (email: string) => api.post('/auth/pai-resend', { email }),
  paiVerifyCode: (payload: { email: string; code: string; role: string }) =>
    api.post('/auth/pai-verify-code', payload),
};

export const jobsService = {
  getAllJobs: (filters: {
    title?: string;
    location?: string;
    jobType?: string;
    page?: number;
    limit?: number;
  }) => api.get('/jobs', { params: filters }),
  getJobById: (id: string) => api.get(`/jobs/${id}`),
  getMyJobs: () => api.get('/jobs/mine'),
  createJob: (jobData: any) => api.post('/jobs', jobData),
  updateJob: (id: string, jobData: any) => api.put(`/jobs/${id}`, jobData),
  deleteJob: (id: string) => api.delete(`/jobs/${id}`),
};

export const applicationsService = {
  applyForJob: (jobId: string, data: any) => api.post('/applications', { jobId, ...data }),
  getMyApplications: () => api.get('/applications'),
  getEmployerApplications: () => api.get('/applications/employer'),
  getApplicationById: (id: string) => api.get(`/applications/${id}`),
  updateApplicationStatus: (id: string, status: string) =>
    api.put(`/applications/${id}`, { status }),
  deleteApplication: (id: string) => api.delete(`/applications/${id}`),
};

export const conversationsService = {
  list: () => api.get('/conversations'),
  create: (recipientId: string) => api.post('/conversations', { recipientId }),
  getMessages: (conversationId: string, limit = 50) =>
    api.get(`/conversations/${conversationId}/messages`, { params: { limit } }),
  sendMessage: (conversationId: string, body: string) =>
    api.post(`/conversations/${conversationId}/messages`, { body }),
  markRead: (conversationId: string) => api.post(`/conversations/${conversationId}/read`),
  unreadCount: () => api.get('/conversations/unread-count'),
};

export const blocksService = {
  list: () => api.get('/blocks'),
  status: (userId: string) => api.get(`/blocks/status/${userId}`),
  block: (userId: string) => api.post('/blocks', { userId }),
  unblock: (userId: string) => api.delete(`/blocks/${userId}`),
};

export const reportsService = {
  create: (payload: {
    targetUserId: string;
    reason: string;
    messageId?: string;
    conversationId?: string;
  }) => api.post('/reports', payload),
};

export const notificationsService = {
  list: (limit = 30) => api.get('/notifications', { params: { limit } }),
  markAllRead: () => api.post('/notifications/read'),
  markRead: (id: string) => api.post(`/notifications/${id}/read`),
};

export const moderationService = {
  listReports: (status = 'open') => api.get('/moderation/reports', { params: { status } }),
  resolveReport: (id: string) => api.post(`/moderation/reports/${id}/resolve`),
  removeMessage: (id: string) => api.post(`/moderation/messages/${id}/remove`),
};

export const usersService = {
  getUserProfile: (id: string) => api.get(`/users/${id}`),
  updateProfile: (id: string, data: any) => api.put(`/users/${id}`, data),
  deleteMe: () => api.delete('/users/me'),
  uploadResume: (dataUrl: string) => api.post('/users/upload-resume', { dataUrl }),
  searchWorkers: (filters: {
    search?: string;
    location?: string;
    skill?: string;
    availability?: string;
    minExp?: number;
    maxExp?: number;
  }) => api.get('/users/workers', { params: filters }),
};

export default api;
