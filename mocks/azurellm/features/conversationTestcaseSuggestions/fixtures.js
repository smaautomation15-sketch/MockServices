/**
 * Conversation Test Case Suggestions (Conversation Test Case Suggestions.pdf) — Azure chat completions.
 * Distinguished from NLP Batch by **"Generate just the 5"** and from Training Utterances by
 * **"possible next user inputs"** + conversation context block.
 */
const ASSISTANT_CONVERSATION_TESTCASES = [
  '1. I want to book movie tickets for [Movie Name](Inception) in [Area](Downtown)',
  '2. Please reserve two seats for [Movie Name](Avatar) at a cinema in [Area](Midtown)',
  '3. Book me a ticket to watch [Movie Name](The Dark Knight) near [Area](Times Square)',
  '4. Can you get movie tickets for [Movie Name](Interstellar) in the [Area](City Center) area?',
  '5. I need to book three tickets for [Movie Name](Joker) at a theater in [Area](Brooklyn)',
].join('\n')

const fixtures = [
  {
    id: 'conversation-testcase-start-flow-notfound',
    matchWhenAll: [
      'generate just the 5 possible next user inputs',
      'chat bot conversation',
      'book movie ticket',
      'smartwatch product colors',
      'current intent: __notfound__',
      'user: start_flow',
      'bot: how can i help you',
    ],
    assistantContent: ASSISTANT_CONVERSATION_TESTCASES,
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

module.exports = { fixtures, ASSISTANT_CONVERSATION_TESTCASES }
