/**
 * In-memory continuation state for multi-turn rows (restart / agent transfer / end chat).
 * Clients should send header x-mock-session-id per conversation; defaults to "default".
 */
const sessions = new Map()

function getSessionId(req) {
  const id = req.headers['x-mock-session-id']
  return typeof id === 'string' && id.trim() !== '' ? id.trim() : 'default'
}

function getPending(sessionId) {
  return sessions.get(sessionId)?.pending ?? null
}

function setGate(sessionId, gate) {
  const cur = sessions.get(sessionId) || {}
  cur.pending = gate
  sessions.set(sessionId, cur)
}

function clearSession(sessionId) {
  sessions.delete(sessionId)
}

function clearPending(sessionId) {
  const cur = sessions.get(sessionId)
  if (cur) {
    cur.pending = null
    sessions.set(sessionId, cur)
  }
}

module.exports = {
  getSessionId,
  getPending,
  setGate,
  clearPending,
  clearSession,
}
