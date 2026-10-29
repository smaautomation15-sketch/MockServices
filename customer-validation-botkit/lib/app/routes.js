var sdk            = require("../sdk");
var serviceHandler = require("./serviceHandler").serviceHandler;
var config         = require("../../config");
var apiPrefix      = config.app.apiPrefix;
var livechat       = require("../../LiveChat.js");
var childProcess   = require("child_process");
var path           = require("path");
var botDatabase    = require("../../scripts/mongodb-bot-provider");
var fixedBot       = require("../../SimpleConversationalBot_StandardBot");
var dynamicBot     = require("../../SimpleConversationalBot_StandardBots_Dynamic");

var syncInProgress = false;
var botIdPattern   = /^st-[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-5[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
var appIdPattern   = /^cs-[0-9a-fA-F-]+$/;

function getSyncToken(req) {
    var authorization = req.get('authorization') || '';
    if (authorization.indexOf('Bearer ') === 0) {
        return authorization.slice(7);
    }
    return req.get('x-sync-token');
}

function authorizeSyncRequest(req, res) {
    var expectedToken = config.syncBots && config.syncBots.token;
    if (!expectedToken) {
        res.status(503).json({
            status: 'error',
            message: 'Bot administration endpoints are not configured'
        });
        return false;
    }
    if (getSyncToken(req) !== expectedToken) {
        res.status(401).json({
            status: 'error',
            message: 'Unauthorized'
        });
        return false;
    }
    return true;
}

function requiredString(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

function getSyncFailureResponse(stderr) {
    var output = stderr || '';

    if (output.indexOf('Database returned no bots') !== -1) {
        return { statusCode: 404, message: 'No active bot records found in database' };
    }
    if (output.indexOf('Invalid botId at database record') !== -1) {
        return { statusCode: 422, message: 'Database contains a record with an invalid botId' };
    }
    if (output.indexOf('Missing apikey for bot') !== -1) {
        return { statusCode: 422, message: 'Database contains a bot with a missing apikey' };
    }
    if (output.indexOf('Invalid appId for bot') !== -1) {
        return { statusCode: 422, message: 'Database contains a bot with a missing or invalid appId' };
    }
    if (output.indexOf('Duplicate database botId') !== -1) {
        return { statusCode: 409, message: 'Database contains duplicate botId records' };
    }
    if (output.indexOf('conflicts with a fixed credential') !== -1) {
        return { statusCode: 409, message: 'A database bot conflicts with an existing fixed bot' };
    }
    if (output.indexOf('EEXIST') !== -1 && output.indexOf('.sync-dynamic-bots.lock') !== -1) {
        return { statusCode: 409, message: 'Bot synchronization is already running' };
    }
    if (output.indexOf('ECONNREFUSED') !== -1 ||
        output.indexOf('ENOTFOUND') !== -1 ||
        output.indexOf('MongoServerSelectionError') !== -1 ||
        output.indexOf('server selection timed out') !== -1) {
        return { statusCode: 503, message: 'Unable to connect to MongoDB' };
    }
    if (output.indexOf('EACCES') !== -1 || output.indexOf('EPERM') !== -1) {
        return { statusCode: 500, message: 'Application does not have permission to update bot configuration files' };
    }
    return { statusCode: 500, message: 'Bot synchronization failed' };
}

function addBot(req, res) {
    if (!authorizeSyncRequest(req, res)) {
        return;
    }

    var bot = req.body || {};
    if (!requiredString(bot.botId)) {
        return res.status(400).json({ status: 'error', message: 'botId is required' });
    }
    if (!botIdPattern.test(bot.botId)) {
        return res.status(400).json({ status: 'error', message: 'Invalid botId' });
    }
    if (!requiredString(bot.apikey)) {
        return res.status(400).json({ status: 'error', message: 'apikey is required' });
    }
    if (!requiredString(bot.appId)) {
        return res.status(400).json({ status: 'error', message: 'appId is required' });
    }
    if (!appIdPattern.test(bot.appId)) {
        return res.status(400).json({ status: 'error', message: 'Invalid appId' });
    }
    if (typeof bot.active !== 'undefined' && typeof bot.active !== 'boolean') {
        return res.status(400).json({ status: 'error', message: 'active must be a boolean' });
    }

    return botDatabase.addBot(bot)
        .then(function(savedBot) {
            return res.status(201).json({
                status: 'created',
                message: 'Bot added to the database; call /syncbots to activate it',
                bot: savedBot
            });
        })
        .catch(function(error) {
            if (error && error.code === 11000) {
                return res.status(409).json({
                    status: 'error',
                    message: 'A bot with this botId already exists'
                });
            }
            console.error('Unable to add bot to database: ' + error.message);
            return res.status(500).json({
                status: 'error',
                message: 'Unable to add bot to database'
            });
        });
}

function removeBot(req, res) {
    if (!authorizeSyncRequest(req, res)) {
        return;
    }

    var botId = req.body && req.body.botId;
    if (!requiredString(botId)) {
        return res.status(400).json({ status: 'error', message: 'botId is required' });
    }
    if (!botIdPattern.test(botId)) {
        return res.status(400).json({ status: 'error', message: 'Invalid botId' });
    }

    return botDatabase.removeBot(botId)
        .then(function(removed) {
            if (!removed) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Bot was not found in the database'
                });
            }
            return res.status(200).json({
                status: 'removed',
                message: 'Bot removed from the database; call /syncbots to deactivate it',
                botId: botId
            });
        })
        .catch(function(error) {
            console.error('Unable to remove bot from database: ' + error.message);
            return res.status(500).json({
                status: 'error',
                message: 'Unable to remove bot from database'
            });
        });
}

function getBots(req, res) {
    if (!authorizeSyncRequest(req, res)) {
        return;
    }

    var staticBots = Array.isArray(fixedBot.botId) ? fixedBot.botId.slice() : [fixedBot.botId];
    var dynamicBots = Array.isArray(dynamicBot.botId) ? dynamicBot.botId.slice() : [dynamicBot.botId];
    staticBots = staticBots.filter(Boolean);
    dynamicBots = dynamicBots.filter(Boolean);
    var allBots = staticBots.concat(dynamicBots).filter(function(botId, index, bots) {
        return bots.indexOf(botId) === index;
    });

    return res.status(200).json({
        status: 'success',
        counts: {
            static: staticBots.length,
            dynamic: dynamicBots.length,
            total: allBots.length
        },
        staticBots: staticBots,
        dynamicBots: dynamicBots,
        allBots: allBots
    });
}

function syncBots(req, res) {
    if (!authorizeSyncRequest(req, res)) {
        return;
    }
    if (syncInProgress) {
        return res.status(409).json({
            status: 'error',
            message: 'Bot synchronization is already running'
        });
    }

    syncInProgress = true;
    var projectDir = path.resolve(__dirname, '../..');
    var syncScript = path.join(projectDir, 'scripts/sync-dynamic-bots.js');
    var environment = Object.assign({}, process.env, {
        BOT_DB_PROVIDER: './scripts/mongodb-bot-provider.js'
    });
    var child = childProcess.spawn(process.execPath, [syncScript], {
        cwd: projectDir,
        env: environment,
        stdio: ['ignore', 'pipe', 'pipe']
    });
    var stdout = '';
    var stderr = '';
    var spawnFailed = false;

    child.stdout.on('data', function(chunk) {
        stdout += chunk.toString();
    });
    child.stderr.on('data', function(chunk) {
        stderr += chunk.toString();
    });
    child.on('error', function(error) {
        spawnFailed = true;
        syncInProgress = false;
        console.error('Unable to start bot synchronization: ' + error.message);
        if (!res.headersSent) {
            res.status(500).json({
                status: 'error',
                message: 'Unable to start bot synchronization'
            });
        }
    });
    child.on('close', function(code) {
        if (spawnFailed) {
            return;
        }
        syncInProgress = false;

        if (code === 10) {
            console.info('Bot configuration changed; requesting restart through forever');
            res.once('finish', function() {
                setTimeout(function() { process.exit(0); }, 250);
            });
            return res.status(200).json({
                status: 'updated',
                message: 'Bot configuration updated; application is restarting'
            });
        }
        if (code === 0) {
            return res.status(200).json({
                status: 'unchanged',
                message: 'Bot configuration is already up to date'
            });
        }

        var failure = getSyncFailureResponse(stderr);
        console.error('Bot synchronization failed with code ' + code + ': ' + stderr.trim());
        return res.status(failure.statusCode).json({
            status: 'error',
            message: failure.message
        });
    });
}

function loadroutes(app) {
    app.post('/addbot', addBot);
    app.delete('/removebot', removeBot);
    app.get('/getbots', getBots);
    app.post('/syncbots', syncBots);

    app.post(apiPrefix + '/sdk/bots/:botId/components/:componentId/:eventName', function(req, res) {
        var reqBody     = req.body;
        var botId       = req.params.botId;
        var componentId = req.params.componentId;
        var eventName   = req.params.eventName;

        serviceHandler(req, res, sdk.runComponentHandler(botId, componentId, eventName, reqBody));
    });
    app.post(apiPrefix + '/sdk/bots/:botId/:eventName', function(req, res) {
        var reqBody     = req.body;
        var botId       = req.params.botId;
        var eventName   = req.params.eventName;

        serviceHandler(req, res, sdk.runComponentHandler(botId, 'default', eventName, reqBody));
    });

    app.get( apiPrefix + '/gethistory', livechat.gethistory);
}

module.exports = {
    load : loadroutes
};
