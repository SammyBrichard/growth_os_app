import { useState, useRef, useCallback } from 'react'
import supabase from '../services/supabase'
import type { User } from '@supabase/supabase-js'
import type { Message } from '../types/index'

const API_URL = import.meta.env.VITE_API_URL

interface UserDetailsData {
  id: string
  account_id: string | null
  signup_complete: boolean
  firstname: string | null
  active_mobilisation: string | null
  active_step_id: string | null
}

interface UseUserDetailsParams {
  user: User | null | undefined
}

/**
 * Manages user details state, message loading, and real-time subscriptions.
 *
 * Does NOT run initialise automatically — the orchestrator (App.tsx) is responsible
 * for calling initialise() and wiring up mobilisation callbacks once both hooks are ready.
 */
export default function useUserDetails({ user }: UseUserDetailsParams) {
  const [userDetailsId, setUserDetailsId] = useState<string | null>(null)
  const [accountId, setAccountId] = useState<string | null>(null)
  const [userFirstName, setUserFirstName] = useState('')
  const userFirstNameRef = useRef('')
  const initialiseRan = useRef(false)

  /**
   * Fetch user_details row from Supabase.
   * Returns the row data so the caller can decide what to do with it (e.g. start mobilisation).
   */
  const initialise = useCallback(async (): Promise<UserDetailsData | null> => {
    if (!user) return null

    const { data: userDetails, error } = await supabase
      .from('user_details')
      .select('id, account_id, signup_complete, firstname, active_mobilisation, active_step_id')
      .eq('auth_id', user.id)
      .single()

    if (error || !userDetails) return null

    setUserDetailsId(userDetails.id)
    setAccountId(userDetails.account_id)
    userFirstNameRef.current = userDetails.firstname ?? ''
    setUserFirstName(userDetails.firstname ?? '')

    return userDetails as UserDetailsData
  }, [user])

  /** Load all messages for a given user_details id. */
  const loadMessages = useCallback(async (detailsId: string): Promise<Message[]> => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('user_details_id', detailsId)
      .order('created_at', { ascending: true })

    if (!error && data) return data as Message[]
    return []
  }, [])

  /** Save a single message to the messages table. Triggers message processor for user messages. */
  const saveMessage = useCallback(async (message_body: string, is_agent: boolean): Promise<Message | null> => {
    if (!userDetailsId) return null
    const { data } = await supabase
      .from('messages')
      .insert({ message_body, is_agent, user_details_id: userDetailsId })
      .select()
      .single()

    // Trigger message processor directly for user messages (replaces Supabase webhook)
    if (!is_agent && data) {
      fetch(`${API_URL}/api/messages/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ record: { user_details_id: userDetailsId, is_agent: false }, type: 'INSERT' }),
      }).catch(err => console.error('[saveMessage] processor trigger error:', err))
    }

    return data as Message | null
  }, [userDetailsId])

  /**
   * Subscribe to real-time broadcasts and postgres_changes for a user_details row.
   * The caller provides callbacks so the hook remains decoupled from message/mobilisation state.
   */
  const subscribeToMessages = useCallback((
    detailsId: string,
    callbacks: {
      setIsTyping: (v: boolean) => void
      setMessages: React.Dispatch<React.SetStateAction<Message[]>>
      startMobilisation: (name: string) => Promise<void>
    },
  ) => {
    const channel = supabase
      .channel(`user:${detailsId}`)
      .on('broadcast', { event: 'agent_typing' }, ({ payload }) => {
        callbacks.setIsTyping(payload.typing)
      })
      .on('broadcast', { event: 'start_mobilisation' }, ({ payload }) => {
        callbacks.startMobilisation(payload.mobilisation)
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `user_details_id=eq.${detailsId}`,
      }, (payload: any) => {
        callbacks.setIsTyping(false)
        callbacks.setMessages((prev: Message[]) => {
          if (prev.some(m => m.id === payload.new.id)) return prev
          const tempIndex = prev.findIndex(
            m => !m.id && m.message_body === payload.new.message_body && m.is_agent === payload.new.is_agent,
          )
          if (tempIndex !== -1) {
            const next = [...prev]
            next[tempIndex] = payload.new
            return next
          }
          return [...prev, payload.new]
        })
      })
      .subscribe()

    return channel
  }, [])

  return {
    userDetailsId,
    accountId,
    userFirstName,
    userFirstNameRef,
    initialiseRan,
    initialise,
    loadMessages,
    saveMessage,
    subscribeToMessages,
  }
}
