import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../components/AuthProvider'
import type { Subdivision } from '../types/app'

export function LoginPage() {
  const { isAuthenticated, signIn, isLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [login, setLogin] = useState('')
  const [subdivision, setSubdivision] = useState<Subdivision>('ogk')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  if (isLoading) {
    return <div className="route-loader">Проверка сессии...</div>
  }

  if (isAuthenticated) {
    return <Navigate to="/catalog" replace />
  }

  const destination = location.state?.from ?? '/catalog'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      await signIn(login, subdivision, password)
      setError('')
      navigate(destination, { replace: true })
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Не удалось войти.')
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-card__intro">
          <img src="/customer/landing-photo.jpeg" alt="Радиолокационная станция" className="login-card__photo" />
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            <span>Логин</span>
            <input
              autoComplete="username"
              value={login}
              onChange={(event) => setLogin(event.target.value)}
              placeholder="username"
            />
          </label>
          <label>
            <span>Подразделение</span>
            <select value={subdivision} onChange={(event) => setSubdivision(event.target.value as Subdivision)}>
              <option value="ogk">ogk</option>
              <option value="oyit">oyit</option>
            </select>
          </label>
          <label>
            <span>Пароль</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="*******"
            />
          </label>
          {error ? <div className="form-error">{error}</div> : null}
          <button type="submit" className="primary-button">
            Войти
          </button>
        </form>
      </div>
    </div>
  )
}
