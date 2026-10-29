const { fixtures } = require('./fixtures')
const { normalizeMatchHaystack } = require('../../messagesFlatten')

/**
 * @returns {{ ok: true, assistantContent: string, usage?: object } | { ok: false }}
 */
function matchTrainingUtteranceFixture(messages) {
  if (!Array.isArray(messages)) return { ok: false }

  const raw = messages
    .map((m) => {
      if (!m || typeof m !== 'object') return ''
      const role = typeof m.role === 'string' ? m.role : ''
      let text = ''
      const c = m.content
      if (typeof c === 'string') text = c
      else if (Array.isArray(c)) {
        text = c
          .map((p) => (p && typeof p.text === 'string' ? p.text : ''))
          .join('')
      }
      return `${role}:${text}`
    })
    .join('\n')

  const haystack = normalizeMatchHaystack(raw)
  if (!haystack) return { ok: false }

  for (const row of fixtures) {
    const ok = row.matchWhenAll.every((needle) =>
      haystack.includes(normalizeMatchHaystack(needle))
    )
    if (ok) {
      return {
        ok: true,
        assistantContent: row.assistantContent,
        usage: row.usage,
      }
    }
  }
  return { ok: false }
}

module.exports = { matchTrainingUtteranceFixture }
