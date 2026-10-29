const { fixtures } = require('./fixtures')
const { buildPromptNodeHaystack, normalizePromptHaystack } = require('./promptHaystack')

/**
 * @returns {{ ok: true, assistantText: string, usage?: object } | { ok: false }}
 */
function matchPromptNodeFixture(body, messages) {
  const haystack = buildPromptNodeHaystack(body, messages)
  if (!haystack) return { ok: false }

  for (const row of fixtures) {
    const ok = row.matchWhenAll.every((needle) =>
      haystack.includes(normalizePromptHaystack(needle))
    )
    if (ok) {
      return {
        ok: true,
        assistantText: row.assistantText,
        usage: row.usage,
      }
    }
  }
  return { ok: false }
}

module.exports = { matchPromptNodeFixture }
