const express = require('express')
const { connectToMongoDB } = require('../../db/mongodb')

const COLLECTION_NAME = process.env.DYNAMIC_MOCK_COLLECTION || 'dynamic_mocks'

function normalizeIdentifier(identifier) {
  return identifier.trim().toLocaleLowerCase('en-US')
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function validateMockRequest(body) {
  const errors = []

  if (!Number.isInteger(body?.statusCode) || body.statusCode < 200 || body.statusCode > 599) {
    errors.push('statusCode must be an integer between 200 and 599')
  }
  if (typeof body?.identifier !== 'string' || !body.identifier.trim()) {
    errors.push('identifier must be a non-empty string')
  }
  if (!body || !Object.prototype.hasOwnProperty.call(body, 'returnPayload')) {
    errors.push('returnPayload is required')
  }

  return errors
}

function createDynamicMockRouter(options = {}) {
  const router = express.Router()
  let collectionPromise

  const getCollection = options.getCollection || (async () => {
    if (!collectionPromise) {
      collectionPromise = connectToMongoDB().then(async (db) => {
        const collection = db.collection(COLLECTION_NAME)
        await collection.createIndex({ identifierKey: 1 }, { unique: true })
        return collection
      }).catch((error) => {
        collectionPromise = undefined
        throw error
      })
    }
    return collectionPromise
  })

  router.use(express.json({ limit: process.env.MOCK_BODY_LIMIT || '10mb' }))

  router.post('/insert', async (req, res) => {
    const errors = validateMockRequest(req.body)
    if (errors.length) return res.status(400).json({ message: 'Invalid request', errors })

    const identifier = req.body.identifier.trim()
    const record = {
      statusCode: req.body.statusCode,
      identifier,
      identifierKey: normalizeIdentifier(identifier),
      returnPayload: req.body.returnPayload,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    try {
      const collection = await getCollection()
      await collection.insertOne(record)
      return res.status(201).json({ message: 'Mock request created', identifier })
    } catch (error) {
      if (error?.code === 11000) {
        return res.status(409).json({ message: 'Identifier already exists' })
      }
      return res.status(500).json({ message: 'Unable to create mock request' })
    }
  })

  router.get('/fetch', async (req, res) => {
    if (typeof req.query.identifier !== 'string' || !req.query.identifier.trim()) {
      return res.status(400).json({ message: 'identifier query parameter is required' })
    }

    try {
      const collection = await getCollection()
      const record = await collection.findOne({ identifierKey: normalizeIdentifier(req.query.identifier) })
      if (!record) return res.status(404).json({ message: 'Identifier did not match' })

      return res.status(record.statusCode).json(record.returnPayload)
    } catch (error) {
      return res.status(500).json({ message: 'Unable to fetch mock request' })
    }
  })

  router.get('/search', async (req, res) => {
    if (typeof req.query.identifierContains !== 'string' || !req.query.identifierContains.trim()) {
      return res.status(400).json({ message: 'identifierContains query parameter is required' })
    }

    try {
      const collection = await getCollection()
      const pattern = escapeRegex(normalizeIdentifier(req.query.identifierContains))
      const records = await collection
        .find({ identifierKey: { $regex: pattern } }, { projection: { _id: 0, identifier: 1 } })
        .sort({ identifierKey: 1 })
        .toArray()
      return res.json({ identifiers: records.map((record) => record.identifier) })
    } catch (error) {
      return res.status(500).json({ message: 'Unable to search mock requests' })
    }
  })

  router.put('/insert', async (req, res) => {
    const errors = validateMockRequest(req.body)
    if (errors.length) return res.status(400).json({ message: 'Invalid request', errors })

    const identifier = req.body.identifier.trim()

    try {
      const collection = await getCollection()
      const result = await collection.updateOne(
        { identifierKey: normalizeIdentifier(identifier) },
        { $set: { statusCode: req.body.statusCode, identifier, returnPayload: req.body.returnPayload, updatedAt: new Date() } }
      )
      if (!result.matchedCount) return res.status(404).json({ message: 'Identifier not found' })

      return res.json({ message: 'Mock request updated', identifier })
    } catch (error) {
      return res.status(500).json({ message: 'Unable to update mock request' })
    }
  })

  router.delete('/delete', async (req, res) => {
    if (typeof req.query.identifier !== 'string' || !req.query.identifier.trim()) {
      return res.status(400).json({ message: 'identifier query parameter is required' })
    }

    try {
      const collection = await getCollection()
      const result = await collection.deleteOne({ identifierKey: normalizeIdentifier(req.query.identifier) })
      if (!result.deletedCount) return res.status(404).json({ message: 'Identifier not found' })

      return res.json({ message: 'Mock request deleted' })
    } catch (error) {
      return res.status(500).json({ message: 'Unable to delete mock request' })
    }
  })

  return router
}

module.exports = { createDynamicMockRouter, escapeRegex, normalizeIdentifier, validateMockRequest }
