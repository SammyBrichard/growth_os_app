import { useState, useEffect } from 'react'
import supabase from '../services/supabase'
import type { Message } from '../types/index'

export interface SkillStatus {
  employee: string
  skill: string
  status: 'running' | 'complete'
  message: string | null
  sidebar_message: string | null
}

interface UseSkillStatusParams {
  userDetailsId: string | null
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
}

/**
 * Listens for skill_status broadcast events.
 * Running statuses are tracked separately and rendered at the bottom of chat.
 * On completion, the status message is injected into the messages array so it persists in place.
 */
export default function useSkillStatus({ userDetailsId, setMessages }: UseSkillStatusParams) {
  const [activeSkills, setActiveSkills] = useState<SkillStatus[]>([])

  useEffect(() => {
    if (!userDetailsId) return

    const channel = supabase
      .channel(`skill_status:${userDetailsId}`)
      .on('broadcast', { event: 'skill_status' }, ({ payload }) => {
        const status = payload as SkillStatus
        if (status.status === 'running') {
          setActiveSkills(prev => {
            if (prev.some(s => s.employee === status.employee && s.skill === status.skill)) return prev
            return [...prev, status]
          })
        } else if (status.status === 'complete') {
          // Read the completing skill's message, then remove and freeze
          setActiveSkills(prev => {
            const completing = prev.find(s => s.employee === status.employee && s.skill === status.skill)
            if (completing) {
              // Use queueMicrotask so the active skill is removed before the message is added
              queueMicrotask(() => {
                setMessages(msgs => [
                  ...msgs,
                  {
                    message_body: completing.message ?? 'Done.',
                    is_agent: true,
                    is_status: true,
                    timestamp: new Date(),
                  },
                ])
              })
            }
            return prev.filter(s => !(s.employee === status.employee && s.skill === status.skill))
          })
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userDetailsId, setMessages])

  return { activeSkills }
}
