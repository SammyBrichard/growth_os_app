import { useState, useRef, useCallback } from 'react'
import type { Message } from '../types/index'

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

interface UseMessagesParams {
  userFirstNameRef: React.MutableRefObject<string>
  saveMessage: (message_body: string, is_agent: boolean, triggerProcessor?: boolean) => Promise<Message | null>
}

/**
 * Manages messages array, typing indicator, auto-scroll ref,
 * and the showStepMessages helper that animates agent messages.
 */
export default function useMessages({ userFirstNameRef, saveMessage }: UseMessagesParams) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  /** Display step messages one-by-one with typing animation. */
  const showStepMessages = useCallback(async (step: { messages: string[] }): Promise<Message[]> => {
    const added: Message[] = []
    for (const body of step.messages) {
      setIsTyping(true)
      await delay(1000)
      setIsTyping(false)
      const resolved = body.replace('{{user_first_name}}', userFirstNameRef.current)
      const tempId = `temp_${Date.now()}_${Math.random()}`
      const msg: Message = { tempId, message_body: resolved, is_agent: true, timestamp: new Date() }
      setMessages(prev => [...prev, msg])
      added.push(msg)
      const saved = await saveMessage(resolved, true)
      if (saved) setMessages(prev => prev.map(m => m.tempId === tempId ? saved : m))
      await delay(400)
    }
    return added
  }, [userFirstNameRef, saveMessage])

  /** Format a date/timestamp for display. */
  const formatTime = useCallback((date: string | Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }, [])

  return {
    messages,
    setMessages,
    isTyping,
    setIsTyping,
    messagesEndRef,
    showStepMessages,
    formatTime,
  }
}
