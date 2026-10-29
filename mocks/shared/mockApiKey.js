/**
 * Validates mock LLM API key from the x-api-key header.
 * Extensible: pass expected key per provider router.
 */
function requireMockApiKey(expectedKey) {
  return function mockApiKeyMiddleware(req, res, next) {
    const key = req.headers['x-api-key']
    if (typeof key !== 'string' || key !== expectedKey) {
      res.status(401).json({
        type: 'error',
        error: {
          type: 'authentication_error',
          message: 'Invalid or missing x-api-key header.',
        },
      })
      return
    }
    next()
  }
}

module.exports = { requireMockApiKey }
