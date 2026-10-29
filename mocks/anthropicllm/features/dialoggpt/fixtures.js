/**
 * DialogGPT custom responses — keyed by normalized extracted user input.
 * Multi-turn rows (restart / agent transfer / end chat) use session gates; see matchFixture.js.
 * Optional setsGate marks the first turn so a later "yes"/"no" resolves via x-mock-session-id.
 * Optional delayMs waits before sending the matched response.
 */
const fixtures = [
  {
    extracted: 'I want to book an aeroplane',
    response: {
      category: 'Category 1',
      fulfillment_type: 'single_intent',
      winning_intents: ['DialogGPTCustomIntegrationApp:Flight Search and Booking'],
    },
  },
  {
    extracted: 'In Switzerland, What kind of activities I can do?',
    response: {
      category: 'Category 1',
      fulfillment_type: 'single_intent',
      winning_intents: [
        'DialogGPTCustomIntegrationApp:What kind of activities can I do in Switzerland?',
      ],
    },
  },
  {
    extracted: 'What is the annual rainfall range of Telangana?',
    response: {
      category: 'Category 1',
      fulfillment_type: 'generate_answer',
      winning_intents: [
        'DialogGPTCustomIntegrationApp:fc-460de520-02e3-48d8-80c8-6233f394cfd1-chk-8104639b-3557-4fc7-b9e0-794fcb19d7da',
        'DialogGPTCustomIntegrationApp:fc-460de520-02e3-48d8-80c8-6233f394cfd1-chk-c06682c5-8eec-4cda-b0f1-259938cf44ec',
      ],
    },
  },
  {
    extracted: 'Can I know what exactly a flowchart is? Give answer in 20 words',
    response: {
      category: 'Category 1',
      fulfillment_type: 'generate_answer',
      winning_intents: [
        'DialogGPTCustomIntegrationApp:fc-1453b088-56f0-5c52-ac3e-dcf5fdb253d9-chk-69da94b1-5859-4fc7-9281-ffcf27a5a23c',
      ],
    },
  },
  {
    extracted: 'I want to watch an anime movie',
    response: {
      category: 'Category 1',
      fulfillment_type: 'ambiguous_intents',
      winning_intents: [
        'DialogGPTCustomIntegrationApp:Japanese Anime',
        'DialogGPTCustomIntegrationApp:Korean Anime',
      ],
    },
  },
  {
    extracted: 'Who is the anime director?',
    response: {
      category: 'Category 1',
      fulfillment_type: 'ambiguous_intents',
      winning_intents: [
        'DialogGPTCustomIntegrationApp:Who is the director of Death Note anime',
        'DialogGPTCustomIntegrationApp:Who is the director of Demon Slayer Anime',
      ],
    },
  },
  {
    extracted: 'What is the best time to visit France?',
    response: {
      category: 'Category 1',
      fulfillment_type: 'single_intent',
      winning_intents: ['DialogGPTCustomIntegrationApp:What is the best time to visit France?'],
    },
  },
  {
    extracted: 'can you please repeat the previous response',
    response: {
      category: 'Category 3',
      fulfillment_type: 'conversation_intent',
      winning_intents: ['Repeat'],
    },
  },
  {
    extracted: 'wait for sometime',
    response: {
      category: 'Category 3',
      fulfillment_type: 'conversation_intent',
      winning_intents: ['Pause_Interaction'],
    },
  },
  {
    extracted: 'Get me the latest tourist data',
    response: {
      category: 'Category 1',
      fulfillment_type: 'single_intent',
      winning_intents: ['DialogGPTCustomIntegrationApp:Get Tourists Data'],
    },
  },
  {
    extracted: 'I dont want to provide the phone number',
    response: {
      category: 'Category 3',
      fulfillment_type: 'conversation_intent',
      winning_intents: ['Refuse_to_answer'],
    },
  },
  {
    extracted:
      "I'd like to start a fresh conversation from the beginning. Let's reset our discussion and begin a new one.",
    setsGate: 'restart',
    response: {
      category: 'Category 3',
      fulfillment_type: 'conversation_intent',
      winning_intents: ['Restart_Interaction'],
    },
  },
  {
    extracted: 'Could you please connect me to a live representative?',
    setsGate: 'transfer',
    response: {
      category: 'Category 3',
      fulfillment_type: 'conversation_intent',
      winning_intents: ['Agent_Transfer'],
    },
  },
  {
    extracted: 'I want to end the chat',
    setsGate: 'end',
    response: {
      category: 'Category 3',
      fulfillment_type: 'conversation_intent',
      winning_intents: ['End_Interaction'],
    },
  },
  {
    extracted: 'Can you help me in planning a budget for my trip',
    response: {
      category: 'Category 1',
      fulfillment_type: 'single_intent',
      winning_intents: ['DialogGPTCustomIntegrationApp:Travel Budgeting Tips'],
    },
  },
  {
    extracted: 'I want to book an aeroplane in a low budget',
    response: {
      category: 'Category 1',
      fulfillment_type: 'single_intent',
      winning_intents: ['DialogGPTCustomIntegrationApp:Flight Search and Booking'],
    },
  },
  {
    extracted: 'What kind of activities can I do in Switzerland?',
    response: {
      category: 'Category 1',
      fulfillment_type: 'single_intent',
      winning_intents: [
        'DialogGPTCustomIntegrationApp:What kind of activities can I do in Switzerland?',
      ],
    },
  },
  {
    extracted: 'What is the annual rainfall range in Telangana',
    response: {
      category: 'Category 1',
      fulfillment_type: 'generate_answer',
      winning_intents: [
        'DialogGPTCustomIntegrationApp:fc-460de520-02e3-48d8-80c8-6233f394cfd1-chk-8104639b-3557-4fc7-b9e0-794fcb19d7da',
        'DialogGPTCustomIntegrationApp:fc-460de520-02e3-48d8-80c8-6233f394cfd1-chk-c06682c5-8eec-4cda-b0f1-259938cf44ec',
      ],
    },
  },
  {
    extracted:
      'Book a flight to mumbai and suggest some live music concerts over there',
    response: {
      category: 'Category 1',
      fulfillment_type: 'multiple_intents',
      winning_intents: [
        'DialogGPTCustomIntegrationApp:Flight Search and Booking',
        'DialogGPTCustomIntegrationApp:Live Music and Entertainment',
      ],
      execution_plan: [
        'DialogGPTCustomIntegrationApp:Flight Search and Booking',
        'DialogGPTCustomIntegrationApp:Live Music and Entertainment',
      ],
    },
  },
  {
    extracted:
      'can you suggest some top attractions in France followed by Switzerland',
    response: {
      category: 'Category 1',
      fulfillment_type: 'multiple_intents',
      winning_intents: [
        'DialogGPTCustomIntegrationApp:What are the top attractions to visit in France?',
        'DialogGPTCustomIntegrationApp:What are the top attractions to visit in Switzerland?',
      ],
      execution_plan: [
        'DialogGPTCustomIntegrationApp:What are the top attractions to visit in France?',
        'DialogGPTCustomIntegrationApp:What are the top attractions to visit in Switzerland?',
      ],
    },
  },
  {
    extracted: 'I want to enquire about the budget for travelling to Delhi.',
    response: {
      category: 'Category 1',
      fulfillment_type: 'single_intent',
      winning_intents: ['DialogGPTCustomIntegrationApp:Travel Budgeting Tips'],
    },
  },
  {
    extracted: 'get user id',
    response: {
      category: 'Category 1',
      fulfillment_type: 'single_intent',
      winning_intents: ['DialogGPTCustomIntegrationApp:Get User Id'],
    },
  },
  {
    extracted: 'Can you recommend Live music and concerts near me',
    response: {
      category: 'Category 1',
      fulfillment_type: 'single_intent',
      winning_intents: ['DialogGPTCustomIntegration:Live Music and Entertainment'],
    },
  },
  {
    extracted: 'What kind of Job Roles are available in Infosys?',
    response: {
      category: 'Category 2',
      fulfillment_type: 'system_intent',
      winning_intents: [''],
    },
  },
  {
    extracted: 'Create a bank account',
    response: {
      category: 'Category 2',
      fulfillment_type: 'system_intent',
      winning_intents: [''],
    },
  },
  {
    extracted: 'Can you please book 2 tickets for the movie John Wick One',
    delayMs: 8000,
    response: {
      category: 'Category 1',
      fulfillment_type: 'single_intent',
      winning_intents: ['DialogGPTCustomIntegrationApp:John Wick One'],
    },
  },
  {
    extracted: 'Can you please book 2 tickets for the movie John Wick Two',
    delayMs: 20000,
    response: {
      category: 'Category 1',
      fulfillment_type: 'single_intent',
      winning_intents: ['DialogGPTCustomIntegrationApp:John Wick Two'],
    },
  },
]

module.exports = { fixtures }
