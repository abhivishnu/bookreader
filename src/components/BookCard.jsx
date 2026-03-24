import { useNavigate } from 'react-router-dom'

const FORMAT_COLORS = {
  pdf: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  epub: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
}

function StarRating({ rating, onRate }) {
  return (
    <div className="flex gap-0.5 mt-1.5" onClick={e => e.stopPropagation()}>
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          onClick={() => onRate(star === rating ? null : star)}
          className="leading-none"
          title={star === rating ? 'Clear rating' : `Rate ${star}`}
        >
          <svg className={`w-3.5 h-3.5 ${star <= (rating || 0) ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'} hover:text-amber-400 transition-colors`} fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      ))}
    </div>
  )
}

export default function BookCard({ book, onDelete, onRate }) {
  const navigate = useNavigate()

  function openBook() {
    const path = book.format === 'pdf' ? `/read/pdf/${book.id}` : `/read/epub/${book.id}`
    navigate(path)
  }

  return (
    <div className="group relative bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden hover:shadow-md hover:border-brand-500/50 transition-all duration-200 cursor-pointer"
      onClick={openBook}
    >
      {/* Cover */}
      <div className="aspect-[2/3] bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center">
        {book.cover_url
          ? <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
          : <svg className="w-12 h-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
        }

        {/* Progress bar */}
        {book.last_percentage > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700">
            <div className="h-full bg-brand-500 transition-all" style={{ width: `${book.last_percentage}%` }} />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-1">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 leading-tight">{book.title}</h3>
          <span className={`shrink-0 text-xs font-medium px-1.5 py-0.5 rounded uppercase ${FORMAT_COLORS[book.format] || ''}`}>
            {book.format}
          </span>
        </div>
        {book.author && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{book.author}</p>
        )}
        {book.last_percentage > 0 && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{book.last_percentage}% read</p>
        )}
        <StarRating rating={book.rating} onRate={r => onRate(book.id, r)} />
      </div>

      {/* Delete button */}
      <button
        onClick={e => { e.stopPropagation(); onDelete(book) }}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center bg-black/50 hover:bg-red-600 rounded-lg transition-all"
        title="Delete book"
      >
        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  )
}
