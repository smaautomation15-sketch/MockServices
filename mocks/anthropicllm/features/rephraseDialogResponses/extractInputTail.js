const {
  normalizeEntities,
  normalizeWhitespace,
} = require('../rephraseUserQuery/extractTail')

/**
 * Text after the last `\n\nInput:` in a Rephrase Dialog Responses prompt (HTML entities normalized).
 * Requires the PDF integration marker so embedded example `Input:` lines are not used alone.
 * @returns {string|null}
 */
function extractDialogRephraseInputTail(fullUserText) {
  const t = normalizeEntities(String(fullUserText))
  if (!/Rephrase\s+Dialog\s+Responses\s+Custom\s+Integration\s+Validation/i.test(t)) {
    return null
  }
  const parts = t.split(/\n\nInput:\s*/i)
  if (parts.length < 2) return null
  const raw = parts[parts.length - 1]
  const tail = normalizeWhitespace(raw)
  return tail === '' ? null : tail
}

function tailMatchKey(s) {
  return normalizeWhitespace(String(s)).toLowerCase()
}

module.exports = {
  extractDialogRephraseInputTail,
  tailMatchKey,
}
