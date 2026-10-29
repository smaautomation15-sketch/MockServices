const path = require('path')
const express = require('express')

const router = express.Router()

const FAQ_HTML = path.join(__dirname, 'faq-mock.html')

/**
 * GET /
 * Serves static HTML for the Privacy & Terms FAQ (no outbound requests).
 * Markup/classes mirror https://policies.google.com/faq?hl=en-US as captured via Playwright.
 * Optional query `hl` is ignored; edit faq-mock.html to refresh the snapshot.
 */
router.get('/', (req, res) => {
  res.status(200)
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('X-Mock-Content', 'static-faq-html')
  res.sendFile(FAQ_HTML)
})

module.exports = router
