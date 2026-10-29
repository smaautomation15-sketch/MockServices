/** Assistant `content[0].text`: markdown fenced JSON (Rephrase Dialog Responses.pdf). */
function wrapDialogRephraseJson(responseObj) {
  return '```json\n' + JSON.stringify(responseObj, null, 2) + '\n```'
}

module.exports = { wrapDialogRephraseJson }
