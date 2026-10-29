/**
 * Shared user prompt prefix through `<<Converation Context:\n` (PDF spelling).
 * @see Rephrase Dialog Responses.pdf
 */
const DIALOG_REPHRASE_STATIC_PREFIX =
  'Paraphrase the bot response in English based on the context and users emotion,\n' +
  'answer any questions related to any of the previous bot and user utterances and then bring the\n' +
  'user back to the right direction. Do not change statements to questions and vice-versa. \n' +
  'Return a JSON in the below format:\n' +
  '{"rephrasedResponse"://the response that is\n' +
  'rephrased,"rephraseSuccessful"://"success" if rephrasedResponse is similar to original phrase ,\n' +
  'if you are not able to rephrase or did not understand query or context return\n' +
  '"failure","reason"://reason on why it was sucssessful or failure}\n' +
  ' Example:\n' +
  'Instructions:\n' +
  'rephrase how a helpful assitant will respond.\n' +
  'Conversation Context:\n' +
  'Bot: Hi, how can i help\n' +
  'you?\n' +
  'User: transfer funds\n\n' +
  'Input: Enter the account number.\n' +
  '{"rephrasedResponse":"Please\n' +
  'enter the account number.","rephraseSuccessful":"success" ,"reason":"Able to rephrase\n' +
  'sentence."}\n' +
  'Output: Please enter the account number.\n' +
  '======END OF EXAMPLES======\n' +
  '<<CurrentIntent: Rephrase Dialog Responses Custom Integration Validation\n' +
  '<<Instructions:>>\n' +
  '<<Converation Context:\n'

function buildRephraseDialogUserContent(chatContextInner, inputTail) {
  const ctxJson = JSON.stringify({ chatContext: chatContextInner })
  return `${DIALOG_REPHRASE_STATIC_PREFIX}${ctxJson}\n>>\n\nInput: ${inputTail}\n`
}

module.exports = {
  DIALOG_REPHRASE_STATIC_PREFIX,
  buildRephraseDialogUserContent,
}
