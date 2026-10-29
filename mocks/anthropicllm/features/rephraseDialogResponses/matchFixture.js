const { fixtures } = require('./fixtures')
const { extractDialogRephraseInputTail, tailMatchKey } = require('./extractInputTail')
const { wrapDialogRephraseJson } = require('./formatAssistantText')

/**
 * @returns {{ ok: true, response: object, assistantText: string, usage: object } | { ok: false }}
 */
function matchRephraseDialogFixture(fullUserText) {
  const tail = extractDialogRephraseInputTail(fullUserText)
  if (tail == null) return { ok: false }
  const key = tailMatchKey(tail)

  for (const row of fixtures) {
    if (tailMatchKey(row.inputTail) === key) {
      return {
        ok: true,
        response: { ...row.response },
        assistantText: wrapDialogRephraseJson(row.response),
        usage: row.usage,
      }
    }
  }
  return { ok: false }
}

module.exports = { matchRephraseDialogFixture }
