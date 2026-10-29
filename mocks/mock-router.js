const express = require('express')
const router = express.Router();
const delayAPI = require('./delay/delayapi');
const webhookAsyncMockAPI = require('./webhookAsyncCallback/AsyncCallbackMockAPI');
const externalNLUMock = require('./externalNLUMock/externalNLUMock');
const getTimeAPI = require('./getTime/getTimeApi');
const remoteLookupAPI = require('./remoteLookupAPI/remoteLookupAPI');
const anthropicllmMock = require('./anthropicllm/router');
const azurellmMock = require('./azurellm/router');
const googlePoliciesFaqMock = require('./googlePoliciesFaq/router');
const { createDynamicMockRouter } = require('./dynamicMock/router');

/** LLM routes send large prompts (history + summaries). Default Express limit is ~100kb → 413. */
const MOCK_BODY_LIMIT = process.env.MOCK_BODY_LIMIT || '10mb'

router.use(express.urlencoded({ extended: true, limit: MOCK_BODY_LIMIT }))
router.use(express.json({ limit: MOCK_BODY_LIMIT }))


router.use('/delayAPI',delayAPI)
router.use('/webhookAsyncCallback',webhookAsyncMockAPI)
router.use('/externalNLU',externalNLUMock)
router.use('/getTime', getTimeAPI)
router.use('/remoteLookupAPI', remoteLookupAPI)
router.use('/anthropicllm', anthropicllmMock)
router.use('/azurellm', azurellmMock)
router.use('/googlePoliciesFaq', googlePoliciesFaqMock)
router.use('/', createDynamicMockRouter())


module.exports = router
