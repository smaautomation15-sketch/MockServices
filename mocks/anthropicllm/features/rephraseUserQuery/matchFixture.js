const { fixtures } = require('./fixtures')
const {
  extractTailAfterConversationHistory,
  tailMatchKey,
} = require('./extractTail')
const { wrapRephraseJson } = require('./formatAssistantText')

/**
 * @returns {{ ok: true, response: object, assistantText: string } | { ok: false }}
 */
function matchRephraseFixture(fullUserText) {
  const tail = extractTailAfterConversationHistory(fullUserText)
  if (tail == null || tail === '') {
    return { ok: false }
  }
  const key = tailMatchKey(tail)

  for (const row of fixtures) {
    if (tailMatchKey(row.userTail) === key) {
      return {
        ok: true,
        response: { ...row.response },
        assistantText: wrapRephraseJson(row.response),
      }
    }
  }
  return { ok: false }
}

module.exports = { matchRephraseFixture }
