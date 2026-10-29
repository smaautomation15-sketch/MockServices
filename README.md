# XO Platform Regression Testing Services

Unified Node.js service for XO Platform regression and integration testing. The runtime hosts mock downstream APIs, authentication profile endpoints, BotKit routes, static mock assets, and the Google Chat typeahead validation mock from a single `app.js` entry point.

## Runtime Requirements

- **Node.js** (recommended 18+; root `redis` client targets modern Node)
- **Redis** is optional. If Redis is not running, OAuth token flows and webhook callback mocks use in-memory storage for the current process.
- **MongoDB** is optional. If MongoDB is not running, dynamic mock data is stored in `db/.local-data/`.

## Installation

From the repository root:

```bash
npm install
```

The `auth-profiles` package lists additional dependencies (`body-parser`, `busboy`, `fast-xml-parser`, and others). If anything fails to resolve when you run the app, install them from that folder as well:

```bash
cd auth-profiles && npm install && cd ..
```

## Service Startup

Start the complete service suite:

```bash
node app.js
```

That command checks and installs missing runtime npm dependencies for the root app, `auth-profiles`, `customer-validation-botkit`, and `gchat-typeahead-mock`, then starts mock services, auth profile routes, BotKit, and the Google Chat typeahead mock on one service port.

The app tries local MongoDB at `mongodb://127.0.0.1:27017` and local Redis at `127.0.0.1:6379`. If either service is not running, startup continues with local fallbacks: Mongo-style data is stored under `db/.local-data/`, and Redis token/webhook data uses in-memory storage for the current process.

MongoDB settings can be overridden with environment variables:

```bash
export MONGODB_URI=mongodb://127.0.0.1:27017
export MONGODB_DATABASE=xoplatform_regression
export DYNAMIC_MOCK_COLLECTION=dynamic_mocks # optional
```

Verify connectivity with an insert-and-read query:

```bash
npm run mongodb:smoke-test
```

```bash
npm start
```

- Default service port: **3000**
- Override port: set **`SERVER_PORT`** (for example `SERVER_PORT=4000 node app.js`).

You should see: `All services are running at http://<host>:<port>`.

MongoDB health check: `GET /health/mongodb`.

GChat typeahead mock:

```bash
GET  /gchat/health
GET  /gchat/
POST /gchat/typeahead
POST /gchat/oauth2/token
GET  /gchat/api/fruits
```

## Dynamic mock service

Dynamic mocks are stored in MongoDB, so mock responses can be created and changed without editing code or restarting this service. Identifiers are unique and all exact/partial matching is case-insensitive.

| Method | Path | Result |
|--------|------|--------|
| POST | `/mocks/insert` | Creates a mock. Returns `409` if the identifier already exists. |
| GET | `/mocks/fetch?identifier=<identifier>` | Returns the stored `returnPayload` using the stored `statusCode`. |
| GET | `/mocks/search?identifierContains=<text>` | Returns `{ "identifiers": [...] }` for literal partial matches. |
| PUT | `/mocks/insert` | Updates an existing mock selected by identifier. |
| DELETE | `/mocks/delete?identifier=<identifier>` | Deletes an exact identifier match. |

POST and PUT accept JSON:

```json
{
  "statusCode": 200,
  "identifier": "customer-created",
  "returnPayload": {
    "result": "success"
  }
}
```

`statusCode` must be an integer from 200 through 599, `identifier` must be a non-empty string, and `returnPayload` may be any JSON value. A unique MongoDB index is created automatically for normalized identifiers.

### Base URL

Set `BASE_URL` to the service root for the environment you are validating.

```bash
export BASE_URL="http://<host>:<port>"
```

---

## How services are exposed

| Mount path | Purpose |
|------------|---------|
| **`/auth-profiles`** | Mock identity providers: Basic/API key checks, OAuth 1.0, OAuth 2.0 (authorization code, password, client credentials), and a simple custom-auth callback page. |
| **`/mocks`** | Mock integrations: delay, webhooks (Redis-backed), NLU, time, remote lookup, Anthropic-style messages, Azure OpenAI–style chat completions, Google Policies FAQ (static HTML). |
| **Static files** | Files under `mocks/mock-files/` are served from the **site root** (not under `/mocks`). Example: `$BASE_URL/Kore.html`. |

Large JSON bodies on mock routes are allowed up to **`MOCK_BODY_LIMIT`** (default `10mb`) to avoid `413` errors on LLM-style payloads.

---

## Auth-profiles service (`/auth-profiles`)

Router: `auth-profiles/auth-router.js`. All paths below are prefixed with **`/auth-profiles`**.

### Simple HTTP auth (`/auth-profiles/auth`)

| Method | Path | Access |
|--------|------|--------|
| GET, POST | `/auth-profiles/auth/protected-basic` | **Basic auth**: username `admin`, password `password` (`Authorization: Basic <base64(admin:password)>`). |
| GET | `/auth-profiles/auth/protected-apikey` | **API key**: header `x-api-key` must be `YOUR_API_KEY_1` or `YOUR_API_KEY_2` (see `auth-profiles/routes/authRoutes.js`). |

### OAuth 1.0 (`/auth-profiles/oauth1`)

Uses Redis for request tokens. Example consumer key: **`Test_OAuth1_Consumer_Key`**. Verifier used in the flow: **`hfdp7dh39dks9884`**.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth-profiles/oauth1/initiate` | Request token; `Authorization` header uses OAuth key-value form (`oauth_consumer_key`, `oauth_signature_method=HMAC-SHA1`, `oauth_callback`, …). |
| GET | `/auth-profiles/oauth1/authorize` | User authorization step; query `oauth_token`. Redirects to stored `oauth_callback` with token and verifier. |
| POST | `/auth-profiles/oauth1/token` | Access token exchange. |
| GET | `/auth-profiles/oauth1/validation` | Validates token from `Authorization` OAuth header. |

### OAuth 2.0 — authorization code (`/auth-profiles/oauth2/grantcode`)

Client: **`Test_OAuth2_Grant_Code_Client_ID`** / **`Test_OAuth2_Grant_Code_Client_Secret`**. Tokens and codes are stored in Redis.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/auth-profiles/oauth2/grantcode/authorize` | Query: `response_type=code`, `client_id`, `redirect_uri`, optional `state`. Redirects with `code`. |
| POST | `/auth-profiles/oauth2/grantcode/token` | Body: `grant_type=authorization_code`, `code`, `redirect_uri`. Returns access and refresh tokens (JSON). |
| POST | `/auth-profiles/oauth2/grantcode/refresh_token` | Body: `grant_type=refresh_token`, `refresh_token`. |
| GET | `/auth-profiles/oauth2/grantcode/validation` | Header: `Authorization: Bearer <access_token>`. |

### OAuth 2.0 — password grant (`/auth-profiles/oauth2/password_grant`)

Test users (see `auth-profiles/routes/oauth2_passwordGrantRoute copy.js`):

- `user1` / `password1`
- `user2` / `password2`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth-profiles/oauth2/password_grant/token` | `grant_type=password` with `username` and `password`. Supports multiple content types via `oauth2BodyParser` (JSON, form, XML, multipart). |
| POST | `/auth-profiles/oauth2/password_grant/refresh_token` | `grant_type=refresh_token` and `refresh_token`. |
| GET | `/auth-profiles/oauth2/password_grant/validation` | `Authorization: Bearer <access_token>`. |

### OAuth 2.0 — client credentials (`/auth-profiles/oauth2/client_credentials_grant`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth-profiles/oauth2/client_credentials_grant/token` | Body: `grant_type=client_credentials`, `client_id` = **`Test_OAuth2_Client_Credentials_Grant_Client_ID`**, `client_secret` = **`Test_OAuth2_Client_Credentials_Grant_Client_Secret`**. |
| GET | `/auth-profiles/oauth2/client_credentials_grant/validation` | `Authorization: Bearer <access_token>`. |

### Custom authentication (`/auth-profiles/customauth`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/auth-profiles/customauth?callbackurl=<encoded-url>` | Calls the given `callbackurl` with a POST JSON body (`{ "name": "rama" }`) and returns a small HTML page that attempts to close the window after a few seconds. Use for flows that open a browser window and expect a callback. |

---

## Mocks service (`/mocks`)

Router: `mocks/mock-router.js`. All paths below are prefixed with **`/mocks`**.

### Delay API — `/mocks/delayAPI`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/mocks/delayAPI?delayseconds=<n>` | Waits `n` seconds (integer), then returns JSON. Invalid or missing `delayseconds` → 400. |

### Webhook async callback — `/mocks/webhookAsyncCallback`

Requires Redis (same manager as auth flows).

| Method | Path | Description |
|--------|------|-------------|
| POST | `/mocks/webhookAsyncCallback/callback` | Stores request body as a webhook response. |
| GET | `/mocks/webhookAsyncCallback/fetch` | Returns stored responses. |
| GET | `/mocks/webhookAsyncCallback/clear` | Clears stored responses. |

### External NLU — `/mocks/externalNLU`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/mocks/externalNLU/` | JSON body with **`user_input`**. If the text contains “travel” or “journey” (case-insensitive), returns a fixed task/entity payload; otherwise `{}`. |

### Get time — `/mocks/getTime`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/mocks/getTime?timeZone=<IANA>` | Returns current date/time parts for the timezone (default `Asia/Kolkata`). Invalid timezone → 400. |

### Remote lookup — `/mocks/remoteLookupAPI`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/mocks/remoteLookupAPI/` | Returns a fixed paginated JSON payload (sample “users” list). |

### Anthropic-style messages — `/mocks/anthropicllm`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/mocks/anthropicllm/v1/messages` | Anthropic-style **Messages** API mock (see [Anthropic mock LLM](#anthropic-mock-llm) below). |

### Azure OpenAI–style chat — `/mocks/azurellm`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/mocks/azurellm/openai/deployments/{deployment-id}/chat/completions` | Azure-style **chat completions** mock: **NLP Batch Test Cases Suggestions**, **Conversation Test Case Suggestions**, and **Training Utterance Suggestions** (see [Azure mock LLM](#azure-mock-llm)). Optional query **`api-version`** is ignored. |

### Google Policies FAQ — `/mocks/googlePoliciesFaq`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/mocks/googlePoliciesFaq/` | Returns **static HTML** modeled on the [Google Privacy & Terms FAQ](https://policies.google.com/faq?hl=en-US): same DOM class names (`ARpxub`, `ZXBUEd`, `#main-content`, `SbNcad`, etc.), logo, nav tabs, article copy, and footer links as on the live page (snapshot maintained in `mocks/googlePoliciesFaq/faq-mock.html`; no runtime calls to Google). `<base href="https://policies.google.com/">` so relative links resolve like production. Optional **`hl`** is ignored. Header **`X-Mock-Content: static-faq-html`**. |

To refresh this snapshot later, open the live FAQ in the **Playwright MCP** (`browser_navigate` → `https://policies.google.com/faq?hl=en-US`), then `browser_evaluate` and copy `document.querySelector('#main-content').outerHTML` and `document.querySelector('.ARpxub').outerHTML` into `faq-mock.html` (keep the local `<style>` block and simplified footer language row if you prefer a smaller file).

---

## Anthropic mock LLM

The mock implements `POST /mocks/anthropicllm/v1/messages` so clients can point at this server instead of Anthropic during tests. Shared wiring lives under `mocks/anthropicllm/`; feature-specific fixtures and handlers live under:

- **`mocks/anthropicllm/features/dialoggpt/`** — intent classification (`Now analyze this user input:` …).
- **`mocks/anthropicllm/features/conversationSummary/`** — transcript summaries (`generate summary for` …).
- **`mocks/anthropicllm/features/rephraseDialogResponses/`** — paraphrase **bot** lines (`Paraphrase the bot response` …, `Rephrase Dialog Responses Custom Integration Validation`, last `\n\nInput:` tail; see `Rephrase Dialog Responses.pdf`).
- **`mocks/anthropicllm/features/rephraseUserQuery/`** — paraphrase last user line after `<<ConversationHistory: "…">>` (`Paraphrase the user response` …, Rephrasing Rules, JSON format + example; see `promptPrefix.js` and `Rephrase User Query.pdf`).
- **`mocks/anthropicllm/features/promptNode/`** — generic prompt completion (`act as a score calculator` score task; top-level **`system`** + **`messages`** per Prompt Node.pdf).

The router reads the **last user** message and **`system`** (if present) and picks a feature in this order:

1. **Conversation Summary** — `generate summary for`
2. **Rephrase Dialog Responses** — `Paraphrase the bot response` and **`Rephrase Dialog Responses Custom Integration Validation`**
3. **Rephrase User Query** — `Paraphrase the user response` (Dialog + FAQ scenarios in the PDF)
4. **Prompt Node** — combined prompt text includes **`act as a score calculator`**
5. **DialogGPT** — `Now analyze this user input:`

### Authentication

Send header **`x-api-key`** with the value from `mocks/anthropicllm/constants.js` (default **`mock-anthropic-key`**). Wrong or missing key → **401**.

### Request shape (shared)

- **Body:** JSON with a **`messages`** array (Anthropic-style). Optional top-level **`system`** (string or content blocks) is included when routing **Prompt Node** and matching its fixtures.
- **Routing:** Most features use the **last user** message text; **Prompt Node** uses **system + all message contents** (normalized) for matching.
- **Optional `model`:** defaults to `claude-sonnet-4-5-20250929` in the response.
- **`stream`:** `true` → **SSE** (`text/event-stream`) with chunked deltas; `false` or omitted → single JSON message.

### DialogGPT feature

- **User text contract:** The last user message must contain **`Now analyze this user input:`** (case-insensitive). Everything **after** that marker is the utterance to classify.
- **Typical pattern:** prepend any prompt/summary, then the marker and the real input, for example:  
  `…summary… Now analyze this user input: I want to book an aeroplane`

#### How DialogGPT matching works

1. The text after `Now analyze this user input:` is **trimmed** and **runs of whitespace are collapsed** to a single space.
2. That string is compared to each row’s **`extracted`** field in `mocks/anthropicllm/features/dialoggpt/fixtures.js` (same normalization).
3. If nothing matches → **412** and body `user_input_not_matched`.
4. If the message does not match an earlier routed feature and does not contain the DialogGPT marker → **412** with the same error type.

#### DialogGPT response shape (non-streaming)

The HTTP response is a JSON **message** object. The assistant’s `content[0].text` is your structured payload **wrapped in a markdown fenced code block** (triple backticks around the JSON). The inner object is the **`response`** object from the matched fixture row (`category`, `fulfillment_type`, `winning_intents`, optional `execution_plan`, etc.).

### Conversation Summary feature

- **User text contract:** The last user message must contain **`generate summary for`** (case-insensitive), followed by the transcript to summarize (see `Conversation Summary.pdf` in the repo).
- **Matching:** Each row in `mocks/anthropicllm/features/conversationSummary/fixtures.js` lists **`matchWhenAll`**: every substring must appear in the user message (case-insensitive; whitespace collapsed for comparison). First matching row wins.
- **Response:** Assistant `content[0].text` is **plain markdown** (not JSON-in-fences). Non-streaming responses include **`stop_details`: null** and extended **`usage`** fields aligned with the spec sheet.

### Rephrase Dialog Responses feature

- **User text contract (Rephrase Dialog Responses.pdf):** The last user message must contain **`Paraphrase the bot response`** and **`Rephrase Dialog Responses Custom Integration Validation`**, a **`<<Converation Context:`** block (PDF spelling) wrapping JSON with **`chatContext`**, then a final **`Input:`** line introduced by **`\n\nInput:`**. The text after the **last** `\n\nInput:` (trimmed, whitespace collapsed) is the bot utterance to rephrase.
- **Matching:** That tail is compared case-insensitively to **`inputTail`** on each row in `mocks/anthropicllm/features/rephraseDialogResponses/fixtures.js`. First match wins. Rows also carry **`chatContextInner`** for building full PDF-shaped prompts via **`buildRephraseDialogUserContent`** in `promptPrefix.js`.
- **Response:** Assistant `content[0].text` is a markdown fenced `json` block with **`rephrasedResponse`**, **`rephraseSuccessful`**, and **`reason`**. Non-streaming responses use PDF-aligned **`usage`** per fixture (`stop_details`: null).

### Rephrase User Query feature

- **User text contract:** Must contain **`Paraphrase the user response`** (see `Rephrase User Query.pdf`), then **Rephrasing Rules** (plain-text rewrite rules, language and tone constraints), the **JSON return format** and **failure** clause, an **Example** block (instructions + conversation context + expected JSON), and a **`<<ConversationHistory: "…">>`** block. The text **after the last such block** (trimmed, whitespace collapsed) is the raw user utterance to rephrase. Shorter legacy prompts that omit the rules/example block still match if they contain the marker and history block.
- **Matching:** That tail is compared case-insensitively to **`userTail`** on each row in `mocks/anthropicllm/features/rephraseUserQuery/fixtures.js`. First match wins.
- **Response:** Assistant `content[0].text` is a markdown fenced code block with the `json` language tag, wrapping JSON with **`rephrasedUserQuery`**, **`rephraseSuccessful`**, **`reason`**, and **`originalFormat`**. Non-streaming responses include **`stop_details`: null** and extended **`usage`** (same style as Conversation Summary).

### Prompt Node feature

- **User contract (Prompt Node.pdf):** Optional top-level **`system`** plus **`messages`**. Detection: normalized **system + all message bodies** contains **`act as a score calculator`**.
- **Matching:** Rows in **`mocks/anthropicllm/features/promptNode/fixtures.js`** use **`matchWhenAll`** on normalized text (system + all message bodies). Typical PDF rows require **`multiplier 8`**, both **`"mark"`** / **`"jude"`** in the JSON snippet, and either **`to calculate the score for jude`** or **`to calculate the score for mark`** (depending on the row). **Curly / “smart” quotes** in the prompt are normalized to ASCII quotes before matching.
- **Response:** Plain text assistant message (e.g. **`Score: 48`**), with **`stop_details`: null** and optional PDF-aligned **`usage`** for covered scenarios.

### Multi-turn behavior (`x-mock-session-id`) — DialogGPT only

Some DialogGPT fixtures set **`setsGate`** to `restart`, `transfer`, or `end`. The server stores that pending state **per session** (in memory).

- Send a stable header **`x-mock-session-id`** (any non-empty string) for a conversation thread. Omit it and the mock uses session **`default`**.
- After a row with `setsGate`, the next matching turn for **that same session** where the extracted text is **`yes`** or **`no`** (case-insensitive) returns a follow-up payload (see `features/dialoggpt/matchFixture.js` and `features/dialoggpt/responses/restartInteraction.js` / `features/dialoggpt/responses/systemContinue.js`).

### Adding a new DialogGPT user input and mock response

1. Open **`mocks/anthropicllm/features/dialoggpt/fixtures.js`**.
2. Append a new object to the **`fixtures`** array:

```js
{
  extracted: 'Your exact user utterance after normalization',
  response: {
    category: 'Category 1',
    fulfillment_type: 'single_intent',
    winning_intents: ['DialogGPTCustomIntegrationApp:Your Intent Name'],
    // optional, for multiple_intents:
    // execution_plan: ['DialogGPTCustomIntegrationApp:First', 'DialogGPTCustomIntegrationApp:Second'],
  },
  // optional — only for restart / transfer / end flows:
  // setsGate: 'restart' | 'transfer' | 'end',
},
```

3. **`extracted`** must equal what your client will send **after** `Now analyze this user input:`, after the same trimming and whitespace collapsing. If tests use extra spaces or newlines, normalize them to match this string (or align the string with how the client formats the text).
4. **`response`** can follow existing examples in the same file (`single_intent`, `multiple_intents`, `generate_answer`, `ambiguous_intents`, `conversation_intent`, `system_intent`, etc.).
5. Restart the Node server (or rely on file reload if you use one) so the updated `fixtures` module is loaded.

### Adding a Rephrase Dialog Responses fixture

1. Open **`mocks/anthropicllm/features/rephraseDialogResponses/fixtures.js`**.
2. Append **`{ id, inputTail, chatContextInner, response, usage }`** where **`inputTail`** matches the client’s final **`Input:`** line (after normalization), **`chatContextInner`** is the string stored in **`chatContext`** for that PDF scenario, **`response`** is the JSON object inside the assistant fenced block, and **`usage`** matches the spec sheet if you need byte-for-byte parity.

### Adding a Rephrase User Query fixture

1. Open **`mocks/anthropicllm/features/rephraseUserQuery/fixtures.js`**.
2. Append **`{ id, userTail, response }`**: **`userTail`** is the exact trailing user line after the last history block (matching is case-insensitive); **`response`** is the JSON object inside the assistant’s fenced `json` code block. Canonical request bodies use **`buildRephraseUserQueryUserContent`** in **`mocks/anthropicllm/features/rephraseUserQuery/promptPrefix.js`**.

### Adding a Conversation Summary fixture

1. Open **`mocks/anthropicllm/features/conversationSummary/fixtures.js`**.
2. Append an object with **`id`**, **`matchWhenAll`** (array of substrings that must all appear in the user message), and **`assistantText`** (markdown returned as the assistant text block).
3. Put **more specific rows first** if two scenarios could overlap.

To verify fixtures without the full app, run:

```bash
node mocks/anthropicllm/run-fixture-tests.js
```

That script starts a tiny local server, posts client-style bodies for every DialogGPT fixture (plus streaming, session checks, Conversation Summary, Rephrase Dialog Responses, Rephrase User Query, Prompt Node), and exits non-zero if any assertion fails.

---

## Azure mock LLM

The mock implements **`POST /mocks/azurellm/openai/deployments/{deployment-id}/chat/completions`** so clients can point at this server instead of Azure OpenAI during tests. Header **`api-key`** must match **`mocks/azurellm/constants.js`** (default **`mock-azure-openai-key`**). Wrong or missing key → **401**.

One route handles three features; the mock tries fixtures in this order:

1. **NLP Batch Test Cases Suggestions** — prompts containing **`Generate exactly 8 intent training samples`** (see `NLP Batch Test Cases Suggestions.pdf`). Fixtures: `mocks/azurellm/features/nlpBatchTestCasesSuggestions/fixtures.js`.
2. **Conversation Test Case Suggestions** — prompts containing **`Generate just the 5 possible next user inputs`** (see `Conversation Test Case Suggestions.pdf`). Fixtures: `mocks/azurellm/features/conversationTestcaseSuggestions/fixtures.js`.
3. **Training Utterance Suggestions** — otherwise matches rows in `mocks/azurellm/features/trainingUtteranceSuggestions/fixtures.js` (see `Training Utterances Suggestions.pdf`).

### NLP Batch Test Cases Suggestions

- **Matching:** Same rules as training utterances: normalized messages text must contain every string in the row’s **`matchWhenAll`** (HTML entities in prompts are normalized).
- **Response:** **`choices[0].message.content`** is exactly **8** numbered lines per the PDF; **`usage`** matches the sheet where specified.

### Conversation Test Case Suggestions

- **Feature folder:** `mocks/azurellm/features/conversationTestcaseSuggestions/`.
- **Request:** System message with **`Generate just the 5 possible next user inputs in English for chat bot conversation`**, rephrasing-condition bullets, bot intent/entity list, and **`Conversation Context:`** (PDF scenario: **`Current Intent: __notFound__`**, **`User: Start_Flow`**, **`Bot: How can I help you?`**). Canonical body: **`buildConversationTestcaseSuggestionsSystemContent`** in **`promptPrefix.js`**.
- **Matching:** Normalized messages text must contain every string in the row’s **`matchWhenAll`**.
- **Response:** **`choices[0].message.content`** is exactly **5** numbered next-user-input lines (movie-ticket samples with entity markers per the PDF); **`usage`** matches the sheet where specified.
- **Streaming:** Same SSE shape as other Azure features.

### Training Utterance Suggestions

- **Feature folder:** `mocks/azurellm/features/trainingUtteranceSuggestions/`.
- **Request body:** Same general shape as Azure/OpenAI chat completions: **`messages`** (array of `{ role, content }`), optional **`model`**, **`temperature`**, **`stream`**, etc.
- **Matching:** The concatenation of all message roles and contents is normalized (HTML entities decoded, whitespace collapsed, lowercased). Each row in **`fixtures.js`** lists **`matchWhenAll`**: every substring must appear for that row to match. First match wins.
- **Response:** JSON **`chat.completion`**: **`choices[0].message.content`** is the numbered training utterance string from the fixture. The PDF scenario (`Training Utterances Suggestions.pdf`) includes fixed **`usage`** (and optional latency fields). Other fixtures omit **`usage`** in the file and the mock fills defaults from payload size.
- **Streaming:** `stream: true` returns Server-Sent Events in the usual **`data: {…}`** / **`data: [DONE]`** chat-completion chunk shape.

Verify:

```bash
node mocks/azurellm/run-fixture-tests.js
```

That script covers **NLP Batch**, **Conversation Test Case** (non-stream + stream), and **Training Utterance** fixtures, then negatives.

---

## Quick checks

```bash
# Basic auth
curl -u admin:password $BASE_URL/auth-profiles/auth/protected-basic

# API key
curl -H "x-api-key: YOUR_API_KEY_1" $BASE_URL/auth-profiles/auth/protected-apikey

# Static mock file
curl -I $BASE_URL/Kore.html

# Delay 1 second
curl "$BASE_URL/mocks/delayAPI?delayseconds=1"

# Anthropic mock — DialogGPT (non-stream): marker + user text must match a fixture `extracted`
curl -s -X POST $BASE_URL/mocks/anthropicllm/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: mock-anthropic-key" \
  -d '{"model":"claude-sonnet-4-5-20250929","stream":false,"messages":[{"role":"user","content":"Summary. Now analyze this user input: I want to book an aeroplane"}]}'

# Anthropic mock — Conversation Summary (non-stream): plain markdown in content[0].text
curl -s -X POST $BASE_URL/mocks/anthropicllm/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: mock-anthropic-key" \
  -d '{"model":"claude-sonnet-4-5-20250929","stream":false,"messages":[{"role":"user","content":"generate summary for Agent: Thank you for calling ITC Computers. My name is Harish. Consumer: My Name is Rao I want to Buy a Tata Tiago Car"}]}'

# Anthropic mock — Rephrase Dialog Responses (non-stream): bot paraphrase + PDF intent marker + last Input: tail (minimal body; production uses full example prefix from the PDF — see promptPrefix.js)
curl -s -X POST $BASE_URL/mocks/anthropicllm/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: mock-anthropic-key" \
  -d '{"model":"claude-sonnet-4-5-20250929","stream":false,"messages":[{"role":"user","content":"Paraphrase the bot response in English based on the context and users emotion.\nRephrase Dialog Responses Custom Integration Validation\n\n<<Converation Context:\n{\"chatContext\":\"\"}\n>>\n\nInput: Enter Your Email Address\n"}]}'

# Anthropic mock — Rephrase User Query (non-stream): legacy short body (still matches the same tail). Full PDF-shaped `content` uses **`buildRephraseUserQueryUserContent`** in **`mocks/anthropicllm/features/rephraseUserQuery/promptPrefix.js`** (see Rephrase User Query.pdf).
curl -s -X POST $BASE_URL/mocks/anthropicllm/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: mock-anthropic-key" \
  -d '{"model":"claude-sonnet-4-5-20250929","stream":false,"messages":[{"role":"user","content":"Paraphrase the user response based on the context and the users emotion in the en. Do not change statements into questions or questions into statements.\n\nReturn ONLY a JSON object in the specified format.\n\n<<ConversationHistory: \"\\nBot: How can I help you?\">>\n\nHello"}]}'

# Anthropic mock — Prompt Node (score calculator, non-stream): top-level system + user task
curl -s -X POST $BASE_URL/mocks/anthropicllm/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: mock-anthropic-key" \
  -d '{"model":"claude-sonnet-4-5-20250929","max_tokens":620,"temperature":0.7,"stream":false,"system":"You are a helpful AI assistant","messages":[{"role":"user","content":"I need you to act as a score calculator. For JSON {\"Mark\" : 5, \"Jude\" : 6, \"Axel\" : 7, \"Erik\" : 3 } and multiplier 8 calculate the score for Jude return only the final value."}]}'

# Azure mock — NLP Batch Test Cases (exactly 8 samples + Book Movie ticket + Paris sample)
curl -s -X POST "$BASE_URL/mocks/azurellm/openai/deployments/gpt-4o/chat/completions?api-version=2024-02-15-preview" \
  -H "Content-Type: application/json" \
  -H "api-key: mock-azure-openai-key" \
  -d '{"model":"GPT-4o","temperature":0.7,"stream":false,"messages":[{"role":"system","content":"Generate exactly 8 intent training samples in English for below intent with the entity values\nIntent: Book Movie ticket\nEntities: moviename, ticketcount\nSamples in English:\n1. Book flight from [SourceCity](Paris) to [DestinationCity](London) for [TravelDate](Tuesday)\n"}]}'

# Azure mock — Conversation Test Case Suggestions (5 next user inputs; full PDF body in promptPrefix.js)
curl -s -X POST "$BASE_URL/mocks/azurellm/openai/deployments/gpt-4o/chat/completions?api-version=2024-02-15-preview" \
  -H "Content-Type: application/json" \
  -H "api-key: mock-azure-openai-key" \
  -d '{"model":"GPT-4o","temperature":0.73,"stream":false,"messages":[{"role":"system","content":"Generate just the 5 possible next user inputs in English for chat bot conversation\nBook Movie ticket\nSmartwatch Product Colors\nConversation Context:\nCurrent Intent: __notFound__\nUser: Start_Flow\nBot: How can I help you?"}]}'

# Azure mock — Training utterances (chat completions): api-key + messages must match a fixture
curl -s -X POST "$BASE_URL/mocks/azurellm/openai/deployments/gpt-4o/chat/completions?api-version=2024-02-15-preview" \
  -H "Content-Type: application/json" \
  -H "api-key: mock-azure-openai-key" \
  -d '{"model":"gpt-4o","stream":false,"messages":[{"role":"system","content":"Generate intent training samples in English for below intent.\nIntent: Book Doctor Appointment\nSamples in English:\n1. Book flight from [SourceCity](Paris) to [DestinationCity](London)"}]}'

# Google Policies FAQ mock (static HTML)
curl -sI "$BASE_URL/mocks/googlePoliciesFaq/"
```

---

## Auth-profiles unit tests

Inside `auth-profiles`:

```bash
cd auth-profiles
npm test
```

---

## Security note

This repository is intended for **testing only**. Credentials, API keys, and Redis settings in source files are not production secrets; replace them with environment-specific configuration before any non-test deployment.
