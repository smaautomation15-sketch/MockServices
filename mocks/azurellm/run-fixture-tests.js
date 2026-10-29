/**
 * Integration checks: POST /mocks/azurellm/openai/deployments/:deployment/chat/completions
 * — NLP Batch, Conversation Test Case Suggestions, then Training Utterance Suggestions.
 */
/* eslint-disable no-console */

const http = require('http')
const express = require('express')
const { fixtures: trainingFixtures } = require('./features/trainingUtteranceSuggestions/fixtures')
const { fixtures: nlpFixtures } = require('./features/nlpBatchTestCasesSuggestions/fixtures')
const { fixtures: conversationTestcaseFixtures } = require('./features/conversationTestcaseSuggestions/fixtures')
const {
  buildConversationTestcaseSuggestionsSystemContent,
} = require('./features/conversationTestcaseSuggestions/promptPrefix')

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b)
}

function request(port, deployment, body, headers = {}) {
  const payload = JSON.stringify(body)
  const path = `/mocks/azurellm/openai/deployments/${encodeURIComponent(
    deployment
  )}/chat/completions?api-version=2024-02-15-preview`
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          'api-key': 'mock-azure-openai-key',
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

function parseSseAssistantContent(sseBody) {
  const lines = sseBody.split('\n')
  let text = ''
  for (const line of lines) {
    if (!line.startsWith('data: ')) continue
    const raw = line.slice(6).trim()
    if (raw === '[DONE]') continue
    if (!raw) continue
    try {
      const ev = JSON.parse(raw)
      const delta = ev.choices?.[0]?.delta
      if (delta && typeof delta.content === 'string') {
        text += delta.content
      }
    } catch {
      // ignore
    }
  }
  return text
}

function nlpBatchPdfLikeBody() {
  return {
    model: 'GPT-4o',
    temperature: 0.7,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
    stream: false,
    messages: [
      {
        role: 'system',
        content: [
          'Generate exactly 8 intent training samples in English for below intent with the entity values\n',
          'Here are some instructions\n',
          'Intent: Book Movie ticket\n',
          'Entities: moviename, ticketcount\n',
          'Samples in English:\n',
          '1. Book flight from [SourceCity](Paris) to [DestinationCity](London) for [TravelDate](Tuesday)\n',
        ].join(''),
      },
    ],
  }
}

function conversationTestcasePdfLikeBody() {
  return {
    model: 'GPT-4o',
    temperature: 0.73,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
    stream: false,
    messages: [
      {
        role: 'system',
        content: buildConversationTestcaseSuggestionsSystemContent(),
      },
    ],
  }
}

function pdfLikeBookDoctorBody() {
  return {
    model: 'GPT-4o',
    temperature: 0.73,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
    stream: false,
    messages: [
      {
        role: 'system',
        content: [
          'Generate intent training samples in English for below intent with the entity values\n',
          'Here are some instructions\n',
          'Intent: Book Doctor Appointment\n',
          'Do not include the sentences that are similar to the following\n',
          'Samples in English:\n',
          '1. Book flight from [SourceCity](Paris) to [DestinationCity](London) for [TravelDate](Tuesday)\n',
        ].join(''),
      },
    ],
  }
}

function orderPizzaBody() {
  return {
    model: 'gpt-4o',
    stream: false,
    messages: [
      {
        role: 'system',
        content:
          'Generate intent training samples in English for below intent.\nIntent: Order Pizza\nEntities: [Size], [Topping]\n',
      },
    ],
  }
}

async function main() {
  const app = express()
  app.use(express.json({ limit: '2mb' }))
  app.use('/mocks/azurellm', require('./router'))

  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s))
  })
  const port = server.address().port
  const deployment = 'gpt-4o'

  let failed = 0
  const ok = (name, cond, detail) => {
    if (cond) {
      console.log(`  OK  ${name}`)
    } else {
      failed++
      console.error(`  FAIL ${name}`, detail || '')
    }
  }

  const rowNlp = nlpFixtures.find((f) => f.id === 'nlp-batch-book-movie-ticket')
  const rowConversation = conversationTestcaseFixtures.find(
    (f) => f.id === 'conversation-testcase-start-flow-notfound'
  )
  const rowPdf = trainingFixtures.find((f) => f.id === 'book-doctor-appointment-movie-samples')
  const rowPizza = trainingFixtures.find((f) => f.id === 'order-pizza-samples')

  console.log('\n--- NLP Batch Test Cases Suggestions (PDF-like) ---\n')
  let res = await request(port, deployment, nlpBatchPdfLikeBody())
  let pass = res.status === 200
  let msg
  if (pass) {
    msg = JSON.parse(res.body)
    pass =
      msg.choices?.[0]?.message?.content === rowNlp.assistantContent &&
      deepEqual(msg.usage, rowNlp.usage)
  }
  ok('Book Movie ticket → 8 batch utterances + PDF usage', pass, res.body?.slice(0, 120))

  console.log('\n--- NLP Batch streaming ---\n')
  const nlpStream = { ...nlpBatchPdfLikeBody(), stream: true }
  res = await request(port, deployment, nlpStream)
  const nlpStreamed = parseSseAssistantContent(res.body)
  ok(
    'NLP batch streaming matches assistant text',
    res.status === 200 && nlpStreamed === rowNlp.assistantContent,
    nlpStreamed.slice(0, 80)
  )

  console.log('\n--- Conversation Test Case Suggestions (PDF-like) ---\n')
  res = await request(port, deployment, conversationTestcasePdfLikeBody())
  pass = res.status === 200
  if (pass) {
    msg = JSON.parse(res.body)
    pass =
      msg.choices?.[0]?.message?.content === rowConversation.assistantContent &&
      deepEqual(msg.usage, rowConversation.usage)
  }
  ok('Start_Flow / __notFound__ → 5 next user inputs + PDF usage', pass, res.body?.slice(0, 120))

  const convStream = { ...conversationTestcasePdfLikeBody(), stream: true }
  res = await request(port, deployment, convStream)
  const convStreamed = parseSseAssistantContent(res.body)
  ok(
    'Conversation Test Case streaming matches assistant text',
    res.status === 200 && convStreamed === rowConversation.assistantContent,
    convStreamed.slice(0, 80)
  )

  console.log('\n--- Training Utterance Suggestions (PDF-like request) ---\n')
  res = await request(port, deployment, pdfLikeBookDoctorBody())
  pass = res.status === 200
  if (pass) {
    msg = JSON.parse(res.body)
    pass =
      msg.choices?.[0]?.message?.content === rowPdf.assistantContent &&
      deepEqual(msg.usage, rowPdf.usage)
  }
  ok('Book Doctor Appointment → movie training utterances + PDF usage', pass, res.body?.slice(0, 120))

  console.log('\n--- Order Pizza fixture ---\n')
  res = await request(port, deployment, orderPizzaBody())
  pass = res.status === 200
  if (pass) {
    msg = JSON.parse(res.body)
    pass = msg.choices?.[0]?.message?.content === rowPizza.assistantContent
  }
  ok('Order Pizza → pizza samples', pass, msg?.choices?.[0]?.message?.content?.slice(0, 80))

  console.log('\n--- Training streaming ---\n')
  const streamBody = { ...pdfLikeBookDoctorBody(), stream: true }
  res = await request(port, deployment, streamBody)
  const streamed = parseSseAssistantContent(res.body)
  ok(
    'training streaming aggregates to same assistant text',
    res.status === 200 && streamed === rowPdf.assistantContent,
    streamed.slice(0, 80)
  )

  console.log('\n--- Negatives ---\n')
  res = await request(port, deployment, { messages: [] })
  ok('missing messages → 400', res.status === 400)

  res = await request(port, deployment, {
    messages: [{ role: 'user', content: 'no training samples keyword here' }],
  })
  ok('no fixture match → 412', res.status === 412)

  res = await request(port, deployment, pdfLikeBookDoctorBody(), { 'api-key': 'wrong' })
  ok('bad api-key → 401', res.status === 401)

  server.close()

  console.log(
    failed === 0
      ? '\nAll Azure LLM mock tests passed.\n'
      : `\nDone with ${failed} failure(s).\n`
  )
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
