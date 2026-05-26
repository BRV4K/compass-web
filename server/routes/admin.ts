import fs from 'node:fs/promises'
import path from 'node:path'
import bcrypt from 'bcryptjs'
import { Router } from 'express'
import { publicModelsDir } from '../lib/constants.js'
import { extractStlMetricsFromFile } from '../lib/stl.js'
import {
  countAdmins,
  createModel,
  createSection,
  createUser,
  deleteModel,
  deleteSection,
  deleteUser,
  filePathReferenced,
  findModelById,
  findSectionById,
  findUserById,
  listUsers,
  toPublicUser,
  updateModel,
  updateSection,
  updateUser,
  userLoginTaken,
} from '../lib/store.js'
import { uploadModel } from '../lib/upload.js'
import type { ModelPrimitive, UserRole } from '../types.js'

function makeModelCode(name: string) {
  const normalized = name
    .trim()
    .toUpperCase()
    .replace(/[^A-ZA-Я0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)

  return normalized || `MODEL-${Date.now()}`
}

function guessPrimitive(filename: string): ModelPrimitive {
  const lower = filename.toLowerCase()

  if (lower.includes('опор') || lower.includes('support')) {
    return 'support'
  }

  if (lower.includes('radar') || lower.includes('антенн')) {
    return 'radar'
  }

  if (lower.includes('cyl') || lower.includes('shaft')) {
    return 'cylinder'
  }

  return 'box'
}

const recommendedBoxes = [
  'ЦСКИ.364651.020',
  'ЦСКИ.364651.036',
  'ЦСКИ.364651.315',
  'Э6.17.18.0011',
  'Э8.23.18.0204-01',
]

function generateModelMetadata(seed: string) {
  const codePoints = [...seed].reduce((sum, character) => sum + character.codePointAt(0)!, 0)
  const lengthMm = 320 + (codePoints % 900)
  const widthMm = 120 + (codePoints % 420)
  const heightMm = 80 + (codePoints % 360)
  const weightKg = Number((2.5 + (codePoints % 145) / 10).toFixed(1))

  return {
    lengthMm,
    widthMm,
    heightMm,
    weightKg,
    dimensions: `${lengthMm}×${widthMm}×${heightMm} мм`,
    recommendedBox: recommendedBoxes[codePoints % recommendedBoxes.length],
  }
}

function toOptionalNumber(value: unknown) {
  const normalized = String(value ?? '').trim()

  if (!normalized) {
    return null
  }

  const parsed = Number(normalized.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

async function resolveModelMetadata(input: {
  seed: string
  uploadedFilePath?: string
  lengthMm?: number | null
  widthMm?: number | null
  heightMm?: number | null
  weightKg?: number | null
  recommendedBox?: string
}) {
  const generated = generateModelMetadata(input.seed)
  const extracted = input.uploadedFilePath?.toLowerCase().endsWith('.stl')
    ? await extractStlMetricsFromFile(input.uploadedFilePath).catch(() => null)
    : null

  const lengthMm = input.lengthMm ?? extracted?.lengthMm ?? generated.lengthMm
  const widthMm = input.widthMm ?? extracted?.widthMm ?? generated.widthMm
  const heightMm = input.heightMm ?? extracted?.heightMm ?? generated.heightMm
  const weightKg = input.weightKg ?? generated.weightKg
  const recommendedBox = input.recommendedBox?.trim() || generated.recommendedBox

  return {
    lengthMm,
    widthMm,
    heightMm,
    weightKg,
    recommendedBox,
    dimensions: `${lengthMm}×${widthMm}×${heightMm} мм`,
  }
}

export const adminRouter = Router()

adminRouter.get('/users', async (_req, res) => {
  const users = await listUsers()
  res.json({ users: users.map(toPublicUser) })
})

adminRouter.post('/users', async (req, res) => {
  const login = String(req.body.login ?? '').trim().toLowerCase()
  const subdivision = String(req.body.subdivision ?? 'ogk').trim().toLowerCase() as 'ogk' | 'oyit'
  const password = String(req.body.password ?? '')
  const name = String(req.body.name ?? '').trim()
  const role = (req.body.role ?? 'user') as UserRole

  if (!login || !password || !name || !['admin', 'user'].includes(role) || !['ogk', 'oyit'].includes(subdivision)) {
    res.status(400).json({ error: 'Нужно указать логин, подразделение, пароль, имя и роль.' })
    return
  }

  if (await userLoginTaken(login, subdivision)) {
    res.status(409).json({ error: 'Пользователь с таким логином в этом подразделении уже существует.' })
    return
  }

  const user = await createUser({
    login,
    subdivision,
    name,
    role,
    passwordHash: await bcrypt.hash(password, 10),
  })
  res.status(201).json({ user: toPublicUser(user) })
})

adminRouter.patch('/users/:userId', async (req, res) => {
  const user = await findUserById(req.params.userId)

  if (!user) {
    res.status(404).json({ error: 'Пользователь не найден.' })
    return
  }

  const login = String(req.body.login ?? user.login).trim().toLowerCase()
  const subdivision = String(req.body.subdivision ?? user.subdivision).trim().toLowerCase() as 'ogk' | 'oyit'
  const name = String(req.body.name ?? user.name).trim()
  const role = (req.body.role ?? user.role) as UserRole
  const password = String(req.body.password ?? '')

  if (!login || !name || !['admin', 'user'].includes(role) || !['ogk', 'oyit'].includes(subdivision)) {
    res.status(400).json({ error: 'Проверьте логин, подразделение, имя и роль.' })
    return
  }

  if (await userLoginTaken(login, subdivision, user.id)) {
    res.status(409).json({ error: 'Логин уже занят.' })
    return
  }

  const updatedUser = await updateUser(user.id, {
    login,
    subdivision,
    name,
    role,
    passwordHash: password ? await bcrypt.hash(password, 10) : undefined,
  })

  res.json({ user: toPublicUser(updatedUser ?? user) })
})

adminRouter.delete('/users/:userId', async (req, res) => {
  const user = await findUserById(req.params.userId)

  if (!user) {
    res.status(404).json({ error: 'Пользователь не найден.' })
    return
  }

  const adminCount = await countAdmins()

  if (user.role === 'admin' && adminCount < 2) {
    res.status(400).json({ error: 'Нельзя удалить последнего администратора.' })
    return
  }

  await deleteUser(user.id)
  res.status(204).end()
})

adminRouter.post('/sections', async (req, res) => {
  const name = String(req.body.name ?? '').trim()

  if (!name) {
    res.status(400).json({ error: 'Название раздела обязательно.' })
    return
  }

  const section = await createSection(name)
  res.status(201).json({ section })
})

adminRouter.patch('/sections/:sectionId', async (req, res) => {
  const section = await findSectionById(req.params.sectionId)

  if (!section) {
    res.status(404).json({ error: 'Раздел не найден.' })
    return
  }

  const name = String(req.body.name ?? '').trim()

  if (!name) {
    res.status(400).json({ error: 'Название раздела обязательно.' })
    return
  }

  const updatedSection = await updateSection(section.id, name)
  res.json({ section: updatedSection ?? section })
})

adminRouter.delete('/sections/:sectionId', async (req, res) => {
  const section = await findSectionById(req.params.sectionId)

  if (!section) {
    res.status(404).json({ error: 'Раздел не найден.' })
    return
  }

  await deleteSection(section.id)
  res.status(204).end()
})

adminRouter.post('/models', uploadModel.single('modelFile'), async (req, res) => {
  const sectionId = String(req.body.sectionId ?? '').trim()
  const name = String(req.body.name ?? '').trim()
  const description = String(req.body.description ?? '').trim()

  if (!(await findSectionById(sectionId))) {
    res.status(400).json({ error: 'Укажите существующий раздел.' })
    return
  }

  if (!name || !description || !req.file) {
    res.status(400).json({ error: 'Укажите раздел, название, описание и файл модели.' })
    return
  }

  const uploadedFilePath = path.join(publicModelsDir, req.file.filename)
  const resolved = await resolveModelMetadata({
    seed: `${sectionId}:${name}:${req.file.originalname}`,
    uploadedFilePath,
    lengthMm: toOptionalNumber(req.body.lengthMm),
    widthMm: toOptionalNumber(req.body.widthMm),
    heightMm: toOptionalNumber(req.body.heightMm),
    weightKg: toOptionalNumber(req.body.weightKg),
    recommendedBox: String(req.body.recommendedBox ?? ''),
  })
  const model = await createModel({
    sectionId,
    name,
    code: makeModelCode(name),
    description,
    dimensions: resolved.dimensions,
    lengthMm: resolved.lengthMm,
    widthMm: resolved.widthMm,
    heightMm: resolved.heightMm,
    material: '',
    weightKg: resolved.weightKg,
    recommendedBox: resolved.recommendedBox,
    modelPath: `/models/${req.file.filename}`,
    sourceFileName: req.file.originalname,
    primitive: guessPrimitive(req.file.originalname),
  })
  res.status(201).json({ model })
})

adminRouter.patch('/models/:modelId', uploadModel.single('modelFile'), async (req, res) => {
  const modelId = String(req.params.modelId)
  const model = await findModelById(modelId)

  if (!model) {
    res.status(404).json({ error: 'Модель не найдена.' })
    return
  }

  const sectionId = String(req.body.sectionId ?? model.sectionId).trim()

  if (!(await findSectionById(sectionId))) {
    res.status(400).json({ error: 'Укажите существующий раздел.' })
    return
  }

  const nextModelPath = req.file ? `/models/${req.file.filename}` : undefined
  const nextSourceFileName = req.file ? req.file.originalname : undefined
  const nextName = String(req.body.name ?? model.name).trim()
  const resolved = await resolveModelMetadata({
    seed: `${sectionId}:${nextName}:${nextSourceFileName ?? model.sourceFileName}`,
    uploadedFilePath: req.file ? path.join(publicModelsDir, req.file.filename) : undefined,
    lengthMm: toOptionalNumber(req.body.lengthMm) ?? model.lengthMm,
    widthMm: toOptionalNumber(req.body.widthMm) ?? model.widthMm,
    heightMm: toOptionalNumber(req.body.heightMm) ?? model.heightMm,
    weightKg: toOptionalNumber(req.body.weightKg) ?? model.weightKg,
    recommendedBox: String(req.body.recommendedBox ?? model.recommendedBox),
  })
  const updatedModel = await updateModel(model.id, {
    sectionId,
    name: nextName,
    code: makeModelCode(nextName),
    description: String(req.body.description ?? model.description).trim(),
    dimensions: resolved.dimensions,
    lengthMm: resolved.lengthMm,
    widthMm: resolved.widthMm,
    heightMm: resolved.heightMm,
    material: model.material,
    weightKg: resolved.weightKg,
    recommendedBox: resolved.recommendedBox,
    primitive: req.file ? guessPrimitive(req.file.originalname) : model.primitive,
    modelPath: nextModelPath,
    sourceFileName: nextSourceFileName,
  })

  if (req.file && !(await filePathReferenced(model.modelPath, model.id))) {
    await fs.rm(path.join(publicModelsDir, path.basename(model.modelPath)), { force: true })
  }

  res.json({ model: updatedModel ?? model })
})

adminRouter.delete('/models/:modelId', async (req, res) => {
  const model = await findModelById(req.params.modelId)

  if (!model) {
    res.status(404).json({ error: 'Модель не найдена.' })
    return
  }

  await deleteModel(model.id)

  if (!(await filePathReferenced(model.modelPath))) {
    await fs.rm(path.join(publicModelsDir, path.basename(model.modelPath)), { force: true })
  }

  res.status(204).end()
})
