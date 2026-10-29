#!/usr/bin/env node
'use strict';

/**
 * Mock endpoint server for validating XOP-33203 (Google Chat typeahead) and for exercising
 * every auth-profile sso_type the platform supports. Zero dependencies — plain node:http.
 *
 * Auth is chosen by PATH, not by an env var, so every method is testable against one
 * running server without a restart:
 *
 *   Fruits API — a plain REST resource, for testing auth on its own
 *     GET|POST /api/fruits                    no auth
 *     GET|POST /api/fruits/basic              HTTP Basic
 *     GET|POST /api/fruits/bearer             static bearer token
 *     GET|POST /api/fruits/apikey             API key, header OR ?api_key=
 *     GET|POST /api/fruits/oauth2-cc          bearer minted via client_credentials
 *     GET|POST /api/fruits/oauth2-password    bearer minted via password grant
 *     GET|POST /api/fruits/any                any one of the above
 *
 *   Typeahead — returns Google Chat suggestion envelopes
 *     POST /typeahead                         auth per AUTH_MODE env (back-compat)
 *     POST /typeahead/basic | /bearer | /apikey | /oauth2-cc | /oauth2-password | /any
 *
 *   OAuth2 token endpoint (grant_type=client_credentials | password)
 *     POST /oauth2/token                      (alias: POST /oauth/token)
 *
 *   GET /health                               liveness + config
 *   GET /                                     endpoint index
 *
 * Every request logs the auth and custom headers it arrived with, so you can prove what the
 * platform actually sent without reading platform logs.
 *
 * Env (all optional):
 *   PORT=4545
 *   AUTH_MODE=none|api_key|basic|bearer|oauth2      applies to /typeahead only
 *   API_KEY_HEADER=X-API-Key       API_KEY=k-123456
 *   BASIC_USER=xo-typeahead        BASIC_PASS=s3cr3t
 *   BEARER_TOKEN=static-tok-abc
 *   OAUTH_CLIENT_ID=svc-xo         OAUTH_CLIENT_SECRET=svc-secret
 *   RO_USERNAME=xo-user            RO_PASSWORD=xo-pass        (password grant)
 *   OAUTH_TOKEN_TTL=300
 *   FAIL_ONCE_401=true             first /typeahead call 401s, to exercise the retry
 */

const http = require('http');

const PORT = Number(process.env.PORT) || 4545;
const AUTH_MODE = (process.env.AUTH_MODE || 'none').toLowerCase();
const API_KEY_HEADER = (process.env.API_KEY_HEADER || 'X-API-Key').toLowerCase();
const API_KEY = process.env.API_KEY || 'k-123456';
const BASIC_USER = process.env.BASIC_USER || 'xo-typeahead';
const BASIC_PASS = process.env.BASIC_PASS || 's3cr3t';
const BEARER_TOKEN = process.env.BEARER_TOKEN || 'static-tok-abc';
const OAUTH_CLIENT_ID = process.env.OAUTH_CLIENT_ID || 'svc-xo';
const OAUTH_CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET || 'svc-secret';
const RO_USERNAME = process.env.RO_USERNAME || 'xo-user';
const RO_PASSWORD = process.env.RO_PASSWORD || 'xo-pass';
const OAUTH_TOKEN_TTL = Number(process.env.OAUTH_TOKEN_TTL) || 300;
const FAIL_ONCE_401 = String(process.env.FAIL_ONCE_401 || '') === 'true';

// Tokens this server minted, so protected routes can verify what it issued.
// token -> { grant, clientId, username, scope, expiresAt }
const issuedTokens = new Map();
let tokenSeq = 0;
let typeaheadHits = 0;
let fruitHits = 0;
let tokenRequests = 0;   // every token call, including rejected ones

/* ---------------------------------------------------------------- *
 * Fruits — the resource used to test auth on its own
 * ---------------------------------------------------------------- */

const FRUITS = [
    { id: 'fr-01', name: 'Alphonso Mango', color: 'yellow', pricePerKg: 240, inStock: true,  season: 'summer' },
    { id: 'fr-02', name: 'Banana',         color: 'yellow', pricePerKg: 60,  inStock: true,  season: 'all' },
    { id: 'fr-03', name: 'Blueberry',      color: 'blue',   pricePerKg: 850, inStock: false, season: 'summer' },
    { id: 'fr-04', name: 'Cherry',         color: 'red',    pricePerKg: 700, inStock: true,  season: 'summer' },
    { id: 'fr-05', name: 'Custard Apple',  color: 'green',  pricePerKg: 180, inStock: true,  season: 'winter' },
    { id: 'fr-06', name: 'Dragon Fruit',   color: 'pink',   pricePerKg: 320, inStock: true,  season: 'monsoon' },
    { id: 'fr-07', name: 'Grapes',         color: 'green',  pricePerKg: 110, inStock: true,  season: 'winter' },
    { id: 'fr-08', name: 'Guava',          color: 'green',  pricePerKg: 90,  inStock: true,  season: 'winter' },
    { id: 'fr-09', name: 'Jackfruit',      color: 'green',  pricePerKg: 70,  inStock: false, season: 'summer' },
    { id: 'fr-10', name: 'Kiwi',           color: 'brown',  pricePerKg: 400, inStock: true,  season: 'winter' },
    { id: 'fr-11', name: 'Lychee',         color: 'red',    pricePerKg: 260, inStock: true,  season: 'summer' },
    { id: 'fr-12', name: 'Orange',         color: 'orange', pricePerKg: 100, inStock: true,  season: 'winter' },
    { id: 'fr-13', name: 'Papaya',         color: 'orange', pricePerKg: 50,  inStock: true,  season: 'all' },
    { id: 'fr-14', name: 'Pineapple',      color: 'yellow', pricePerKg: 80,  inStock: true,  season: 'monsoon' },
    { id: 'fr-15', name: 'Pomegranate',    color: 'red',    pricePerKg: 220, inStock: true,  season: 'autumn' },
    { id: 'fr-16', name: 'Sapota',         color: 'brown',  pricePerKg: 95,  inStock: true,  season: 'winter' },
    { id: 'fr-17', name: 'Strawberry',     color: 'red',    pricePerKg: 520, inStock: true,  season: 'winter' },
    { id: 'fr-18', name: 'Watermelon',     color: 'green',  pricePerKg: 30,  inStock: true,  season: 'summer' }
];

/** Filters supported on every fruits route: ?q= ?id= ?color= ?inStock= ?limit= */
function filterFruits(query) {
    let out = FRUITS.slice();
    const q = String(query.q || query.search || '').trim().toLowerCase();
    if (q) {
        out = out.filter((f) =>
            f.name.toLowerCase().includes(q) ||
            f.color.toLowerCase().includes(q) ||
            f.id.toLowerCase().includes(q));
    }
    if (query.id) out = out.filter((f) => f.id === String(query.id));
    if (query.color) out = out.filter((f) => f.color === String(query.color).toLowerCase());
    if (query.inStock !== undefined && query.inStock !== '') {
        const want = String(query.inStock) === 'true';
        out = out.filter((f) => f.inStock === want);
    }
    const limit = Number(query.limit);
    if (Number.isFinite(limit) && limit > 0) out = out.slice(0, limit);
    return out;
}

/* ---------------------------------------------------------------- *
 * Typeahead suggestion sources
 * ---------------------------------------------------------------- */

/**
 * Suggestion sources, keyed by the card's externalDataSource.function.
 *
 * Routing on the function name is the reason the platform forwards the whole Chat
 * event rather than just the query string: one endpoint can back every multiselect
 * in the bot. Add a key here for each new widget.
 *
 * Each item is a Google SelectionItem — `text` and `value` are the only required
 * fields. `value` is what the bot receives when the form is submitted, so it should
 * be the stable id, not the display name. `startIconUri` is also supported but is
 * omitted here: Google fetches it directly, so a URL it cannot reach renders broken.
 */
const DATA_SOURCES = {
    // matches "externalDataSource": { "function": "queryEmployees" }
    queryEmployees: [
        { text: 'Aarti Mehta',        value: 'emp-1013', bottomText: 'Engineering · Bengaluru' },
        { text: 'Aaron Fitzgerald',   value: 'emp-1027', bottomText: 'Sales · Austin' },
        { text: 'Ananya Krishnan',    value: 'emp-1042', bottomText: 'Product · Hyderabad' },
        { text: 'Brian Osei',         value: 'emp-1055', bottomText: 'Support · Dublin' },
        { text: 'Chen Wei',           value: 'emp-1061', bottomText: 'Engineering · Singapore' },
        { text: 'Diego Ramirez',      value: 'emp-1074', bottomText: 'Finance · Mexico City' },
        { text: 'Fatima Al-Sayed',    value: 'emp-1088', bottomText: 'Legal · Dubai' },
        { text: 'Grace Okonkwo',      value: 'emp-1090', bottomText: 'Engineering · Lagos' },
        { text: 'Hiroshi Tanaka',     value: 'emp-1104', bottomText: 'Design · Tokyo' },
        { text: 'Priya Raghavan',     value: 'emp-1117', bottomText: 'Engineering · Bengaluru' },
        { text: 'Sanjay Dooluri',     value: 'emp-1125', bottomText: 'Platform · Hyderabad' },
        { text: 'Sofia Lindqvist',    value: 'emp-1132', bottomText: 'Marketing · Stockholm' },
        { text: 'Tomas Novak',        value: 'emp-1146', bottomText: 'Support · Prague' },
        { text: 'Yuki Sato',          value: 'emp-1158', bottomText: 'Engineering · Osaka' }
    ],
    // matches "externalDataSource": { "function": "queryFruits" }
    queryFruits: FRUITS.map((f) => ({
        text: f.name,
        value: f.id,
        bottomText: `${f.color} · ₹${f.pricePerKg}/kg${f.inStock ? '' : ' · out of stock'}`
    }))
};

// Used only when the event carries no invokedFunction at all (bare curl testing).
const DEFAULT_FUNCTION = process.env.DEFAULT_FUNCTION || 'queryEmployees';

/* ---------------------------------------------------------------- *
 * Event reading — mirrors the platform so we can prove what arrived
 * ---------------------------------------------------------------- */

// CommonEventObject.parameters is a map; the {key,value} array is tolerated.
function eventParameters(body) {
    let params = body && body.common && body.common.parameters;
    if (params === undefined || params === null) {
        params = body && body.commonEventObject && body.commonEventObject.parameters;
    }
    if (Array.isArray(params)) {
        return params.reduce((acc, e) => {
            if (e && typeof e.key === 'string') acc[e.key] = e.value;
            return acc;
        }, {});
    }
    return (params && typeof params === 'object') ? params : {};
}

/**
 * Is this body a Google Chat event rather than a plain API call?
 *
 * Add-on payloads nest everything under `chat`; classic Chat app payloads carry `type` plus
 * `common` at the top level. Either way the response has to be a suggestion envelope, since
 * the platform returns whatever we send straight back to Google.
 */
function isChatEvent(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) return false;
    return !!(body.chat || body.commonEventObject || body.common ||
        body.type === 'WIDGET_UPDATED' || body.type === 'CARD_CLICKED' || body.type === 'MESSAGE');
}

function readEvent(body) {
    const params = eventParameters(body);
    const isAddons = !!(body && body.chat);
    return {
        format: isAddons ? 'addons' : 'legacy',
        type: isAddons ? (body.chat.widgetUpdatedPayload ? 'WIDGET_UPDATED' : '?') : (body && body.type),
        invokedFunction:
            (body && body.common && body.common.invokedFunction) ||
            (body && body.commonEventObject && body.commonEventObject.invokedFunction) ||
            params.__action_method_name__ || null,
        query: typeof params.autocomplete_widget_query === 'string' ? params.autocomplete_widget_query : '',
        // Which data source the card asked for, when function is a URL and the name
        // travels in action.parameters. Accepts a few common key spellings.
        dataSourceParam: params.method || params.dataSource || params.source ||
            params.__action_method_name__ || null,
        space: (body && body.space && body.space.name) ||
            (isAddons && body.chat.widgetUpdatedPayload && body.chat.widgetUpdatedPayload.space
                && body.chat.widgetUpdatedPayload.space.name) || null
    };
}

/* ---------------------------------------------------------------- *
 * The typeahead response — returned to Google Chat verbatim
 * ---------------------------------------------------------------- */

/**
 * Build the suggestion envelope Google expects.
 *
 * The platform forwards this response to Google Chat unchanged, so what we return here IS
 * what the Chat client receives. That makes the envelope our responsibility, and it
 * differs by app type:
 *
 *   classic Chat app  -> actionResponse.updatedWidget.suggestions.items
 *   Workspace add-on  -> action.modifyOperations[].updateWidget
 *                          .selectionInputWidgetSuggestions.suggestions
 *
 * ("UpdatedWidget ... Only available for Google Chat apps. Not available for Google
 * Workspace add-ons.") We pick from the forwarded event: body.chat is present only for an
 * add-on. Any real customer endpoint serving both app types must do this same check.
 */
function googleSuggestionsResponse(items, isAddons) {
    if (isAddons) {
        return {
            action: {
                modifyOperations: [
                    { updateWidget: { selectionInputWidgetSuggestions: { suggestions: items } } }
                ]
            }
        };
    }
    return {
        actionResponse: {
            type: 'UPDATE_WIDGET',
            updatedWidget: { suggestions: { items: items } }
        }
    };
}

/* ---------------------------------------------------------------- *
 * Auth — one checker per method, selected by route
 * ---------------------------------------------------------------- */

/**
 * Every place a credential could have arrived, tagged with where it came from.
 *
 * An auth profile decides placement through its own fields[], where each entry carries a
 * `type` of header / querystring / payload / pathparam and a `key` naming the header or
 * parameter. So the credential does NOT always turn up in Authorization or X-API-Key — a
 * profile may put an api key in X-Custom-Key, a token in a query param, and so on. This
 * server therefore looks everywhere and reports the location it matched, which is what makes
 * a manual test conclusive: you see not just that auth passed, but where the platform put it.
 *
 * Only top-level body values are considered. Descending into the Google Chat event would
 * risk matching the user's typed query by accident.
 */
function credentialCandidates(headers, query, body) {
    const out = [];
    const push = (where, value) => {
        if (typeof value === 'string' && value !== '') out.push({ where, value });
    };
    Object.keys(headers || {}).forEach((k) => push(`header "${k}"`, headers[k]));
    Object.keys(query || {}).forEach((k) => push(`query "${k}"`, query[k]));
    if (body && typeof body === 'object' && !Array.isArray(body)) {
        Object.keys(body).forEach((k) => push(`body "${k}"`, body[k]));
    }
    return out;
}

/** Strip an optional scheme prefix, so "Bearer xyz" and bare "xyz" both yield "xyz". */
function stripScheme(value, scheme) {
    const p = scheme + ' ';
    return value.startsWith(p) ? value.slice(p.length) : value;
}

function checkBasic(headers, query, body) {
    // Canonical location first, then anywhere else the profile may have put it.
    const candidates = [];
    if (headers.authorization) candidates.push({ where: 'Authorization header', value: headers.authorization });
    credentialCandidates(headers, query, body).forEach((c) => {
        if (c.where !== 'header "authorization"') candidates.push(c);
    });

    let sawBasic = false;
    let rejectedUser = null;

    for (const c of candidates) {
        if (!c.value.startsWith('Basic ')) continue;
        sawBasic = true;
        let decoded;
        try {
            decoded = Buffer.from(c.value.slice(6), 'base64').toString('utf8');
        } catch (e) { continue; }
        const idx = decoded.indexOf(':');
        if (idx < 0) continue;
        const user = decoded.slice(0, idx);
        const pass = decoded.slice(idx + 1);
        if (user === BASIC_USER && pass === BASIC_PASS) {
            return { ok: true, detail: `basic ok for "${user}" via ${c.where}` };
        }
        rejectedUser = user;
    }

    if (rejectedUser !== null) {
        return { ok: false, status: 401, detail: `basic credentials rejected (got user "${rejectedUser}")` };
    }
    if (sawBasic) {
        return { ok: false, status: 401, detail: 'Basic credentials were malformed (bad base64 or no ":")' };
    }
    return { ok: false, status: 401, detail: 'no Basic credential found in headers, query or body' };
}

function checkBearer(headers, query, body) {
    for (const c of credentialCandidates(headers, query, body)) {
        if (stripScheme(c.value, 'Bearer') === BEARER_TOKEN) {
            return { ok: true, detail: `static bearer ok via ${c.where}` };
        }
    }
    if (headers.authorization && headers.authorization.startsWith('Bearer ')) {
        return { ok: false, status: 401, detail: 'static bearer token did not match' };
    }
    return { ok: false, status: 401, detail: 'no static bearer token found in headers, query or body' };
}

/** API key, wherever the profile placed it. */
function checkApiKey(headers, query, body) {
    for (const c of credentialCandidates(headers, query, body)) {
        // Tolerate "ApiKey xyz" / "Bearer xyz" wrappers as well as the bare value.
        const bare = stripScheme(stripScheme(c.value, 'ApiKey'), 'Bearer');
        if (c.value === API_KEY || bare === API_KEY) {
            return { ok: true, detail: `api key matched via ${c.where}` };
        }
    }
    const supplied = headers[API_KEY_HEADER] || (query && (query.api_key || query.apikey || query.apiKey));
    if (supplied) {
        return { ok: false, status: 401, detail: 'api key did not match' };
    }
    return {
        ok: false, status: 401,
        detail: `no api key found — looked in every header (incl. ${API_KEY_HEADER}), query and body`
    };
}

/**
 * A bearer token this server minted. `grant` pins which flow issued it, so a
 * client_credentials token cannot be used on the password-grant route and vice versa —
 * that keeps the two OAuth2 paths genuinely distinguishable when testing.
 */
function checkOAuth2(headers, query, body, grant) {
    let sawExpired = false;
    let wrongGrant = null;

    for (const c of credentialCandidates(headers, query, body)) {
        const tok = stripScheme(c.value, 'Bearer');
        const rec = issuedTokens.get(tok);
        if (!rec) continue;
        if (rec.expiresAt <= Date.now()) {
            issuedTokens.delete(tok);
            sawExpired = true;
            continue;
        }
        if (grant && rec.grant !== grant) {
            wrongGrant = rec.grant;
            continue;
        }
        return {
            ok: true,
            detail: `oauth2 token ok via ${c.where} (grant=${rec.grant}` +
                `${rec.username ? ', user=' + rec.username : ''}` +
                `${rec.scope ? ', scope=' + rec.scope : ''})`
        };
    }

    if (wrongGrant) {
        return {
            ok: false, status: 403,
            detail: `token was issued via grant_type=${wrongGrant}, this route requires ${grant}`
        };
    }
    if (sawExpired) {
        return { ok: false, status: 401, detail: 'bearer token expired' };
    }
    return {
        ok: false, status: 401,
        detail: 'no bearer token issued by this server was found in headers, query or body'
    };
}

/** Any single method succeeding is enough. */
function checkAny(headers, query, body) {
    const attempts = [
        ['basic', checkBasic(headers, query, body)],
        ['bearer', checkBearer(headers, query, body)],
        ['apikey', checkApiKey(headers, query, body)],
        ['oauth2', checkOAuth2(headers, query, body, null)]
    ];
    const win = attempts.find(([, r]) => r.ok);
    if (win) return { ok: true, detail: `${win[0]}: ${win[1].detail}` };
    return {
        ok: false, status: 401,
        detail: 'no accepted credential found — tried basic, bearer, api key, oauth2 bearer'
    };
}

/** Resolve a route's auth mode name to a verdict. */
function authenticate(mode, headers, query, body) {
    switch (mode) {
        case 'none':             return { ok: true, detail: 'no auth required' };
        case 'basic':            return checkBasic(headers, query, body);
        case 'bearer':           return checkBearer(headers, query, body);
        case 'apikey':
        case 'api_key':          return checkApiKey(headers, query, body);
        case 'oauth2-cc':        return checkOAuth2(headers, query, body, 'client_credentials');
        case 'oauth2-password':  return checkOAuth2(headers, query, body, 'password');
        case 'oauth2':           return checkOAuth2(headers, query, body, null);
        case 'any':              return checkAny(headers, query, body);
        default:
            return { ok: false, status: 500, detail: `unknown auth mode "${mode}"` };
    }
}

/* ---------------------------------------------------------------- *
 * Logging
 * ---------------------------------------------------------------- */

function mask(value) {
    if (!value) return value;
    const s = String(value);
    if (s.length <= 12) return s.slice(0, 3) + '***';
    return s.slice(0, 10) + '***(' + s.length + ' chars)';
}

// Headers the platform adds itself; anything else came from dynamicSearch.headers.
const PLATFORM_HEADERS = new Set([
    'host', 'connection', 'content-length', 'content-type', 'accept',
    'accept-encoding', 'user-agent', 'authorization', API_KEY_HEADER
]);

function logRequest(method, path, headers, note) {
    const custom = {};
    Object.keys(headers).forEach((h) => {
        if (!PLATFORM_HEADERS.has(h)) custom[h] = headers[h];
    });

    console.log('\n─────────────────────────────────────────────');
    console.log(`${new Date().toISOString()}  ${method} ${path}`);
    if (headers.authorization) console.log(`  Authorization : ${mask(headers.authorization)}`);
    if (headers[API_KEY_HEADER]) console.log(`  ${API_KEY_HEADER} : ${mask(headers[API_KEY_HEADER])}`);
    if (!headers.authorization && !headers[API_KEY_HEADER]) console.log('  (no auth header sent)');
    console.log(`  content-type  : ${headers['content-type'] || '(none)'}`);
    console.log(`  extra headers : ${Object.keys(custom).length ? JSON.stringify(custom) : '(none)'}`);
    if (note) console.log(`  ${note}`);
}

/* ---------------------------------------------------------------- *
 * HTTP plumbing
 * ---------------------------------------------------------------- */

function send(res, status, obj) {
    const payload = JSON.stringify(obj, null, 2);
    res.writeHead(status, {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
    });
    res.end(payload);
}

function sendUnauthorized(res, verdict, mode) {
    const status = verdict.status || 401;
    if (status === 401) {
        // WWW-Authenticate is what a real server sends; harmless here, useful for curl -v.
        res.setHeader('WWW-Authenticate',
            mode === 'basic' ? 'Basic realm="mock"' : 'Bearer realm="mock"');
    }
    console.log(`  -> ${status} ${verdict.detail}`);
    return send(res, status, {
        error: status === 403 ? 'forbidden' : 'unauthorized',
        error_description: verdict.detail,
        requiredAuth: mode
    });
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let size = 0;
        req.on('data', (c) => {
            size += c.length;
            if (size > 1024 * 1024) { reject(new Error('body too large')); req.destroy(); return; }
            chunks.push(c);
        });
        req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        req.on('error', reject);
    });
}

function parseForm(raw) {
    const out = {};
    new URLSearchParams(raw).forEach((v, k) => { out[k] = v; });
    return out;
}

function parseQuery(rawUrl) {
    const out = {};
    const qIdx = (rawUrl || '').indexOf('?');
    if (qIdx < 0) return out;
    new URLSearchParams(rawUrl.slice(qIdx + 1)).forEach((v, k) => { out[k] = v; });
    return out;
}

/* ---------------------------------------------------------------- *
 * Routes
 * ---------------------------------------------------------------- */

// path -> auth mode
const FRUIT_ROUTES = {
    '/api/fruits': 'none',
    '/api/fruits/basic': 'basic',
    '/api/fruits/bearer': 'bearer',
    '/api/fruits/apikey': 'apikey',
    '/api/fruits/oauth2-cc': 'oauth2-cc',
    '/api/fruits/oauth2-password': 'oauth2-password',
    '/api/fruits/any': 'any'
};

const TYPEAHEAD_ROUTES = {
    '/typeahead': AUTH_MODE === 'api_key' ? 'apikey' : AUTH_MODE,   // back-compat with env
    '/typeahead/none': 'none',
    '/typeahead/basic': 'basic',
    '/typeahead/bearer': 'bearer',
    '/typeahead/apikey': 'apikey',
    '/typeahead/oauth2-cc': 'oauth2-cc',
    '/typeahead/oauth2-password': 'oauth2-password',
    '/typeahead/any': 'any'
};

const TOKEN_PATHS = new Set(['/oauth2/token', '/oauth/token']);

function handleTokenEndpoint(res, method, path, headers, raw) {
    tokenRequests++;

    // Log FIRST, before any rejection. A method-based 405 that returned early left no trace
    // at all, which made it impossible to tell "the platform sent something odd" apart from
    // "the request never arrived".
    logRequest(method, path, headers,
        `RAW BODY (${raw ? raw.length : 0} bytes): ${raw ? raw.slice(0, 400) : '(empty)'}`);

    // Any method is accepted. An auth profile with no `method` leaves
    // CreateAccount.executeRequest's options.method undefined ("if(method) options.method =
    // method"), and RequestAgent falls back to GET ("req.endPoint.method || 'GET'"). The
    // credentials still arrive either way: the form body is attached outside RequestAgent's
    // non-GET gate, at "if(req.form){ this.options.form = req.form }". Rejecting on method
    // only produced a confusing 405, so the method is recorded and the body parsed regardless.
    if (method !== 'POST') {
        console.log(`  NOTE: token request arrived as ${method}, not POST — the auth profile ` +
                    `has no "method" set, so RequestAgent defaulted. Parsing the body anyway.`);
    }

    // An auth profile's "Token URL Content Type" is configurable, so accept a JSON body as
    // well as form-encoded rather than assuming one and silently parsing garbage.
    // The declared content-type and the actual body encoding do not always agree. The
    // platform's own token call defaults content-type to application/json while sending a
    // form-encoded body (CreateAccount.executeRequest: `contentType || "application/json"`
    // with reqObject.form), so parse by what the body IS and treat the header as a hint only.
    const ctype = String(headers['content-type'] || '');
    const looksJson = !!(raw && raw.trim().startsWith('{'));
    let form = {};
    let bodyKind;

    if (looksJson) {
        try {
            form = JSON.parse(raw);
            bodyKind = ctype.includes('json') ? 'json' : 'json (content-type said form)';
        } catch (e) {
            console.log('  -> 400 body opened with { but did not parse as JSON');
            return send(res, 400, { error: 'invalid_request', error_description: 'body is not valid JSON' });
        }
    } else {
        form = parseForm(raw);
        bodyKind = ctype.includes('json') ? 'form (content-type said json)' : 'form';
    }
    if (!form || typeof form !== 'object') form = {};

    // Client credentials may arrive three ways: as body fields, as HTTP Basic, or as the
    // custom client_id / client_secret headers the auth-profile UI suggests under
    // "Request Authorization Header(s)".
    let clientId = form.client_id || headers['client_id'] || headers['client-id'];
    let clientSecret = form.client_secret || headers['client_secret'] || headers['client-secret'];
    let credSource = form.client_id ? 'body fields'
        : (headers['client_id'] || headers['client-id']) ? 'client_id/client_secret headers'
        : 'none';
    const authz = headers.authorization || '';
    if (authz.startsWith('Basic ')) {
        const decoded = Buffer.from(authz.slice(6), 'base64').toString('utf8');
        const i = decoded.indexOf(':');
        clientId = decoded.slice(0, i);
        clientSecret = decoded.slice(i + 1);
        credSource = 'HTTP Basic header';
    }

    const known = ['grant_type', 'client_id', 'client_secret', 'scope', 'audience', 'username', 'password'];
    logRequest(method, path, headers,
        `body=${bodyKind} grant_type=${form.grant_type} client_id=${clientId} ` +
        `clientCredsVia=${credSource} scope=${form.scope || '(none)'} ` +
        `audience=${form.audience || '(none)'} extra=${JSON.stringify(
            Object.keys(form).filter((k) => !known.includes(k))
                .reduce((a, k) => { a[k] = form[k]; return a; }, {}))}`);

    const grant = form.grant_type;
    if (grant !== 'client_credentials' && grant !== 'password') {
        console.log('  -> 400 unsupported_grant_type');
        return send(res, 400, {
            error: 'unsupported_grant_type',
            error_description: 'supported: client_credentials, password'
        });
    }

    if (clientId !== OAUTH_CLIENT_ID || clientSecret !== OAUTH_CLIENT_SECRET) {
        console.log('  -> 401 invalid_client' + (credSource === 'none'
            ? ' (no client credentials found in the body, Basic header, or client_id headers)'
            : ' (via ' + credSource + ')'));
        return send(res, 401, {
            error: 'invalid_client',
            error_description: credSource === 'none'
                ? 'no client_id/client_secret found in the body, the Basic header, or client_id/client_secret headers'
                : 'client_id/client_secret rejected (supplied via ' + credSource + ')'
        });
    }

    let username;
    if (grant === 'password') {
        username = form.username;
        if (username !== RO_USERNAME || form.password !== RO_PASSWORD) {
            console.log('  -> 401 invalid_grant (resource owner credentials)');
            return send(res, 401, {
                error: 'invalid_grant',
                error_description: 'username/password rejected'
            });
        }
    }

    const token = `mock-tok-${++tokenSeq}`;
    issuedTokens.set(token, {
        grant: grant,
        clientId: clientId,
        username: username,
        scope: form.scope,
        expiresAt: Date.now() + OAUTH_TOKEN_TTL * 1000
    });
    console.log(`  -> 200 issued ${token} grant=${grant}` +
        `${username ? ' user=' + username : ''} (expires_in=${OAUTH_TOKEN_TTL}) [total: ${tokenSeq}]`);

    const out = {
        access_token: token,
        token_type: 'Bearer',
        expires_in: OAUTH_TOKEN_TTL
    };
    if (form.scope) out.scope = form.scope;
    if (grant === 'password') out.refresh_token = `mock-refresh-${tokenSeq}`;
    return send(res, 200, out);
}

/**
 * The fruits API, in either of two modes.
 *
 * Given a Google Chat widget-update event — classic or add-on — it answers with a suggestion
 * envelope matching the inbound format, so any of these routes can be dropped straight into
 * dynamicSearch.url to test that auth method end to end. Given anything else it answers with
 * the plain JSON fruit list, for ordinary curl testing.
 */
function handleFruits(res, method, path, headers, query, mode, body) {
    fruitHits++;

    const chatMode = isChatEvent(body);
    const evt = chatMode ? readEvent(body) : null;

    logRequest(method, path, headers, chatMode
        ? `fruits route in CHAT mode, auth=${mode}, format=${evt.format} type=${evt.type} ` +
          `fn=${evt.invokedFunction} query="${evt.query}" space=${evt.space}`
        : `fruits route in REST mode, auth=${mode}, query=${JSON.stringify(query)}`);

    // Credentials are looked for in headers, query and body, because an auth profile's
    // fields[] decides the placement.
    const verdict = authenticate(mode, headers, query, body);
    if (!verdict.ok) {
        // In chat mode a 401 body would be forwarded to Google as-is, but the platform
        // discards non-2xx and shows no matches, so the shape only matters for curl.
        return sendUnauthorized(res, verdict, mode);
    }
    console.log(`  auth ok       : ${verdict.detail}`);

    if (chatMode) {
        const q = evt.query.trim().toLowerCase();
        const items = (q
            ? DATA_SOURCES.queryFruits.filter((c) =>
                c.text.toLowerCase().includes(q) ||
                c.value.toLowerCase().includes(q) ||
                String(c.bottomText || '').toLowerCase().includes(q))
            : DATA_SOURCES.queryFruits).slice(0, 100);
        console.log(`  -> 200 ${items.length} suggestion(s) in the ${evt.format} envelope: ` +
            `${items.map((i) => i.value).join(', ') || '(none)'}`);
        return send(res, 200, googleSuggestionsResponse(items, evt.format === 'addons'));
    }

    const items = filterFruits(query);
    console.log(`  -> 200 ${items.length} fruit(s): ${items.map((f) => f.id).join(', ') || '(none)'}`);
    return send(res, 200, {
        ok: true,
        authMode: mode,
        authDetail: verdict.detail,
        count: items.length,
        fruits: items
    });
}

function handleTypeahead(res, method, path, headers, query, mode, raw) {
    if (method !== 'POST') return send(res, 405, { error: 'method_not_allowed', expected: 'POST' });
    typeaheadHits++;

    let body = {};
    try {
        body = raw ? JSON.parse(raw) : {};
    } catch (err) {
        logRequest(method, path, headers, 'body was not JSON');
        return send(res, 400, { error: 'invalid_json' });
    }

    const evt = readEvent(body);
    logRequest(method, path, headers,
        `event: format=${evt.format} type=${evt.type} fn=${evt.invokedFunction} ` +
        `query="${evt.query}" space=${evt.space} auth=${mode}`);

    if (FAIL_ONCE_401 && typeaheadHits === 1) {
        console.log('  -> 401 (FAIL_ONCE_401: forcing the platform retry path)');
        return send(res, 401, { error: 'unauthorized', error_description: 'forced first-call failure' });
    }

    const verdict = authenticate(mode, headers, query, body);
    if (!verdict.ok) return sendUnauthorized(res, verdict, mode);
    console.log(`  auth ok       : ${verdict.detail}`);

    // Resolve which data source to serve. In add-on mode externalDataSource.function
    // is a URL, not a name, so the widget passes the source name in action.parameters
    // instead (Google's documented "common endpoint + action name" pattern). Fall back
    // to invokedFunction for classic Chat apps, where it IS the name.
    let fnName = evt.dataSourceParam;
    let how = 'action.parameters';
    if (!fnName && evt.invokedFunction && !/^https?:\/\//i.test(evt.invokedFunction)) {
        fnName = evt.invokedFunction;
        how = 'invokedFunction (classic)';
    }
    if (!fnName) {
        fnName = DEFAULT_FUNCTION;
        how = `default (invokedFunction was ${evt.invokedFunction ? 'a URL' : 'absent'})`;
    }
    console.log(`  source picked  : ${fnName}  via ${how}`);
    const source = DATA_SOURCES[fnName];
    if (!source) {
        console.log(`  -> 200 unknown function "${fnName}" — returning empty. ` +
            `Known: ${Object.keys(DATA_SOURCES).join(', ')}`);
        return send(res, 200, googleSuggestionsResponse([], evt.format === 'addons'));
    }

    const q = evt.query.trim().toLowerCase();
    const items = (q ? source.filter((c) =>
        c.text.toLowerCase().includes(q) ||
        c.value.toLowerCase().includes(q) ||
        String(c.bottomText || '').toLowerCase().includes(q)
    ) : source).slice(0, 100);

    console.log(`  -> 200 ${items.length} item(s) in the ${evt.format} envelope: ` +
        `${items.map((i) => i.value).join(', ') || '(none)'}`);
    return send(res, 200, googleSuggestionsResponse(items, evt.format === 'addons'));
}

/* ---------------------------------------------------------------- *
 * Server
 * ---------------------------------------------------------------- */

async function handleGchatRequest(req, res) {
    const method = req.method || 'GET';
    const path = (req.url || '').split('?')[0];
    const query = parseQuery(req.url);

    if (method === 'GET' && path === '/health') {
        return send(res, 200, {
            ok: true,
            typeaheadAuthMode: AUTH_MODE,
            typeaheadHits,
            fruitHits,
            tokenRequests,
            tokensIssued: tokenSeq,
            tokensLive: issuedTokens.size
        });
    }

    if (method === 'GET' && (path === '/' || path === '/index')) {
        return send(res, 200, {
            fruits: Object.keys(FRUIT_ROUTES).reduce((a, p) => { a[p] = FRUIT_ROUTES[p]; return a; }, {}),
            typeahead: Object.keys(TYPEAHEAD_ROUTES).reduce((a, p) => { a[p] = TYPEAHEAD_ROUTES[p]; return a; }, {}),
            token: Array.from(TOKEN_PATHS),
            credentials: {
                basic: `${BASIC_USER} / ${BASIC_PASS}`,
                bearer: BEARER_TOKEN,
                apiKey: `${API_KEY_HEADER}: ${API_KEY}  (or ?api_key=${API_KEY})`,
                oauth2Client: `${OAUTH_CLIENT_ID} / ${OAUTH_CLIENT_SECRET}`,
                oauth2ResourceOwner: `${RO_USERNAME} / ${RO_PASSWORD}`
            }
        });
    }

    // Only the token endpoint and typeahead need a body, but reading it for every request
    // keeps the socket clean and lets fruits accept POST too.
    let raw;
    try {
        raw = await readBody(req);
    } catch (err) {
        return send(res, 413, { error: 'payload_too_large' });
    }

    if (TOKEN_PATHS.has(path)) {
        return handleTokenEndpoint(res, method, path, req.headers, raw);
    }

    if (Object.prototype.hasOwnProperty.call(FRUIT_ROUTES, path)) {
        if (method !== 'GET' && method !== 'POST') {
            return send(res, 405, { error: 'method_not_allowed', expected: 'GET or POST' });
        }
        let parsedBody = null;
        if (raw) {
            try {
                const p = JSON.parse(raw);
                if (p && typeof p === 'object') parsedBody = p;
            } catch (e) { /* not JSON — filters come from the query string */ }
        }
        // A plain POST body of {"q":"man"} works as an alternative to ?q=man. A Chat event
        // must NOT be folded into the filters — it is the payload, not a filter set.
        let merged = query;
        if (parsedBody && !isChatEvent(parsedBody)) {
            merged = Object.assign({}, parsedBody, query);
        }
        return handleFruits(res, method, path, req.headers, merged, FRUIT_ROUTES[path], parsedBody);
    }

    if (Object.prototype.hasOwnProperty.call(TYPEAHEAD_ROUTES, path)) {
        return handleTypeahead(res, method, path, req.headers, query, TYPEAHEAD_ROUTES[path], raw);
    }

    return send(res, 404, {
        error: 'not_found',
        path,
        hint: 'GET / for the endpoint index'
    });
}

if (require.main === module) {
    const server = http.createServer(handleGchatRequest);

    server.listen(PORT, '0.0.0.0', () => {
    const pad = (s) => String(s).padEnd(30);
    console.log('Mock endpoint server — XOP-33203 typeahead + auth methods');
    console.log(`  listening      http://0.0.0.0:${PORT}`);
    console.log('');
    console.log('  Fruits API (auth chosen by path):');
    Object.keys(FRUIT_ROUTES).forEach((p) => console.log(`    GET|POST ${pad(p)} ${FRUIT_ROUTES[p]}`));
    console.log('');
    console.log('  Typeahead (returns Google suggestion envelopes):');
    Object.keys(TYPEAHEAD_ROUTES).forEach((p) => console.log(`    POST     ${pad(p)} ${TYPEAHEAD_ROUTES[p] || 'none'}`));
    console.log('');
    console.log('  OAuth2 token   POST /oauth2/token   (alias /oauth/token)');
    console.log('                 grant_type=client_credentials | password');
    console.log('');
    console.log('  Credentials:');
    console.log(`    basic        ${BASIC_USER} / ${BASIC_PASS}`);
    console.log(`    bearer       ${BEARER_TOKEN}`);
    console.log(`    api key      ${API_KEY_HEADER}: ${API_KEY}   (or ?api_key=${API_KEY})`);
    console.log(`    oauth client ${OAUTH_CLIENT_ID} / ${OAUTH_CLIENT_SECRET}`);
    console.log(`    oauth user   ${RO_USERNAME} / ${RO_PASSWORD}`);
    console.log(`    token ttl    ${OAUTH_TOKEN_TTL}s`);
    console.log('');
    console.log(`  functions      ${Object.keys(DATA_SOURCES).map((k) => k + ' (' + DATA_SOURCES[k].length + ')').join(', ')}`);
    console.log('  envelope       matches the inbound event (classic -> actionResponse, add-on -> action)');
    if (FAIL_ONCE_401) console.log('  FAIL_ONCE_401  on — first typeahead call will 401');
    console.log('');
    });
}

module.exports = {
    handleGchatRequest
};
