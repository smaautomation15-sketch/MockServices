'use strict';

var rootMongo = require('../../db/mongodb');

var collectionName = process.env.BOT_MONGODB_COLLECTION || 'botkit_dynamic_bots';

async function getCollection() {
    var db = await rootMongo.connectToMongoDB();
    var collection = db.collection(collectionName);
    await collection.createIndex({ botId: 1 }, { unique: true });
    return collection;
}

module.exports.fetchBots = async function fetchBots() {
    var collection = await getCollection();
    return await collection
        .find(
            { active: true },
            { projection: { _id: 0, botId: 1, apikey: 1, appId: 1 } }
        )
        .toArray();
};

module.exports.addBot = async function addBot(bot) {
    var collection = await getCollection();
    await collection.insertOne({
        botId: bot.botId,
        apikey: bot.apikey,
        appId: bot.appId,
        active: bot.active !== false,
        createdAt: new Date()
    });
    return {
        botId: bot.botId,
        appId: bot.appId,
        active: bot.active !== false
    };
};

module.exports.removeBot = async function removeBot(botId) {
    var collection = await getCollection();
    var result = await collection.deleteOne({ botId: botId });
    return result.deletedCount === 1;
};
