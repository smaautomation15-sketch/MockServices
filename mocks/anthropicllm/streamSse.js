/**
 * Anthropic Messages streaming — SSE shape aligned with
 * https://docs.anthropic.com/en/api/messages-streaming
 */

const { wrapStructuredText } = require('./formatAssistantText')

function chunkString(str, size) {
  const chunks = []
  for (let i = 0; i < str.length; i += size) {
    chunks.push(str.slice(i, i + size))
  }
  return chunks
}

function writeSse(res, eventName, dataObj) {
  if (eventName) {
    res.write(`event: ${eventName}\n`)
  }
  res.write(`data: ${JSON.stringify(dataObj)}\n\n`)
}

/**
 * Streams an assistant message whose single text block is fenced JSON.stringify(responsePayload).
 */
function streamAnthropicMessage(res, { model, responsePayload }) {
  const text = wrapStructuredText(JSON.stringify(responsePayload))
  const id = `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`
  const outputTokens = Math.max(1, Math.ceil(text.length / 4))

  writeSse(res, 'message_start', {
    type: 'message_start',
    message: {
      id,
      type: 'message',
      role: 'assistant',
      content: [],
      model,
      stop_reason: null,
      stop_sequence: null,
      usage: { input_tokens: 1, output_tokens: 1 },
    },
  })

  writeSse(res, null, {
    type: 'content_block_start',
    index: 0,
    content_block: { type: 'text', text: '' },
  })

  const parts = chunkString(text, 100)
  for (const part of parts) {
    writeSse(res, null, {
      type: 'content_block_delta',
      index: 0,
      delta: { type: 'text_delta', text: part },
    })
  }

  writeSse(res, null, {
    type: 'content_block_stop',
    index: 0,
  })

  writeSse(res, null, {
    type: 'message_delta',
    delta: {
      stop_reason: 'end_turn',
      stop_sequence: null,
    },
    usage: { output_tokens: outputTokens },
  })

  writeSse(res, null, {
    type: 'message_stop',
  })
}

/**
 * Same SSE framing as {@link streamAnthropicMessage}, but the text block is raw assistant
 * markdown (Conversation Summary), not fenced JSON.
 */
function streamAnthropicPlainMessage(res, { model, text }) {
  const id = `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`
  const outputTokens = Math.max(1, Math.ceil(text.length / 4))

  writeSse(res, 'message_start', {
    type: 'message_start',
    message: {
      id,
      type: 'message',
      role: 'assistant',
      content: [],
      model,
      stop_reason: null,
      stop_sequence: null,
      usage: { input_tokens: 1, output_tokens: 1 },
    },
  })

  writeSse(res, null, {
    type: 'content_block_start',
    index: 0,
    content_block: { type: 'text', text: '' },
  })

  const parts = chunkString(text, 100)
  for (const part of parts) {
    writeSse(res, null, {
      type: 'content_block_delta',
      index: 0,
      delta: { type: 'text_delta', text: part },
    })
  }

  writeSse(res, null, {
    type: 'content_block_stop',
    index: 0,
  })

  writeSse(res, null, {
    type: 'message_delta',
    delta: {
      stop_reason: 'end_turn',
      stop_sequence: null,
    },
    usage: { output_tokens: outputTokens },
  })

  writeSse(res, null, {
    type: 'message_stop',
  })
}

module.exports = {
  streamAnthropicMessage,
  streamAnthropicPlainMessage,
}
