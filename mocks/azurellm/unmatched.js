const UNMATCHED_STATUS = 412
const UNMATCHED_BODY = {
  error: {
    type: 'fixture_not_matched',
    message: 'Request did not match any training-utterance mock fixture.',
  },
}

module.exports = { UNMATCHED_STATUS, UNMATCHED_BODY }
