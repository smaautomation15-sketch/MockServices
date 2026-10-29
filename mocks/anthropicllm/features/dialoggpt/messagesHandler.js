const { streamAnthropicMessage } = require('../../streamSse')
const { getLastUserMessageText } = require('../../userMessage')
const { extractAnalyzedUserInput } = require('./extractUserInput')
const { matchFixture } = require('./matchFixture')
const { getSessionId, setGate } = require('../../sessionStore')
const { wrapStructuredText } = require('../../formatAssistantText')
const { UNMATCHED_STATUS, UNMATCHED_BODY } = require('../../unmatched')

function newMessageId() {
  return `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function handleDialoggptMessages(req, res, { body, messages }) {
  const fullUserText = getLastUserMessageText(messages)
  const extracted = extractAnalyzedUserInput(fullUserText)
  if (extracted === null) {
    res.status(UNMATCHED_STATUS).json(UNMATCHED_BODY)
    return
  }

  const sessionId = getSessionId(req)
  const match = matchFixture(sessionId, extracted)
  if (!match.ok) {
    res.status(UNMATCHED_STATUS).json(UNMATCHED_BODY)
    return
  }

  if (match.setsGate) {
    setGate(sessionId, match.setsGate)
  }

  const model =
    typeof body.model === 'string' ? body.model : 'claude-sonnet-4-5-20250929'
  const wantsStream = body.stream === true
  if (Number.isFinite(match.delayMs) && match.delayMs > 0) {
    await wait(match.delayMs)
  }

  if (wantsStream) {
    res.status(200)
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders?.()

    streamAnthropicMessage(res, {
      model,
      responsePayload: match.response,
    })
    res.end()
    return
  }

  const textPayload = wrapStructuredText(JSON.stringify(match.response))
  res.status(200).json({
    id: newMessageId(),
    type: 'message',
    role: 'assistant',
    model,
    content: [{ type: 'text', text: textPayload }],
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: {
      input_tokens: 1,
      output_tokens: Math.max(1, Math.ceil(textPayload.length / 4)),
    },
  })
}

module.exports = { handleDialoggptMessages, newMessageId }
