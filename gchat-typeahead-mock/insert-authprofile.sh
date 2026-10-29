#!/usr/bin/env bash
#
# Inserts the auth profile that the hangoutchat channel's
# dynamicSearch.authProfileRef points at (XOP-33203).
#
# Writes TWO documents sharing one refId — 'configured' and 'published' — which is
# how the platform pairs designtime/runtime copies (verified against koredbm001).
# The runtime reads the 'published' one.
#
# appConfig is inserted as PLAINTEXT and the encryption markers (ire/cek/iv/reFields)
# are deliberately omitted. CryptoService only decrypts when `ire` is truthy, so a
# marker-free document reads back verbatim. Do not add those fields by hand.
#
# Usage:
#   ./insert-authprofile.sh <streamId> <developerId> [authMode] [typeaheadUrlBase]
#
#   authMode: none | api_key | basic | bearer | oauth2   (default: oauth2)
#
# Example:
#   ./insert-authprofile.sh st-775a4278-3b2f-50f9-a29b-e5232e1f574a \
#       u-af8eb051-384a-5c05-8a67-ba5d3ef17afc oauth2 http://localhost:4545
#
# Env: MONGO=mongo   MONGO_DB=koredbm001   MONGO_HOST=localhost:27017

set -euo pipefail

STREAM_ID="${1:-}"
DEVELOPER_ID="${2:-}"
AUTH_MODE="${3:-oauth2}"
URL_BASE="${4:-http://localhost:4545}"

MONGO_BIN="${MONGO:-mongo}"
MONGO_DB="${MONGO_DB:-koredbm001}"
MONGO_HOST="${MONGO_HOST:-localhost:27017}"

if [[ -z "$STREAM_ID" || -z "$DEVELOPER_ID" ]]; then
  echo "usage: $0 <streamId> <developerId> [none|api_key|basic|bearer|oauth2] [urlBase]" >&2
  exit 1
fi

# Fixed, recognisable identifiers so the records are easy to find and delete again.
REF_ID="7f3c9a10-0000-4000-8000-000000000001"
ID_CONFIGURED="ap-7f3c9a10-0000-4000-8000-00000000c0f1"
ID_PUBLISHED="ap-7f3c9a10-0000-4000-8000-00000000pub1"
PROFILE_NAME="gchat-typeahead-mock"

case "$AUTH_MODE" in
  none)
    SSO_TYPE="none"
    APP_AUTH='{ type: "none" }'
    APP_NATIVE=''
    AUTH_CHECK_URL=''
    ;;
  api_key)
    SSO_TYPE="api_key"
    APP_AUTH='{ type: "api_key", apiKey: "k-123456", headerName: "X-API-Key" }'
    APP_NATIVE=''
    AUTH_CHECK_URL=''
    ;;
  basic)
    SSO_TYPE="basic"
    APP_AUTH='{ type: "basic", username: "xo-typeahead", password: "s3cr3t" }'
    APP_NATIVE=''
    AUTH_CHECK_URL=''
    ;;
  bearer)
    # sso_type "custom" is the enum slot the resolver maps to a static bearer.
    SSO_TYPE="custom"
    APP_AUTH='{ type: "bearer", bearerToken: "static-tok-abc" }'
    APP_NATIVE=''
    AUTH_CHECK_URL=''
    ;;
  oauth2)
    # Native platform field names. The client_credentials flow is handled by
    # RequestAgent -> clientCredservice, which reads appConfig.tokenURL / clientID /
    # clientSecret / scope (capitalisation matters) and sends the credentials as HTTP
    # Basic. Same shape a service-node auth profile uses.
    SSO_TYPE="oauth2_client_credential"
    APP_AUTH="{ type: \"oauth2_client_credential\" }"
    APP_NATIVE=", tokenURL: \"${URL_BASE}/oauth/token\", clientID: \"svc-xo\", clientSecret: \"svc-secret\", scope: \"read:catalog\""
    AUTH_CHECK_URL="${URL_BASE}/oauth/token"
    ;;
  *)
    echo "unknown authMode: $AUTH_MODE" >&2
    exit 1
    ;;
esac

echo "Inserting auth profile into ${MONGO_DB}.idpconfigurations on ${MONGO_HOST}"
echo "  streamId  : ${STREAM_ID}"
echo "  authMode  : ${AUTH_MODE}  (sso_type=${SSO_TYPE})"
echo ""

"$MONGO_BIN" "${MONGO_HOST}/${MONGO_DB}" --quiet <<EOF
var streamId    = "${STREAM_ID}";
var developerId = "${DEVELOPER_ID}";
var refId       = "${REF_ID}";
var name        = "${PROFILE_NAME}";
var ssoType     = "${SSO_TYPE}";
var authCheckUrl= "${AUTH_CHECK_URL}";
var appAuth     = ${APP_AUTH};
var appNative   = { ${APP_NATIVE#,} };

function doc(id, state) {
    var d = {
        _id          : id,
        refId        : refId,
        name         : name,
        streamId     : streamId,
        developerId  : developerId,
        createdBy    : developerId,
        lModifiedBy  : developerId,
        // 'default' keeps the profile in the generic auth-profile list, the same
        // pool service nodes pick from. channel_auth is NOT used by the lookup.
        channel_auth : "default",
        hasTenancy   : false,
        sso_type     : ssoType,
        state        : state,
        formfields   : [],
        headerFields : [],
        payloadFields: [],
        fields       : [],
        appConfig    : Object.assign({ auth: appAuth }, appNative),
        createdOn    : new Date(),
        lModified    : new Date()
    };
    if (authCheckUrl) { d.authCheckUrl = authCheckUrl; }
    return d;
}

// Remove any previous run so this is idempotent.
var removed = db.idpconfigurations.remove({ refId: refId, streamId: streamId });
print("removed prior copies : " + (removed.nRemoved !== undefined ? removed.nRemoved : 0));

db.idpconfigurations.insert(doc("${ID_CONFIGURED}", "configured"));
db.idpconfigurations.insert(doc("${ID_PUBLISHED}",  "published"));

var check = db.idpconfigurations.find(
    { refId: refId, streamId: streamId },
    { _id: 1, state: 1, sso_type: 1, name: 1 }
).toArray();
print("inserted             : " + JSON.stringify(check));

// Guard: the runtime reads the published copy only.
// Kept as one statement — the legacy mongo shell cannot parse a multi-line
// if/else fed in over stdin.
var pub = db.idpconfigurations.findOne({ refId: refId, streamId: streamId, state: "published" });
print("published appConfig  : " + (pub ? JSON.stringify(pub.appConfig) : "MISSING — the runtime will not see this profile"));
EOF

echo ""
echo "authProfileRef to put on the channel:"
echo "  ${REF_ID}"
echo ""
echo "Now point the channel at it:"
cat <<CURL

curl -X POST 'https://<host>/api/1.1/users/${DEVELOPER_ID}/builder/streams/${STREAM_ID}/channels/hangoutchat' \\
  -H 'Authorization: bearer <token>' \\
  -H 'AccountId: <accountId>' \\
  -H 'state: configured' \\
  -H 'Content-Type: application/json;charset=UTF-8' \\
  --data-raw '{
    "type": "hangoutchat",
    "enable": true,
    "clientEmail": "<existing value>",
    "privateKey": "<existing value>",
    "dynamicSearch": {
      "enabled": true,
      "url": "${URL_BASE}/typeahead",
      "headers": [{ "key": "X-Tenant", "value": "acme" }],
      "authProfileRef": "${REF_ID}"
    }
  }'

CURL
echo "Then PUBLISH the bot — the runtime only reads state:\"published\"."
