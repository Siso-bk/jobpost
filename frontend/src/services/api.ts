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

// With cookie-based auth, send CSRF header for mutating requests.
api.interceptors.request.use((config) => {
  const method = (config.method || 'get').toLowerCase();
  const isUnsafe = !['get', 'head', 'options'].includes(method);
  if (isUnsafe) {
    const token = getCookie('csrfToken');
    if (token) {
      config.headers = config.headers || {};
      config.headers['x-csrf-token'] = token;
    }
  }
  return config;
});

export const authService = {
  register: (name: string, email: string, password: string, role: string) =>
    api.post('/auth/register', { name, email, password, role }),
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  paiSignup: (email: string) => api.post('/auth/pai-signup', { email }),
  paiSignupVerify: (email: string, code: string) => api.post('/auth/pai-signup/verify', { email, code }),
  paiSignupComplete: (payload: { preToken: string; name: string; handle: string; password: string; role: string }) =>
    api.post('/auth/pai-signup/complete', payload),
  paiLogin: (email: string, password: string) => api.post('/auth/pai-login', { email, password }),
  paiResend: (email: string) => api.post('/auth/pai-resend', { email }),
  paiVerifyCode: (payload: { email: string; code: string; role: string }) => api.post('/auth/pai-verify-code', payload),
};

export const jobsService = {
  getAllJobs: (filters: { title?: string; location?: string; jobType?: string; page?: number; limit?: number }) =>
    api.get('/jobs', { params: filters }),
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
  updateApplicationStatus: (id: string, status: string) => api.put(`/applications/${id}`, { status }),
};

export const usersService = {
  getUserProfile: (id: string) => api.get(`/users/${id}`),
  updateProfile: (id: string, data: any) => api.put(`/users/${id}`, data),
  uploadResume: (dataUrl: string) => api.post('/users/upload-resume', { dataUrl }),
  searchWorkers: (filters: { search?: string; location?: string; skill?: string; availability?: string; minExp?: number; maxExp?: number }) =>
    api.get('/users/workers', { params: filters }),
};

export default api;
