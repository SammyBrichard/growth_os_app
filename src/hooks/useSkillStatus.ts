import { useState, useEffect } from 'react'
import supabase from '../services/supabase'

export interface SkillStatus {
  employee: string
  skill: string
  status: 'running' | 'complete'
  message: string | null
}

interface UseSkillStatusParams {
  userDetailsId: string | null
}

/**
 * Listens for skill_status broadcast events and tracks which skills are currently running.
 * Returns the list of active (running) skills.
 */
export default function useSkillStatus({ userDetailsId }: UseSkillStatusParams) {
  const [activeSkills, setActiveSkills] = useState<SkillStatus[]>([])

  useEffect(() => {
    if (!userDetailsId) return

    // Subscribe to the existing user channel for skill_status events
    const channel = supabase
      .channel(`skill_status:${userDetailsId}`)
      .on('broadcast', { event: 'skill_status' }, ({ payload }) => {
        const status = payload as SkillStatus
        if (status.status === 'running') {
          setActiveSkills(prev => {
            // Don't add duplicates
            if (prev.some(s => s.employee === status.employee && s.skill === status.skill)) return prev
            return [...prev, status]
          })
        } else if (status.status === 'complete') {
          setActiveSkills(prev =>
            prev.filter(s => !(s.employee === status.employee && s.skill === status.skill))
          )
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userDetailsId])

  return { activeSkills }
}
