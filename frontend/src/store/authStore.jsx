import { create } from 'zustand'
import { authAPI } from '../services/api.jsx'
import { wsService } from '../services/websocket.jsx'

const useAuthStore = create((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  init: async () => {
    const token = localStorage.getItem('access_token')
    if (!token) { set({ isLoading: false }); return }
    try {
      const { data } = await authAPI.me()
      set({ user: data, isAuthenticated: true, isLoading: false })
      wsService.connectUser(data.id)
    } catch {
      localStorage.clear()
      set({ isLoading: false })
    }
  },

  login: async (credentials) => {
    const { data } = await authAPI.login(credentials)
    localStorage.setItem('access_token', data.access_token)
    localStorage.setItem('refresh_token', data.refresh_token)
    set({ user: data.user, isAuthenticated: true })
    wsService.connectUser(data.user.id)
    return data
  },

  register: async (userData) => {
    const { data } = await authAPI.register(userData)
    return data
  },

  logout: () => {
    localStorage.clear()
    wsService.disconnectAll()
    set({ user: null, isAuthenticated: false })
  },

  updateUser: (updates) => set((s) => ({ user: { ...s.user, ...updates } })),
}))

export default useAuthStore
