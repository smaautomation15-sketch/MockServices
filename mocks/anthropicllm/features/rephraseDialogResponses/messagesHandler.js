const { streamAnthropicPlainMessage } = require('../../streamSse')
const { UNMATCHED_STATUS, UNMATCHED_BODY } = require('../../unmatched')
const { matchRephraseDialogFixture } = require('./matchFixture')

function newMessageId() {
  return `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`
}

function handleRephraseDialogResponses(req, res, { body, fullUserText }) {
  const match = matchRephraseDialogFixture(fullUserText)
  if (!match.ok) {
    res.status(UNMATCHED_STATUS).json(UNMATCHED_BODY)
    return
  }

  const model =
    typeof body.model === 'string' ? body.model : 'claude-sonnet-4-5-20250929'
  const wantsStream = body.stream === true
  const text = match.assistantText
  const usage = match.usage

  if (wantsStream) {
    res.status(200)
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders?.()

    streamAnthropicPlainMessage(res, { model, text })
    res.end()
    return
  }

  res.status(200).json({
    id: newMessageId(),
    type: 'message',
    role: 'assistant',
    model,
    content: [{ type: 'text', text }],
    stop_reason: 'end_turn',
    stop_sequence: null,
    stop_details: null,
    usage,
  })
}

module.exports = { handleRephraseDialogResponses }
