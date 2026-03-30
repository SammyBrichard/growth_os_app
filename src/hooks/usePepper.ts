import { useState, useEffect, useCallback } from 'react'
import supabase from '../services/supabase'
import type { Employee, Account, Sender, ActivityMessage } from '../types/index'

interface UsePepperParams {
  accountId: string | null
  userDetailsId: string | null
  selectedEmployee: Employee
}

export interface PepperUserDetails {
  firstname: string
  email: string
  signup_complete: boolean
  active_skill: any | null
  queued_mobilisations: any[]
}

export default function usePepper({ accountId, userDetailsId, selectedEmployee }: UsePepperParams) {
  const [account, setAccount] = useState<Account | null>(null)
  const [userDetails, setUserDetails] = useState<PepperUserDetails | null>(null)
  const [activityLog, setActivityLog] = useState<ActivityMessage[]>([])
  const [senders, setSenders] = useState<Sender[]>([])

  const fetchSenders = useCallback(async () => {
    if (!accountId) return
    const { data } = await supabase.from('senders').select('*').eq('account_id', accountId)
    setSenders((data ?? []) as Sender[])
  }, [accountId])

  useEffect(() => {
    if (selectedEmployee.name !== 'Pepper' || !accountId) return

    supabase.from('account').select('*').eq('id', accountId).single()
      .then(({ data }) => setAccount(data as Account | null))

    fetchSenders()
  }, [selectedEmployee, accountId, fetchSenders])

  useEffect(() => {
    if (selectedEmployee.name !== 'Pepper' || !userDetailsId) return

    supabase.from('user_details')
      .select('firstname, email, signup_complete, active_skill, queued_mobilisations')
      .eq('id', userDetailsId).single()
      .then(({ data }) => setUserDetails(data as PepperUserDetails | null))

    supabase.from('messages')
      .select('id, message_body, is_agent, is_status, created_at')
      .eq('user_details_id', userDetailsId)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => setActivityLog((data ?? []) as ActivityMessage[]))
  }, [selectedEmployee, userDetailsId])

  const updateUserFirstname = useCallback(async (firstname: string) => {
    if (!userDetailsId) return
    const { error } = await supabase.from('user_details').update({ firstname }).eq('id', userDetailsId)
    if (!error) {
      setUserDetails(prev => prev ? { ...prev, firstname } : prev)
    }
    return error
  }, [userDetailsId])

  const updateSender = useCallback(async (senderId: string, updates: Partial<Sender>) => {
    const { error } = await supabase.from('senders').update(updates).eq('id', senderId)
    if (!error) {
      setSenders(prev => prev.map(s => s.id === senderId ? { ...s, ...updates } : s))
    }
    return error
  }, [])

  return { account, userDetails, activityLog, senders, updateUserFirstname, updateSender, refreshSenders: fetchSenders }
}
