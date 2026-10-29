const { MongoClient } = require('mongodb')
const { createLocalDatabase } = require('./localDocumentStore')

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017'
const databaseName = process.env.MONGODB_DATABASE || 'xoplatform_regression'

const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 5000
})

let database
let usingLocalFallback = false

async function connectToMongoDB() {
  if (!database) {
    try {
      await client.connect()
      database = client.db(databaseName)
      await database.command({ ping: 1 })
      usingLocalFallback = false
    } catch (error) {
      if (process.env.REQUIRE_REAL_MONGODB === 'true') {
        throw error
      }
      usingLocalFallback = true
      database = createLocalDatabase(databaseName)
      console.warn(
        `MongoDB is not available at ${uri}; using local file-backed store instead.`
      )
    }
  }

  return database
}

async function closeMongoDB() {
  if (!usingLocalFallback) {
    await client.close()
  }
  database = undefined
}

module.exports = { connectToMongoDB, closeMongoDB }
