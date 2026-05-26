import { useEffect, useState, type FormEvent } from 'react'
import {
  createModelRequest,
  createSectionRequest,
  createUserRequest,
  deleteModelRequest,
  deleteSectionRequest,
  deleteUserRequest,
  getUsersRequest,
  updateModelRequest,
  updateSectionRequest,
  updateUserRequest,
  type ModelPayload,
} from '../lib/api'
import { useAuth } from '../components/AuthProvider'
import { useCatalog } from '../components/CatalogProvider'
import { extractStlMetricsFromFile } from '../lib/stl'
import type { AuthUser, CatalogModel, CatalogSection, Subdivision, UserRole } from '../types/app'

type UserFormState = {
  login: string
  subdivision: Subdivision
  password: string
  name: string
  role: UserRole
}

const emptyUserForm: UserFormState = {
  login: '',
  subdivision: 'ogk',
  password: '',
  name: '',
  role: 'user',
}

const emptyModelForm: ModelPayload = {
  sectionId: '',
  name: '',
  description: '',
  lengthMm: '',
  widthMm: '',
  heightMm: '',
  weightKg: '',
  recommendedBox: '',
  modelFile: null,
}

export function AdminPage() {
  const { token } = useAuth()
  const { sections, refreshCatalog } = useCatalog()
  const [users, setUsers] = useState<AuthUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [error, setError] = useState('')
  const [userForm, setUserForm] = useState<UserFormState>(emptyUserForm)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [sectionName, setSectionName] = useState('')
  const [editingSection, setEditingSection] = useState<CatalogSection | null>(null)
  const [modelForm, setModelForm] = useState<ModelPayload>(emptyModelForm)
  const [editingModel, setEditingModel] = useState<CatalogModel | null>(null)

  useEffect(() => {
    if (!token) {
      return
    }

    void (async () => {
      setLoadingUsers(true)
      try {
        const payload = await getUsersRequest(token)
        setUsers(payload.users)
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Не удалось загрузить пользователей.')
      } finally {
        setLoadingUsers(false)
      }
    })()
  }, [token])

  useEffect(() => {
    if (!modelForm.sectionId && sections[0]) {
      setModelForm((current) => ({ ...current, sectionId: sections[0].id }))
    }
  }, [sections, modelForm.sectionId])

  async function reloadUsers() {
    if (!token) {
      return
    }
    const payload = await getUsersRequest(token)
    setUsers(payload.users)
  }

  async function handleUserSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token) {
      return
    }

    try {
      setError('')
      if (editingUserId) {
        await updateUserRequest(token, editingUserId, userForm)
      } else {
        await createUserRequest(token, userForm)
      }
      await reloadUsers()
      setEditingUserId(null)
      setUserForm(emptyUserForm)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Не удалось сохранить пользователя.')
    }
  }

  async function handleSectionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token) {
      return
    }

    try {
      setError('')
      if (editingSection) {
        await updateSectionRequest(token, editingSection.id, { name: sectionName })
      } else {
        await createSectionRequest(token, { name: sectionName })
      }
      setEditingSection(null)
      setSectionName('')
      await refreshCatalog()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Не удалось сохранить раздел.')
    }
  }

  async function handleModelSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token) {
      return
    }

    try {
      setError('')
      if (editingModel) {
        await updateModelRequest(token, editingModel.id, modelForm)
      } else {
        await createModelRequest(token, modelForm)
      }
      setEditingModel(null)
      setModelForm({
        ...emptyModelForm,
        sectionId: sections[0]?.id ?? '',
      })
      await refreshCatalog()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Не удалось сохранить модель.')
    }
  }

  return (
    <section className="page">
      <div className="hero-card">
        <span className="eyebrow">Admin</span>
        <h1>Управление пользователями и каталогом</h1>
        <p>Администратор ОЙИТ управляет пользователями, разделами и загружает STL-модели для станции 1РЛ131Р.</p>
      </div>

      {error ? <div className="form-error">{error}</div> : null}

      <div className="admin-grid">
        <section className="admin-card">
          <div className="admin-card__header">
            <h2>Пользователи</h2>
            <span>{loadingUsers ? 'Загрузка...' : `${users.length} шт.`}</span>
          </div>
          <form className="stack-form" onSubmit={handleUserSubmit}>
            <input
              value={userForm.name}
              onChange={(event) => setUserForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Имя пользователя"
            />
            <input
              value={userForm.login}
              onChange={(event) => setUserForm((current) => ({ ...current, login: event.target.value }))}
              placeholder="Логин"
            />
            <select
              value={userForm.subdivision}
              onChange={(event) =>
                setUserForm((current) => ({ ...current, subdivision: event.target.value as Subdivision }))
              }
            >
              <option value="ogk">ogk</option>
              <option value="oyit">oyit</option>
            </select>
            <input
              type="password"
              value={userForm.password}
              onChange={(event) => setUserForm((current) => ({ ...current, password: event.target.value }))}
              placeholder={editingUserId ? 'Новый пароль, если нужно' : 'Пароль'}
            />
            <select
              value={userForm.role}
              onChange={(event) =>
                setUserForm((current) => ({ ...current, role: event.target.value as UserRole }))
              }
            >
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
            <button type="submit" className="primary-button">
              {editingUserId ? 'Сохранить пользователя' : 'Создать пользователя'}
            </button>
          </form>
          <div className="admin-list">
            {users.map((user) => (
              <div key={user.id} className="admin-list__item">
                <div>
                  <strong>{user.name}</strong>
                  <div>
                    {user.login} · {user.subdivision} · {user.role}
                  </div>
                </div>
                <div className="admin-list__actions">
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => {
                      setEditingUserId(user.id)
                      setUserForm({
                        login: user.login,
                        subdivision: user.subdivision,
                        password: '',
                        name: user.name,
                        role: user.role,
                      })
                    }}
                  >
                    Редактировать
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={async () => {
                      if (!token) {
                        return
                      }
                      try {
                        await deleteUserRequest(token, user.id)
                        await reloadUsers()
                      } catch (requestError) {
                        setError(requestError instanceof Error ? requestError.message : 'Не удалось удалить пользователя.')
                      }
                    }}
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="admin-card">
          <div className="admin-card__header">
            <h2>Разделы</h2>
            <span>{sections.length} шт.</span>
          </div>
          <form className="stack-form" onSubmit={handleSectionSubmit}>
            <input
              value={sectionName}
              onChange={(event) => setSectionName(event.target.value)}
              placeholder="Название раздела"
            />
            <button type="submit" className="primary-button">
              {editingSection ? 'Сохранить раздел' : 'Создать раздел'}
            </button>
          </form>
          <div className="admin-list">
            {sections.map((section) => (
              <div key={section.id} className="admin-list__item">
                <div>
                  <strong>{section.name}</strong>
                  <div>{section.models.length} моделей</div>
                </div>
                <div className="admin-list__actions">
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => {
                      setEditingSection(section)
                      setSectionName(section.name)
                    }}
                  >
                    Редактировать
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={async () => {
                      if (!token) {
                        return
                      }
                      try {
                        await deleteSectionRequest(token, section.id)
                        await refreshCatalog()
                      } catch (requestError) {
                        setError(requestError instanceof Error ? requestError.message : 'Не удалось удалить раздел.')
                      }
                    }}
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="admin-card">
        <div className="admin-card__header">
          <h2>Модели</h2>
          <span>{sections.reduce((sum, section) => sum + section.models.length, 0)} шт.</span>
        </div>
        <form className="stack-form stack-form--wide" onSubmit={handleModelSubmit}>
          <select
            value={modelForm.sectionId}
            onChange={(event) => setModelForm((current) => ({ ...current, sectionId: event.target.value }))}
          >
            <option value="">Выберите раздел</option>
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.name}
              </option>
            ))}
          </select>
          <input
            value={modelForm.name}
            onChange={(event) => setModelForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Название модели"
          />
          <textarea
            value={modelForm.description}
            onChange={(event) => setModelForm((current) => ({ ...current, description: event.target.value }))}
            placeholder="Описание"
          />
          <input
            value={modelForm.lengthMm}
            onChange={(event) => setModelForm((current) => ({ ...current, lengthMm: event.target.value }))}
            placeholder="Длина, мм"
          />
          <input
            value={modelForm.widthMm}
            onChange={(event) => setModelForm((current) => ({ ...current, widthMm: event.target.value }))}
            placeholder="Ширина, мм"
          />
          <input
            value={modelForm.heightMm}
            onChange={(event) => setModelForm((current) => ({ ...current, heightMm: event.target.value }))}
            placeholder="Высота, мм"
          />
          <input
            value={modelForm.weightKg}
            onChange={(event) => setModelForm((current) => ({ ...current, weightKg: event.target.value }))}
            placeholder="Вес, кг"
          />
          <input
            value={modelForm.recommendedBox}
            onChange={(event) =>
              setModelForm((current) => ({ ...current, recommendedBox: event.target.value }))
            }
            placeholder="Рекомендуемый ящик"
          />
          <input
            type="file"
            accept=".stl"
            onChange={async (event) => {
              const file = event.target.files?.[0] ?? null
              const extracted = file ? await extractStlMetricsFromFile(file).catch(() => null) : null

              setModelForm((current) => ({
                ...current,
                modelFile: file,
                lengthMm: extracted?.lengthMm ? String(extracted.lengthMm) : current.lengthMm,
                widthMm: extracted?.widthMm ? String(extracted.widthMm) : current.widthMm,
                heightMm: extracted?.heightMm ? String(extracted.heightMm) : current.heightMm,
              }))
            }}
          />
          <button type="submit" className="primary-button">
            {editingModel ? 'Сохранить модель' : 'Добавить модель'}
          </button>
        </form>
        <div className="admin-list">
          {sections.flatMap((section) =>
            section.models.map((model) => (
              <div key={model.id} className="admin-list__item">
                <div>
                  <strong>{model.name}</strong>
                  <div>{section.name}</div>
                </div>
                <div className="admin-list__actions">
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => {
                      setEditingModel(model)
                      setModelForm({
                        sectionId: model.sectionId,
                        name: model.name,
                        description: model.description,
                        lengthMm: String(model.lengthMm),
                        widthMm: String(model.widthMm),
                        heightMm: String(model.heightMm),
                        weightKg: String(model.weightKg),
                        recommendedBox: model.recommendedBox,
                        modelFile: null,
                      })
                    }}
                  >
                    Редактировать
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={async () => {
                      if (!token) {
                        return
                      }
                      try {
                        await deleteModelRequest(token, model.id)
                        await refreshCatalog()
                      } catch (requestError) {
                        setError(requestError instanceof Error ? requestError.message : 'Не удалось удалить модель.')
                      }
                    }}
                  >
                    Удалить
                  </button>
                </div>
              </div>
            )),
          )}
        </div>
      </section>
    </section>
  )
}
