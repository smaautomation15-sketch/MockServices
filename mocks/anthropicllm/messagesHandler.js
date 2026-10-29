const { getLastUserMessageText } = require('./userMessage')
const { handleDialoggptMessages } = require('./features/dialoggpt/messagesHandler')
const { handleConversationSummary } = require('./features/conversationSummary/messagesHandler')
const { isConversationSummaryPrompt } = require('./features/conversationSummary/detect')
const { handleRephraseDialogResponses } = require('./features/rephraseDialogResponses/messagesHandler')
const { isRephraseDialogResponsesPrompt } = require('./features/rephraseDialogResponses/detect')
const { handleRephraseUserQuery } = require('./features/rephraseUserQuery/messagesHandler')
const { isRephraseUserQueryPrompt } = require('./features/rephraseUserQuery/detect')
const { handlePromptNode } = require('./features/promptNode/messagesHandler')
const { isPromptNodePrompt } = require('./features/promptNode/promptHaystack')
const { UNMATCHED_STATUS, UNMATCHED_BODY } = require('./unmatched')

function handleMessages(req, res) {
  const body = req.body
  if (!body || typeof body !== 'object') {
    res.status(400).json({
      type: 'error',
      error: {
        type: 'invalid_request_error',
        message: 'Expected JSON body.',
      },
    })
    return
  }

  const messages = body.messages
  if (!Array.isArray(messages)) {
    res.status(400).json({
      type: 'error',
      error: {
        type: 'invalid_request_error',
        message: 'Field "messages" must be an array.',
      },
    })
    return
  }

  const fullUserText = getLastUserMessageText(messages)

  if (isConversationSummaryPrompt(fullUserText)) {
    handleConversationSummary(req, res, { body, fullUserText })
    return
  }

  if (isRephraseDialogResponsesPrompt(fullUserText)) {
    handleRephraseDialogResponses(req, res, { body, fullUserText })
    return
  }

  if (isRephraseUserQueryPrompt(fullUserText)) {
    handleRephraseUserQuery(req, res, { body, fullUserText })
    return
  }

  if (isPromptNodePrompt(body, messages)) {
    handlePromptNode(req, res, { body, messages })
    return
  }

  handleDialoggptMessages(req, res, { body, messages })
}

module.exports = {
  handleMessages,
  UNMATCHED_STATUS,
  UNMATCHED_BODY,
}
