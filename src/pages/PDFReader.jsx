import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Document, Page, pdfjs } from 'react-pdf'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useReadingProgress } from '../hooks/useReadingProgress'

import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// Use the bundled worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url
).toString()

export default function PDFReader() {
  const { bookId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { progress, saveProgress } = useReadingProgress(user?.id, bookId)

  const [book, setBook] = useState(null)
  const [numPages, setNumPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [scale, setScale] = useState(1.2)
  const [pageInput, setPageInput] = useState('1')
  const containerRef = useRef()

  // Fetch book metadata
  useEffect(() => {
    if (!bookId) return
    supabase.from('books').select('*').eq('id', bookId).single()
      .then(({ data, error }) => {
        if (error || !data) navigate('/')
        else setBook(data)
      })
  }, [bookId, navigate])

  // Restore progress
  useEffect(() => {
    if (progress?.location) {
      const page = parseInt(progress.location)
      if (!isNaN(page) && page > 0) {
        setCurrentPage(page)
        setPageInput(String(page))
      }
    }
  }, [progress])

  function onDocumentLoad({ numPages }) {
    setNumPages(numPages)
  }

  function goToPage(p) {
    const page = Math.max(1, Math.min(numPages, p))
    setCurrentPage(page)
    setPageInput(String(page))
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    const pct = numPages ? (page / numPages) * 100 : 0
    saveProgress(page, pct)
  }

  function handlePageInput(e) {
    setPageInput(e.target.value)
  }

  function handlePageInputBlur() {
    const n = parseInt(pageInput)
    if (!isNaN(n)) goToPage(n)
    else setPageInput(String(currentPage))
  }

  if (!book) return null

  return (
    <div className="flex flex-col h-screen bg-gray-800 dark:bg-gray-950">
      {/* Top bar */}
      <div className="flex items-center gap-4 px-4 h-12 bg-gray-900 dark:bg-black border-b border-gray-700 shrink-0">
        <button
          onClick={() => navigate('/')}
          className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors"
          title="Back to library"
        >
          <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>

        <span className="text-sm font-medium text-gray-200 truncate flex-1">{book.title}</span>

        {/* Page controls */}
        <div className="flex items-center gap-2">
          <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1}
            className="p-1.5 hover:bg-gray-700 disabled:opacity-30 rounded-lg transition-colors">
            <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="flex items-center gap-1 text-sm text-gray-300">
            <input
              type="text"
              value={pageInput}
              onChange={handlePageInput}
              onBlur={handlePageInputBlur}
              onKeyDown={e => e.key === 'Enter' && handlePageInputBlur()}
              className="w-12 text-center bg-gray-700 border border-gray-600 rounded px-1 py-0.5 text-sm text-gray-200 focus:outline-none focus:border-brand-500"
            />
            <span>/ {numPages}</span>
          </div>

          <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= numPages}
            className="p-1.5 hover:bg-gray-700 disabled:opacity-30 rounded-lg transition-colors">
            <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-1.5">
          <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors">
            <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <span className="text-xs text-gray-400 w-10 text-center">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.min(3, s + 0.1))} className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors">
            <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* PDF content */}
      <div ref={containerRef} className="flex-1 overflow-auto flex justify-center py-6 px-4">
        <Document
          file={book.file_url}
          onLoadSuccess={onDocumentLoad}
          loading={<div className="flex items-center justify-center pt-24"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>}
          error={<p className="text-red-400 pt-24 text-center">Failed to load PDF.</p>}
        >
          <Page
            pageNumber={currentPage}
            scale={scale}
            renderTextLayer={true}
            renderAnnotationLayer={true}
            className="shadow-2xl"
          />
        </Document>
      </div>

      {/* Progress bar at bottom */}
      <div className="h-1 bg-gray-700 shrink-0">
        <div className="h-full bg-brand-500 transition-all" style={{ width: `${numPages ? (currentPage / numPages) * 100 : 0}%` }} />
      </div>
    </div>
  )
}
