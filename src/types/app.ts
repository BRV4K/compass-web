export type UserRole = 'admin' | 'user'
export type Subdivision = 'ogk' | 'oyit'

export type AuthUser = {
  id: string
  login: string
  subdivision: Subdivision
  name: string
  role: UserRole
  createdAt: string
}

export type ModelPrimitive = 'box' | 'cylinder' | 'radar' | 'support'

export type CatalogModel = {
  id: string
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
  createdAt: string
}

export type CatalogSection = {
  id: string
  name: string
  createdAt: string
  models: CatalogModel[]
}
