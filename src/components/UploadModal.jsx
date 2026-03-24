import { useState, useRef, useEffect } from 'react'
import { pdfjs } from 'react-pdf'
import { uploadToR2, uploadCoverToR2 } from '../lib/r2'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url
).toString()

const ACCEPTED = '.pdf,.epub'
const MAX_SIZE_MB = 200

async function extractEpubCover(file) {
  try {
    const { default: Epub } = await import('epubjs')
    const book = Epub(await file.arrayBuffer())
    await book.ready
    const coverUrl = await book.coverUrl()
    book.destroy()
    if (!coverUrl) return null
    const res = await fetch(coverUrl)
    return await res.blob()
  } catch { return null }
}

async function extractPdfCover(file) {
  try {
    const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise
    const page = await pdf.getPage(1)
    const viewport = page.getViewport({ scale: 0.6 })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
    return await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85))
  } catch { return null }
}

export default function UploadModal({ userId, onAdd, onClose }) {
  const [file, setFile] = useState(null)
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [coverBlob, setCoverBlob] = useState(null)
  const [coverPreview, setCoverPreview] = useState(null)
  const [extracting, setExtracting] = useState(false)
  const inputRef = useRef()

  useEffect(() => {
    return () => { if (coverPreview) URL.revokeObjectURL(coverPreview) }
  }, [coverPreview])

  async function handleFileChange(e) {
    const f = e.target.files[0]
    if (!f) return
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File too large (max ${MAX_SIZE_MB} MB)`)
      return
    }
    setError('')
    setFile(f)
    const name = f.name.replace(/\.(pdf|epub)$/i, '').replace(/[_-]/g, ' ')
    setTitle(name)

    setCoverBlob(null)
    if (coverPreview) URL.revokeObjectURL(coverPreview)
    setCoverPreview(null)
    setExtracting(true)
    const lname = f.name.toLowerCase()
    const isEpub = lname.endsWith('.epub') || lname.endsWith('.epu') || f.type === 'application/epub+zip'
    const blob = isEpub ? await extractEpubCover(f) : await extractPdfCover(f)
    setExtracting(false)
    if (blob) {
      setCoverBlob(blob)
      setCoverPreview(URL.createObjectURL(blob))
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) handleFileChange({ target: { files: [f] } })
  }

  async function handleUpload() {
    if (!file || !title.trim()) { setError('Please select a file and enter a title.'); return }
    setError('')
    setUploading(true)
    try {
      const fileUrl = await uploadToR2(file, userId, setProgress)
      const lname = file.name.toLowerCase()
      const isEpub = lname.endsWith('.epub') || lname.endsWith('.epu') || file.type === 'application/epub+zip'
      const format = isEpub ? 'epub' : 'pdf'

      let cover_url = null
      if (coverBlob) {
        try { cover_url = await uploadCoverToR2(coverBlob, userId) } catch { /* skip */ }
      }

      await onAdd({ title: title.trim(), author: author.trim() || null, file_url: fileUrl, format, cover_url })
      onClose()
    } catch (err) {
      setError(err.message)
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Add a book</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-6 text-center cursor-pointer hover:border-brand-500 transition-colors mb-4"
        >
          <input ref={inputRef} type="file" accept={ACCEPTED} className="hidden" onChange={handleFileChange} />
          {file ? (
            <div className="flex items-center gap-4">
              <div className="shrink-0 w-16 h-24 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                {extracting ? (
                  <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                ) : coverPreview ? (
                  <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                )}
              </div>
              <div className="text-left min-w-0">
                <p className="font-medium text-gray-800 dark:text-gray-200 truncate">{file.name}</p>
                <p className="text-sm text-gray-400 mt-1">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                {!extracting && !coverPreview && <p className="text-xs text-gray-400 mt-0.5">No cover found</p>}
              </div>
            </div>
          ) : (
            <div>
              <svg className="w-10 h-10 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm text-gray-500 dark:text-gray-400">Drop a PDF or EPUB here, or <span className="text-brand-500">browse</span></p>
              <p className="text-xs text-gray-400 mt-1">Max {MAX_SIZE_MB} MB</p>
            </div>
          )}
        </div>

        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              placeholder="Book title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Author <span className="text-gray-400">(optional)</span></label>
            <input
              type="text"
              value={author}
              onChange={e => setAuthor(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              placeholder="Author name"
            />
          </div>
        </div>

        {/* Upload progress */}
        {uploading && (
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
              <span>Uploading…</span><span>{progress}%</span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-brand-500 transition-all duration-200" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

        <div className="flex gap-3">
          <button onClick={onClose} disabled={uploading} className="flex-1 py-2 px-4 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleUpload} disabled={uploading || !file || extracting} className="flex-1 py-2 px-4 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-lg transition-colors text-sm font-medium">
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  )
}
