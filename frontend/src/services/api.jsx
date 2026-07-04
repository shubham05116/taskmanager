import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const refresh = localStorage.getItem('refresh_token')
      if (refresh) {
        try {
          const { data } = await axios.post(`${API_URL}/auth/refresh`, { refresh_token: refresh })
          localStorage.setItem('access_token', data.access_token)
          localStorage.setItem('refresh_token', data.refresh_token)
          original.headers.Authorization = `Bearer ${data.access_token}`
          return api(original)
        } catch {
          localStorage.clear()
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

export const authAPI = {
  register: (d) => api.post('/auth/register', d),
  login: (d) => api.post('/auth/login', d),
  refresh: (t) => api.post('/auth/refresh', { refresh_token: t }),
  me: () => api.get('/auth/me'),
}

export const usersAPI = {
  list: (search) => api.get('/users', { params: { search } }),
  me: () => api.get('/users/me'),
  updateMe: (d) => api.put('/users/me', d),
  get: (id) => api.get(`/users/${id}`),
}

export const projectsAPI = {
  create: (d) => api.post('/projects', d),
  list: (status) => api.get('/projects', { params: { status } }),
  get: (id) => api.get(`/projects/${id}`),
  update: (id, d) => api.put(`/projects/${id}`, d),
  delete: (id) => api.delete(`/projects/${id}`),
}

export const tasksAPI = {
  create: (d) => api.post('/tasks', d),
  listByProject: (projectId, filters) => api.get(`/tasks/project/${projectId}`, { params: filters }),
  get: (id) => api.get(`/tasks/${id}`),
  update: (id, d) => api.put(`/tasks/${id}`, d),
  delete: (id) => api.delete(`/tasks/${id}`),
  addComment: (taskId, d) => api.post(`/tasks/${taskId}/comments`, d),
  getComments: (taskId) => api.get(`/tasks/${taskId}/comments`),
}

export const teamsAPI = {
  getByProject: (pid) => api.get(`/teams/project/${pid}`),
  addMember: (pid, d) => api.post(`/teams/project/${pid}/members`, d),
  removeMember: (pid, uid) => api.delete(`/teams/project/${pid}/members/${uid}`),
  updateRole: (pid, uid, role) => api.put(`/teams/project/${pid}/members/${uid}/role`, null, { params: { role } }),
}

export const notificationsAPI = {
  list: (unreadOnly) => api.get('/notifications', { params: { unread_only: unreadOnly } }),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
}

export default api
