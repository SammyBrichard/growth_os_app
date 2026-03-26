import { useState, useCallback } from 'react'
import supabase from '../services/supabase'
import type { User } from '@supabase/supabase-js'
import type { Message, MobilisationStep, StepOption, CustomerInput } from '../types/index'

const API_URL = import.meta.env.VITE_API_URL

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

interface UseMobilisationParams {
  userDetailsId: string | null
  accountId: string | null
  user: User | null | undefined
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
  setIsTyping: (v: boolean) => void
  showStepMessages: (step: { messages: string[] }) => Promise<Message[]>
  saveMessage: (message_body: string, is_agent: boolean, triggerProcessor?: boolean) => Promise<Message | null>
}

/**
 * Manages the full mobilisation flow: starting, resuming, stepping,
 * completing mobilisations, handling options, sidebars, manual customers, CSV uploads.
 */
export default function useMobilisation({
  userDetailsId,
  accountId,
  user,
  setMessages,
  setIsTyping,
  showStepMessages,
  saveMessage,
}: UseMobilisationParams) {
  const [mobilisation_active, setMobilisationActive] = useState(false)
  const [current_mobilisation, setCurrentMobilisation] = useState<string | null>(null)
  const [current_step, setCurrentStep] = useState<MobilisationStep | null>(null)
  const [mobilisation_responses, setMobilisationResponses] = useState<Record<string, string>>({})
  const [input_bar_enabled, setInputBarEnabled] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [options, setOptions] = useState<StepOption[] | null>(null)

  // Sidebar state
  const [activeSidebar, setActiveSidebar] = useState<string | null>(null)
  const [sidebarData, setSidebarData] = useState<Record<string, any>>({})
  const [sidebarNextId, setSidebarNextId] = useState<string | null>(null)

  // Customer input state (used by sidebar panels)
  const [manualCustomers, setManualCustomers] = useState<CustomerInput[]>([])
  const [manualCustomerInput, setManualCustomerInput] = useState<CustomerInput>({ organisation_name: '', organisation_website: '' })
  const [csvRows, setCsvRows] = useState<CustomerInput[]>([])
  const [csvDragOver, setCsvDragOver] = useState(false)

  // ITP selection sidebar state
  const [itpList, setItpList] = useState<any[]>([])
  const [selectedItpId, setSelectedItpId] = useState<string | null>(null)

  // Queue check state
  const [queueChecked, setQueueChecked] = useState(false)

  // ── Persistence helpers ──────────────────────────────────────────────

  const saveMobilisationState = useCallback(async (mobilisation: string, stepId: string) => {
    if (!userDetailsId) return
    await supabase
      .from('user_details')
      .update({ active_mobilisation: mobilisation, active_step_id: stepId })
      .eq('id', userDetailsId)
  }, [userDetailsId])

  const clearMobilisationState = useCallback(async () => {
    setMobilisationActive(false)
    setCurrentMobilisation(null)
    setCurrentStep(null)
    setOptions(null)
    if (!userDetailsId) return
    await supabase
      .from('user_details')
      .update({ active_mobilisation: null, active_step_id: null })
      .eq('id', userDetailsId)
  }, [userDetailsId])

  // ── Mobilisation completion ──────────────────────────────────────────

  const completeMobilisation = useCallback(async (
    mobilisationName: string,
    responses: Record<string, string>,
    msgs: Message[] = [],
  ) => {
    const res = await fetch(`${API_URL}/api/mobilisation/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobilisation: mobilisationName, responses, messages: msgs, user_details_id: userDetailsId }),
    })
    const { result } = await res.json()
    return result
  }, [userDetailsId])

  // ── Start mobilisation ───────────────────────────────────────────────

  const startMobilisation = useCallback(async (name: string) => {
    setMobilisationResponses({})
    setInputBarEnabled(false)
    try {
      const res = await fetch(`${API_URL}/api/mobilisation/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobilisation: name, user_details_id: userDetailsId }),
      })
      const result = await res.json()
      if (result.step) {
        setMobilisationActive(true)
        setCurrentMobilisation(name)
        setCurrentStep(result.step)
        await supabase.from('user_details').update({ active_mobilisation: name, active_step_id: result.step.id }).eq('auth_id', user!.id)
        const addedMessages = await showStepMessages(result.step)
        if (result.step.type === 'end_flow') {
          setMobilisationActive(false)
          setCurrentMobilisation(null)
          setCurrentStep(null)
          setOptions(null)
          if (userDetailsId) {
            await supabase.from('user_details').update({ active_mobilisation: null, active_step_id: null }).eq('id', userDetailsId)
          }
          const completion = await completeMobilisation(name, {}, addedMessages)
          if (completion?.next_mobilisation) {
            // Recursive call — startMobilisation will handle the next one
            await startMobilisation(completion.next_mobilisation)
          } else {
            setInputBarEnabled(true)
          }
        } else if (result.step.type === 'option_set' || result.step.type === 'ai_message_with_options') {
          setOptions(result.step.options)
        } else {
          setInputBarEnabled(true)
        }
      }
    } catch (err) {
      console.error('mobilisation start error:', err)
      setInputBarEnabled(true)
    }
  }, [userDetailsId, user, showStepMessages, completeMobilisation])

  // ── Resume mobilisation ──────────────────────────────────────────────

  const resumeMobilisation = useCallback(async (mobilisationName: string, stepId: string, _detailsId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/mobilisation/step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobilisation: mobilisationName, step_id: stepId, value: null }),
      })
      const result = await res.json()
      if (result.step) {
        setMobilisationActive(true)
        setCurrentMobilisation(mobilisationName)
        setCurrentStep(result.step)
        if (result.step.type === 'option_set' || result.step.type === 'ai_message_with_options') setOptions(result.step.options)
        else if (result.step.type !== 'end_flow') setInputBarEnabled(true)
      }
    } catch (err) {
      console.error('mobilisation resume error:', err)
      startMobilisation('sign_up_get_website')
    }
  }, [startMobilisation])

  // ── Check queued mobilisations ───────────────────────────────────────

  const checkQueuedMobilisations = useCallback(async () => {
    if (!userDetailsId) return
    const { data: ud, error } = await supabase
      .from('user_details')
      .select('queued_mobilisations, active_mobilisation')
      .eq('id', userDetailsId)
      .single()
    console.log('[queue] checkQueuedMobilisations:', ud, error)
    if (ud?.active_mobilisation || !ud?.queued_mobilisations?.length) return
    const [next, ...remaining] = ud.queued_mobilisations
    await supabase.from('user_details').update({ queued_mobilisations: remaining }).eq('id', userDetailsId)
    setIsTyping(true)
    await delay(1500)
    setIsTyping(false)
    await startMobilisation(next.mobilisation)
  }, [userDetailsId, setIsTyping, startMobilisation])

  // ── Handle send (free-type input) ────────────────────────────────────

  const handleSend = useCallback(async () => {
    const text = inputValue.trim()
    if (!text || !input_bar_enabled || activeSidebar) return

    const tempId = `temp_${Date.now()}_${Math.random()}`
    setMessages(prev => [...prev, { tempId, message_body: text, is_agent: false, timestamp: new Date() }])
    setInputValue('')
    setInputBarEnabled(false)
    saveMessage(text, false, !mobilisation_active).then(saved => {
      if (saved) setMessages(prev => prev.map(m => m.tempId === tempId ? saved : m))
    })

    if (mobilisation_active && current_step?.next_id) {
      const responseKey = current_step.response_key ?? current_step.id
      const updatedResponses = { ...mobilisation_responses, [responseKey]: text }
      setMobilisationResponses(updatedResponses)

      try {
        const res = await fetch(`${API_URL}/api/mobilisation/step`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mobilisation: current_mobilisation, step_id: current_step.next_id, value: text, user_details_id: userDetailsId }),
        })
        const result = await res.json()
        if (result.step) {
          setCurrentStep(result.step)
          if (result.step.type === 'end_flow') {
            await clearMobilisationState()
            const addedMessages = await showStepMessages(result.step)
            await completeMobilisation(current_mobilisation!, updatedResponses, addedMessages)
          } else {
            await saveMobilisationState(current_mobilisation!, result.step.id)
            await showStepMessages(result.step)
            if (result.step.type === 'option_set' || result.step.type === 'ai_message_with_options') setOptions(result.step.options)
            else setInputBarEnabled(true)
          }
        }
      } catch (err) {
        console.error('mobilisation step error:', err)
        setInputBarEnabled(true)
      }
    }
  }, [
    inputValue, input_bar_enabled, activeSidebar, mobilisation_active, current_step,
    current_mobilisation, mobilisation_responses, userDetailsId,
    setMessages, saveMessage, showStepMessages, saveMobilisationState,
    clearMobilisationState, completeMobilisation,
  ])

  // ── Handle option select ─────────────────────────────────────────────

  const handleOptionSelect = useCallback(async (option: StepOption) => {
    if (activeSidebar) return
    console.log('Option selected:', option.message)
    console.log('current_step:', current_step)
    setOptions(null)

    if (mobilisation_active && current_mobilisation) {
      await saveMobilisationState(current_mobilisation, current_step?.id ?? '')
    }

    const tempId = `temp_${Date.now()}_${Math.random()}`
    setMessages(prev => [...prev, { tempId, message_body: option.message, is_agent: false, timestamp: new Date() }])
    saveMessage(option.message, false, false).then(saved => {
      if (saved) setMessages(prev => prev.map(m => m.tempId === tempId ? saved : m))
    })

    if (!option.next_id && !current_step?.next_id) {
      console.warn('No next_id on current_step or option — returning early')
      return
    }

    try {
      const res = await fetch(`${API_URL}/api/mobilisation/step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobilisation: current_mobilisation, step_id: option.next_id ?? current_step!.next_id, value: option.message, user_details_id: userDetailsId }),
      })
      const result = await res.json()
      if (result.step) {
        setCurrentStep(result.step)
        if (result.step.type === 'sidebar') {
          await showStepMessages(result.step)
          setActiveSidebar(result.step.sidebar)
          setSidebarNextId(result.step.next_id)
          setSidebarData({})
          setManualCustomers([])
          setCsvRows([])
        } else if (result.step.type === 'end_flow') {
          const responseKey = current_step?.response_key ?? current_step?.id
          const updatedResponses = responseKey
            ? { ...mobilisation_responses, [responseKey]: option.message }
            : mobilisation_responses
          setMobilisationResponses(updatedResponses)
          await clearMobilisationState()
          const addedMessages = await showStepMessages(result.step)
          const completion = await completeMobilisation(current_mobilisation!, updatedResponses, addedMessages)
          if (completion?.next_mobilisation) {
            await startMobilisation(completion.next_mobilisation)
          } else {
            setInputBarEnabled(true)
          }
        } else {
          await saveMobilisationState(current_mobilisation!, result.step.id)
          await showStepMessages(result.step)
          if (result.step.type === 'option_set' || result.step.type === 'ai_message_with_options') setOptions(result.step.options)
          else setInputBarEnabled(true)
        }
      }
    } catch (err) {
      console.error('option select error:', err)
      setInputBarEnabled(true)
    }
  }, [
    activeSidebar, current_step, current_mobilisation, mobilisation_active,
    mobilisation_responses, userDetailsId,
    setMessages, saveMessage, showStepMessages,
    saveMobilisationState, clearMobilisationState, completeMobilisation, startMobilisation,
  ])

  // ── Sidebar advance (generic) ────────────────────────────────────────

  const handleSidebarAdvance = useCallback(async (messageText?: string) => {
    if (messageText) {
      const tempId = `temp_${Date.now()}_${Math.random()}`
      setMessages(prev => [...prev, { tempId, message_body: messageText, is_agent: false, timestamp: new Date() }])
      const saved = await saveMessage(messageText, false, false)
      if (saved) setMessages(prev => prev.map(m => m.tempId === tempId ? saved : m))
    }
    setActiveSidebar(null)
    if (!sidebarNextId) return
    try {
      const res = await fetch(`${API_URL}/api/mobilisation/step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobilisation: current_mobilisation, step_id: sidebarNextId, value: null, user_details_id: userDetailsId }),
      })
      const result = await res.json()
      if (result.step) {
        setCurrentStep(result.step)
        if (result.step.type === 'end_flow') {
          await clearMobilisationState()
          const addedMessages = await showStepMessages(result.step)
          await completeMobilisation(current_mobilisation!, mobilisation_responses, addedMessages)
        } else {
          await saveMobilisationState(current_mobilisation!, result.step.id)
          await showStepMessages(result.step)
          if (result.step.type === 'option_set' || result.step.type === 'ai_message_with_options') setOptions(result.step.options)
          else setInputBarEnabled(true)
        }
      }
    } catch (err) {
      console.error('sidebar advance error:', err)
    }
  }, [
    sidebarNextId, current_mobilisation, mobilisation_responses, userDetailsId,
    setMessages, saveMessage, showStepMessages,
    saveMobilisationState, clearMobilisationState, completeMobilisation,
  ])

  // ── Save company details sidebar ─────────────────────────────────────

  const handleSaveCompanyDetails = useCallback(async () => {
    if (accountId) {
      await supabase.from('account').update({
        organisation_website: sidebarData.website_url ?? null,
        organisation_name: sidebarData.company_name ?? null,
        description: sidebarData.company_description ?? null,
        problem_solved: sidebarData.problem_solved ?? null,
      }).eq('id', accountId)
    }

    const text = 'Looks good. Save my organisation details.'
    const tempId = `temp_${Date.now()}_${Math.random()}`
    setMessages(prev => [...prev, { tempId, message_body: text, is_agent: false, timestamp: new Date() }])
    saveMessage(text, false, false).then(saved => {
      if (saved) setMessages(prev => prev.map(m => m.tempId === tempId ? saved : m))
    })

    setActiveSidebar(null)
    startMobilisation('signup_ideal_target_profile')
  }, [accountId, sidebarData, setMessages, saveMessage, startMobilisation])

  // ── Save ITP sidebar ─────────────────────────────────────────────────

  const handleSaveItp = useCallback(async () => {
    if (sidebarData.itp_id) {
      await supabase.from('itp').update({
        name: sidebarData.name ?? null,
        itp_summary: sidebarData.itp_summary ?? null,
        itp_demographic: sidebarData.demographics ?? null,
        itp_pain_points: sidebarData.pain_points ?? null,
        itp_buying_trigger: sidebarData.buying_trigger ?? null,
        location: sidebarData.location ?? null,
      }).eq('id', sidebarData.itp_id)
    }
    const text = 'Looks good.'
    const tempId = `temp_${Date.now()}_${Math.random()}`
    setMessages(prev => [...prev, { tempId, message_body: text, is_agent: false, timestamp: new Date() }])
    saveMessage(text, false, false).then(saved => {
      if (saved) setMessages(prev => prev.map(m => m.tempId === tempId ? saved : m))
    })
    setActiveSidebar(null)
    startMobilisation('upload_customers')
  }, [sidebarData, setMessages, saveMessage, startMobilisation])

  // ── Manual customer add ──────────────────────────────────────────────

  const handleAddManualCustomer = useCallback(async () => {
    const { organisation_name, organisation_website } = manualCustomerInput
    if (!organisation_name.trim()) return
    if (accountId) {
      await supabase.from('customers').insert({
        account_id: accountId,
        organisation_name: organisation_name.trim(),
        organisation_website: organisation_website.trim() || null,
      })
    }
    setManualCustomers(prev => [...prev, {
      organisation_name: organisation_name.trim(),
      organisation_website: organisation_website.trim(),
    }])
    setManualCustomerInput({ organisation_name: '', organisation_website: '' })
  }, [accountId, manualCustomerInput])

  // ── CSV handling ─────────────────────────────────────────────────────

  const handleCsvDrop = useCallback((e: any) => {
    e.preventDefault()
    setCsvDragOver(false)
    const file = e.dataTransfer?.files[0] ?? e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev: any) => {
      const lines = (ev.target.result as string).split('\n').filter(Boolean)
      const rows = lines.slice(1).map(line => {
        const [organisation_name, organisation_website] = line.split(',').map((v: string) => v.trim().replace(/^"|"$/g, ''))
        return { organisation_name, organisation_website }
      }).filter(r => r.organisation_name)
      if (accountId && rows.length) {
        await supabase.from('customers').insert(rows.map(r => ({ account_id: accountId, ...r })))
      }
      setCsvRows(rows)
    }
    reader.readAsText(file)
  }, [accountId])

  const downloadCsvTemplate = useCallback(() => {
    const csv = 'organisation_name,organisation_website\nAcme Corp,https://acmecorp.com\n'
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'customers_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  // ── ITP list loading (for select_itp sidebar) ────────────────────────

  const loadItpList = useCallback(async () => {
    if (!accountId) return
    setSelectedItpId(null)
    const { data } = await supabase
      .from('itp')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
    setItpList(data ?? [])
  }, [accountId])

  // ── Key handler ──────────────────────────────────────────────────────

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSend()
  }, [handleSend])

  return {
    // Mobilisation state
    mobilisation_active,
    current_mobilisation,
    current_step,
    mobilisation_responses,
    input_bar_enabled,
    setInputBarEnabled,
    inputValue,
    setInputValue,
    options,
    setOptions,

    // Mobilisation responses setter
    setMobilisationResponses,

    // Sidebar state
    activeSidebar,
    setActiveSidebar,
    sidebarData,
    setSidebarData,
    sidebarNextId,
    setSidebarNextId,

    // Customer input state
    manualCustomers,
    manualCustomerInput,
    setManualCustomerInput,
    csvRows,
    csvDragOver,
    setCsvDragOver,

    // ITP selection
    itpList,
    selectedItpId,
    setSelectedItpId,

    // Queue
    queueChecked,
    setQueueChecked,

    // Functions
    startMobilisation,
    resumeMobilisation,
    checkQueuedMobilisations,
    handleSend,
    handleOptionSelect,
    handleSidebarAdvance,
    handleSaveCompanyDetails,
    handleSaveItp,
    handleAddManualCustomer,
    handleCsvDrop,
    downloadCsvTemplate,
    loadItpList,
    handleKeyDown,
  }
}
