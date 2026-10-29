/** Client contract from Conversation Summary.pdf — summary request prefix. */
const SUMMARY_TRIGGER = /generate\s+summary\s+for\b/i

function isConversationSummaryPrompt(fullUserText) {
  return SUMMARY_TRIGGER.test(String(fullUserText))
}

module.exports = { isConversationSummaryPrompt, SUMMARY_TRIGGER }
