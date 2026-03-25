import { useState, useEffect, useCallback } from 'react'
import supabase from '../services/supabase'
import type { Employee, Lead, ITP } from '../types/index'

const API_URL = import.meta.env.VITE_API_URL

interface UseBelfortParams {
  accountId: string | null
  userDetailsId: string | null
  selectedEmployee: Employee
}

/**
 * Manages the Belfort (Lead Generation Expert) tab:
 * ITP selection, lead list, lead approval/rejection, and queue-checking.
 */
export default function useBelfort({ accountId, userDetailsId, selectedEmployee }: UseBelfortParams) {
  const [belfortItps, setBelfortItps] = useState<Pick<ITP, 'id' | 'name'>[]>([])
  const [belfortSelectedItpId, setBelfortSelectedItpId] = useState<string | null>(null)
  const [belfortLeads, setBelfortLeads] = useState<Lead[]>([])
  const [belfortSubTab, setBelfortSubTab] = useState<'needs_approval' | 'approved'>('needs_approval')
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null)

  // Load ITPs when Belfort is selected
  useEffect(() => {
    if (selectedEmployee.name === 'Belfort' && accountId) {
      supabase.from('itp').select('id, name').eq('account_id', accountId).order('created_at', { ascending: false })
        .then(({ data }) => {
          const itps = (data ?? []) as Pick<ITP, 'id' | 'name'>[]
          setBelfortItps(itps)
          if (itps.length > 0) setBelfortSelectedItpId(itps[0].id)
        })
    }
  }, [selectedEmployee, accountId])

  // Load leads when selected ITP changes
  useEffect(() => {
    if (!belfortSelectedItpId) { setBelfortLeads([]); return }
    supabase.from('leads').select('id, title, link, score, score_reason, approved, rejected')
      .eq('itp', belfortSelectedItpId)
      .gte('score', 70)
      .order('score', { ascending: false })
      .then(({ data }) => setBelfortLeads((data ?? []) as Lead[]))
  }, [belfortSelectedItpId])

  /**
   * After all leads for an ITP have been approved/rejected, queue
   * the appropriate follow-up mobilisation.
   */
  const checkAndQueueLeadMobilisation = useCallback(async (itpId: string | null) => {
    if (!itpId || !userDetailsId) return
    const { data: leads } = await supabase
      .from('leads')
      .select('id, approved, rejected')
      .eq('itp', itpId)
      .gte('score', 70)
    const approved = (leads ?? []).filter((l: any) => l.approved).length
    const needsApproval = (leads ?? []).filter((l: any) => !l.approved && !l.rejected).length
    console.log('[queue] checkAndQueue: approved=', approved, 'needsApproval=', needsApproval)
    if (needsApproval === 0) {
      const mobilisationToQueue = approved >= 10 ? 'ten_approved_leads_found' : 'need_ten_more_leads'
      const { data: ud, error } = await supabase.from('user_details').select('queued_mobilisations').eq('id', userDetailsId).single()
      console.log('[queue] fetched user_details:', ud, error)
      const queue = ud?.queued_mobilisations ?? []
      if (!queue.some((q: any) => q.mobilisation === mobilisationToQueue)) {
        const { error: updateError } = await supabase.from('user_details')
          .update({ queued_mobilisations: [...queue, { mobilisation: mobilisationToQueue, queued_at: new Date().toISOString() }] })
          .eq('id', userDetailsId)
        console.log('[queue] queued', mobilisationToQueue, 'error:', updateError)
      }
    }
  }, [userDetailsId])

  /** Reject a lead and check the queue. */
  const rejectLead = useCallback(async (lead: Lead) => {
    await supabase.from('leads').update({ rejected: true, rejection_reason: lead.rejection_reason ?? null }).eq('id', lead.id)
    setBelfortLeads(prev => prev.filter(l => l.id !== lead.id))
    setSelectedLead(null)
    await checkAndQueueLeadMobilisation(belfortSelectedItpId)
  }, [belfortSelectedItpId, checkAndQueueLeadMobilisation])

  /** Approve a lead, dispatch contact_finder, and check the queue. */
  const approveLead = useCallback(async (lead: Lead) => {
    await supabase.from('leads').update({ approved: true }).eq('id', lead.id)
    fetch(`${API_URL}/api/skills/dispatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employee: 'lead_gen_expert', skill: 'contact_finder', user_details_id: userDetailsId, inputs: { lead_id: lead.id } }),
    }).catch(err => console.error('[approve] contact_finder dispatch error:', err))
    const updated = { ...lead, approved: true }
    setBelfortLeads(prev => prev.map(l => l.id === lead.id ? updated : l))
    setSelectedLead(null)
    await checkAndQueueLeadMobilisation(belfortSelectedItpId)
  }, [belfortSelectedItpId, userDetailsId, checkAndQueueLeadMobilisation])

  return {
    belfortItps,
    belfortSelectedItpId,
    setBelfortSelectedItpId,
    belfortLeads,
    belfortSubTab,
    setBelfortSubTab,
    selectedLead,
    setSelectedLead,
    expandedLeadId,
    setExpandedLeadId,
    checkAndQueueLeadMobilisation,
    rejectLead,
    approveLead,
  }
}
