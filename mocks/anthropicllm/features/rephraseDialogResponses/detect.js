/**
 * Rephrase Dialog Responses.pdf — bot line rephrasing (distinct from Rephrase User Query).
 */
function isRephraseDialogResponsesPrompt(fullUserText) {
  const t = String(fullUserText)
  return (
    /Paraphrase\s+the\s+bot\s+response\b/i.test(t) &&
    /Rephrase\s+Dialog\s+Responses\s+Custom\s+Integration\s+Validation/i.test(t)
  )
}

module.exports = { isRephraseDialogResponsesPrompt }
