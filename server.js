/**
 * Express.js Server for Railway/Render Deployment
 * Speech Token + Claude Proxy for IPA Mastery Tool
 */
require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const app = express()
const PORT = process.env.PORT || 3001

const subscriptionKey = process.env.AZURE_SPEECH_KEY
const region = process.env.AZURE_SPEECH_REGION

// Render runs behind a proxy, so express-rate-limit needs trust proxy enabled to correctly identify clients via X-Forwarded-For.
app.set('trust proxy', 1)

app.use(helmet())

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  message: { error: 'Too many requests, please try again later' }
})
app.use('/api/', limiter)

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://ipamastery.vercel.app',
  process.env.PRODUCTION_ORIGIN
].filter(Boolean)

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || origin === 'null') return callback(null, true)
    if (allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      console.log('CORS blocked:', origin)
      callback(new Error('Not allowed by CORS'))
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}))

app.use(express.json())

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'IPA Mastery Speech Token Server',
    configured: !!(subscriptionKey && region)
  })
})

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    configured: !!(subscriptionKey && region)
  })
})

// Azure Speech token endpoint
app.post('/api/speech-token', async (req, res) => {
  if (!subscriptionKey || !region) {
    console.error('Missing Azure Speech credentials')
    return res.status(500).json({ error: 'Server configuration error' })
  }
  try {
    const tokenUrl = `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issuetoken`
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': subscriptionKey,
        'Content-Length': '0'
      }
    })
    if (!response.ok) {
      console.error(`Azure error: ${response.status}`)
      return res.status(502).json({ error: 'Failed to fetch speech token' })
    }
    const token = await response.text()
    res.set('Cache-Control', 'no-store')
    res.json({ token, region, expiresIn: 600 })
  } catch (error) {
    console.error(`Error: ${error.message}`)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Claude AI proxy — keeps API key server-side, never in browser bundle
app.post('/api/claude-proxy', async (req, res) => {
  const { system, messages } = req.body
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })
  }
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: system || '',
        messages: messages || [],
      }),
    })
    const data = await response.json()
    res.status(response.status).json(data)
  } catch (error) {
    console.error('Claude proxy error:', error.message)
    res.status(500).json({ error: 'Claude proxy failed' })
  }
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' })
})

app.listen(PORT, () => {
  console.log(`
🚀 IPA Mastery Speech Token Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Port: ${PORT}
   Azure Key: ${subscriptionKey ? '✓ Set' : '✗ Missing'}
   Region: ${region || 'Not set'}
   Claude Key: ${process.env.ANTHROPIC_API_KEY ? '✓ Set' : '✗ Missing'}
   CORS: ${allowedOrigins.join(', ')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `)
})
