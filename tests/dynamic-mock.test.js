const assert = require('node:assert/strict')
const { after, before, test } = require('node:test')
const express = require('express')
const { createDynamicMockRouter } = require('../mocks/dynamicMock/router')

const records = new Map()
const collection = {
  async insertOne(record) {
    if (records.has(record.identifierKey)) throw Object.assign(new Error('duplicate'), { code: 11000 })
    records.set(record.identifierKey, { ...record })
  },
  async findOne(query) {
    return records.get(query.identifierKey) || null
  },
  find(query) {
    let matches = [...records.values()].filter((record) => new RegExp(query.identifierKey.$regex).test(record.identifierKey))
    return {
      sort() {
        matches.sort((a, b) => a.identifierKey.localeCompare(b.identifierKey))
        return this
      },
      async toArray() { return matches }
    }
  },
  async updateOne(query, update) {
    const record = records.get(query.identifierKey)
    if (!record) return { matchedCount: 0 }
    records.set(query.identifierKey, { ...record, ...update.$set })
    return { matchedCount: 1 }
  },
  async deleteOne(query) {
    return { deletedCount: records.delete(query.identifierKey) ? 1 : 0 }
  }
}

let server
let baseUrl

before(async () => {
  const app = express()
  app.use('/mocks', createDynamicMockRouter({ getCollection: async () => collection }))
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve)
  })
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())))

test('creates and fetches a mock case-insensitively with its configured status', async () => {
  const createResponse = await fetch(`${baseUrl}/mocks/insert`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ statusCode: 202, identifier: 'Order.Created', returnPayload: { accepted: true } })
  })
  assert.equal(createResponse.status, 201)

  const fetchResponse = await fetch(`${baseUrl}/mocks/fetch?identifier=order.created`)
  assert.equal(fetchResponse.status, 202)
  assert.deepEqual(await fetchResponse.json(), { accepted: true })
})

test('search treats regex characters literally and matches partial identifiers', async () => {
  const response = await fetch(`${baseUrl}/mocks/search?identifierContains=${encodeURIComponent('DER.CRE')}`)
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { identifiers: ['Order.Created'] })
})

test('updates and deletes with case-insensitive exact identifiers', async () => {
  const updateResponse = await fetch(`${baseUrl}/mocks/insert`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ statusCode: 418, identifier: 'ORDER.CREATED', returnPayload: { updated: true } })
  })
  assert.equal(updateResponse.status, 200)

  const fetchResponse = await fetch(`${baseUrl}/mocks/fetch?identifier=order.created`)
  assert.equal(fetchResponse.status, 418)
  assert.deepEqual(await fetchResponse.json(), { updated: true })

  const deleteResponse = await fetch(`${baseUrl}/mocks/delete?identifier=Order.Created`, { method: 'DELETE' })
  assert.equal(deleteResponse.status, 200)
  assert.equal((await fetch(`${baseUrl}/mocks/fetch?identifier=order.created`)).status, 404)
})

test('validates required input and reports missing records', async () => {
  const invalidResponse = await fetch(`${baseUrl}/mocks/insert`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ identifier: 'missing-fields' })
  })
  assert.equal(invalidResponse.status, 400)
  assert.equal((await fetch(`${baseUrl}/mocks/delete?identifier=unknown`, { method: 'DELETE' })).status, 404)
})
