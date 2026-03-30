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
  const [loading, setLoading] = useState(false)

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
    setLoading(true)
    supabase.from('leads')
      .select('id, score, score_reason, approved, rejected, rejection_reason, targets(id, domain, title, link, contacts(id, first_name, last_name, email, role))')
      .eq('itp_id', belfortSelectedItpId)
      .gte('score', 70)
      .order('score', { ascending: false })
      .then(({ data }) => { setBelfortLeads((data ?? []) as Lead[]); setLoading(false) })
  }, [belfortSelectedItpId])

  /**
   * After all leads for an ITP have been approved/rejected, queue
   * the appropriate follow-up mobilisation.
   */
  const checkAndQueueTargetMobilisation = useCallback(async (itpId: string | null) => {
    if (!itpId || !userDetailsId) return
    const { data: leads } = await supabase
      .from('leads')
      .select('id, approved, rejected, rejection_reason')
      .eq('itp_id', itpId)
      .gte('score', 70)
    const approved = (leads ?? []).filter((l: any) => l.approved).length
    const needsApproval = (leads ?? []).filter((l: any) => !l.approved && !l.rejected).length
    console.log('[queue] checkAndQueue: approved=', approved, 'needsApproval=', needsApproval)
    if (needsApproval === 0) {
      if (approved >= 10) {
        // Enough approved — offer to find 100 more or create campaign
        const mobilisationToQueue = 'ten_approved_leads_found'
        const { data: ud, error } = await supabase.from('user_details').select('queued_mobilisations').eq('id', userDetailsId).single()
        console.log('[queue] fetched user_details:', ud, error)
        const queue = ud?.queued_mobilisations ?? []
        if (!queue.some((q: any) => q.mobilisation === mobilisationToQueue)) {
          const { error: updateError } = await supabase.from('user_details')
            .update({ queued_mobilisations: [...queue, { mobilisation: mobilisationToQueue, queued_at: new Date().toISOString() }] })
            .eq('id', userDetailsId)
          console.log('[queue] queued', mobilisationToQueue, 'error:', updateError)
        }
      } else {
        // Check if any rejections have reasons
        const rejected = (leads ?? []).filter((l: any) => l.rejected)
        const withReasons = rejected.filter((l: any) => l.rejection_reason?.trim())

        if (withReasons.length > 0) {
          // Dispatch itp_refiner — it will refine the ITP and auto-trigger target_finder
          console.log('[queue] Dispatching itp_refiner with', withReasons.length, 'rejection reasons')
          fetch(`${API_URL}/api/skills/dispatch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              employee: 'lead_gen_expert',
              skill: 'itp_refiner',
              user_details_id: userDetailsId,
              inputs: { itp_id: itpId },
            }),
          }).catch(err => console.error('[queue] itp_refiner dispatch error:', err))
        } else {
          // No reasons — just find more targets
          const mobilisationToQueue = 'need_ten_more_leads'
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
      }
    }
  }, [userDetailsId])

  /** Reject a lead. */
  const rejectLead = useCallback(async (lead: Lead) => {
    await supabase.from('leads').update({ rejected: true, rejection_reason: lead.rejection_reason ?? null }).eq('id', lead.id)
    setBelfortLeads(prev => prev.filter(l => l.id !== lead.id))
    setSelectedLead(null)
  }, [])

  /** Approve a lead. */
  const approveLead = useCallback(async (lead: Lead) => {
    await supabase.from('leads').update({ approved: true }).eq('id', lead.id)
    const updated = { ...lead, approved: true }
    setBelfortLeads(prev => prev.map(l => l.id === lead.id ? updated : l))
    setSelectedLead(null)
  }, [])

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
    loading,
    checkAndQueueTargetMobilisation,
    rejectLead,
    approveLead,
  }
}
