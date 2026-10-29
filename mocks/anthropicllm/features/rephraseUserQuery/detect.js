/** Client contract from Rephrase User Query.pdf — marker line; full prompt includes rules + example in promptPrefix.js */
function isRephraseUserQueryPrompt(fullUserText) {
  return /Paraphrase\s+the\s+user\s+response\b/i.test(String(fullUserText))
}

module.exports = { isRephraseUserQueryPrompt }
