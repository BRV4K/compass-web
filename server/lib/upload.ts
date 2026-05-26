import multer from 'multer'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { publicModelsDir } from './constants.js'

function sanitizeBaseName(filename: string) {
  return filename
    .toLowerCase()
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
}

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, publicModelsDir),
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname) || '.stl'
    const baseName = sanitizeBaseName(file.originalname) || 'model'
    callback(null, `${baseName}-${randomUUID().slice(0, 8)}${extension}`)
  },
})

export const uploadModel = multer({ storage })
