/**
 * Integration checks: POST /mocks/anthropicllm/v1/messages — DialogGPT fixtures,
 * Conversation Summary, Rephrase Dialog Responses, Rephrase User Query, Prompt Node, streaming, sessions, negatives.
 */
/* eslint-disable no-console */

const http = require('http')
const express = require('express')
const { fixtures } = require('./features/dialoggpt/fixtures')
const restartInteraction = require('./features/dialoggpt/responses/restartInteraction')
const systemContinue = require('./features/dialoggpt/responses/systemContinue')
const { fixtures: conversationSummaryFixtures } = require('./features/conversationSummary/fixtures')
const { fixtures: rephraseFixtures } = require('./features/rephraseUserQuery/fixtures')
const { fixtures: promptNodeFixtures } = require('./features/promptNode/fixtures')
const { fixtures: rephraseDialogFixtures } = require('./features/rephraseDialogResponses/fixtures')
const { buildRephraseDialogUserContent } = require('./features/rephraseDialogResponses/promptPrefix')
const { buildRephraseUserQueryUserContent } = require('./features/rephraseUserQuery/promptPrefix')

function promptNodeJudeNonStreamBody() {
  return {
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 620,
    temperature: 0.7,
    stream: false,
    system: 'You are a helpful AI assistant',
    messages: [
      {
        role: 'user',
        content:
          'I need you to act as a score calculator. You will multiply the point value of any individual (provided in the form of a JSON) by a given multiplier value.\n' +
          'Example:\nGiven the JSON structure:\n{ "a": 2, "b": 3, "c": 4 }\n' +
          'For this specific case, please use the provided JSON structure {"Mark" : 5, "Jude" : 6, "Axel" : 7, "Erik" : 3 } and multiplier 8 to calculate the score for Jude return only the final value.\n' +
          'Mandatory: return as Score: 18',
      },
    ],
    metadata: { user_id: 'example_user' },
  }
}

function promptNodeMarkStreamBody() {
  return {
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 350,
    temperature: 0.6,
    stream: true,
    system: 'You are a helpful AI assistant',
    messages: [
      {
        role: 'user',
        content:
          'I need you to act as a score calculator. You will multiply the point value of any individual (provided in the form of a JSON) by a given multiplier value.\n' +
          'Example:\nGiven the JSON structure:\n{ "a": 2, "b": 3, "c": 4 }\n' +
          'For this specific case, please use the provided JSON structure {"Mark" : 5, "Jude" : 6, "Axel" : 7, "Erik" : 3 } and multiplier 8 to calculate the score for Mark return only the final value.\n' +
          'Mandatory: return as Score: 18',
      },
    ],
    metadata: { user_id: 'example_user' },
  }
}

const PREFIX =
  '<Prompt summary from client> Now analyze this user input: '

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b)
}

function parseStructuredAssistantText(text) {
  const t = String(text).trim()
  if (t.startsWith('```') && t.endsWith('```')) {
    let inner = t.slice(3, -3).trim()
    if (/^json\s*/i.test(inner)) {
      inner = inner.replace(/^json\s*/i, '').trim()
    }
    return JSON.parse(inner)
  }
  return JSON.parse(t)
}

function request(port, body, headers = {}) {
  const payload = JSON.stringify(body)
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: '/mocks/anthropicllm/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          'x-api-key': 'mock-anthropic-key',
          ...headers,
        },
      },
      (res) => {
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks).toString('utf8'),
          })
        })
      }
    )
    req.on('error', reject)
    req.write(payload)
    req.end()
  })
}

function parseSseAssistantText(sseBody) {
  const lines = sseBody.split('\n')
  let text = ''
  for (const line of lines) {
    if (!line.startsWith('data: ')) continue
    const raw = line.slice(6)
    if (!raw.trim()) continue
    try {
      const ev = JSON.parse(raw)
      if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') {
        text += ev.delta.text || ''
      }
    } catch {
      // ignore incomplete lines
    }
  }
  return text
}

async function main() {
  const app = express()
  app.use(express.json({ limit: '2mb' }))
  app.use('/mocks/anthropicllm', require('./router'))

  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s))
  })
  const port = server.address().port
  const baseBody = {
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4096,
    temperature: 0.1,
  }

  let failed = 0
  const ok = (name, cond, detail) => {
    if (cond) {
      console.log(`  OK  ${name}`)
    } else {
      failed++
      console.error(`  FAIL ${name}`, detail || '')
    }
  }

  console.log('\n--- Non-streaming: each fixture user input ---\n')
  for (let i = 0; i < fixtures.length; i++) {
    const row = fixtures[i]
    const userContent = PREFIX + row.extracted
    const res = await request(port, {
      ...baseBody,
      stream: false,
      messages: [{ role: 'user', content: userContent }],
    })
    if (res.status !== 200) {
      ok(`[${i + 1}] "${row.extracted.slice(0, 50)}..."`, false, res.body)
      continue
    }
    const msg = JSON.parse(res.body)
    const parsed = parseStructuredAssistantText(msg.content[0].text)
    const match = deepEqual(parsed, row.response)
    ok(`[${i + 1}] ${row.extracted.slice(0, 60)}`, match, parsed)
  }

  console.log('\n--- Streaming: sample user inputs ---\n')
  const streamSamples = [
    'I want to book an aeroplane',
    'wait for sometime',
    'get user id',
  ]
  for (const extracted of streamSamples) {
    const res = await request(port, {
      ...baseBody,
      stream: true,
      messages: [{ role: 'user', content: PREFIX + extracted }],
    })
    const text = parseSseAssistantText(res.body)
    let parsed
    try {
      parsed = parseStructuredAssistantText(text)
    } catch (e) {
      parsed = null
    }
    const row = fixtures.find((f) => f.extracted === extracted)
    const match = row && parsed && deepEqual(parsed, row.response)
    ok(`stream "${extracted.slice(0, 40)}..."`, res.status === 200 && match, text.slice(0, 120))
  }

  console.log('\n--- Session multi-turn (x-mock-session-id) ---\n')
  const sessionScenarios = [
    {
      name: 'restart + yes',
      gate: "I'd like to start a fresh conversation from the beginning. Let's reset our discussion and begin a new one.",
      follow: 'yes',
      expectFollow: restartInteraction,
    },
    {
      name: 'transfer + no',
      gate: 'Could you please connect me to a live representative?',
      follow: 'no',
      expectFollow: systemContinue,
    },
    {
      name: 'end chat + yes',
      gate: 'I want to end the chat',
      follow: 'yes',
      expectFollow: systemContinue,
    },
  ]

  for (const sc of sessionScenarios) {
    const sid = `test-${sc.name.replace(/\s+/g, '-')}`
    let res = await request(
      port,
      { ...baseBody, messages: [{ role: 'user', content: PREFIX + sc.gate }] },
      { 'x-mock-session-id': sid }
    )
    let msg = JSON.parse(res.body)
    const gateOk = res.status === 200
    res = await request(
      port,
      { ...baseBody, messages: [{ role: 'user', content: PREFIX + sc.follow }] },
      { 'x-mock-session-id': sid }
    )
    msg = JSON.parse(res.body)
    const followParsed = parseStructuredAssistantText(msg.content[0].text)
    const followOk = res.status === 200 && deepEqual(followParsed, sc.expectFollow)
    ok(sc.name, gateOk && followOk, followParsed)
  }

  console.log('\n--- Conversation Summary (generate summary for …) ---\n')
  const summaryBodies = [
    {
      name: 'Tata Tiago call (scenario 1)',
      userText:
        'generate summary for Agent: Thank you for calling ITC Computers. My name is Harish I will assist you. Consumer: My Name is Rao I want to Buy a Tata Tiago Car',
      expectText: conversationSummaryFixtures[0].assistantText,
    },
    {
      name: 'Smartwatch discard flow (scenario 2)',
      userText:
        'generate summary for CUSTOMER:Discard all AGENT:Ok. CUSTOMER:Smartwatch AGENT:Pick color CUSTOMER:Black AGENT:The price is Rs.2000',
      expectText: conversationSummaryFixtures[1].assistantText,
    },
  ]
  for (const sb of summaryBodies) {
    const res = await request(port, {
      ...baseBody,
      stream: false,
      messages: [{ role: 'user', content: sb.userText }],
    })
    let pass = res.status === 200
    let gotText = ''
    if (pass) {
      const msg = JSON.parse(res.body)
      gotText = msg.content?.[0]?.text
      pass = gotText === sb.expectText
    }
    ok(sb.name, pass, gotText?.slice(0, 80))
  }

  const sumStream = await request(port, {
    ...baseBody,
    stream: true,
    messages: [{ role: 'user', content: summaryBodies[0].userText }],
  })
  const sumStreamText = parseSseAssistantText(sumStream.body)
  ok(
    'Conversation Summary streaming',
    sumStream.status === 200 && sumStreamText === summaryBodies[0].expectText,
    sumStreamText.slice(0, 80)
  )

  console.log('\n--- Rephrase Dialog Responses (Rephrase Dialog Responses.pdf) ---\n')
  for (const rd of rephraseDialogFixtures) {
    const userContent = buildRephraseDialogUserContent(rd.chatContextInner, rd.inputTail)
    const res = await request(port, {
      ...baseBody,
      stream: false,
      messages: [{ role: 'user', content: userContent }],
    })
    let pass = res.status === 200
    let parsed
    if (pass) {
      const msg = JSON.parse(res.body)
      try {
        parsed = parseStructuredAssistantText(msg.content[0].text)
      } catch {
        parsed = null
      }
      pass =
        parsed &&
        deepEqual(parsed, rd.response) &&
        deepEqual(msg.usage, rd.usage)
    }
    ok(`RDR ${rd.id}`, pass, parsed)
  }

  const rdrStream = await request(port, {
    ...baseBody,
    stream: true,
    messages: [
      {
        role: 'user',
        content: buildRephraseDialogUserContent(
          rephraseDialogFixtures[0].chatContextInner,
          rephraseDialogFixtures[0].inputTail
        ),
      },
    ],
  })
  const rdrStreamText = parseSseAssistantText(rdrStream.body)
  let rdrParsed
  try {
    rdrParsed = parseStructuredAssistantText(rdrStreamText)
  } catch {
    rdrParsed = null
  }
  ok(
    'Rephrase Dialog Responses streaming (entity plain email)',
    rdrStream.status === 200 &&
      rdrParsed &&
      deepEqual(rdrParsed, rephraseDialogFixtures[0].response),
    rdrStreamText.slice(0, 120)
  )

  console.log('\n--- Rephrase User Query ---\n')
  const rephraseCases = [
    {
      name: 'tail Hello',
      history: '\nBot: How can I help you?',
      tail: 'Hello',
    },
    {
      name: 'tail Book a cab',
      history: '\nBot: How can I help you?\nUser: Hello\nBot: Hey :)',
      tail: 'Book a cab',
    },
    {
      name: 'tail How about flight',
      history:
        '\nUser: Hello\nBot: Hey :)\nUser: Book a cab\nBot: Cab Booking Successful\nBot: Is there anything else I can help you with today?',
      tail: 'How about flight',
    },
    {
      name: 'tail I lost my shell recharge card (FAQ)',
      history: '\nBot: How can I help you?\nUser: Hello\nBot: Hi! ',
      tail: 'I lost my shell recharge card',
    },
    {
      name: 'tail How do I order a new one (FAQ)',
      history:
        '\nUser: Hello\nBot: Hi! \nUser: I lost my shell recharge card\nBot: Shell Recharge Card Dialog Task triggered successfully\nBot: Is there anything else I can help you with today?',
      tail: 'How do I order a new one',
    },
  ]
  for (const rc of rephraseCases) {
    const userContent = buildRephraseUserQueryUserContent(rc.history, rc.tail)
    const res = await request(port, {
      ...baseBody,
      stream: false,
      messages: [{ role: 'user', content: userContent }],
    })
    let pass = res.status === 200
    let parsed
    if (pass) {
      const msg = JSON.parse(res.body)
      try {
        parsed = parseStructuredAssistantText(msg.content[0].text)
      } catch {
        parsed = null
      }
      const row = rephraseFixtures.find((f) => f.userTail.toLowerCase() === rc.tail.toLowerCase())
      pass = row && parsed && deepEqual(parsed, row.response)
    }
    ok(rc.name, pass, parsed)
  }

  const rpStream = await request(port, {
    ...baseBody,
    stream: true,
    messages: [
      {
        role: 'user',
        content: buildRephraseUserQueryUserContent(rephraseCases[0].history, rephraseCases[0].tail),
      },
    ],
  })
  const rpStreamText = parseSseAssistantText(rpStream.body)
  let rpParsed
  try {
    rpParsed = parseStructuredAssistantText(rpStreamText)
  } catch {
    rpParsed = null
  }
  ok(
    'Rephrase User Query streaming',
    rpStream.status === 200 &&
      rpParsed &&
      deepEqual(rpParsed, rephraseFixtures.find((f) => f.userTail === 'Hello').response),
    rpStreamText.slice(0, 100)
  )

  console.log('\n--- Prompt Node (score calculator, Prompt Node.pdf) ---\n')
  const rowJude = promptNodeFixtures.find((f) => f.id === 'score-calculator-jude-8')
  const rowMark = promptNodeFixtures.find((f) => f.id === 'score-calculator-mark-8')
  const judeRes = await request(port, promptNodeJudeNonStreamBody())
  let pass = judeRes.status === 200
  let judeMsg
  if (pass) {
    judeMsg = JSON.parse(judeRes.body)
    pass =
      judeMsg.content?.[0]?.text === rowJude.assistantText &&
      deepEqual(judeMsg.usage, rowJude.usage)
  }
  ok('Prompt Node non-stream Jude x8 → Score: 48 + PDF usage', pass, judeMsg?.content?.[0]?.text)

  const pnStream = await request(port, promptNodeMarkStreamBody())
  const pnStreamText = parseSseAssistantText(pnStream.body)
  ok(
    'Prompt Node streaming Mark x8 → Score: 40',
    pnStream.status === 200 && pnStreamText === rowMark.assistantText,
    pnStreamText
  )

  console.log('\n--- Negative cases ---\n')
  let res = await request(port, { model: 'x', messages: [] })
  ok('missing user marker → 412', res.status === 412)

  res = await request(port, {
    model: 'x',
    messages: [{ role: 'user', content: 'no Now analyze this user input: totally-unknown-xyz-999' }],
  })
  ok('unknown user input → 412', res.status === 412)

  res = await request(port, {
    model: 'x',
    messages: [
      {
        role: 'user',
        content:
          'generate summary for CUSTOMER:unknown transcript that will not match any fixture needles xyz123',
      },
    ],
  })
  ok('conversation summary unknown transcript → 412', res.status === 412)

  res = await request(port, {
    model: 'x',
    messages: [
      {
        role: 'user',
        content:
          'Paraphrase the user response based on the context in the en. No history block here. User: Hello',
      },
    ],
  })
  ok('rephrase missing ConversationHistory block → 412', res.status === 412)

  res = await request(port, {
    model: 'x',
    messages: [
      {
        role: 'user',
        content: buildRephraseUserQueryUserContent('\\nBot: Hi', 'totally-unknown-rephrase-tail-xyz'),
      },
    ],
  })
  ok('rephrase unknown tail → 412', res.status === 412)

  res = await request(port, {
    model: 'x',
    messages: [
      {
        role: 'user',
        content:
          'Paraphrase the bot response in English. <<CurrentIntent: Rephrase Dialog Responses Custom Integration Validation\n<<Instructions:>>\n<<Converation Context:\n{"chatContext":"x"}\n>>\n\nInput: totally-unknown-rdr-input-zz\n',
      },
    ],
  })
  ok('rephrase dialog responses unknown Input tail → 412', res.status === 412)

  res = await request(port, {
    model: 'x',
    messages: [
      {
        role: 'user',
        content:
          'Paraphrase the bot response in English based on the context. No Custom Integration Validation marker.\n\nInput: Enter Your Email Address\n',
      },
    ],
  })
  ok('rephrase bot phrase without PDF intent marker → 412', res.status === 412)

  res = await request(port, {
    model: 'x',
    messages: [
      {
        role: 'user',
        content:
          'I need you to act as a score calculator. JSON {"Mark" : 5, "Jude" : 6} multiplier 8 to calculate the score for Erik return only the final value.',
      },
    ],
  })
  ok('prompt node calculator phrase but no matching fixture → 412', res.status === 412)

  res = await request(
    port,
    { model: 'x', messages: [{ role: 'user', content: PREFIX + 'I want to book an aeroplane' }] },
    { 'x-api-key': 'wrong' }
  )
  ok('bad API key → 401', res.status === 401)

  server.close()

  console.log(
    failed === 0
      ? '\nAll tests passed.\n'
      : `\nDone with ${failed} failure(s).\n`
  )
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
