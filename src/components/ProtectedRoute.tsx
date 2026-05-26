import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthProvider'
import type { UserRole } from '../types/app'

export function ProtectedRoute({
  children,
  role,
}: {
  children: ReactNode
  role?: UserRole
}) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <div className="route-loader">Проверка доступа...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />
  }

  if (role && user?.role !== role) {
    return <Navigate to="/catalog" replace />
  }

  return <>{children}</>
}
