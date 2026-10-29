function normalizeEntities(s) {
  return String(s)
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/g, '&')
}

function normalizeWhitespace(s) {
  return String(s)
    .trim()
    .replace(/\s+/g, ' ')
}

const HISTORY_BLOCK =
  /<<\s*ConversationHistory:\s*"[\s\S]*?"\s*>>/gi

/**
 * Text after the **last** `<<ConversationHistory: "…">>` block (HTML entities normalized).
 * @returns {string|null}
 */
function extractTailAfterConversationHistory(fullUserText) {
  const t = normalizeEntities(fullUserText)
  const blocks = [...t.matchAll(HISTORY_BLOCK)]
  if (blocks.length === 0) return null
  const last = blocks[blocks.length - 1]
  const end = last.index + last[0].length
  const tail = normalizeWhitespace(t.slice(end))
  return tail === '' ? null : tail
}

function tailMatchKey(s) {
  return normalizeWhitespace(String(s)).toLowerCase()
}

module.exports = {
  normalizeEntities,
  extractTailAfterConversationHistory,
  normalizeWhitespace,
  tailMatchKey,
}
