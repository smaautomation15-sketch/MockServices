const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const projectRoot = __dirname

function packageNeedsInstall(packageDir) {
  const packagePath = path.join(packageDir, 'package.json')
  if (!fs.existsSync(packagePath)) return false

  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
  const dependencies = Object.keys(pkg.dependencies || {})
  if (dependencies.length === 0) return false

  return dependencies.some((dependency) => {
    try {
      require.resolve(dependency, { paths: [packageDir] })
      return false
    } catch (error) {
      return true
    }
  })
}

function ensureDependencies() {
  if (process.env.AUTO_NPM_INSTALL === 'false') return

  const packageDirs = [
    projectRoot,
    path.join(projectRoot, 'auth-profiles'),
    path.join(projectRoot, 'customer-validation-botkit'),
    path.join(projectRoot, 'gchat-typeahead-mock'),
  ]
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'

  packageDirs.forEach((packageDir) => {
    if (!packageNeedsInstall(packageDir)) return

    console.log(`Installing npm dependencies in ${packageDir}`)
    execFileSync(npmCommand, ['install'], {
      cwd: packageDir,
      stdio: 'inherit',
    })
  })
}

ensureDependencies()

const express = require('express')
const auth = require('./auth-profiles/auth-router')
const mockAPIs = require('./mocks/mock-router')
const { connectToMongoDB, closeMongoDB } = require('./db/mongodb')
const { handleGchatRequest } = require('./gchat-typeahead-mock/server')
const registerConfiguredBots = require('./customer-validation-botkit/lib/registerConfiguredBots')

const app = express()
const port = process.env.SERVER_PORT || process.env.PORT || 3000
let server

function loadBotkitIntoApp(expressApp) {
  const Application = require('./customer-validation-botkit/lib/app')
  const sdk = require('./customer-validation-botkit/lib/sdk')
  const config = require('./customer-validation-botkit/config')

  config.server = config.server || {}
  config.server.port = port
  config.app = config.app || {}
  config.app.url = process.env.PUBLIC_APP_URL || `http://localhost:${port}`
  config.examples = config.examples || {}
  config.examples.mockServicesHost = `http://localhost:${port}/mocks`

  const botkitApp = new Application(expressApp, config)
  sdk.checkNodeVersion()
  botkitApp.load()

  const botHandlers = [
    require('./customer-validation-botkit/SimpleConversationalBot_StandardBot.js'),
    require('./customer-validation-botkit/SimpleConversationalBot_StandardBots_Dynamic.js'),
    require('./customer-validation-botkit/SimpleConversationalBot_UB.js'),
    require('./customer-validation-botkit/CcAIAutomationBot.js'),
  ]
  botHandlers.forEach((handler) => sdk.registerBot(handler))

  const configuredBotIds = registerConfiguredBots(
    sdk,
    config.credentials,
    botHandlers[0],
    botHandlers,
  )
  if (configuredBotIds.length) {
    console.log(`Registered ${configuredBotIds.length} config-defined BotKit bot ID(s)`)
  }

  console.log('BotKit routes loaded into the main Express app')
}

app.use('/auth-profiles', auth)
app.use('/mocks', mockAPIs)
app.use('/gchat', handleGchatRequest)
app.use(express.static(path.join(__dirname, 'mocks/mock-files')))

// Dependency-free liveness/readiness endpoint. Deliberately does NOT touch
// MongoDB or Redis: kubelet probes must report on the HTTP server itself, not
// on datastores the service can run without.
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok' })
})

app.get('/health/mongodb', async (req, res) => {
  try {
    const db = await connectToMongoDB()
    await db.command({ ping: 1 })
    res.json({ status: 'ok', database: db.databaseName })
  } catch (error) {
    res.status(503).json({ status: 'error', message: error.message })
  }
})

loadBotkitIntoApp(app)

async function start() {
  const db = await connectToMongoDB()
  console.log(`Database ready: ${db.databaseName}`)

  server = app.listen(port, '0.0.0.0', async () => {
    console.log(`All services are running at http://localhost:${port}`)
    console.log(`Mocks: http://localhost:${port}/mocks`)
    console.log(`Auth profiles: http://localhost:${port}/auth-profiles`)
    console.log(`BotKit SDK: http://localhost:${port}/botkit/sdk`)
    console.log(`GChat typeahead mock: http://localhost:${port}/gchat`)
  })
}

async function shutdown() {
  if (server) {
    await new Promise((resolve) => server.close(resolve))
  }
  await closeMongoDB()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

start().catch((error) => {
  console.error('Unable to start application:', error.message)
  process.exit(1)
})
