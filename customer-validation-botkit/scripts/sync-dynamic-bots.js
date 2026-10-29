'use strict';

var fs = require('fs');
var path = require('path');

var projectDir = path.resolve(__dirname, '..');
var configPath = path.join(projectDir, 'config.json');
var fixedBotPath = path.join(projectDir, 'SimpleConversationalBot_StandardBot.js');
var dynamicBotPath = path.join(projectDir, 'SimpleConversationalBot_StandardBots_Dynamic.js');
var lockPath = path.join(projectDir, '.sync-dynamic-bots.lock');
var startMarker = '    // DB_BOT_IDS_START';
var endMarker = '    // DB_BOT_IDS_END';
var botIdPattern = /^st-[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-5[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
var appIdPattern = /^cs-[0-9a-fA-F-]+$/;

function loadProvider() {
    var providerPath = process.env.BOT_DB_PROVIDER;
    if (!providerPath) {
        throw new Error('BOT_DB_PROVIDER must point to a module that exports fetchBots()');
    }

    var absolutePath = path.isAbsolute(providerPath) ? providerPath : path.resolve(projectDir, providerPath);
    var provider = require(absolutePath);
    if (!provider || typeof provider.fetchBots !== 'function') {
        throw new Error('BOT_DB_PROVIDER must export a fetchBots() function');
    }
    return provider;
}

function validateAndNormalize(records) {
    if (!Array.isArray(records)) {
        throw new Error('fetchBots() must resolve to an array');
    }
    if (records.length === 0 && process.env.ALLOW_EMPTY_DB_BOTS !== 'true') {
        throw new Error('Database returned no bots; set ALLOW_EMPTY_DB_BOTS=true to accept an intentionally empty result');
    }

    var botsById = {};
    records.forEach(function(record, index) {
        var botId = record && record.botId;
        var apikey = record && record.apikey;
        var appId = record && record.appId;

        if (!botIdPattern.test(botId || '')) {
            throw new Error('Invalid botId at database record ' + index);
        }
        if (typeof apikey !== 'string' || !apikey.trim()) {
            throw new Error('Missing apikey for bot ' + botId);
        }
        if (typeof appId !== 'string' || !appIdPattern.test(appId)) {
            throw new Error('Invalid appId for bot ' + botId);
        }
        if (botsById[botId]) {
            throw new Error('Duplicate database botId: ' + botId);
        }

        botsById[botId] = {
            botId: botId,
            apikey: apikey,
            appId: appId
        };
    });

    return Object.keys(botsById).sort().map(function(botId) {
        return botsById[botId];
    });
}

function extractFixedBotIds(source) {
    var arrayMatch = source.match(/var\s+botId\s*=\s*\[([\s\S]*?)\]\s*;/);
    if (!arrayMatch) {
        throw new Error('Could not locate the fixed botId array');
    }

    var ids = {};
    var idPattern = /['\"](st-[0-9a-fA-F-]+)['\"]/g;
    var match;
    while ((match = idPattern.exec(arrayMatch[1])) !== null) {
        ids[match[1]] = true;
    }
    return ids;
}

function renderDynamicSource(source, botIds) {
    var start = source.indexOf(startMarker);
    var end = source.indexOf(endMarker);
    if (start === -1 || end === -1 || end < start) {
        throw new Error('Dynamic bot markers are missing or invalid');
    }

    var lines = botIds.map(function(botId) {
        return '    ' + JSON.stringify(botId) + ',';
    });
    var managedBlock = startMarker + '\n' + (lines.length ? lines.join('\n') + '\n' : '') + endMarker;
    return source.slice(0, start) + managedBlock + source.slice(end + endMarker.length);
}

function buildConfig(config, bots, fixedBotIds) {
    if (!config.credentials || typeof config.credentials !== 'object') {
        throw new Error('config.json does not contain a credentials object');
    }

    var nextConfig = JSON.parse(JSON.stringify(config));

    // Only DB-owned entries may be removed. Fixed and unmarked entries are preserved.
    Object.keys(nextConfig.credentials).forEach(function(key) {
        var credential = nextConfig.credentials[key];
        if (credential && credential.source === 'db') {
            delete nextConfig.credentials[key];
        }
    });

    bots.forEach(function(bot) {
        if (fixedBotIds[bot.botId]) {
            return;
        }
        var existing = nextConfig.credentials[bot.botId];
        if (existing && existing.source !== 'db') {
            throw new Error('Database bot conflicts with a fixed credential: ' + bot.botId);
        }
        nextConfig.credentials[bot.botId] = {
            apikey: bot.apikey,
            appId: bot.appId,
            source: 'db'
        };
    });

    return nextConfig;
}

function writeAtomically(filePath, content) {
    var temporaryPath = filePath + '.tmp';
    fs.writeFileSync(temporaryPath, content, { mode: 0o600 });
    fs.renameSync(temporaryPath, filePath);
}

function synchronize(records) {
    var bots = validateAndNormalize(records);
    var fixedSource = fs.readFileSync(fixedBotPath, 'utf8');
    var dynamicSource = fs.readFileSync(dynamicBotPath, 'utf8');
    var configSource = fs.readFileSync(configPath, 'utf8');
    var config = JSON.parse(configSource);
    var fixedBotIds = extractFixedBotIds(fixedSource);
    var dynamicBots = bots.filter(function(bot) { return !fixedBotIds[bot.botId]; });
    var nextDynamicSource = renderDynamicSource(dynamicSource, dynamicBots.map(function(bot) { return bot.botId; }));
    var nextConfig = buildConfig(config, bots, fixedBotIds);
    var nextConfigSource = JSON.stringify(nextConfig, null, 4) + '\n';

    // Parse/compile both outputs before changing either live file.
    JSON.parse(nextConfigSource);
    new Function(nextDynamicSource);

    var dynamicChanged = nextDynamicSource !== dynamicSource;
    var configChanged = nextConfigSource !== configSource;
    if (!dynamicChanged && !configChanged) {
        return { changed: false, dynamicBotCount: dynamicBots.length };
    }

    var dynamicBackup = dynamicBotPath + '.bak';
    var configBackup = configPath + '.bak';
    fs.copyFileSync(dynamicBotPath, dynamicBackup);
    fs.copyFileSync(configPath, configBackup);

    try {
        writeAtomically(dynamicBotPath, nextDynamicSource);
        writeAtomically(configPath, nextConfigSource);
    } catch (error) {
        fs.copyFileSync(dynamicBackup, dynamicBotPath);
        fs.copyFileSync(configBackup, configPath);
        throw error;
    }

    fs.unlinkSync(dynamicBackup);
    fs.unlinkSync(configBackup);

    return { changed: true, dynamicBotCount: dynamicBots.length };
}

var lockFileDescriptor;

Promise.resolve()
    .then(function() {
        lockFileDescriptor = fs.openSync(lockPath, 'wx');
    })
    .then(function() { return loadProvider().fetchBots(); })
    .then(synchronize)
    .then(function(result) {
        console.log(JSON.stringify(result));
        // Exit code 10 tells the external process manager that a restart is required.
        process.exitCode = result.changed ? 10 : 0;
    })
    .catch(function(error) {
        console.error('Dynamic bot synchronization failed: ' + error.message);
        process.exitCode = 1;
    })
    .then(function() {
        if (typeof lockFileDescriptor === 'number') {
            fs.closeSync(lockFileDescriptor);
            fs.unlinkSync(lockPath);
        }
    });
