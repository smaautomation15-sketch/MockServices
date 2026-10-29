function chunkString(str, size) {
  const chunks = []
  for (let i = 0; i < str.length; i += size) {
    chunks.push(str.slice(i, i + size))
  }
  return chunks
}

/**
 * Azure / OpenAI chat completions streaming (SSE).
 * @see https://learn.microsoft.com/en-us/azure/ai-services/openai/how-to/chatgpt
 */
function streamAzureChatCompletion(res, { model, assistantContent }) {
  const id = `chatcmpl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}`
  const created = Math.floor(Date.now() / 1000)

  res.status(200)
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders?.()

  const writeChunk = (obj) => {
    res.write(`data: ${JSON.stringify(obj)}\n\n`)
  }

  writeChunk({
    id,
    object: 'chat.completion.chunk',
    created,
    model,
    choices: [
      {
        index: 0,
        delta: { role: 'assistant', content: '' },
        finish_reason: null,
        logprobs: null,
      },
    ],
  })

  const parts = chunkString(assistantContent, 120)
  for (let i = 0; i < parts.length; i++) {
    writeChunk({
      id,
      object: 'chat.completion.chunk',
      created,
      model,
      choices: [
        {
          index: 0,
          delta: { content: parts[i] },
          finish_reason: null,
          logprobs: null,
        },
      ],
    })
  }

  writeChunk({
    id,
    object: 'chat.completion.chunk',
    created,
    model,
    choices: [
      {
        index: 0,
        delta: {},
        finish_reason: 'stop',
        logprobs: null,
      },
    ],
  })

  res.write('data: [DONE]\n\n')
}

module.exports = { streamAzureChatCompletion }
