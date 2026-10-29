/**
 * Flatten OpenAI/Azure chat message content for fixture matching.
 */
function flattenMessageContent(content) {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content
    .map((part) => {
      if (part && typeof part === 'object' && typeof part.text === 'string') {
        return part.text
      }
      return ''
    })
    .join('')
}

/** Join all turns into one searchable string (lowercased by caller). */
function concatMessagesForMatch(messages) {
  if (!Array.isArray(messages)) return ''
  return messages
    .map((m) => {
      if (!m || typeof m !== 'object') return ''
      const role = typeof m.role === 'string' ? m.role : ''
      const text = flattenMessageContent(m.content)
      return `${role}:${text}`
    })
    .join('\n')
}

function normalizeMatchHaystack(s) {
  return String(s)
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/g, '&')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

module.exports = {
  flattenMessageContent,
  concatMessagesForMatch,
  normalizeMatchHaystack,
}
