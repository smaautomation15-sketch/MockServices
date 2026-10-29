const ANALYZE_PREFIX = /Now analyze this user input:\s*(.*)/is

function normalizeWhitespace(s) {
  return String(s)
    .trim()
    .replace(/\s+/g, ' ')
}

/**
 * Text after "Now analyze this user input:" (DialogGPT client contract).
 */
function extractAnalyzedUserInput(fullUserText) {
  const m = String(fullUserText).match(ANALYZE_PREFIX)
  if (!m) return null
  return normalizeWhitespace(m[1])
}

module.exports = {
  normalizeWhitespace,
  extractAnalyzedUserInput,
}
