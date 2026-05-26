import { Fragment } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthProvider'
import { useCatalog } from './CatalogProvider'
import { stations } from '../lib/stations'

export function ShellLayout() {
  const { user, signOut } = useAuth()
  const { sections } = useCatalog()
  const navigate = useNavigate()
  const location = useLocation()
  const activeStationId = stations.find((station) => location.pathname.includes(`/catalog/stations/${station.id}`))?.id

  return (
    <div className="shell">
      <aside className="sidebar">
        <Link to="/catalog" className="brand brand--home">
          <strong>Просмотр 3D-моделей</strong>
        </Link>

        <nav className="sidebar__nav" aria-label="Навигация">
          <NavLink
            to="/catalog"
            end
            className={({ isActive }) => `nav-card nav-card--home${isActive ? ' nav-card--active' : ''}`}
          >
            <span className="nav-card__title">Главная страница</span>
          </NavLink>
          {stations.map((station) => (
            <Fragment key={station.id}>
              <NavLink
                to={`/catalog/stations/${station.id}`}
                className={({ isActive }) => `nav-card${isActive ? ' nav-card--active' : ''}`}
              >
                <span className="nav-card__title">{station.name}</span>
                <span className="nav-card__meta">
                  {station.status === 'ready' ? 'Каталог доступен' : 'В доработке'}
                </span>
              </NavLink>
              {activeStationId === station.id && station.id === '1rl131r'
                ? sections.map((section) => (
                    <NavLink
                      key={section.id}
                      to={`/catalog/stations/1rl131r/sections/${section.id}`}
                      className={({ isActive }) => `nav-card nav-card--sub${isActive ? ' nav-card--active' : ''}`}
                    >
                      <span className="nav-card__title">{section.name}</span>
                      <span className="nav-card__meta">{section.models.length} моделей</span>
                    </NavLink>
                  ))
                : null}
            </Fragment>
          ))}
          {user?.role === 'admin' ? (
            <NavLink
              to="/admin"
              className={({ isActive }) => `nav-card${isActive ? ' nav-card--active' : ''}`}
            >
              <span className="nav-card__title">Админ-панель</span>
              <span className="nav-card__meta">Пользователи, разделы, модели</span>
            </NavLink>
          ) : null}
        </nav>

        <div className="sidebar__footer">
          <div>
            <strong>{user?.name}</strong>
          </div>
          <button
            type="button"
            className="ghost-button"
            onClick={() => {
              signOut()
              navigate('/')
            }}
          >
            Выйти
          </button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
