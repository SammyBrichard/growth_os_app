import { useState, useEffect } from 'react'
import supabase from '../services/supabase'
import type { User } from '@supabase/supabase-js'

/**
 * Manages authentication state via Supabase.
 * Returns `undefined` while loading, `null` when not logged in, or the User object.
 */
export default function useAuth() {
  const [user, setUser] = useState<User | null | undefined>(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  return { user }
}
