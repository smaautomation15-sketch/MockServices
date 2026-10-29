'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const registerConfiguredBots = require('../customer-validation-botkit/lib/registerConfiguredBots');

test('registers credentialed config bot IDs with the standard handler', () => {
  const newBotId = 'st-bbc47d3b-9c31-5434-a93f-c6c158a83059';
  const standardHandler = { botId: ['st-11111111-1111-5111-8111-111111111111'], botName: 'Standard', on_event() {} };
  const registeredHandlers = [standardHandler];
  const registrations = [];
  const sdk = { registerBot: (handler) => registrations.push(handler) };

  const added = registerConfiguredBots(sdk, {
    apikey: 'default-key',
    [newBotId]: { apikey: 'bot-key', appId: 'cs-12345678-1234-1234-1234-123456789abc' },
    'st-22222222-2222-5222-8222-222222222222': { apikey: 'incomplete' },
    'not-a-stream-id': { apikey: 'bot-key', appId: 'cs-12345678-1234-1234-1234-123456789abc' },
  }, standardHandler, registeredHandlers);

  assert.deepEqual(added, [newBotId]);
  assert.equal(registrations.length, 1);
  assert.deepEqual(registrations[0].botId, [newBotId]);
  assert.equal(registrations[0].on_event, standardHandler.on_event);
});

test('does not register IDs that already have a handler', () => {
  const botId = 'st-11111111-1111-5111-8111-111111111111';
  const handler = { botId: [botId], on_event() {} };
  const registrations = [];
  const sdk = { registerBot: (value) => registrations.push(value) };

  const added = registerConfiguredBots(sdk, {
    [botId]: { apikey: 'bot-key', appId: 'cs-12345678-1234-1234-1234-123456789abc' },
  }, handler, [handler]);

  assert.deepEqual(added, []);
  assert.deepEqual(registrations, []);
});
