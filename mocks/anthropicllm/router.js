const express = require('express')
const { requireMockApiKey } = require('../shared/mockApiKey')
const { MOCK_ANTHROPIC_API_KEY } = require('./constants')
const { handleMessages } = require('./messagesHandler')

const router = express.Router()

router.post(
  '/v1/messages',
  requireMockApiKey(MOCK_ANTHROPIC_API_KEY),
  handleMessages
)

module.exports = router
