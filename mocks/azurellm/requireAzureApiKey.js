/**
 * Azure OpenAI uses the `api-key` header (not `x-api-key`).
 */
function requireAzureOpenAIApiKey(expectedKey) {
  return function azureApiKeyMiddleware(req, res, next) {
    const key = req.headers['api-key']
    if (typeof key !== 'string' || key !== expectedKey) {
      res.status(401).json({
        error: {
          code: '401',
          message: 'Access denied due to invalid subscription key or wrong API endpoint.',
        },
      })
      return
    }
    next()
  }
}

module.exports = { requireAzureOpenAIApiKey }
