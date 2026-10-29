/**
 * Shared: read the last user turn from an Anthropic-style messages array.
 */

function flattenUserContent(content) {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content
    .map((block) => {
      if (
        block &&
        typeof block === 'object' &&
        block.type === 'text' &&
        typeof block.text === 'string'
      ) {
        return block.text
      }
      return ''
    })
    .join('')
}

function getLastUserMessageText(messages) {
  if (!Array.isArray(messages)) return ''
  const userMsgs = messages.filter((m) => m && m.role === 'user')
  if (userMsgs.length === 0) return ''
  const last = userMsgs[userMsgs.length - 1]
  return flattenUserContent(last.content)
}

module.exports = {
  flattenUserContent,
  getLastUserMessageText,
}
