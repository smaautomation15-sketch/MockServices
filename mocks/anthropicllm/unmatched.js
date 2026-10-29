const UNMATCHED_STATUS = 412
const UNMATCHED_BODY = {
  type: 'error',
  error: {
    type: 'user_input_not_matched',
    message: 'User input not matched with existing user inputs list.',
  },
}

module.exports = { UNMATCHED_STATUS, UNMATCHED_BODY }
