import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useBooks(userId) {
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchBooks = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) setError(error.message)
    else setBooks(data)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchBooks()

    // Real-time subscription
    const channel = supabase
      .channel('books-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'books',
        filter: `user_id=eq.${userId}`
      }, () => fetchBooks())
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [userId, fetchBooks])

  const addBook = async (book) => {
    const { data, error } = await supabase
      .from('books')
      .insert({ ...book, user_id: userId })
      .select()
      .single()
    if (error) throw error
    return data
  }

  const deleteBook = async (bookId) => {
    const { error } = await supabase
      .from('books')
      .delete()
      .eq('id', bookId)
      .eq('user_id', userId)
    if (error) throw error
  }

  return { books, loading, error, addBook, deleteBook, refetch: fetchBooks }
}
