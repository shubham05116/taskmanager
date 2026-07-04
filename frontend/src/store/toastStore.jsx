import { create } from 'zustand'

const useToastStore = create((set, get) => ({
  toasts: [],
  addToast: (message, type = 'info', duration = 3500) => {
    const id = Date.now()
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }))
    setTimeout(() => get().removeToast(id), duration)
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) })),
  success: (msg) => get().addToast(msg, 'success'),
  error: (msg) => get().addToast(msg, 'error'),
  info: (msg) => get().addToast(msg, 'info'),
}))

export default useToastStore
