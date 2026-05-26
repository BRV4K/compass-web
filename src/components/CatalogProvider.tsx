import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { getCatalogRequest } from '../lib/api'
import { useAuth } from './AuthProvider'
import type { CatalogSection } from '../types/app'

type CatalogContextValue = {
  sections: CatalogSection[]
  isLoading: boolean
  refreshCatalog: () => Promise<void>
}

const CatalogContext = createContext<CatalogContextValue | null>(null)

export function CatalogProvider({ children }: { children: ReactNode }) {
  const { token, isAuthenticated } = useAuth()
  const [sections, setSections] = useState<CatalogSection[]>([])
  const [isLoading, setIsLoading] = useState(false)

  async function refreshCatalog() {
    if (!token) {
      setSections([])
      return
    }

    setIsLoading(true)
    try {
      const payload = await getCatalogRequest(token)
      setSections(payload.sections)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      void refreshCatalog()
    } else {
      setSections([])
    }
  }, [isAuthenticated, token])

  return (
    <CatalogContext.Provider value={{ sections, isLoading, refreshCatalog }}>
      {children}
    </CatalogContext.Provider>
  )
}

export function useCatalog() {
  const context = useContext(CatalogContext)

  if (!context) {
    throw new Error('useCatalog must be used inside CatalogProvider')
  }

  return context
}
