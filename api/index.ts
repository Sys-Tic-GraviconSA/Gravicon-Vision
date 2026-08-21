import type { VercelRequest, VercelResponse } from '@vercel/node'
import express from 'express'
import { createApiRouter } from '../server/api-routes.js'

const app = express()

app.use(express.json({ limit: '10kb' }))
app.use('/api', createApiRouter())

export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req, res)
}
