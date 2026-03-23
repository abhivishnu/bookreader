import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ePub from 'epubjs'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useReadingProgress } from '../hooks/useReadingProgress'

export default function EPUBReader() {
  const { bookId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { progress, saveProgress } = useReadingProgress(user?.id, bookId)

  const [book, setBook] = useState(null)
  const [rendition, setRendition] = useState(null)
  const [fontSize, setFontSize] = useState(100) // percent
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark')
  const [toc, setToc] = useState([])
  const [showToc, setShowToc] = useState(false)
  const viewerRef = useRef()
  const bookRef = useRef()

  // Fetch book metadata
  useEffect(() => {
    if (!bookId) return
    supabase.from('books').select('*').eq('id', bookId).single()
      .then(({ data, error }) => {
        if (error || !data) navigate('/')
        else setBook(data)
      })
  }, [bookId, navigate])

  // Initialize epub.js
  useEffect(() => {
    if (!book || !viewerRef.current) return

    const epubBook = ePub(book.file_url)
    bookRef.current = epubBook

    const rend = epubBook.renderTo(viewerRef.current, {
      width: '100%',
      height: '100%',
      spread: 'none'
    })
    setRendition(rend)

    // Apply theme
    rend.themes.register('light', {
      body: { background: '#ffffff', color: '#1a1a1a', fontFamily: 'Georgia, serif', lineHeight: '1.7' }
    })
    rend.themes.register('dark', {
      body: { background: '#1a1a2e', color: '#e0e0e0', fontFamily: 'Georgia, serif', lineHeight: '1.7' }
    })
    rend.themes.select(darkMode ? 'dark' : 'light')

    // Load TOC
    epubBook.loaded.navigation.then(nav => {
      setToc(nav.toc || [])
    })

    // Restore progress
    if (progress?.location) {
      rend.display(progress.location)
    } else {
      rend.display()
    }

    // Track location changes
    rend.on('locationChanged', (loc) => {
      const pct = epubBook.locations.percentageFromCfi(loc.start.cfi) * 100
      saveProgress(loc.start.cfi, pct)
    })

    return () => {
      epubBook.destroy()
    }
  }, [book]) // eslint-disable-line react-hooks/exhaustive-deps

  // Apply font size
  useEffect(() => {
    rendition?.themes.fontSize(`${fontSize}%`)
  }, [fontSize, rendition])

  // Apply dark/light
  useEffect(() => {
    rendition?.themes.select(darkMode ? 'dark' : 'light')
    localStorage.setItem('theme', darkMode ? 'dark' : 'light')
  }, [darkMode, rendition])

  function prev() { rendition?.prev() }
  function next() { rendition?.next() }

  // Keyboard navigation
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!book) return null

  return (
    <div className={`flex flex-col h-screen ${darkMode ? 'bg-gray-950' : 'bg-gray-100'}`}>
      {/* Top bar */}
      <div className={`flex items-center gap-3 px-4 h-12 shrink-0 border-b ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
        <button onClick={() => navigate('/')} className={`p-1.5 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>

        <span className={`text-sm font-medium truncate flex-1 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{book.title}</span>

        {/* TOC toggle */}
        {toc.length > 0 && (
          <button onClick={() => setShowToc(s => !s)} className={`p-1.5 rounded-lg transition-colors text-xs font-medium ${darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`} title="Table of contents">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
          </button>
        )}

        {/* Font size */}
        <div className="flex items-center gap-1">
          <button onClick={() => setFontSize(f => Math.max(70, f - 10))} className={`px-2 py-1 rounded text-sm ${darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}>A-</button>
          <button onClick={() => setFontSize(f => Math.min(200, f + 10))} className={`px-2 py-1 rounded text-sm ${darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}>A+</button>
        </div>

        {/* Dark/light toggle */}
        <button onClick={() => setDarkMode(d => !d)} className={`p-1.5 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}>
          {darkMode
            ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
          }
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* TOC sidebar */}
        {showToc && (
          <div className={`w-64 shrink-0 overflow-y-auto border-r ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className={`p-3 text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Contents</div>
            {toc.map((item, i) => (
              <button
                key={i}
                onClick={() => { rendition?.display(item.href); setShowToc(false) }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-brand-500/10 transition-colors ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}
              >
                {item.label.trim()}
              </button>
            ))}
          </div>
        )}

        {/* Reader area with prev/next overlay */}
        <div className="flex-1 relative overflow-hidden">
          {/* Prev click zone */}
          <button onClick={prev} className="absolute left-0 top-0 bottom-0 w-16 z-10 flex items-center justify-start pl-2 opacity-0 hover:opacity-100 transition-opacity">
            <div className={`p-2 rounded-full shadow ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <svg className={`w-5 h-5 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </div>
          </button>

          {/* EPUB viewer */}
          <div ref={viewerRef} className="w-full h-full max-w-3xl mx-auto" />

          {/* Next click zone */}
          <button onClick={next} className="absolute right-0 top-0 bottom-0 w-16 z-10 flex items-center justify-end pr-2 opacity-0 hover:opacity-100 transition-opacity">
            <div className={`p-2 rounded-full shadow ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <svg className={`w-5 h-5 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
