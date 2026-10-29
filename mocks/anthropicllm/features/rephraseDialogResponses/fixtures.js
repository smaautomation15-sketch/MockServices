/**
 * Rephrase Dialog Responses.pdf — Anthropic `messages[0].content` ends with `\n\nInput: …`.
 * Match key: normalized tail after last `\n\nInput:` (case-insensitive).
 */
const CC_CUSTOM = (lastUserLine) =>
  '\nUser: Custom Integration\nBot: Please choose type of Node from the list\na) Entity Node\nb) Confirmation Node\nc) Message Node\n\n' +
  'User: Entity Node\nBot: Please choose Rephrase Mode from the list\na) Plain Text Rephrasing\nb) Custom JavaScript Rephrasing\nc) Alternate Prompts Rephrasing\nd) Formatted Text Rephrasing\ne) Bot Variables Validation\n\n' +
  `User: ${lastUserLine}`

const CC_CUSTOM_CONFIRM = (lastUserLine) =>
  '\nUser: Custom Integration\nBot: Please choose type of Node from the list\na) Entity Node\nb) Confirmation Node\nc) Message Node\n\n' +
  'User: Confirmation Node\nBot: Please choose Rephrase Mode from the list\na) Plain Text Rephrasing\nb) Custom JavaScript Rephrasing\nc) Alternate Prompts Rephrasing\nd) Formatted Text Rephrasing\ne) Bot Variables Validation\n\n' +
  `User: ${lastUserLine}`

const CC_CUSTOM_MESSAGE = (lastUserLine) =>
  '\nUser: Custom Integration\nBot: Please choose type of Node from the list\na) Entity Node\nb) Confirmation Node\nc) Message Node\n\n' +
  'User: Message Node\nBot: Please choose Rephrase Mode from the list\na) Plain Text Rephrasing\nb) Custom JavaScript Rephrasing\nc) Alternate Prompts Rephrasing\nd) Formatted Text Rephrasing\ne) Bot Variables Validation\n\n' +
  `User: ${lastUserLine}`

const CC_BOT_VARS = (userAfterDate, botPhoneLine) =>
  `\nUser: Bot Variables Validation\nBot: Enter the Date to Book Your Ticket\nUser: ${userAfterDate}\nBot: Enter Your Phone Number to Book Ticket\nUser: ${botPhoneLine}`

const usageBase = {
  cache_creation_input_tokens: 0,
  cache_read_input_tokens: 0,
  cache_creation: {
    ephemeral_5m_input_tokens: 0,
    ephemeral_1h_input_tokens: 0,
  },
  service_tier: 'standard',
  inference_geo: 'not_available',
}

const fixtures = [
  {
    id: 'rdr-entity-plain-email',
    inputTail: 'Enter Your Email Address',
    chatContextInner: CC_CUSTOM('Plain Text Rephrasing'),
    response: {
      rephrasedResponse: 'Please enter your email address.',
      rephraseSuccessful: 'success',
      reason:
        'Successfully rephrased the statement into a more polite and conversational form while maintaining the original meaning and staying aligned with the context of collecting user information during Plain Text Rephrasing mode for an Entity Node.',
    },
    usage: { ...usageBase, input_tokens: 438, output_tokens: 89 },
  },
  {
    id: 'rdr-entity-js-phone',
    inputTail: 'Enter Your Phone Number',
    chatContextInner: CC_CUSTOM('Custom JavaScript Rephrasing'),
    response: {
      rephrasedResponse: 'Please enter your phone number.',
      rephraseSuccessful: 'success',
      reason:
        'Able to rephrase sentence to be more polite and conversational while maintaining the original meaning.',
    },
    usage: { ...usageBase, input_tokens: 438, output_tokens: 67 },
  },
  {
    id: 'rdr-entity-formatted-email',
    inputTail: '_*Enter Your Email ID*_',
    chatContextInner: CC_CUSTOM('Formatted Text Rephrasing'),
    response: {
      rephrasedResponse: '_*Please enter your email ID*_',
      rephraseSuccessful: 'success',
      reason:
        'Successfully rephrased the request to be more polite and conversational while maintaining the formatted text structure (bold and italic markdown).',
    },
    usage: { ...usageBase, input_tokens: 443, output_tokens: 76 },
  },
  {
    id: 'rdr-entity-pii-email-placeholders',
    inputTail:
      'Enter Your Email ID to book Ticket #*#SENSITIVE-mp412gqr#*# on RedBus Application to with #*#PHONE-mp412oww#*#',
    chatContextInner: CC_BOT_VARS('#*#SENSITIVE-mp412gqr#*#', '#*#PHONE-mp412oww#*#'),
    response: {
      rephrasedResponse:
        'Please enter your email ID to book your ticket for #*#SENSITIVE-mp412gqr#*# on the RedBus application with #*#PHONE-mp412oww#*#.',
      rephraseSuccessful: 'success',
      reason:
        'Successfully rephrased the sentence to be more polite and natural while maintaining the original meaning and placeholders.',
    },
    usage: { ...usageBase, input_tokens: 429, output_tokens: 107 },
  },
  {
    id: 'rdr-entity-pii-respond-contextually',
    inputTail: 'Respond Contextually',
    chatContextInner:
      '\nUser: #*#SENSITIVE-mp3yt4cr#*#\nBot: Enter Your Phone Number to Book Ticket\nUser: #*#PHONE-mp3yt5e8#*#\nBot: Enter Your Email ID to book Ticket #*#SENSITIVE-mp3yt4cr#*# on RedBus Application to with #*#PHONE-mp3yt5e8#*#\nUser: johnsmith@gmail.com',
    response: {
      rephrasedResponse:
        "Thank you! I've received your email address johnsmith@gmail.com. Let me help you complete your ticket booking on RedBus. Is there anything else you need assistance with for this booking?",
      rephraseSuccessful: 'success',
      reason:
        "Successfully rephrased the response to acknowledge the user's email input contextually and guide them forward in the ticket booking process while maintaining a helpful assistant tone.",
    },
    usage: { ...usageBase, input_tokens: 428, output_tokens: 113 },
  },
  {
    id: 'rdr-confirm-plain-email',
    inputTail: 'Confirm Your Email Address?',
    chatContextInner: CC_CUSTOM_CONFIRM('Plain Text Rephrasing'),
    response: {
      rephrasedResponse: 'Could you please confirm your email address?',
      rephraseSuccessful: 'success',
      reason:
        'Successfully rephrased the statement into a more polite and helpful assistant tone while maintaining the confirmation request nature.',
    },
    usage: { ...usageBase, input_tokens: 441, output_tokens: 71 },
  },
  {
    id: 'rdr-confirm-js-phone',
    inputTail: 'Confirm Your Phone Number?',
    chatContextInner: CC_CUSTOM_CONFIRM('Custom JavaScript Rephrasing'),
    response: {
      rephrasedResponse: 'Could you please confirm your phone number?',
      rephraseSuccessful: 'success',
      reason:
        'Successfully rephrased the confirmation question to sound more polite and conversational while maintaining the intent to confirm the phone number.',
    },
    usage: { ...usageBase, input_tokens: 441, output_tokens: 74 },
  },
  {
    id: 'rdr-confirm-formatted-email',
    inputTail: '_*Confirm Your Email ID?*_',
    chatContextInner: CC_CUSTOM_CONFIRM('Formatted Text Rephrasing'),
    response: {
      rephrasedResponse: '**Confirm Your Email ID?**',
      rephraseSuccessful: 'success',
      reason:
        'Successfully rephrased the formatted text by converting markdown-style bold syntax (_* *_) to standard markdown bold syntax (** **).',
    },
    usage: { ...usageBase, input_tokens: 446, output_tokens: 78 },
  },
  {
    id: 'rdr-confirm-pii-email',
    inputTail:
      'Confirm Your Email ID to book Ticket #*#SENSITIVE-mp3yt6bo#*# on RedBus Application to with #*#PHONE-mp3yt7f1#*#?',
    chatContextInner: CC_BOT_VARS('#*#SENSITIVE-mp3yt6bo#*#', '#*#PHONE-mp3yt7f1#*#'),
    response: {
      rephrasedResponse:
        'Please confirm your email ID to book a ticket for #*#SENSITIVE-mp3yt6bo#*# on the RedBus Application using phone number #*#PHONE-mp3yt7f1#*#.',
      rephraseSuccessful: 'success',
      reason:
        'Successfully rephrased the confirmation request in a more natural and helpful assistant tone, maintaining the original statement format and all sensitive placeholders.',
    },
    usage: { ...usageBase, input_tokens: 439, output_tokens: 118 },
  },
  {
    id: 'rdr-message-plain-email-submitted',
    inputTail: 'Your Email Address has been submitted',
    chatContextInner: CC_CUSTOM_MESSAGE('Plain Text Rephrasing'),
    response: {
      rephrasedResponse: 'Thank you! Your email address has been successfully submitted.',
      rephraseSuccessful: 'success',
      reason:
        'Able to rephrase the confirmation statement in a more helpful and conversational tone while maintaining the original meaning.',
    },
    usage: { ...usageBase, input_tokens: 440, output_tokens: 74 },
  },
  {
    id: 'rdr-message-js-phone-submitted',
    inputTail: 'Your Phone Number has been submitted',
    chatContextInner: CC_CUSTOM_MESSAGE('Custom JavaScript Rephrasing'),
    response: {
      rephrasedResponse: 'Thank you! Your phone number has been successfully submitted.',
      rephraseSuccessful: 'success',
      reason:
        'Successfully rephrased the statement to be more conversational and helpful while maintaining the original meaning. Added acknowledgment and confirmation tone appropriate for a helpful assistant.',
    },
    usage: { ...usageBase, input_tokens: 440, output_tokens: 82 },
  },
  {
    id: 'rdr-message-formatted-email-submitted',
    inputTail: '_*Your Email ID has been submitted*_',
    chatContextInner: CC_CUSTOM_MESSAGE('Formatted Text Rephrasing'),
    response: {
      rephrasedResponse: 'Your Email ID has been successfully submitted.',
      rephraseSuccessful: 'success',
      reason:
        "Able to rephrase the sentence by correcting grammar ('is been' to 'has been') and improving clarity while maintaining the original meaning and formatted emphasis.",
    },
    usage: { ...usageBase, input_tokens: 445, output_tokens: 82 },
  },
  {
    id: 'rdr-message-pii-ticket-booked',
    inputTail:
      'Ticket has been booked for #*#SENSITIVE-mp40qh5z#*# on RedBus Application to with #*#PHONE-mp40qp4o#*#',
    chatContextInner: CC_BOT_VARS('#*#SENSITIVE-mp40qh5z#*#', '#*#PHONE-mp40qp4o#*#'),
    response: {
      rephrasedResponse:
        'Your ticket has been successfully booked for #*#SENSITIVE-mp40qh5z#*# on the RedBus Application with the phone number #*#PHONE-mp40qp4o#*#.',
      rephraseSuccessful: 'success',
      reason:
        'Successfully rephrased the confirmation message to sound more natural and complete while maintaining all the original information including the sensitive data placeholders.',
    },
    usage: { ...usageBase, input_tokens: 434, output_tokens: 115 },
  },
]

module.exports = { fixtures }
