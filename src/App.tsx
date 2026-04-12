import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import { Layout } from '@/components/Layout'
import { LoginPage } from '@/pages/LoginPage'
import { AuthCallback } from '@/pages/AuthCallback'
import { GalleryPage } from '@/pages/GalleryPage'
import { HistoryPage } from '@/pages/HistoryPage'
import { GuidePage } from '@/pages/GuidePage'
import { ShotTypesPage } from '@/pages/ShotTypesPage'
import { UsersPage } from '@/pages/UsersPage'
import { GeneratePage } from '@/pages/GeneratePage'

function ProtectedRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return (
    <Layout>
      <Routes>
        <Route index element={<GalleryPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="guide" element={<GuidePage />} />
        <Route path="shot-types" element={<ShotTypesPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="generate/:shotTypeId" element={<GeneratePage />} />
      </Routes>
    </Layout>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/*" element={<ProtectedRoutes />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
