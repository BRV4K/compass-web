import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import bcrypt from 'bcryptjs'
import { Pool } from 'pg'
import { publicModelsDir, rootDir } from './constants.js'
import { extractStlMetricsFromFile } from './stl.js'
import type {
  CatalogModel,
  ModelPrimitive,
  PublicUser,
  Section,
  User,
  UserRole,
} from '../types.js'

const schemaPath = path.join(rootDir, 'server', 'sql', 'schema.sql')
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/compass_web',
})

type UserRow = {
  id: string
  login: string
  subdivision: 'ogk' | 'oyit'
  name: string
  role: UserRole
  password_hash: string
  created_at: string
}

type SectionRow = {
  id: string
  name: string
  created_at: string
}

type ModelRow = {
  id: string
  section_id: string
  name: string
  code: string
  description: string
  dimensions: string
  length_mm: number
  width_mm: number
  height_mm: number
  material: string
  weight_kg: string | number
  recommended_box: string
  model_path: string
  source_file_name: string
  primitive: ModelPrimitive
  created_at: string
}

type CatalogAsset = {
  sectionName: string
  fileName: string
  sourcePath: string
  publicPath: string
}

const defaultSectionName = 'Без раздела'
const defaultRecommendedBoxes = [
  'ЦСКИ.364651.020',
  'ЦСКИ.364651.036',
  'ЦСКИ.364651.315',
  'Э6.17.18.0011',
  'Э8.23.18.0204-01',
]

function mapUser(row: UserRow): User {
  return {
    id: row.id,
    login: row.login,
    subdivision: row.subdivision,
    name: row.name,
    role: row.role,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
  }
}

function mapSection(row: SectionRow): Section {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
  }
}

function mapModel(row: ModelRow): CatalogModel {
  return {
    id: row.id,
    sectionId: row.section_id,
    name: row.name,
    code: row.code,
    description: row.description,
    dimensions: row.dimensions,
    lengthMm: Number(row.length_mm),
    widthMm: Number(row.width_mm),
    heightMm: Number(row.height_mm),
    material: row.material,
    weightKg: Number(row.weight_kg),
    recommendedBox: row.recommended_box,
    modelPath: row.model_path,
    sourceFileName: row.source_file_name,
    primitive: row.primitive,
    createdAt: row.created_at,
  }
}

export function toPublicUser(user: User): PublicUser {
  const { passwordHash: _passwordHash, ...publicUser } = user
  return publicUser
}

function makeModelCode(name: string) {
  const normalized = name
    .trim()
    .toUpperCase()
    .replace(/[^A-ZА-Я0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)

  return normalized || `MODEL-${Date.now()}`
}

function guessPrimitive(filename: string): ModelPrimitive {
  const lower = filename.toLowerCase()

  if (lower.includes('швеллер') || lower.includes('опор')) {
    return 'support'
  }

  if (lower.includes('розетк')) {
    return 'cylinder'
  }

  if (lower.includes('антенн') || lower.includes('радар')) {
    return 'radar'
  }

  return 'box'
}

function makeDescription(sectionName: string, modelName: string) {
  return `${modelName} из раздела «${sectionName}» для станции 1РЛ131Р.`
}

function makeDimensions(seed: string) {
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
    recommendedBox: defaultRecommendedBoxes[codePoints % defaultRecommendedBoxes.length],
  }
}

function toPublicModelPath(sourcePath: string) {
  const relativePath = path.relative(publicModelsDir, sourcePath)
  return `/models/${relativePath.split(path.sep).join('/')}`
}

async function listCatalogAssets() {
  const sourceExists = await fs
    .access(publicModelsDir)
    .then(() => true)
    .catch(() => false)

  if (!sourceExists) {
    return []
  }

  const assets: CatalogAsset[] = []

  async function walkDirectory(currentDir: string, sectionName = defaultSectionName) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true })

    for (const entry of entries) {
      const sourcePath = path.join(currentDir, entry.name)

      if (entry.isDirectory()) {
        const nextSectionName = currentDir === publicModelsDir ? entry.name : sectionName
        await walkDirectory(sourcePath, nextSectionName)
        continue
      }

      if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== '.stl') {
        continue
      }

      assets.push({
        sectionName,
        fileName: entry.name,
        sourcePath,
        publicPath: toPublicModelPath(sourcePath),
      })
    }
  }

  await walkDirectory(publicModelsDir)

  return assets.sort((left, right) =>
    `${left.sectionName}/${left.fileName}`.localeCompare(`${right.sectionName}/${right.fileName}`, 'ru'),
  )
}

export async function ensureStorage() {
  await fs.mkdir(publicModelsDir, { recursive: true })

  const schema = await fs.readFile(schemaPath, 'utf8')
  await pool.query(schema)
  await seedDatabase()
  await importDefaultCatalog()
}

async function seedDatabase() {
  const createdAt = new Date().toISOString()
  const adminPasswordHash = await bcrypt.hash('oyit023', 10)
  const userPasswordHash = await bcrypt.hash('ogk078', 10)

  await pool.query(
    `
      insert into users (id, login, subdivision, name, role, password_hash, created_at)
      values
        ($1, $2, $3, $4, $5, $6, $7),
        ($8, $9, $10, $11, $12, $13, $14)
      on conflict (login) do nothing
    `,
    [
      randomUUID(),
      'oyit023',
      'oyit',
      'Администратор ОУИТ-023',
      'admin',
      adminPasswordHash,
      createdAt,
      randomUUID(),
      'ogk078',
      'ogk',
      'Пользователь ОГК-078',
      'user',
      userPasswordHash,
      createdAt,
    ],
  )
}

async function importDefaultCatalog() {
  const assets = await listCatalogAssets()

  if (assets.length === 0) {
    return
  }

  const existingSections = await listSections()
  const existingModels = await listModels()
  const sectionIds = new Map<string, string>(
    existingSections.map((section) => [section.name, section.id]),
  )
  const modelPaths = new Set(existingModels.map((model) => model.modelPath))

  for (const asset of assets) {
    let sectionId = sectionIds.get(asset.sectionName)

    if (!sectionId) {
      sectionId = randomUUID()
      sectionIds.set(asset.sectionName, sectionId)
      await pool.query(
        `
          insert into sections (id, name, created_at)
          values ($1, $2, $3)
        `,
        [sectionId, asset.sectionName, new Date().toISOString()],
      )
    }

    if (modelPaths.has(asset.publicPath)) {
      continue
    }

    const modelName = path.basename(asset.fileName, path.extname(asset.fileName)).replace(/_/g, ' ')
    const generated = makeDimensions(`${asset.sectionName}:${modelName}`)
    const extracted = await extractStlMetricsFromFile(asset.sourcePath).catch(() => null)
    const lengthMm = extracted?.lengthMm ?? generated.lengthMm
    const widthMm = extracted?.widthMm ?? generated.widthMm
    const heightMm = extracted?.heightMm ?? generated.heightMm

    await pool.query(
      `
        insert into models (
          id, section_id, name, code, description, dimensions, length_mm, width_mm, height_mm,
          material, weight_kg, recommended_box, model_path, source_file_name, primitive, created_at
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      `,
      [
        randomUUID(),
        sectionId,
        modelName,
        makeModelCode(modelName),
        makeDescription(asset.sectionName, modelName),
        `${lengthMm}×${widthMm}×${heightMm} мм`,
        lengthMm,
        widthMm,
        heightMm,
        '',
        generated.weightKg,
        generated.recommendedBox,
        asset.publicPath,
        asset.fileName,
        guessPrimitive(asset.fileName),
        new Date().toISOString(),
      ],
    )

    modelPaths.add(asset.publicPath)
  }
}

export async function findUserByLogin(login: string, subdivision?: 'ogk' | 'oyit') {
  const result = await pool.query<UserRow>(
    `
      select *
      from users
      where login = $1
        and ($2::text is null or subdivision = $2)
    `,
    [login, subdivision ?? null],
  )

  return result.rows[0] ? mapUser(result.rows[0]) : null
}

export async function findUserById(userId: string) {
  const result = await pool.query<UserRow>('select * from users where id = $1', [userId])
  return result.rows[0] ? mapUser(result.rows[0]) : null
}

export async function listUsers() {
  const result = await pool.query<UserRow>('select * from users order by created_at asc')
  return result.rows.map(mapUser)
}

export async function createUser(input: {
  login: string
  subdivision: 'ogk' | 'oyit'
  name: string
  role: UserRole
  passwordHash: string
}) {
  const id = randomUUID()
  const createdAt = new Date().toISOString()

  const result = await pool.query<UserRow>(
    `
      insert into users (id, login, subdivision, name, role, password_hash, created_at)
      values ($1, $2, $3, $4, $5, $6, $7)
      returning *
    `,
    [id, input.login, input.subdivision, input.name, input.role, input.passwordHash, createdAt],
  )

  return mapUser(result.rows[0])
}

export async function updateUser(
  userId: string,
  input: {
    login: string
    subdivision: 'ogk' | 'oyit'
    name: string
    role: UserRole
    passwordHash?: string
  },
) {
  const result = await pool.query<UserRow>(
    `
      update users
      set
        login = $2,
        subdivision = $3,
        name = $4,
        role = $5,
        password_hash = coalesce($6, password_hash)
      where id = $1
      returning *
    `,
    [userId, input.login, input.subdivision, input.name, input.role, input.passwordHash ?? null],
  )

  return result.rows[0] ? mapUser(result.rows[0]) : null
}

export async function deleteUser(userId: string) {
  await pool.query('delete from users where id = $1', [userId])
}

export async function countAdmins() {
  const result = await pool.query<{ count: string }>("select count(*) from users where role = 'admin'")
  return Number(result.rows[0].count)
}

export async function userLoginTaken(
  login: string,
  subdivision: 'ogk' | 'oyit',
  excludeUserId?: string,
) {
  const result = await pool.query<{ exists: boolean }>(
    `
      select exists(
        select 1
        from users
        where login = $1
          and subdivision = $2
          and ($3::text is null or id <> $3)
      ) as exists
    `,
    [login, subdivision, excludeUserId ?? null],
  )

  return result.rows[0].exists
}

export async function listSections() {
  const result = await pool.query<SectionRow>('select * from sections order by created_at asc')
  return result.rows.map(mapSection)
}

export async function findSectionById(sectionId: string) {
  const result = await pool.query<SectionRow>('select * from sections where id = $1', [sectionId])
  return result.rows[0] ? mapSection(result.rows[0]) : null
}

export async function createSection(name: string) {
  const result = await pool.query<SectionRow>(
    `
      insert into sections (id, name, created_at)
      values ($1, $2, $3)
      returning *
    `,
    [randomUUID(), name, new Date().toISOString()],
  )

  return mapSection(result.rows[0])
}

export async function updateSection(sectionId: string, name: string) {
  const result = await pool.query<SectionRow>(
    `
      update sections
      set name = $2
      where id = $1
      returning *
    `,
    [sectionId, name],
  )

  return result.rows[0] ? mapSection(result.rows[0]) : null
}

export async function deleteSection(sectionId: string) {
  await pool.query('delete from sections where id = $1', [sectionId])
}

export async function listModels() {
  const result = await pool.query<ModelRow>('select * from models order by created_at asc')
  return result.rows.map(mapModel)
}

export async function findModelById(modelId: string) {
  const result = await pool.query<ModelRow>('select * from models where id = $1', [modelId])
  return result.rows[0] ? mapModel(result.rows[0]) : null
}

export async function createModel(input: {
  sectionId: string
  name: string
  code: string
  description: string
  dimensions: string
  lengthMm: number
  widthMm: number
  heightMm: number
  material: string
  weightKg: number
  recommendedBox: string
  modelPath: string
  sourceFileName: string
  primitive: ModelPrimitive
}) {
  const result = await pool.query<ModelRow>(
    `
      insert into models (
        id, section_id, name, code, description, dimensions, length_mm, width_mm, height_mm,
        material, weight_kg, recommended_box, model_path, source_file_name, primitive, created_at
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      returning *
    `,
    [
      randomUUID(),
      input.sectionId,
      input.name,
      input.code,
      input.description,
      input.dimensions,
      input.lengthMm,
      input.widthMm,
      input.heightMm,
      input.material,
      input.weightKg,
      input.recommendedBox,
      input.modelPath,
      input.sourceFileName,
      input.primitive,
      new Date().toISOString(),
    ],
  )

  return mapModel(result.rows[0])
}

export async function updateModel(
  modelId: string,
  input: {
    sectionId: string
    name: string
    code: string
    description: string
    dimensions: string
    lengthMm: number
    widthMm: number
    heightMm: number
    material: string
    weightKg: number
    recommendedBox: string
    primitive: ModelPrimitive
    modelPath?: string
    sourceFileName?: string
  },
) {
  const result = await pool.query<ModelRow>(
    `
      update models
      set
        section_id = $2,
        name = $3,
        code = $4,
        description = $5,
        dimensions = $6,
        length_mm = $7,
        width_mm = $8,
        height_mm = $9,
        material = $10,
        weight_kg = $11,
        recommended_box = $12,
        primitive = $13,
        model_path = coalesce($14, model_path),
        source_file_name = coalesce($15, source_file_name)
      where id = $1
      returning *
    `,
    [
      modelId,
      input.sectionId,
      input.name,
      input.code,
      input.description,
      input.dimensions,
      input.lengthMm,
      input.widthMm,
      input.heightMm,
      input.material,
      input.weightKg,
      input.recommendedBox,
      input.primitive,
      input.modelPath ?? null,
      input.sourceFileName ?? null,
    ],
  )

  return result.rows[0] ? mapModel(result.rows[0]) : null
}

export async function deleteModel(modelId: string) {
  await pool.query('delete from models where id = $1', [modelId])
}

export async function filePathReferenced(modelPath: string, excludeModelId?: string) {
  const result = await pool.query<{ exists: boolean }>(
    `
      select exists(
        select 1
        from models
        where model_path = $1
          and ($2::text is null or id <> $2)
      ) as exists
    `,
    [modelPath, excludeModelId ?? null],
  )

  return result.rows[0].exists
}

export async function listSectionsWithModels(): Promise<Array<Section & { models: CatalogModel[] }>> {
  const [sections, models] = await Promise.all([listSections(), listModels()])

  return sections.map((section) => ({
    ...section,
    models: models
      .filter((model) => model.sectionId === section.id)
      .sort((left, right) => left.name.localeCompare(right.name, 'ru')),
  }))
}

export async function closePool() {
  await pool.end()
}
