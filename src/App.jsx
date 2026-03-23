import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Auth from './pages/Auth'
import Library from './pages/Library'
import PDFReader from './pages/PDFReader'
import EPUBReader from './pages/EPUBReader'

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen bg-white dark:bg-gray-950"><Spinner /></div>
  return user ? children : <Navigate to="/auth" replace />
}

function Spinner() {
  return (
    <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/" element={<RequireAuth><Library /></RequireAuth>} />
        <Route path="/read/pdf/:bookId" element={<RequireAuth><PDFReader /></RequireAuth>} />
        <Route path="/read/epub/:bookId" element={<RequireAuth><EPUBReader /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
