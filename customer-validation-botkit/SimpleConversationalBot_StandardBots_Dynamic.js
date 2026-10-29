/*
 * This bot list is managed by scripts/sync-dynamic-bots.js.
 * Keep fixed bot IDs in SimpleConversationalBot_StandardBot.js.
 */
var botId = [
    // DB_BOT_IDS_START
    "st-33333333-3333-5333-8333-333333333311",
    "st-33333333-3333-5333-8333-333333333322",
    "st-33333333-3333-5333-8333-333333333344",
    // DB_BOT_IDS_END
];

// Reuse the standard bot's handlers so behavior stays identical without
// maintaining a second copy of the callback implementation.
var standardBot = require('./SimpleConversationalBot_StandardBot.js');

module.exports = Object.assign({}, standardBot, {
    botId: botId,
    botName: 'Customer Validation Bot - Dynamic'
});
