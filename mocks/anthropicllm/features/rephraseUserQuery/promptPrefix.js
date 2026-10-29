/**
 * Full user prompt through the closing `>>` of `<<ConversationHistory: "…">>` (see Rephrase User Query.pdf).
 * Same shape for Dialog and FAQ scenarios; only `historyInner` and the tail line differ.
 */
const REPHRASE_USER_QUERY_STATIC_PREFIX =
  "Paraphrase the user response based on the context and the user's emotion in the en. " +
  'Do not change statements into questions or questions into statements.\n\n' +
  'Rephrasing Rules:\n' +
  '1. For plain text: Rewrite using different vocabulary and sentence structures while maintaining the original intent.\n' +
  '2. ALL responses must be in the specified en.\n' +
  '3. Maintain consistent tone and formality level.\n' +
  "4. Consider the user's emotional context from the conversation history.\n" +
  '5. Preserve technical terminology and proper nouns.\n\n' +
  'Return ONLY a JSON object in the following format:\n' +
  '{\n' +
  '"rephrasedUserQuery": "<the rephrased user response — must be stringified JSON if the input was JSON>",\n' +
  '"rephraseSuccessful": "success" or "failure",\n' +
  '"reason": "<why it was successful or why it failed>",\n' +
  '"originalFormat": "text" or "json"\n' +
  '}\n\n' +
  'If you cannot rephrase or do not understand the query or context, return "failure".\n\n' +
  'Example:\n' +
  'Instructions: Rephrase the user response politely based on the conversation history.\n' +
  'Conversation Context:\n' +
  'Bot: Hi, how can I help you?\n' +
  'User: I want to book an appointment.\n' +
  'Bot: When would you like to schedule the appointment?\n' +
  'User: I want to schedule an appointment with Dr. Lisa.\n\n' +
  'Expected output:\n' +
  '{"rephrasedUserQuery":"Please help me schedule an appointment with Dr. Lisa.","rephraseSuccessful":"success","reason":"Able to rephrase user input while maintaining clarity.","originalFormat":"text"}\n\n'

function buildRephraseUserQueryUserContent(historyInner, tail) {
  return `${REPHRASE_USER_QUERY_STATIC_PREFIX}<<ConversationHistory: "${historyInner}">>\n\n${tail}`
}

module.exports = {
  REPHRASE_USER_QUERY_STATIC_PREFIX,
  buildRephraseUserQueryUserContent,
}
