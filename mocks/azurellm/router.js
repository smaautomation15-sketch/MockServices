const express = require('express')
const { MOCK_AZURE_OPENAI_API_KEY } = require('./constants')
const { requireAzureOpenAIApiKey } = require('./requireAzureApiKey')
const { handleAzureChatCompletions } = require('./chatCompletionsEntry')

const router = express.Router()

/**
 * Mirrors Azure OpenAI URL shape:
 * POST /openai/deployments/{deployment-id}/chat/completions?api-version=...
 *
 * Dispatches by prompt: **NLP Batch Test Cases Suggestions** (`Generate exactly 8…`), then
 * **Conversation Test Case Suggestions** (`Generate just the 5 possible next user inputs…`), then
 * **Training Utterance Suggestions** (`Generate intent training samples` …).
 */
router.post(
  '/openai/deployments/:deployment/chat/completions',
  requireAzureOpenAIApiKey(MOCK_AZURE_OPENAI_API_KEY),
  handleAzureChatCompletions
)

module.exports = router
