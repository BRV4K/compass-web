export type UserRole = 'admin' | 'user'

export type User = {
  id: string
  login: string
  subdivision: 'ogk' | 'oyit'
  name: string
  role: UserRole
  passwordHash: string
  createdAt: string
}

export type PublicUser = Omit<User, 'passwordHash'>

export type Section = {
  id: string
  name: string
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

export type Database = {
  users: User[]
  sections: Section[]
  models: CatalogModel[]
}
