import { useState, useEffect, useCallback } from 'react'
import supabase from '../services/supabase'
import type { Employee, ITP, Account, Customer, ItpStats } from '../types/index'

const API_URL = import.meta.env.VITE_API_URL

interface UseWarrenParams {
  accountId: string | null
  userDetailsId: string | null
  selectedEmployee: Employee
  firstname?: string
}

export default function useWarren({ accountId, selectedEmployee, firstname }: UseWarrenParams) {
  const [itps, setItps] = useState<ITP[]>([])
  const [itpStats, setItpStats] = useState<Record<string, ItpStats>>({})
  const [account, setAccount] = useState<Account | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [warrenSummary, setWarrenSummary] = useState<string | null>(null)
  const [warrenSummaryLoading, setWarrenSummaryLoading] = useState(false)

  useEffect(() => {
    if (selectedEmployee.name !== 'Warren' || !accountId || warrenSummary || warrenSummaryLoading) return
    setWarrenSummaryLoading(true)
    fetch(`${API_URL}/api/messages/warren-summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account_id: accountId, firstname }),
    })
      .then(r => r.json())
      .then(data => setWarrenSummary(data.message ?? null))
      .catch(() => {})
      .finally(() => setWarrenSummaryLoading(false))
  }, [selectedEmployee, accountId])

  useEffect(() => {
    if (selectedEmployee.name !== 'Warren' || !accountId) return

    // Fetch full ITPs
    supabase.from('itp').select('*').eq('account_id', accountId).order('created_at', { ascending: false })
      .then(({ data }) => {
        const itpList = (data ?? []) as ITP[]
        setItps(itpList)

        if (itpList.length === 0) { setItpStats({}); return }

        const itpIds = itpList.map(i => i.id)

        // Batch-fetch leads and campaigns in parallel
        Promise.all([
          supabase.from('leads').select('id, itp_id, score, approved, rejected').in('itp_id', itpIds),
          supabase.from('campaigns').select('id, itp_id').eq('account_id', accountId),
        ]).then(([leadsRes, campaignsRes]) => {
          const leads = (leadsRes.data ?? []) as { id: string; itp_id: string; score: number; approved?: boolean; rejected?: boolean }[]
          const campaigns = (campaignsRes.data ?? []) as { id: string; itp_id: string | null }[]

          const stats: Record<string, ItpStats> = {}
          for (const itp of itpList) {
            const itpLeads = leads.filter(l => l.itp_id === itp.id)
            const approved = itpLeads.filter(l => l.approved).length
            const rejected = itpLeads.filter(l => l.rejected).length
            const scores = itpLeads.map(l => l.score)
            const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
            const campaignCount = campaigns.filter(c => c.itp_id === itp.id).length

            stats[itp.id] = {
              itpId: itp.id,
              leadCount: itpLeads.length,
              avgScore,
              approvedCount: approved,
              rejectedCount: rejected,
              campaignCount,
            }
          }
          setItpStats(stats)
        })
      })

    // Fetch account
    supabase.from('account').select('*').eq('id', accountId).single()
      .then(({ data }) => setAccount(data as Account | null))

    // Fetch customers
    supabase.from('customers').select('*').eq('account_id', accountId)
      .then(({ data }) => setCustomers((data ?? []) as Customer[]))

  }, [selectedEmployee, accountId])

  const updateAccount = useCallback(async (updates: Partial<Account>) => {
    if (!accountId) return
    const { error } = await supabase.from('account').update(updates).eq('id', accountId)
    if (!error) {
      setAccount(prev => prev ? { ...prev, ...updates } : prev)
    }
    return error
  }, [accountId])

  const updateItp = useCallback(async (itpId: string, updates: Partial<ITP>) => {
    const { error } = await supabase.from('itp').update(updates).eq('id', itpId)
    if (!error) {
      setItps(prev => prev.map(i => i.id === itpId ? { ...i, ...updates } : i))
    }
    return error
  }, [])

  return { itps, itpStats, account, customers, warrenSummary, updateAccount, updateItp }
}
