/**
 * PDF-shaped system prompt for Conversation Test Case Suggestions (Conversation Test Case Suggestions.pdf).
 */
function buildConversationTestcaseSuggestionsSystemContent() {
  return [
    'Generate just the 5 possible next user inputs in English for chat bot conversation',
    '',
    'Apply below conditions for generating user inputs',
    ' - with or without entities',
    ' - a different intent all together',
    ' - different combinations of entities in the user input',
    ' - digression to a different intent',
    ' - trigger error scenarios',
    '',
    '',
    'Here are the list of intents and entities in the bot',
    'Book Movie ticket',
    '\t - undefined',
    '\t - undefined',
    'Product Inquiry',
    '\t - Product Name',
    'Smartwatch Product Colors',
    'Book Doctor Appointment',
    '\t - undefined',
    'undefined',
    '',
    'Conversation Context:',
    'Current Intent: __notFound__',
    'User: Start_Flow',
    'Bot: How can I help you?',
    'User: ',
    ' 1.',
  ].join('\n')
}

module.exports = { buildConversationTestcaseSuggestionsSystemContent }
