var Application = require("./lib/app");
var Server      = require("./lib/server");
var sdk         = require("./lib/sdk");
var config      = require("./config");

var app    = new Application(null, config);
var server = new Server(config, app);

sdk.checkNodeVersion();

server.start();

// sdk.registerBot(require('./FindAFlight.js'));
// sdk.registerBot(require('./SimpleConversationalBot.js'));
sdk.registerBot(require('./SimpleConversationalBot_StandardBot.js'));
sdk.registerBot(require('./SimpleConversationalBot_StandardBots_Dynamic.js'));
// sdk.registerBot(require('./SimpleConversationalBot_UB_ESI.js'));
sdk.registerBot(require('./SimpleConversationalBot_UB.js'));
sdk.registerBot(require('./CcAIAutomationBot.js'));
// sdk.registerBot(require('./GuessTheNumber.js'));
// sdk.registerBot(require('./BookACab.js'));
// sdk.registerBot(require('./OrderAPizza.js'));
// sdk.registerBot(require('./BotVariables.js'));
// sdk.registerBot(require('./LiveChat.js'));
