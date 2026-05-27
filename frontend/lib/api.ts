import axios, { AxiosError } from 'axios'
import Cookies from 'js-cookie'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = Cookies.get('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean }
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      const refresh = Cookies.get('refresh_token')
      if (refresh) {
        try {
          const { data } = await axios.post(`${API_URL}/api/auth/token/refresh/`, { refresh })
          Cookies.set('access_token', data.access, { expires: 1 })
          originalRequest.headers = originalRequest.headers || {}
          originalRequest.headers.Authorization = `Bearer ${data.access}`
          return api(originalRequest)
        } catch {
          Cookies.remove('access_token')
          Cookies.remove('refresh_token')
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

// Auth
export const authApi = {
  login: (username: string, password: string) =>
    api.post('/api/auth/login/', { username, password }),
  login2fa: (userId: number, code: string) =>
    api.post('/api/auth/login/2fa/', { user_id: userId, code }),
  logout: (refresh: string) => api.post('/api/auth/logout/', { refresh }),
  me: () => api.get('/api/auth/me/'),
  changePassword: (data: { old_password: string; new_password: string; confirm_password: string }) =>
    api.post('/api/auth/change-password/', data),
  setup2fa: () => api.get('/api/auth/2fa/setup/'),
  verify2fa: (code: string, action: 'enable' | 'verify') =>
    api.post('/api/auth/2fa/verify/', { code, action }),
}

// Clinic
export const clinicApi = {
  get: () => api.get('/api/clinic/'),
  update: (data: Partial<{ name: string; phone: string; email: string; address: string }>) =>
    api.put('/api/clinic/', data),
  getSettings: () => api.get('/api/clinic/settings/'),
  updateSettings: (data: FormData) =>
    api.put('/api/clinic/settings/', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
}

// Patients
export const patientsApi = {
  list: (params?: { q?: string; page?: number }) =>
    api.get('/api/patients/', { params }),
  search: (q: string) => api.get('/api/patients/search/', { params: { q } }),
  get: (id: number) => api.get(`/api/patients/${id}/`),
  create: (data: Partial<{ name: string; cpf: string; birth_date: string; phone: string; email: string; address: string; notes: string }>) =>
    api.post('/api/patients/', data),
  update: (id: number, data: unknown) => api.patch(`/api/patients/${id}/`, data),
  createPortalAccess: (id: number) => api.post(`/api/patients/${id}/create-portal-access/`),
}

// Reports
export const reportsApi = {
  list: (params?: { status?: string; patient?: number; page?: number }) =>
    api.get('/api/reports/', { params }),
  get: (id: number) => api.get(`/api/reports/${id}/`),
  upload: (data: FormData) =>
    api.post('/api/reports/', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  approve: (id: number) => api.post(`/api/reports/${id}/approve/`),
  reject: (id: number, notes: string) => api.post(`/api/reports/${id}/reject/`, { notes }),
  requestRevision: (id: number, notes: string) => api.post(`/api/reports/${id}/revision/`, { notes }),
  reupload: (id: number, data: FormData) =>
    api.post(`/api/reports/${id}/reupload/`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  sign: (id: number) => api.post(`/api/reports/${id}/sign/`),
  publish: (id: number) => api.post(`/api/reports/${id}/publish/`),
  getDownloadUrl: (id: number) => api.get(`/api/reports/${id}/download/`),
}

// Super Admin
export const superAdminApi = {
  dashboard: () => api.get('/api/auth/superadmin/dashboard/'),
  listClinics: () => api.get('/api/auth/superadmin/clinics/'),
  getClinic: (id: number) => api.get(`/api/auth/superadmin/clinics/${id}/`),
  updateClinic: (id: number, data: Record<string, unknown>) =>
    api.patch(`/api/auth/superadmin/clinics/${id}/`, data),
}

// Audit
export const auditApi = {
  list: (params?: { action?: string; page?: number }) =>
    api.get('/api/audit-logs/', { params }),
}

// Dashboard
export const dashboardApi = {
  get: () => api.get('/api/dashboard/'),
}
