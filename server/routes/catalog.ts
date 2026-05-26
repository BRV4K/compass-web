import { Router } from 'express'
import { listSectionsWithModels } from '../lib/store.js'

export const catalogRouter = Router()

catalogRouter.get('/', async (_req, res) => {
  const sections = await listSectionsWithModels()
  res.json({ sections })
})
