const redis = require('redis')

class MemoryRedisStore {
  constructor() {
    this.values = new Map()
    this.lists = new Map()
  }

  _isExpired(entry) {
    return entry && entry.expiresAt && entry.expiresAt <= Date.now()
  }

  async setEx(key, seconds, value) {
    this.values.set(key, {
      value,
      expiresAt: Date.now() + seconds * 1000,
    })
  }

  async get(key) {
    const entry = this.values.get(key)
    if (this._isExpired(entry)) {
      this.values.delete(key)
      return null
    }
    return entry ? entry.value : null
  }

  async exists(key) {
    return (await this.get(key)) === null ? 0 : 1
  }

  async del(key) {
    const deletedValue = this.values.delete(key)
    const deletedList = this.lists.delete(key)
    return deletedValue || deletedList ? 1 : 0
  }

  async lPush(key, value) {
    const list = this.lists.get(key) || []
    list.unshift(value)
    this.lists.set(key, list)
  }

  async lRange(key, start, stop) {
    const list = this.lists.get(key) || []
    const end = stop === -1 ? list.length : stop + 1
    return list.slice(start, end)
  }

  async lLen(key) {
    return (this.lists.get(key) || []).length
  }

  async disconnect() {}
}

class RedisTokenManager {
  constructor() {
    this.client = null
    this.ready = this.connect()
  }

  async connect() {
    if (process.env.USE_IN_MEMORY_REDIS === 'true') {
      this.client = new MemoryRedisStore()
      console.warn('Using in-memory Redis fallback.')
      return
    }

    try {
      this.client = redis.createClient({
        socket: {
          host: process.env.REDIS_HOST || '127.0.0.1',
          port: Number(process.env.REDIS_PORT || 6379),
          reconnectStrategy: false,
        },
        username: process.env.REDIS_USERNAME || undefined,
        password: process.env.REDIS_PASSWORD || undefined,
        database: Number(process.env.REDIS_DATABASE || 0),
      })

      this.client.on('error', (err) => {
        if (process.env.REDIS_LOG_ERRORS === 'true') {
          console.error('Redis Client Error:', err.message)
        }
      })

      await this.client.connect()
      console.log('Connected to local Redis server')
    } catch (error) {
      if (process.env.REQUIRE_REAL_REDIS === 'true') {
        throw error
      }
      this.client = new MemoryRedisStore()
      console.warn('Redis is not available locally; using in-memory Redis fallback.')
    }
  }

  async ensureReady() {
    await this.ready
  }

  async disconnect() {
    await this.ensureReady()
    if (this.client) {
      await this.client.disconnect()
    }
  }

  async setAccessToken(token, authType, expirationMinutes = 5) {
    await this.ensureReady()
    const key = `access_token:${authType}:${token}`
    const timestamp = new Date().toISOString()
    await this.client.setEx(key, expirationMinutes * 60, timestamp)
  }

  async getAccessToken(token, authType) {
    await this.ensureReady()
    const key = `access_token:${authType}:${token}`
    return await this.client.get(key)
  }

  async deleteAccessToken(token, authType) {
    await this.ensureReady()
    const key = `access_token:${authType}:${token}`
    await this.client.del(key)
  }

  async isAccessTokenValid(token, authType) {
    if (!token) return false

    const timestampStr = await this.getAccessToken(token, authType)
    if (!timestampStr) return false

    const tokenTime = new Date(timestampStr)
    const currentTime = new Date()
    const timeDifference = Math.abs(currentTime - tokenTime)
    const timeDifferenceInMinutes = Math.floor(timeDifference / (1000 * 60))

    if (timeDifferenceInMinutes < 5) {
      return true
    }

    await this.deleteAccessToken(token, authType)
    return false
  }

  async setRefreshToken(token, authType, expirationDays = 30) {
    await this.ensureReady()
    const key = `refresh_token:${authType}:${token}`
    await this.client.setEx(key, expirationDays * 24 * 60 * 60, 'valid')
  }

  async hasRefreshToken(token, authType) {
    await this.ensureReady()
    const key = `refresh_token:${authType}:${token}`
    const result = await this.client.exists(key)
    return result === 1
  }

  async deleteRefreshToken(token, authType) {
    await this.ensureReady()
    const key = `refresh_token:${authType}:${token}`
    await this.client.del(key)
  }

  async setAuthorizationCode(code, authType = 'oauth2_auth_code', expirationMinutes = 10) {
    await this.ensureReady()
    const key = `auth_code:${authType}:${code}`
    await this.client.setEx(key, expirationMinutes * 60, 'valid')
  }

  async hasAuthorizationCode(code, authType = 'oauth2_auth_code') {
    await this.ensureReady()
    const key = `auth_code:${authType}:${code}`
    const result = await this.client.exists(key)
    return result === 1
  }

  async deleteAuthorizationCode(code, authType = 'oauth2_auth_code') {
    await this.ensureReady()
    const key = `auth_code:${authType}:${code}`
    await this.client.del(key)
  }

  async setOAuth1Token(token, expirationMinutes = 5) {
    await this.ensureReady()
    const key = `oauth1_token:oauth1:${token}`
    const timestamp = new Date().toISOString()
    await this.client.setEx(key, expirationMinutes * 60, timestamp)
  }

  async getOAuth1Token(token) {
    await this.ensureReady()
    const key = `oauth1_token:oauth1:${token}`
    return await this.client.get(key)
  }

  async deleteOAuth1Token(token) {
    await this.ensureReady()
    const key = `oauth1_token:oauth1:${token}`
    await this.client.del(key)
  }

  async isOAuth1TokenValid(token) {
    if (!token) return false

    const timestampStr = await this.getOAuth1Token(token)
    if (!timestampStr) return false

    const tokenTime = new Date(timestampStr)
    const currentTime = new Date()
    const timeDifference = Math.abs(currentTime - tokenTime)
    const timeDifferenceInMinutes = Math.floor(timeDifference / (1000 * 60))

    if (timeDifferenceInMinutes < 5) {
      return true
    }

    await this.deleteOAuth1Token(token)
    return false
  }

  async storeWebhookResponse(response) {
    await this.ensureReady()
    const key = 'webhook_responses'
    const timestamp = new Date().toISOString()
    const responseWithTimestamp = JSON.stringify({ response, timestamp })
    await this.client.lPush(key, responseWithTimestamp)
  }

  async getAllWebhookResponses() {
    await this.ensureReady()
    const key = 'webhook_responses'
    const responses = await this.client.lRange(key, 0, -1)
    return responses.map(responseStr => {
      try {
        const parsed = JSON.parse(responseStr)
        return parsed.response || parsed
      } catch (error) {
        console.error('Error parsing webhook response:', error)
        return responseStr
      }
    }).reverse()
  }

  async clearWebhookResponses() {
    await this.ensureReady()
    const key = 'webhook_responses'
    const deletedCount = await this.client.del(key)
    return deletedCount > 0
  }

  async getWebhookResponseCount() {
    await this.ensureReady()
    const key = 'webhook_responses'
    return await this.client.lLen(key)
  }
}

const redisTokenManager = new RedisTokenManager()

module.exports = redisTokenManager
