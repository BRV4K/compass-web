import type { AuthUser, CatalogModel, CatalogSection, Subdivision, UserRole } from '../types/app'

const API_BASE = '/api'
const TOKEN_KEY = 'compass-web-token'

export function readToken() {
  return window.localStorage.getItem(TOKEN_KEY)
}

export function writeToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY)
}

async function apiRequest<T>(path: string, init: RequestInit = {}, token?: string | null) {
  const headers = new Headers(init.headers)

  if (!headers.has('Content-Type') && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_BASE}${path}`, { ...init, headers })

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(payload.error ?? 'Ошибка запроса.')
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export async function loginRequest(login: string, subdivision: Subdivision, password: string) {
  return apiRequest<{ token: string; user: AuthUser }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ login, subdivision, password }),
  })
}

export async function meRequest(token: string) {
  return apiRequest<{ user: AuthUser }>('/auth/me', { method: 'GET' }, token)
}

export async function getCatalogRequest(token: string) {
  return apiRequest<{ sections: CatalogSection[] }>('/catalog', { method: 'GET' }, token)
}

export async function getUsersRequest(token: string) {
  return apiRequest<{ users: AuthUser[] }>('/admin/users', { method: 'GET' }, token)
}

export async function createUserRequest(
  token: string,
  payload: {
    login: string
    subdivision: Subdivision
    password: string
    name: string
    role: UserRole
  },
) {
  return apiRequest<{ user: AuthUser }>(
    '/admin/users',
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  )
}

export async function updateUserRequest(
  token: string,
  userId: string,
  payload: {
    login: string
    subdivision: Subdivision
    password?: string
    name: string
    role: UserRole
  },
) {
  return apiRequest<{ user: AuthUser }>(
    `/admin/users/${userId}`,
    { method: 'PATCH', body: JSON.stringify(payload) },
    token,
  )
}

export async function deleteUserRequest(token: string, userId: string) {
  return apiRequest<void>(`/admin/users/${userId}`, { method: 'DELETE' }, token)
}

export async function createSectionRequest(token: string, payload: { name: string }) {
  return apiRequest<{ section: CatalogSection }>(
    '/admin/sections',
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  )
}

export async function updateSectionRequest(token: string, sectionId: string, payload: { name: string }) {
  return apiRequest<{ section: CatalogSection }>(
    `/admin/sections/${sectionId}`,
    { method: 'PATCH', body: JSON.stringify(payload) },
    token,
  )
}

export async function deleteSectionRequest(token: string, sectionId: string) {
  return apiRequest<void>(`/admin/sections/${sectionId}`, { method: 'DELETE' }, token)
}

export type ModelPayload = {
  sectionId: string
  name: string
  description: string
  lengthMm: string
  widthMm: string
  heightMm: string
  weightKg: string
  recommendedBox: string
  modelFile?: File | null
}

function buildModelFormData(payload: ModelPayload) {
  const formData = new FormData()
  formData.set('sectionId', payload.sectionId)
  formData.set('name', payload.name)
  formData.set('description', payload.description)
  formData.set('lengthMm', payload.lengthMm)
  formData.set('widthMm', payload.widthMm)
  formData.set('heightMm', payload.heightMm)
  formData.set('weightKg', payload.weightKg)
  formData.set('recommendedBox', payload.recommendedBox)
  if (payload.modelFile) {
    formData.set('modelFile', payload.modelFile)
  }
  return formData
}

export async function createModelRequest(token: string, payload: ModelPayload) {
  return apiRequest<{ model: CatalogModel }>(
    '/admin/models',
    { method: 'POST', body: buildModelFormData(payload) },
    token,
  )
}

export async function updateModelRequest(token: string, modelId: string, payload: ModelPayload) {
  return apiRequest<{ model: CatalogModel }>(
    `/admin/models/${modelId}`,
    { method: 'PATCH', body: buildModelFormData(payload) },
    token,
  )
}

export async function deleteModelRequest(token: string, modelId: string) {
  return apiRequest<void>(`/admin/models/${modelId}`, { method: 'DELETE' }, token)
}
