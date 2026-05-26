import path from 'node:path'

export const rootDir = process.cwd()
export const publicModelsDir = path.join(rootDir, 'public', 'models')
export const jwtSecret = process.env.JWT_SECRET ?? 'compass-web-demo-secret'
