import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ShellLayout } from './components/ShellLayout'

const LoginPage = lazy(() =>
  import('./pages/LoginPage').then((module) => ({ default: module.LoginPage })),
)
const CatalogPage = lazy(() =>
  import('./pages/CatalogPage').then((module) => ({ default: module.CatalogPage })),
)
const StationPage = lazy(() =>
  import('./pages/StationPage').then((module) => ({ default: module.StationPage })),
)
const SectionPage = lazy(() =>
  import('./pages/SectionPage').then((module) => ({ default: module.SectionPage })),
)
const ModelPage = lazy(() =>
  import('./pages/ModelPage').then((module) => ({ default: module.ModelPage })),
)
const AdminPage = lazy(() =>
  import('./pages/AdminPage').then((module) => ({ default: module.AdminPage })),
)

function App() {
  return (
    <Suspense fallback={<div className="route-loader">Загрузка интерфейса...</div>}>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route
          path="/catalog"
          element={
            <ProtectedRoute>
              <ShellLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<CatalogPage />} />
          <Route path="stations/:stationId" element={<StationPage />} />
          <Route path="stations/:stationId/sections/:sectionId" element={<SectionPage />} />
          <Route path="stations/:stationId/models/:modelId" element={<ModelPage />} />
        </Route>
        <Route
          path="/admin"
          element={
            <ProtectedRoute role="admin">
              <ShellLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default App
