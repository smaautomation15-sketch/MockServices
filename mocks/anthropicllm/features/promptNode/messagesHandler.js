const { streamAnthropicPlainMessage } = require('../../streamSse')
const { UNMATCHED_STATUS, UNMATCHED_BODY } = require('../../unmatched')
const { matchPromptNodeFixture } = require('./matchFixture')
const { buildPromptNodeHaystack } = require('./promptHaystack')

function newMessageId() {
  return `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`
}

function defaultUsage(haystack, assistantText) {
  const input_tokens = Math.max(1, Math.ceil(String(haystack).length / 4))
  const output_tokens = Math.max(1, Math.ceil(String(assistantText).length / 4))
  return {
    input_tokens,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
    cache_creation: {
      ephemeral_5m_input_tokens: 0,
      ephemeral_1h_input_tokens: 0,
    },
    output_tokens,
    service_tier: 'standard',
    inference_geo: 'not_available',
  }
}

function handlePromptNode(req, res, { body, messages }) {
  const match = matchPromptNodeFixture(body, messages)
  if (!match.ok) {
    res.status(UNMATCHED_STATUS).json(UNMATCHED_BODY)
    return
  }

  const model =
    typeof body.model === 'string' ? body.model : 'claude-sonnet-4-5-20250929'
  const wantsStream = body.stream === true
  const text = match.assistantText
  const haystack = buildPromptNodeHaystack(body, messages)
  const usage = match.usage || defaultUsage(haystack, text)

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

module.exports = { handlePromptNode }
