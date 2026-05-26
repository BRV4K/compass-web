import bcrypt from 'bcryptjs'
import { Router } from 'express'
import { findUserByLogin, toPublicUser } from '../lib/store.js'
import { signToken } from '../middleware/auth.js'

export const authRouter = Router()

authRouter.post('/login', async (req, res) => {
  const login = String(req.body.login ?? '').trim().toLowerCase()
  const subdivision = String(req.body.subdivision ?? '').trim().toLowerCase() as 'ogk' | 'oyit'
  const password = String(req.body.password ?? '')

  if (!login || !password || !['ogk', 'oyit'].includes(subdivision)) {
    res.status(400).json({ error: 'Введите логин, подразделение и пароль.' })
    return
  }

  const user = await findUserByLogin(login, subdivision)

  if (!user) {
    res.status(401).json({ error: 'Неверный логин или пароль.' })
    return
  }

  const matches = await bcrypt.compare(password, user.passwordHash)

  if (!matches) {
    res.status(401).json({ error: 'Неверный логин или пароль.' })
    return
  }

  const publicUser = toPublicUser(user)
  res.json({ token: signToken(publicUser), user: publicUser })
})
