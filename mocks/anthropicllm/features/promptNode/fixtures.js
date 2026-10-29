/**
 * Prompt Node (Prompt Node.pdf): Anthropic Messages API with optional top-level `system`,
 * plain-text assistant answer (e.g. `Score: 48`), non-streaming or SSE streaming.
 *
 * Match needles tolerate spacing after `:` in JSON (PDF / clients vary). Unicode “smart”
 * quotes are normalized in {@link ../promptHaystack#normalizePromptHaystack}.
 */
const fixtures = [
  {
    id: 'score-calculator-jude-8',
    matchWhenAll: [
      'to calculate the score for jude',
      'multiplier 8',
      '"jude"',
      '"mark"',
    ],
    assistantText: 'Score: 48',
    usage: {
      input_tokens: 267,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
      cache_creation: {
        ephemeral_5m_input_tokens: 0,
        ephemeral_1h_input_tokens: 0,
      },
      output_tokens: 7,
      service_tier: 'standard',
      inference_geo: 'not_available',
    },
  },
  {
    id: 'score-calculator-mark-8',
    matchWhenAll: [
      'to calculate the score for mark',
      'multiplier 8',
      '"mark"',
      '"jude"',
    ],
    assistantText: 'Score: 40',
    usage: {
      input_tokens: 261,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
      cache_creation: {
        ephemeral_5m_input_tokens: 0,
        ephemeral_1h_input_tokens: 0,
      },
      output_tokens: 7,
      service_tier: 'standard',
      inference_geo: 'not_available',
    },
  },
]

module.exports = { fixtures }
