import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { clearToken, loginRequest, meRequest, readToken, writeToken } from '../lib/api'
import type { AuthUser, Subdivision } from '../types/app'

type AuthContextValue = {
  token: string | null
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  signIn: (login: string, subdivision: Subdivision, password: string) => Promise<void>
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(readToken())
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const storedToken = readToken()

    if (!storedToken) {
      setIsLoading(false)
      return
    }

    meRequest(storedToken)
      .then((payload) => {
        setToken(storedToken)
        setUser(payload.user)
      })
      .catch(() => {
        clearToken()
        setToken(null)
        setUser(null)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  async function signIn(login: string, subdivision: Subdivision, password: string) {
    const payload = await loginRequest(login, subdivision, password)
    writeToken(payload.token)
    setToken(payload.token)
    setUser(payload.user)
  }

  function signOut() {
    clearToken()
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated: Boolean(token && user),
        isLoading,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return context
}
