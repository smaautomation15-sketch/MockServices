const fs = require('fs')
const path = require('path')

const dataDir = path.join(__dirname, '.local-data')
const filePath = path.join(dataDir, 'document-store.json')

let state

function loadState() {
  if (state) return state

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }

  if (!fs.existsSync(filePath)) {
    state = {}
    saveState()
    return state
  }

  try {
    state = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch (error) {
    state = {}
    saveState()
  }

  return state
}

function saveState() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
  fs.writeFileSync(filePath, JSON.stringify(state || {}, null, 2) + '\n')
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value))
}

function matches(record, query) {
  return Object.entries(query || {}).every(([key, expected]) => {
    const actual = record[key]
    if (expected && typeof expected === 'object' && expected.$regex !== undefined) {
      return new RegExp(expected.$regex).test(String(actual || ''))
    }
    return actual === expected
  })
}

function project(record, projection) {
  if (!projection) return clone(record)
  const include = Object.entries(projection).filter(([, value]) => value === 1).map(([key]) => key)
  if (include.length === 0) {
    const copy = clone(record)
    Object.entries(projection).forEach(([key, value]) => {
      if (value === 0) delete copy[key]
    })
    return copy
  }

  const copy = {}
  include.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(record, key)) copy[key] = clone(record[key])
  })
  return copy
}

class LocalCollection {
  constructor(name) {
    this.name = name
    const db = loadState()
    if (!Array.isArray(db[name])) {
      db[name] = []
      saveState()
    }
  }

  _records() {
    const db = loadState()
    if (!Array.isArray(db[this.name])) db[this.name] = []
    return db[this.name]
  }

  async createIndex() {
    return `${this.name}_local_index`
  }

  async insertOne(record) {
    const records = this._records()
    if (
      record.identifierKey &&
      records.some((item) => item.identifierKey === record.identifierKey)
    ) {
      const error = new Error('duplicate key')
      error.code = 11000
      throw error
    }
    if (record.botId && records.some((item) => item.botId === record.botId)) {
      const error = new Error('duplicate key')
      error.code = 11000
      throw error
    }

    const next = clone(record)
    next._id = next._id || `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`
    records.push(next)
    saveState()
    return { insertedId: next._id }
  }

  async findOne(query) {
    const found = this._records().find((record) => matches(record, query))
    return found ? clone(found) : null
  }

  find(query, options = {}) {
    let results = this._records()
      .filter((record) => matches(record, query))
      .map((record) => project(record, options.projection))

    return {
      sort(sortSpec) {
        const [key, direction] = Object.entries(sortSpec || {})[0] || []
        if (key) {
          results = results.sort((a, b) =>
            String(a[key] || '').localeCompare(String(b[key] || '')) * (direction === -1 ? -1 : 1)
          )
        }
        return this
      },
      async toArray() {
        return clone(results)
      },
    }
  }

  async updateOne(query, update) {
    const records = this._records()
    const index = records.findIndex((record) => matches(record, query))
    if (index === -1) return { matchedCount: 0, modifiedCount: 0 }

    records[index] = { ...records[index], ...(update.$set || {}) }
    saveState()
    return { matchedCount: 1, modifiedCount: 1 }
  }

  async deleteOne(query) {
    const records = this._records()
    const index = records.findIndex((record) => matches(record, query))
    if (index === -1) return { deletedCount: 0 }

    records.splice(index, 1)
    saveState()
    return { deletedCount: 1 }
  }
}

function createLocalDatabase(databaseName) {
  return {
    databaseName: `${databaseName}_local`,
    command: async () => ({ ok: 1 }),
    collection: (name) => new LocalCollection(name),
  }
}

module.exports = { createLocalDatabase }
