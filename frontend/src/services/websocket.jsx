const WS_URL = import.meta.env.VITE_WS_URL ||
  `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`

class WebSocketService {
  constructor() {
    this.connections = {}
    this.handlers = {}
    this._reconnectTimers = {}
  }

  _key(type, id) { return `${type}_${id}` }

  connect(projectId) {
    const key = this._key('project', projectId)
    if (this.connections[key]?.readyState === WebSocket.OPEN) return
    const token = localStorage.getItem('access_token')
    if (!token) return

    const ws = new WebSocket(`${WS_URL}/ws/${projectId}?token=${token}`)
    ws.onopen = () => {
      ws._ping = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }))
      }, 25000)
    }
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.type === 'pong') return
        ;(this.handlers[key] || []).forEach(h => h(data))
      } catch {}
    }
    ws.onclose = () => {
      clearInterval(ws._ping)
      delete this.connections[key]
      this._reconnectTimers[key] = setTimeout(() => this.connect(projectId), 3000)
    }
    ws.onerror = () => {}
    this.connections[key] = ws
  }

  connectUser(userId) {
    const key = this._key('user', userId)
    if (this.connections[key]?.readyState === WebSocket.OPEN) return
    const token = localStorage.getItem('access_token')
    if (!token) return

    const ws = new WebSocket(`${WS_URL}/ws/user/${userId}?token=${token}`)
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        ;(this.handlers[key] || []).forEach(h => h(data))
      } catch {}
    }
    ws.onclose = () => { delete this.connections[key] }
    ws.onerror = () => {}
    this.connections[key] = ws
  }

  subscribe(key, handler) {
    if (!this.handlers[key]) this.handlers[key] = []
    this.handlers[key].push(handler)
    return () => {
      this.handlers[key] = (this.handlers[key] || []).filter(h => h !== handler)
    }
  }

  subscribeToProject(projectId, handler) {
    return this.subscribe(this._key('project', projectId), handler)
  }

  subscribeToUser(userId, handler) {
    return this.subscribe(this._key('user', userId), handler)
  }

  disconnect(projectId) {
    const key = this._key('project', projectId)
    clearTimeout(this._reconnectTimers[key])
    this.connections[key]?.close()
    delete this.connections[key]
  }

  disconnectAll() {
    Object.values(this._reconnectTimers).forEach(clearTimeout)
    Object.values(this.connections).forEach(ws => ws.close())
    this.connections = {}
    this.handlers = {}
    this._reconnectTimers = {}
  }
}

export const wsService = new WebSocketService()
