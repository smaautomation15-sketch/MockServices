/**
 * NLP Batch Test Cases Suggestions (NLP Batch Test Cases Suggestions.pdf) — Azure chat completions.
 * Prompt is distinguished from Training Utterance Suggestions by **"Generate exactly 8"**.
 */
const ASSISTANT_BATCH = [
  '1. I want to book movie tickets for [Movie Name](Inception) in [Area](Downtown)',
  '2. Please reserve two seats for [Movie Name](Avatar) at a cinema in [Area](Midtown)',
  '3. Book me a ticket to watch [Movie Name](The Dark Knight) near [Area](Times Square)',
  '4. Can you get movie tickets for [Movie Name](Interstellar) in the [Area](City Center) area?',
  '5. I need to book three tickets for [Movie Name](Joker) at a theater in [Area](Brooklyn)',
  '6. Help me book a movie ticket for [Movie Name](Titanic) around [Area](Harbor District)',
  '7. Reserve evening show tickets for [Movie Name](Frozen) in [Area](Uptown)',
  '8. Book two balcony seats for [Movie Name](Avengers: Endgame) at a cinema near [Area](Silicon Valley)',
].join('\n')

const fixtures = [
  {
    id: 'nlp-batch-book-movie-ticket',
    matchWhenAll: [
      'generate exactly 8 intent training samples',
      'book movie ticket',
      'moviename',
      'ticketcount',
      '[sourcecity](paris)',
    ],
    assistantContent: ASSISTANT_BATCH,
    usage: {
      completion_tokens: 210,
      completion_tokens_details: {
        accepted_prediction_tokens: 0,
        audio_tokens: 0,
        reasoning_tokens: 0,
        rejected_prediction_tokens: 0,
      },
      latency_checkpoint: {
        engine_tbt_ms: 7,
        engine_ttft_ms: 38,
        engine_ttlt_ms: 1476,
        pre_inference_ms: 80,
        service_tbt_ms: 7,
        service_ttft_ms: 222,
        service_ttlt_ms: 1654,
        total_duration_ms: 1581,
        user_visible_ttft_ms: 142,
      },
      prompt_tokens: 120,
      prompt_tokens_details: {
        audio_tokens: 0,
        cached_tokens: 0,
      },
      total_tokens: 330,
    },
  },
]

module.exports = { fixtures }
