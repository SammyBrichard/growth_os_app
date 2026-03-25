import { useState, useEffect, useCallback } from 'react'
import supabase from '../services/supabase'
import type { Employee, Target, ITP } from '../types/index'

const API_URL = import.meta.env.VITE_API_URL

interface UseBelfortParams {
  accountId: string | null
  userDetailsId: string | null
  selectedEmployee: Employee
}

/**
 * Manages the Belfort (Lead Generation Expert) tab:
 * ITP selection, target list, target approval/rejection, and queue-checking.
 */
export default function useBelfort({ accountId, userDetailsId, selectedEmployee }: UseBelfortParams) {
  const [belfortItps, setBelfortItps] = useState<Pick<ITP, 'id' | 'name'>[]>([])
  const [belfortSelectedItpId, setBelfortSelectedItpId] = useState<string | null>(null)
  const [belfortTargets, setBelfortTargets] = useState<Target[]>([])
  const [belfortSubTab, setBelfortSubTab] = useState<'needs_approval' | 'approved'>('needs_approval')
  const [selectedTarget, setSelectedTarget] = useState<Target | null>(null)
  const [expandedTargetId, setExpandedTargetId] = useState<string | null>(null)

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

  // Load targets when selected ITP changes
  useEffect(() => {
    if (!belfortSelectedItpId) { setBelfortTargets([]); return }
    supabase.from('targets').select('id, title, link, score, score_reason, approved, rejected')
      .eq('itp', belfortSelectedItpId)
      .gte('score', 70)
      .order('score', { ascending: false })
      .then(({ data }) => setBelfortTargets((data ?? []) as Target[]))
  }, [belfortSelectedItpId])

  /**
   * After all targets for an ITP have been approved/rejected, queue
   * the appropriate follow-up mobilisation.
   */
  const checkAndQueueTargetMobilisation = useCallback(async (itpId: string | null) => {
    if (!itpId || !userDetailsId) return
    const { data: targets } = await supabase
      .from('targets')
      .select('id, approved, rejected')
      .eq('itp', itpId)
      .gte('score', 70)
    const approved = (targets ?? []).filter((l: any) => l.approved).length
    const needsApproval = (targets ?? []).filter((l: any) => !l.approved && !l.rejected).length
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

  /** Reject a target and check the queue. */
  const rejectTarget = useCallback(async (target: Target) => {
    await supabase.from('targets').update({ rejected: true, rejection_reason: target.rejection_reason ?? null }).eq('id', target.id)
    setBelfortTargets(prev => prev.filter(l => l.id !== target.id))
    setSelectedTarget(null)
    await checkAndQueueTargetMobilisation(belfortSelectedItpId)
  }, [belfortSelectedItpId, checkAndQueueTargetMobilisation])

  /** Approve a target, dispatch contact_finder, and check the queue. */
  const approveTarget = useCallback(async (target: Target) => {
    await supabase.from('targets').update({ approved: true }).eq('id', target.id)
    fetch(`${API_URL}/api/skills/dispatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employee: 'lead_gen_expert', skill: 'contact_finder', user_details_id: userDetailsId, inputs: { lead_id: target.id } }),
    }).catch(err => console.error('[approve] contact_finder dispatch error:', err))
    const updated = { ...target, approved: true }
    setBelfortTargets(prev => prev.map(l => l.id === target.id ? updated : l))
    setSelectedTarget(null)
    await checkAndQueueTargetMobilisation(belfortSelectedItpId)
  }, [belfortSelectedItpId, userDetailsId, checkAndQueueTargetMobilisation])

  return {
    belfortItps,
    belfortSelectedItpId,
    setBelfortSelectedItpId,
    belfortTargets,
    belfortSubTab,
    setBelfortSubTab,
    selectedTarget,
    setSelectedTarget,
    expandedTargetId,
    setExpandedTargetId,
    checkAndQueueTargetMobilisation,
    rejectTarget,
    approveTarget,
  }
}
