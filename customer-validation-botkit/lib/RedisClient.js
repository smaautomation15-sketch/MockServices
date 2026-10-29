/**
 * @module RedisClient
 * helper to create redis client
 */

var redis = require('redis');
var debug = require('debug')('redisclient');

var redis_client_cache = {};

function MemoryRedisClient() {
    this.hashes = {};
}

MemoryRedisClient.prototype.on = function() {
    return this;
};

MemoryRedisClient.prototype.hget = function(collection, key, callback) {
    var value = this.hashes[collection] && this.hashes[collection][key];
    setImmediate(function() {
        callback(null, value || null);
    });
};

MemoryRedisClient.prototype.hset = function(collection, key, value, callback) {
    this.hashes[collection] = this.hashes[collection] || {};
    this.hashes[collection][key] = value;
    setImmediate(function() {
        callback(null, 1);
    });
};

MemoryRedisClient.prototype.hdel = function(collection, key, callback) {
    var deleted = 0;
    if (this.hashes[collection] && Object.prototype.hasOwnProperty.call(this.hashes[collection], key)) {
        delete this.hashes[collection][key];
        deleted = 1;
    }
    setImmediate(function() {
        callback(null, deleted);
    });
};

function errorlistener (e) {
    if (!debug.enabled) console.log(e.stack);
    else debug(e);
}

/**
 * create a redis client with given options
 * falling back to defaults otherwise
 *
 * @param {Object}    opts
 * @param {Object}    [opts.redis=redis] - redis client library
 * @param {String}    [opts.name] - name of the service
 * @param {Object}    [opts.options={}] - options for redis.createClient
 * @param {String}    [cache_key] - if provided, cache the redis client with the given cache_key
 *
 * @returns {Object}  RedisClient
 */
function createClient (opts, cache_key) {

    if ((typeof cache_key === 'string') && (redis_client_cache[cache_key] !== undefined)) {
        debug('using %s redis client', cache_key);
        return redis_client_cache[cache_key];
    }

    if (process.env.BOTKIT_USE_REAL_REDIS !== 'true') {
        console.warn('BotKit using in-memory Redis fallback.');
        return new MemoryRedisClient();
    }

    //use version of redis library passed by caller if provided
    opts.redis = opts.redis || redis;

    var client = opts.redis.createClient(
            opts.options.port,
            opts.options.host,
            opts.options);

    //if errors like connection reset should not cause crash,
    client.on('error', errorlistener);

    if (typeof cache_key === 'string' && (redis_client_cache[cache_key] === undefined)) {
        debug('caching redis client %s', cache_key);
        redis_client_cache[cache_key] = client;
    }

    return client;
}

exports.createClient = createClient;
