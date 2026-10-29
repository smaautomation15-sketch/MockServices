/**
 * Rephrase User Query (Rephrase User Query.pdf): prompt contains
 * `Paraphrase the user response…`, Rephrasing Rules, JSON format + example, then
 * `<<ConversationHistory: "…">>` and the raw user line to rephrase.
 * Assistant returns ```json …``` with rephrasedUserQuery, rephraseSuccessful, reason, originalFormat.
 */
const fixtures = [
  {
    id: 'rephrase-hello',
    userTail: 'Hello',
    response: {
      rephrasedUserQuery: 'Hi there',
      rephraseSuccessful: 'success',
      reason:
        'Successfully rephrased the greeting while maintaining the friendly casual tone appropriate for an initial conversation opener.',
      originalFormat: 'text',
    },
  },
  {
    id: 'rephrase-book-a-cab',
    userTail: 'Book a cab',
    response: {
      rephrasedUserQuery: 'I need to arrange a taxi ride.',
      rephraseSuccessful: 'success',
      reason:
        "Successfully rephrased the user's request using alternative vocabulary while maintaining the original intent and directive nature.",
      originalFormat: 'text',
    },
  },
  {
    id: 'rephrase-how-about-flight',
    userTail: 'How about flight',
    response: {
      rephrasedUserQuery: 'What about booking a flight?',
      rephraseSuccessful: 'success',
      reason:
        "Successfully rephrased the brief query into a complete sentence while maintaining the user's intent to inquire about flight booking services, consistent with the conversation context where they just booked a cab.",
      originalFormat: 'text',
    },
  },
  {
    id: 'rephrase-lost-shell-card',
    userTail: 'I lost my shell recharge card',
    response: {
      rephrasedUserQuery: "I've misplaced my Shell recharge card",
      rephraseSuccessful: 'success',
      reason:
        "Successfully rephrased the user's statement using different vocabulary while maintaining the original meaning and neutral tone appropriate for the greeting context",
      originalFormat: 'text',
    },
  },
  {
    id: 'rephrase-how-order-new-one',
    userTail: 'How do I order a new one',
    response: {
      rephrasedUserQuery: 'What is the process for ordering a replacement card?',
      rephraseSuccessful: 'success',
      reason:
        "Successfully rephrased the user's question about ordering a new Shell recharge card using different vocabulary while maintaining the original intent and question format.",
      originalFormat: 'text',
    },
  },
]

module.exports = { fixtures }
