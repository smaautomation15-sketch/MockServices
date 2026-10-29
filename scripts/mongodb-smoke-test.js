const { connectToMongoDB, closeMongoDB } = require('../db/mongodb')

async function run() {
  const db = await connectToMongoDB()
  const collection = db.collection('connection_checks')
  const marker = `mongodb-smoke-${Date.now()}`

  await collection.insertOne({ marker, checkedAt: new Date() })
  const record = await collection.findOne({ marker })

  if (!record) {
    throw new Error('Inserted MongoDB record could not be read back')
  }

  console.log('MongoDB query succeeded:', {
    database: db.databaseName,
    collection: collection.collectionName,
    marker: record.marker
  })
}

run()
  .catch((error) => {
    console.error('MongoDB smoke test failed:', error.message)
    process.exitCode = 1
  })
  .finally(closeMongoDB)
