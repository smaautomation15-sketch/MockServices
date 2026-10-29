/**
 * Assistant text is JSON rendered as markdown code fences for downstream parsers.
 */
function wrapStructuredText(jsonString) {
  return `\`\`\`${jsonString}\`\`\``
}

module.exports = { wrapStructuredText }
