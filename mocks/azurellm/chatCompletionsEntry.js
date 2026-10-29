const { UNMATCHED_STATUS, UNMATCHED_BODY } = require('./unmatched')
const { matchNlpBatchTestCasesFixture } = require('./features/nlpBatchTestCasesSuggestions/matchFixture')
const {
  matchConversationTestcaseSuggestionsFixture,
} = require('./features/conversationTestcaseSuggestions/matchFixture')
const { matchTrainingUtteranceFixture } = require('./features/trainingUtteranceSuggestions/matchFixture')
const { buildChatCompletionResponse } = require('./features/trainingUtteranceSuggestions/buildCompletion')
const { streamAzureChatCompletion } = require('./streamAzureChat')

function handleAzureChatCompletions(req, res) {
  const body = req.body
  if (!body || typeof body !== 'object') {
    res.status(400).json({
      error: {
        message: 'Expected JSON body.',
        type: 'invalid_request_error',
        code: null,
      },
    })
    return
  }

  const messages = body.messages
  if (!Array.isArray(messages)) {
    res.status(400).json({
      error: {
        message: 'messages must be an array',
        type: 'invalid_request_error',
        param: 'messages',
        code: null,
      },
    })
    return
  }
  if (messages.length === 0) {
    res.status(400).json({
      error: {
        message: 'messages must not be empty',
        type: 'invalid_request_error',
        param: 'messages',
        code: null,
      },
    })
    return
  }

  let match = matchNlpBatchTestCasesFixture(messages)
  if (!match.ok) {
    match = matchConversationTestcaseSuggestionsFixture(messages)
  }
  if (!match.ok) {
    match = matchTrainingUtteranceFixture(messages)
  }
  if (!match.ok) {
    res.status(UNMATCHED_STATUS).json(UNMATCHED_BODY)
    return
  }

  const deploymentId =
    typeof req.params.deployment === 'string' ? req.params.deployment : 'unknown-deployment'

  const wantsStream = body.stream === true
  const model =
    typeof body.model === 'string' ? body.model : deploymentId || 'gpt-4o'

  if (wantsStream) {
    streamAzureChatCompletion(res, {
      model,
      assistantContent: match.assistantContent,
    })
    res.end()
    return
  }

  const payload = buildChatCompletionResponse({
    deploymentId,
    body,
    assistantContent: match.assistantContent,
    usageOverride: match.usage,
  })

  res.status(200).json(payload)
}

module.exports = { handleAzureChatCompletions }
