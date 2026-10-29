const { fixtures } = require('./fixtures')
const restartInteraction = require('./responses/restartInteraction')
const systemContinue = require('./responses/systemContinue')
const { getPending, setGate, clearPending } = require('../../sessionStore')
const { normalizeWhitespace } = require('./extractUserInput')

const AFFIRMATIVE = new Set(['yes'])
const NEGATIVE = new Set(['no'])

function normalizeExtractedKey(s) {
  return normalizeWhitespace(String(s))
}

function classifyYesNo(extracted) {
  const lower = extracted.toLowerCase()
  if (AFFIRMATIVE.has(lower)) return 'affirm'
  if (NEGATIVE.has(lower)) return 'neg'
  return null
}

/**
 * @returns {{ ok: true, response: object, setsGate?: string, delayMs?: number } | { ok: false }}
 */
function matchFixture(sessionId, extracted) {
  if (extracted == null || extracted === '') {
    return { ok: false }
  }

  const key = normalizeExtractedKey(extracted)
  const yn = classifyYesNo(key)

  if (yn) {
    const pending = getPending(sessionId)
    if (pending === 'restart') {
      clearPending(sessionId)
      return { ok: true, response: { ...restartInteraction } }
    }
    if (pending === 'transfer' || pending === 'end') {
      clearPending(sessionId)
      return { ok: true, response: { ...systemContinue } }
    }
  }

  for (const row of fixtures) {
    if (normalizeExtractedKey(row.extracted) === key) {
      clearPending(sessionId)
      return {
        ok: true,
        response: { ...row.response },
        setsGate: row.setsGate,
        delayMs: row.delayMs,
      }
    }
  }

  return { ok: false }
}

module.exports = { matchFixture, normalizeExtractedKey }
