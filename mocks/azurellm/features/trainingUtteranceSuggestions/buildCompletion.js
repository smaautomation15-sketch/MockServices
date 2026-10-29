function newChatCompletionId() {
  return `chatcmpl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}`
}

function defaultUsage(body, assistantContent) {
  const promptChars = JSON.stringify(body.messages || []).length
  const completionChars = String(assistantContent).length
  const prompt_tokens = Math.max(1, Math.ceil(promptChars / 4))
  const completion_tokens = Math.max(1, Math.ceil(completionChars / 4))
  return {
    prompt_tokens,
    completion_tokens,
    total_tokens: prompt_tokens + completion_tokens,
    prompt_tokens_details: { cached_tokens: 0, audio_tokens: 0 },
    completion_tokens_details: {
      accepted_prediction_tokens: 0,
      audio_tokens: 0,
      reasoning_tokens: 0,
      rejected_prediction_tokens: 0,
    },
  }
}

function buildChatCompletionResponse({ deploymentId, body, assistantContent, usageOverride }) {
  const requestModel = typeof body.model === 'string' ? body.model : null
  const model = requestModel || deploymentId || 'gpt-4o'
  const usage = usageOverride || defaultUsage(body, assistantContent)

  return {
    id: newChatCompletionId(),
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        finish_reason: 'stop',
        logprobs: null,
        message: {
          role: 'assistant',
          content: assistantContent,
          refusal: null,
          annotations: [],
        },
      },
    ],
    usage,
    service_tier: 'default',
    system_fingerprint: null,
  }
}

module.exports = {
  buildChatCompletionResponse,
  newChatCompletionId,
  defaultUsage,
}
