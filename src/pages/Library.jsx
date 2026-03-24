import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useBooks } from '../hooks/useBooks'
import Navbar from '../components/Navbar'
import BookCard from '../components/BookCard'
import UploadModal from '../components/UploadModal'

export default function Library() {
  const { user } = useAuth()
  const { books, loading, addBook, deleteBook, updateRating } = useBooks(user?.id)
  const [showUpload, setShowUpload] = useState(false)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('added')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const filtered = books
    .filter(b =>
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      (b.author || '').toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title)
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0)
      if (sortBy === 'opened') {
        if (!a.last_read_at && !b.last_read_at) return 0
        if (!a.last_read_at) return 1
        if (!b.last_read_at) return -1
        return new Date(b.last_read_at) - new Date(a.last_read_at)
      }
      return new Date(b.created_at) - new Date(a.created_at)
    })

  async function handleDelete() {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await deleteBook(confirmDelete.id)
    } finally {
      setDeleting(false)
      setConfirmDelete(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar user={user} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Library</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{books.length} book{books.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="sm:ml-auto flex gap-3">
            {/* Sort */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="added">Recently added</option>
              <option value="opened">Last opened</option>
              <option value="title">Title A–Z</option>
              <option value="rating">Rating</option>
            </select>
            {/* Search */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search books…"
                className="pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent w-56"
              />
            </div>
            {/* Upload button */}
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add book
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-24">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            {search
              ? <p className="text-gray-500 dark:text-gray-400">No books match "{search}"</p>
              : <div>
                  <svg className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">Your library is empty</p>
                  <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Upload a PDF or EPUB to get started</p>
                  <button
                    onClick={() => setShowUpload(true)}
                    className="mt-4 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Add your first book
                  </button>
                </div>
            }
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filtered.map(book => (
              <BookCard key={book.id} book={book} onDelete={setConfirmDelete} onRate={updateRating} />
            ))}
          </div>
        )}
      </main>

      {/* Upload modal */}
      {showUpload && (
        <UploadModal userId={user.id} onAdd={addBook} onClose={() => setShowUpload(false)} />
      )}

      {/* Delete confirm dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Delete book?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              "<span className="font-medium text-gray-700 dark:text-gray-300">{confirmDelete.title}</span>" will be removed from your library. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
