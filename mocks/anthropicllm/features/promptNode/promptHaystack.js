const { flattenUserContent } = require('../../userMessage')

function flattenSystemField(system) {
  if (system == null || system === '') return ''
  if (typeof system === 'string') return system
  if (Array.isArray(system)) {
    return system
      .map((block) => {
        if (block && typeof block === 'object' && block.type === 'text' && typeof block.text === 'string') {
          return block.text
        }
        return ''
      })
      .join('')
  }
  return ''
}

function normalizePromptHaystack(s) {
  return String(s)
    .replace(/[\u201c\u201d\u00ab\u00bb]/g, '"')
    .replace(/[\u2018\u2019\u2032]/g, "'")
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

/**
 * System + all message contents (Prompt Node.pdf uses top-level `system` plus `messages`).
 */
function buildPromptNodeHaystack(body, messages) {
  const sys = flattenSystemField(body?.system)
  const msgParts = (messages || []).map((m) => {
    if (!m || typeof m !== 'object') return ''
    return flattenUserContent(m.content)
  })
  return normalizePromptHaystack([sys, ...msgParts].filter(Boolean).join('\n'))
}

function isPromptNodePrompt(body, messages) {
  const h = buildPromptNodeHaystack(body, messages)
  return h.includes('act as a score calculator')
}

module.exports = {
  flattenSystemField,
  buildPromptNodeHaystack,
  normalizePromptHaystack,
  isPromptNodePrompt,
}
