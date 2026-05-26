import path from 'node:path'
import cors from 'cors'
import express from 'express'
import { ensureStorage, findUserById, toPublicUser } from './lib/store.js'
import { requireAdmin, requireAuth } from './middleware/auth.js'
import { authRouter } from './routes/auth.js'
import { catalogRouter } from './routes/catalog.js'
import { adminRouter } from './routes/admin.js'
import { publicModelsDir, rootDir } from './lib/constants.js'

const app = express()
const port = Number(process.env.PORT ?? 3001)
const clientDistDir = path.join(rootDir, 'dist')
const clientIndexPath = path.join(clientDistDir, 'index.html')

app.use(cors())
app.use(express.json())
app.use('/models', express.static(publicModelsDir))
app.use('/api/auth', authRouter)

app.get('/api/auth/me', requireAuth, async (req, res) => {
  const user = req.user?.id ? await findUserById(req.user.id) : null

  if (!user) {
    res.status(401).json({ error: 'Пользователь не найден.' })
    return
  }

  res.json({ user: toPublicUser(user) })
})

app.use('/api/catalog', requireAuth, catalogRouter)
app.use('/api/admin', requireAuth, requireAdmin, adminRouter)

app.use(express.static(clientDistDir))

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Маршрут не найден.' })
})

app.get(/^(?!\/api\/).*/, (_req, res) => {
  res.sendFile(clientIndexPath)
})

await ensureStorage()

app.listen(port, () => {
  console.log(`Compass backend started on http://localhost:${port}`)
})
