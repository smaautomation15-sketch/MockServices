/**
 * PDF expects assistant `content[0].text` as markdown fenced JSON with the `json` language tag.
 */
function wrapRephraseJson(responseObj) {
  return '```json\n' + JSON.stringify(responseObj, null, 2) + '\n```'
}

module.exports = { wrapRephraseJson }
