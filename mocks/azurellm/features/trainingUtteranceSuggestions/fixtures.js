/**
 * Training Utterance Suggestions (Training Utterances Suggestions.pdf) — Azure OpenAI
 * chat completions: system prompt asks to generate intent training samples; assistant returns
 * numbered utterances with entity markers.
 *
 * Rows match when every string in `matchWhenAll` appears in the normalized request messages text.
 */
const MOVIE_TRAINING_ASSISTANT = [
  '1. Book 2 tickets for the movie [Movie Name](Inception) in [Area](Downtown).',
  '2. I want to book a movie ticket for [Movie Name](Avatar) near [Area](Times Square).',
  '3. Can you reserve seats for [Movie Name](Oppenheimer) in [Area](Brooklyn)?',
  '4. Help me book a movie ticket to [Movie Name](Dune) at a cinema in [Area](Soho).',
  "5. I'd like to buy movie tickets for [Movie Name](The Batman) around [Area](Central Park).",
  '6. Book a couple of seats for [Movie Name](Spider-Man: No Way Home) in [Area](Harborfront).',
  '7. Find a theater in [Area](Midtown) and book tickets for [Movie Name](Joker).',
  '8. Please book one movie ticket for [Movie Name](Frozen 2) in [Area](Silicon Valley).',
  '9. I need two tickets to [Movie Name](Interstellar) at any theater in [Area](Palo Alto).',
  '10. Reserve a movie ticket for [Movie Name](Top Gun: Maverick) somewhere in [Area](Downtown LA).',
].join('\n')

const fixtures = [
  {
    id: 'book-doctor-appointment-movie-samples',
    matchWhenAll: [
      'generate intent training samples',
      'book doctor appointment',
      'book flight',
      '[sourcecity](paris)',
    ],
    assistantContent: MOVIE_TRAINING_ASSISTANT,
    usage: {
      prompt_tokens: 118,
      completion_tokens: 767,
      total_tokens: 885,
      prompt_tokens_details: { cached_tokens: 0, audio_tokens: 0 },
      completion_tokens_details: {
        accepted_prediction_tokens: 0,
        audio_tokens: 0,
        reasoning_tokens: 0,
        rejected_prediction_tokens: 0,
      },
      latency_checkpoint: {
        engine_tbt_ms: 11,
        engine_ttft_ms: 50,
        engine_ttlt_ms: 8774,
        pre_inference_ms: 114,
        service_tbt_ms: 11,
        service_ttft_ms: 281,
        service_ttlt_ms: 8997,
        total_duration_ms: 8893,
        user_visible_ttft_ms: 167,
      },
    },
  },
  {
    id: 'order-pizza-samples',
    matchWhenAll: ['generate intent training samples', 'order pizza'],
    assistantContent: [
      "1. I'd like a large [PizzaSize](large) [PizzaType](pepperoni) delivered to [Address](123 Main St).",
      '2. Can you order two [PizzaType](margherita) pizzas for pickup at [Location](downtown)?',
      '3. Please add extra cheese on my [PizzaType](veggie) [PizzaSize](medium) pizza.',
    ].join('\n'),
  },
]

module.exports = { fixtures }
