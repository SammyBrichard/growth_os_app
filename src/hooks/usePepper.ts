import { useState, useEffect } from 'react'
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

  useEffect(() => {
    if (selectedEmployee.name !== 'Pepper' || !accountId) return

    // Fetch account
    supabase.from('account').select('*').eq('id', accountId).single()
      .then(({ data }) => setAccount(data as Account | null))

    // Fetch senders
    supabase.from('senders').select('*').eq('account_id', accountId)
      .then(({ data }) => setSenders((data ?? []) as Sender[]))

  }, [selectedEmployee, accountId])

  useEffect(() => {
    if (selectedEmployee.name !== 'Pepper' || !userDetailsId) return

    // Fetch user details
    supabase.from('user_details')
      .select('firstname, email, signup_complete, active_skill, queued_mobilisations')
      .eq('id', userDetailsId).single()
      .then(({ data }) => setUserDetails(data as PepperUserDetails | null))

    // Fetch recent activity (50 messages)
    supabase.from('messages')
      .select('id, message_body, is_agent, is_status, created_at')
      .eq('user_details_id', userDetailsId)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => setActivityLog((data ?? []) as ActivityMessage[]))

  }, [selectedEmployee, userDetailsId])

  return { account, userDetails, activityLog, senders }
}
