'use strict';

var botIdPattern = /^st-[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-5[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

function handlerBotIds(handler) {
    if (!handler || !handler.botId) {
        return [];
    }
    return Array.isArray(handler.botId) ? handler.botId : [handler.botId];
}

function registerConfiguredBots(sdk, credentials, standardHandler, registeredHandlers) {
    var registeredIds = new Set();
    (registeredHandlers || []).forEach(function(handler) {
        handlerBotIds(handler).forEach(function(botId) {
            registeredIds.add(botId);
        });
    });

    var configuredIds = Object.keys(credentials || {}).filter(function(botId) {
        var credential = credentials[botId];
        return botIdPattern.test(botId) && credential &&
            typeof credential.apikey === 'string' && credential.apikey.trim() &&
            typeof credential.appId === 'string' && credential.appId.trim();
    });

    var missingIds = configuredIds.filter(function(botId) {
        return !registeredIds.has(botId);
    });

    if (missingIds.length) {
        sdk.registerBot(Object.assign({}, standardHandler, {
            botId: missingIds,
            botName: (standardHandler.botName || 'Standard Bot') + ' (config credentials)'
        }));
    }

    return missingIds;
}

module.exports = registerConfiguredBots;
