import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

export function useReadingProgress(userId, bookId) {
  const [progress, setProgress] = useState(null)
  const saveTimer = useRef(null)

  useEffect(() => {
    if (!userId || !bookId) return
    supabase
      .from('reading_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('book_id', bookId)
      .maybeSingle()
      .then(({ data }) => setProgress(data))
  }, [userId, bookId])

  // Debounced save — waits 2s after last call before writing to DB
  const saveProgress = useCallback((location, percentage) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      await supabase
        .from('reading_progress')
        .upsert({
          user_id: userId,
          book_id: bookId,
          location: String(location),
          percentage: Math.round(percentage),
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,book_id' })
    }, 2000)
  }, [userId, bookId])

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current) }, [])

  return { progress, saveProgress }
}
