const { fixtures } = require('./fixtures')

function normalizeForMatch(s) {
  return String(s)
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

/**
 * @returns {{ ok: true, assistantText: string } | { ok: false }}
 */
function matchConversationSummaryFixture(fullUserText) {
  const haystack = normalizeForMatch(fullUserText)
  if (!haystack) return { ok: false }

  for (const row of fixtures) {
    const ok = row.matchWhenAll.every((needle) =>
      haystack.includes(normalizeForMatch(needle))
    )
    if (ok) {
      return { ok: true, assistantText: row.assistantText }
    }
  }
  return { ok: false }
}

module.exports = { matchConversationSummaryFixture, normalizeForMatch }
