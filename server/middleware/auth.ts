import jwt from 'jsonwebtoken'
import type { NextFunction, Request, Response } from 'express'
import { jwtSecret } from '../lib/constants.js'
import type { PublicUser, UserRole } from '../types.js'

type TokenPayload = {
  sub: string
  login: string
  subdivision: 'ogk' | 'oyit'
  name: string
  role: UserRole
}

declare global {
  namespace Express {
    interface Request {
      user?: PublicUser
    }
  }
}

export function signToken(user: PublicUser) {
  return jwt.sign(
    {
      sub: user.id,
      login: user.login,
      subdivision: user.subdivision,
      name: user.name,
      role: user.role,
    } satisfies TokenPayload,
    jwtSecret,
    { expiresIn: '12h' },
  )
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization

  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Требуется авторизация.' })
    return
  }

  try {
    const token = header.slice('Bearer '.length)
    const payload = jwt.verify(token, jwtSecret) as TokenPayload
    req.user = {
      id: payload.sub,
      login: payload.login,
      subdivision: payload.subdivision,
      name: payload.name,
      role: payload.role,
      createdAt: '',
    }
    next()
  } catch {
    res.status(401).json({ error: 'Сессия истекла или токен некорректен.' })
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Доступно только администратору.' })
    return
  }
  next()
}
