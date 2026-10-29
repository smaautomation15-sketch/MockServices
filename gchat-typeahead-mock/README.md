# Google Chat typeahead validation harness — XOP-33203

Two pieces for validating the Dynamic Search changes end to end:

- **`server.js`** — a mock customer endpoint that enforces auth and returns suggestions.
  Zero dependencies, plain `node:http`.
- **`insert-authprofile.sh`** — inserts the auth profile the channel's
  `dynamicSearch.authProfileRef` points at, into `koredbm001.idpconfigurations`.

When running from the repository root, this mock is hosted by `node app.js` on the
same project port under `/gchat`. Set `BASE_URL` to the service root for the active
environment before using these paths.

```bash
export BASE_URL="http://<host>:<port>"

$BASE_URL/gchat/typeahead
$BASE_URL/gchat/oauth2/token
$BASE_URL/gchat/api/fruits
```

You can still run this folder standalone with `node server.js`; standalone mode keeps
the original port `4545`.

## 1. Start the mock endpoint

```bash
# no auth — quickest smoke test
AUTH_MODE=none node server.js

# OAuth2 client credentials (exercises the token fetch + cache)
AUTH_MODE=oauth2 node server.js

# API key with a custom header name
AUTH_MODE=api_key API_KEY_HEADER=X-Catalog-Key API_KEY=k-999 node server.js

# Basic / static bearer
AUTH_MODE=basic node server.js
AUTH_MODE=bearer node server.js
```

Routes:

| Route | Purpose |
|---|---|
| `POST /typeahead` | the Dynamic Search endpoint — auth enforced |
| `POST /oauth/token` | `client_credentials` token endpoint (for `AUTH_MODE=oauth2`) |
| `GET /health` | shows auth mode, hit count, tokens issued |

Suggestions are routed by the card's `externalDataSource.function`. `queryEmployees` is
wired up; add a key to `DATA_SOURCES` in `server.js` for each additional widget. An
unrecognised function returns an empty list and logs the names it does know.

Every request prints the auth header (masked), any **extra** headers — which is how you
confirm `dynamicSearch.headers` arrived — plus the detected event format, the invoked
function, and the extracted `autocomplete_widget_query`.

### Useful toggles

| Env | Effect |
|---|---|
| `RESPONSE_SHAPE=neutral\|legacy\|addons` | which envelope the endpoint returns. Use this to prove the platform's format matching: set `addons` while sending a legacy event and the platform should still answer Google in `legacy`. |
| `FAIL_ONCE_401=true` | first `/typeahead` call returns 401, rest succeed — exercises the token-invalidate-and-retry path. |
| `OAUTH_TOKEN_TTL=60` | shorten to watch the cache expire and re-fetch. |

Default `AUTH_MODE=none` and `RESPONSE_SHAPE=neutral`. Port defaults to `4545`; binds
`0.0.0.0` so a remote platform can reach it.

## 2. Insert the auth profile

```bash
./insert-authprofile.sh <streamId> <developerId> [none|api_key|basic|bearer|oauth2] [urlBase]

# e.g.
./insert-authprofile.sh st-775a4278-3b2f-50f9-a29b-e5232e1f574a \
    u-af8eb051-384a-5c05-8a67-ba5d3ef17afc oauth2 http://<gchat-host>:4545
```

Connection defaults to `mongo <mongo-host>:27017/koredbm001`; override with
`MONGO`, `MONGO_HOST`, `MONGO_DB`.

It writes **two** documents sharing one `refId` — `configured` and `published` — because
that is how the platform pairs designtime and runtime copies. The runtime reads the
`published` one. Re-running removes the previous pair first, so it is idempotent.

The credentials it writes match `server.js` defaults, so the two line up out of the box.
It prints the `refId` to put on the channel.

### Why the record has no encryption markers

`appConfig` is written as **plaintext**, with `ire` / `cek` / `iv` / `reFields` deliberately
omitted. `CryptoService` only decrypts when `ire` is truthy, so a marker-free document reads
back verbatim. Most existing records in `koredbm001` are in exactly this state.
Do not add those four fields by hand — you would need the real content-encryption key.

Profiles saved through the **UI** will be encrypted; both forms read correctly at runtime.

## 3. Point the channel at it

```bash
curl -X POST 'https://<host>/api/1.1/users/<userId>/builder/streams/<streamId>/channels/hangoutchat' \
  -H 'Authorization: bearer <token>' \
  -H 'AccountId: <accountId>' \
  -H 'state: configured' \
  -H 'Content-Type: application/json;charset=UTF-8' \
  --data-raw '{
    "type": "hangoutchat",
    "enable": true,
    "clientEmail": "<keep existing>",
    "privateKey": "<keep existing>",
    "dynamicSearch": {
      "enabled": true,
      "url": "http://<gchat-host>:4545/typeahead",
      "headers": [{ "key": "X-Tenant", "value": "acme" }],
      "authProfileRef": "7f3c9a10-0000-4000-8000-000000000001"
    }
  }'
```

Send `clientEmail` / `privateKey` with their current values — `createUpdateChannel`
rebuilds the channel entry, so anything omitted is dropped.

**Then publish the bot.** The runtime reads `state: "published"` for both the channel and
the auth profile; before publishing you will get empty suggestions no matter what.

## 4. Reachability

`server.js` binds `0.0.0.0`, but a remote platform host still cannot reach your laptop.
Either run this on a host the platform can reach, or tunnel it and use the public URL as
`dynamicSearch.url`. Plain `http://` works today — the runtime accepts `http:` and `https:`,
and HTTPS is not yet enforced server-side.

## 5. Direct check without the platform

```bash
# what the platform will POST for a legacy-format Chat app
curl -s -X POST http://<gchat-host>:4545/typeahead \
  -H 'Content-Type: application/json' \
  --data '{"type":"WIDGET_UPDATED",
           "common":{"invokedFunction":"queryEmployees",
                     "parameters":{"autocomplete_widget_query":"aar"}},
           "space":{"name":"spaces/AAAA"}}'

# ...and for a Workspace Add-ons Chat app
curl -s -X POST http://<gchat-host>:4545/typeahead \
  -H 'Content-Type: application/json' \
  --data '{"chat":{"widgetUpdatedPayload":{"space":{"name":"spaces/AAAA"}}},
           "commonEventObject":{"invokedFunction":"queryEmployees",
                                "parameters":{"autocomplete_widget_query":"bengaluru"}}}'
```

## Cleanup

```bash
mongo koredbm001 --quiet --eval \
  'print(db.idpconfigurations.remove({refId:"7f3c9a10-0000-4000-8000-000000000001"}).nRemoved)'
```
