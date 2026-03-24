import { useState, useEffect, useRef } from 'react'
import supabase from './services/supabase'
import ReactMarkdown from 'react-markdown'
import watsonImg from './assets/Watson.png'
import belfortImg from './assets/Belfort.png'
import warrenImg from './assets/Warren.png'
import pepperImg from './assets/Pepper.png'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL
const CLIENT_URL = import.meta.env.VITE_CLIENT_URL

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function App() {
  const [user, setUser] = useState(undefined)
  const [userDetailsId, setUserDetailsId] = useState(null)
  const [accountId, setAccountId] = useState(null)
  const [userFirstName, setUserFirstName] = useState('')
  const [messages, setMessages] = useState([])
  const [activeNav, setActiveNav] = useState('chat')
  const employees = [
    { name: 'Watson', role: 'Chief Marketing Officer', img: watsonImg },
    { name: 'Belfort', role: 'Lead Generation Expert', img: belfortImg },
    { name: 'Warren', role: 'Business Analyst', img: warrenImg },
    { name: 'Pepper', role: 'Office Administrator', img: pepperImg },
  ]
  const [selectedEmployee, setSelectedEmployee] = useState(employees[0])
  const [mobilisation_active, setMobilisationActive] = useState(false)
  const [current_mobilisation, setCurrentMobilisation] = useState(null)
  const [current_step, setCurrentStep] = useState(null)
  const [mobilisation_responses, setMobilisationResponses] = useState({})
  const [input_bar_enabled, setInputBarEnabled] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [options, setOptions] = useState(null)
  const [activeSidebar, setActiveSidebar] = useState(null)
  const [sidebarData, setSidebarData] = useState({})
  const [sidebarNextId, setSidebarNextId] = useState(null)
  const [manualCustomers, setManualCustomers] = useState([])
  const [manualCustomerInput, setManualCustomerInput] = useState({ organisation_name: '', organisation_website: '' })
  const [csvRows, setCsvRows] = useState([])
  const [csvDragOver, setCsvDragOver] = useState(false)
  const [itpList, setItpList] = useState([])
  const [selectedItpId, setSelectedItpId] = useState(null)
  const [queueChecked, setQueueChecked] = useState(false)
  const [belfortItps, setBelfortItps] = useState([])
  const [belfortSelectedItpId, setBelfortSelectedItpId] = useState(null)
  const [belfortLeads, setBelfortLeads] = useState([])
  const [belfortSubTab, setBelfortSubTab] = useState('needs_approval')
  const [selectedLead, setSelectedLead] = useState(null)
  const messagesEndRef = useRef(null)
  const initialiseRan = useRef(false)
  const userFirstNameRef = useRef('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user || initialiseRan.current) return
    initialiseRan.current = true
    initialise()
  }, [user])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  useEffect(() => {
    if (activeSidebar) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 150)
    }
    if (activeSidebar === 'select_itp' && accountId) {
      setSelectedItpId(null)
      supabase.from('itp').select('*').eq('account_id', accountId).order('created_at', { ascending: false })
        .then(({ data }) => setItpList(data ?? []))
    }
  }, [activeSidebar])

  useEffect(() => {
    if (selectedEmployee.name === 'Belfort' && accountId) {
      supabase.from('itp').select('id, name').eq('account_id', accountId).order('created_at', { ascending: false })
        .then(({ data }) => {
          const itps = data ?? []
          setBelfortItps(itps)
          if (itps.length > 0) setBelfortSelectedItpId(itps[0].id)
        })
    }
  }, [selectedEmployee, accountId])

  useEffect(() => {
    if (!belfortSelectedItpId) { setBelfortLeads([]); return }
    supabase.from('leads').select('id, title, link, score, score_reason, approved, rejected').eq('itp', belfortSelectedItpId)
      .gte('score', 70).order('score', { ascending: false })
      .then(({ data }) => setBelfortLeads(data ?? []))
  }, [belfortSelectedItpId])

  useEffect(() => {
    if (selectedEmployee.name === 'Watson') {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      if (userDetailsId && !mobilisation_active && !queueChecked) {
        setQueueChecked(true)
        checkQueuedMobilisations()
      }
    }
    if (selectedEmployee.name !== 'Watson') setQueueChecked(false)
  }, [selectedEmployee, mobilisation_active, userDetailsId])

  async function checkQueuedMobilisations() {
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
  }

  async function checkAndQueueLeadMobilisation(itpId) {
    const { data: leads } = await supabase
      .from('leads')
      .select('id, approved, rejected')
      .eq('itp', itpId)
      .gte('score', 70)
    const approved = (leads ?? []).filter(l => l.approved).length
    const needsApproval = (leads ?? []).filter(l => !l.approved && !l.rejected).length
    console.log('[queue] checkAndQueue: approved=', approved, 'needsApproval=', needsApproval)
    if (needsApproval === 0) {
      const mobilisationToQueue = approved >= 10 ? 'ten_approved_leads_found' : 'need_ten_more_leads'
      const { data: ud, error } = await supabase.from('user_details').select('queued_mobilisations').eq('id', userDetailsId).single()
      console.log('[queue] fetched user_details:', ud, error)
      const queue = ud?.queued_mobilisations ?? []
      if (!queue.some(q => q.mobilisation === mobilisationToQueue)) {
        const { error: updateError } = await supabase.from('user_details')
          .update({ queued_mobilisations: [...queue, { mobilisation: mobilisationToQueue, queued_at: new Date().toISOString() }] })
          .eq('id', userDetailsId)
        console.log('[queue] queued', mobilisationToQueue, 'error:', updateError)
      }
    }
  }

  useEffect(() => {
    const latest = messages[messages.length - 1]
    if (latest?.sidebar) {
      setActiveSidebar(latest.sidebar)
      setSidebarData(latest.sidebar_info ?? {})
    }
    if (latest?.is_agent && !mobilisation_active) {
      setInputBarEnabled(true)
    }
  }, [messages])

  async function saveMobilisationState(mobilisation, stepId) {
    if (!userDetailsId) return
    await supabase
      .from('user_details')
      .update({ active_mobilisation: mobilisation, active_step_id: stepId })
      .eq('id', userDetailsId)
  }

  async function clearMobilisationState() {
    setMobilisationActive(false)
    setCurrentMobilisation(null)
    setCurrentStep(null)
    setOptions(null)
    if (!userDetailsId) return
    await supabase
      .from('user_details')
      .update({ active_mobilisation: null, active_step_id: null })
      .eq('id', userDetailsId)
  }

  async function initialise() {
    const { data: userDetails, error } = await supabase
      .from('user_details')
      .select('id, account_id, signup_complete, firstname, active_mobilisation, active_step_id')
      .eq('auth_id', user.id)
      .single()

    if (error || !userDetails) return

    setUserDetailsId(userDetails.id)
    setAccountId(userDetails.account_id)
    userFirstNameRef.current = userDetails.firstname ?? ''
    setUserFirstName(userDetails.firstname ?? '')
    loadMessages(userDetails.id)
    subscribeToMessages(userDetails.id)

    if (!userDetails.signup_complete) {
      if (userDetails.active_mobilisation && userDetails.active_step_id) {
        resumeMobilisation(userDetails.active_mobilisation, userDetails.active_step_id, userDetails.id)
      } else {
        startMobilisation('sign_up_get_website')
      }
    } else {
      setInputBarEnabled(true)
    }
  }

  async function resumeMobilisation(mobilisationName, stepId, detailsId) {
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
  }

  function subscribeToMessages(detailsId) {
    supabase
      .channel(`user:${detailsId}`)
      .on('broadcast', { event: 'agent_typing' }, ({ payload }) => {
        setIsTyping(payload.typing)
      })
      .on('broadcast', { event: 'start_mobilisation' }, ({ payload }) => {
        startMobilisation(payload.mobilisation)
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `user_details_id=eq.${detailsId}`,
      }, (payload) => {
        setIsTyping(false)
        setMessages(prev => {
          if (prev.some(m => m.id === payload.new.id)) return prev
          // Replace a matching temp message (no id yet, same body) rather than appending
          const tempIndex = prev.findIndex(m => !m.id && m.message_body === payload.new.message_body && m.is_agent === payload.new.is_agent)
          if (tempIndex !== -1) {
            const next = [...prev]
            next[tempIndex] = payload.new
            return next
          }
          return [...prev, payload.new]
        })
      })
      .subscribe()
  }

  async function loadMessages(detailsId) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('user_details_id', detailsId)
      .order('created_at', { ascending: true })

    if (!error && data) setMessages(data)
  }

  async function saveMessage(message_body, is_agent) {
    if (!userDetailsId) return null
    const { data } = await supabase
      .from('messages')
      .insert({ message_body, is_agent, user_details_id: userDetailsId })
      .select()
      .single()
    return data
  }

  async function showStepMessages(step) {
    const added = []
    for (const body of step.messages) {
      setIsTyping(true)
      await delay(1000)
      setIsTyping(false)
      const resolved = body.replace('{{user_first_name}}', userFirstNameRef.current)
      const tempId = `temp_${Date.now()}_${Math.random()}`
      const msg = { tempId, message_body: resolved, is_agent: true, timestamp: new Date() }
      setMessages(prev => [...prev, msg])
      added.push(msg)
      const saved = await saveMessage(resolved, true)
      if (saved) setMessages(prev => prev.map(m => m.tempId === tempId ? saved : m))
      await delay(400)
    }
    return added
  }

  async function completeMobilisation(mobilisationName, responses, messages = []) {
    const res = await fetch(`${API_URL}/api/mobilisation/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobilisation: mobilisationName, responses, messages, user_details_id: userDetailsId }),
    })
    const { result } = await res.json()
    if (result?.next_mobilisation) {
      await startMobilisation(result.next_mobilisation)
    }
  }

  async function startMobilisation(name) {
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
        await supabase.from('user_details').update({ active_mobilisation: name, active_step_id: result.step.id }).eq('auth_id', user.id)
        const addedMessages = await showStepMessages(result.step)
        if (result.step.type === 'end_flow') {
          await clearMobilisationState()
          await completeMobilisation(name, {}, addedMessages)
          setInputBarEnabled(true)
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
  }

  async function handleSend() {
    const text = inputValue.trim()
    if (!text || !input_bar_enabled || activeSidebar) return

    const tempId = `temp_${Date.now()}_${Math.random()}`
    setMessages(prev => [...prev, { tempId, message_body: text, is_agent: false, timestamp: new Date() }])
    setInputValue('')
    setInputBarEnabled(false)
    saveMessage(text, false).then(saved => {
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
            await completeMobilisation(current_mobilisation, updatedResponses, addedMessages)
          } else {
            await saveMobilisationState(current_mobilisation, result.step.id)
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
  }

  async function handleOptionSelect(option) {
    if (activeSidebar) return
    console.log('🔘 Option selected:', option.message)
    console.log('📍 current_step:', current_step)
    setOptions(null)
    // Ensure active_mobilisation is written to DB before saveMessage fires the webhook
    if (mobilisation_active && current_mobilisation) {
      await saveMobilisationState(current_mobilisation, current_step?.id)
    }
    const tempId = `temp_${Date.now()}_${Math.random()}`
    setMessages(prev => [...prev, { tempId, message_body: option.message, is_agent: false, timestamp: new Date() }])
    saveMessage(option.message, false).then(saved => {
      if (saved) setMessages(prev => prev.map(m => m.tempId === tempId ? saved : m))
    })

    if (!option.next_id && !current_step?.next_id) {
      console.warn('⚠️ No next_id on current_step or option — returning early')
      return
    }
    try {
      const res = await fetch(`${API_URL}/api/mobilisation/step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobilisation: current_mobilisation, step_id: option.next_id ?? current_step.next_id, value: option.message, user_details_id: userDetailsId }),
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
          const completion = await completeMobilisation(current_mobilisation, updatedResponses, addedMessages)
          if (completion?.next_mobilisation) {
            await startMobilisation(completion.next_mobilisation)
          } else {
            setInputBarEnabled(true)
          }
        } else {
          await saveMobilisationState(current_mobilisation, result.step.id)
          await showStepMessages(result.step)
          if (result.step.type === 'option_set' || result.step.type === 'ai_message_with_options') setOptions(result.step.options)
          else setInputBarEnabled(true)
        }
      }
    } catch (err) {
      console.error('option select error:', err)
      setInputBarEnabled(true)
    }
  }

  async function handleSaveCompanyDetails() {
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
    saveMessage(text, false).then(saved => {
      if (saved) setMessages(prev => prev.map(m => m.tempId === tempId ? saved : m))
    })

    setActiveSidebar(null)
    startMobilisation('signup_ideal_target_profile')
  }

  async function handleSidebarAdvance(messageText) {
    if (messageText) {
      const tempId = `temp_${Date.now()}_${Math.random()}`
      setMessages(prev => [...prev, { tempId, message_body: messageText, is_agent: false, timestamp: new Date() }])
      const saved = await saveMessage(messageText, false)
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
          await completeMobilisation(current_mobilisation, mobilisation_responses, addedMessages)
        } else {
          await saveMobilisationState(current_mobilisation, result.step.id)
          await showStepMessages(result.step)
          if (result.step.type === 'option_set' || result.step.type === 'ai_message_with_options') setOptions(result.step.options)
          else setInputBarEnabled(true)
        }
      }
    } catch (err) {
      console.error('sidebar advance error:', err)
    }
  }

  async function handleAddManualCustomer() {
    const { organisation_name, organisation_website } = manualCustomerInput
    if (!organisation_name.trim()) return
    if (accountId) {
      await supabase.from('customers').insert({ account_id: accountId, organisation_name: organisation_name.trim(), organisation_website: organisation_website.trim() || null })
    }
    setManualCustomers(prev => [...prev, { organisation_name: organisation_name.trim(), organisation_website: organisation_website.trim() }])
    setManualCustomerInput({ organisation_name: '', organisation_website: '' })
  }

  function handleCsvDrop(e) {
    e.preventDefault()
    setCsvDragOver(false)
    const file = e.dataTransfer?.files[0] ?? e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const lines = ev.target.result.split('\n').filter(Boolean)
      const rows = lines.slice(1).map(line => {
        const [organisation_name, organisation_website] = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
        return { organisation_name, organisation_website }
      }).filter(r => r.organisation_name)
      if (accountId && rows.length) {
        await supabase.from('customers').insert(rows.map(r => ({ account_id: accountId, ...r })))
      }
      setCsvRows(rows)
    }
    reader.readAsText(file)
  }

  function downloadCsvTemplate() {
    const csv = 'organisation_name,organisation_website\nAcme Corp,https://acmecorp.com\n'
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'customers_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = CLIENT_URL
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleSend()
  }

  function formatTime(date) {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  if (user === undefined) return null
  if (user === null) return <p>Not logged in</p>

  return (
    <div id="layout">
      <aside id="sidebar-icon-rail">
        <div className={activeNav === 'chat' ? 'rail-icon-btn active' : 'rail-icon-btn'} onClick={() => setActiveNav('chat')}>
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5C5C5C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <div className={activeNav === 'settings' ? 'rail-icon-btn active' : 'rail-icon-btn'} onClick={() => setActiveNav('settings')} id="rail-settings-btn">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5C5C5C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </div>
      </aside>

      <aside id="sidebar-panel">
        <h1 id="sidebar-heading">
          growthOS<span className="logo-dot">.</span><span className="logo-version">v0.1</span>
        </h1>
        <div id="employee-list">
          {employees.map(emp => (
            <div
              key={emp.name}
              className={`employee-row${selectedEmployee.name === emp.name ? ' selected' : ''}`}
              onClick={() => setSelectedEmployee(emp)}
            >
              <div className="employee-avatar">
                {emp.img ? <img src={emp.img} alt={emp.name} /> : emp.name[0]}
              </div>
              <div className="employee-info">
                <span className="employee-name">{emp.name}</span>
                <span className="employee-role">{emp.role}</span>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {activeNav === 'settings' && <div id="main-content">
        <nav id="top-nav">
          <div id="top-nav-profile">
            <span id="top-nav-name">Settings</span>
          </div>
        </nav>
        <div id="main-body" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', color: '#5C5C5C' }}>User ID</p>
            <p style={{ margin: 0, fontSize: '13px', color: '#08060d', fontFamily: 'var(--mono)' }}>{userDetailsId}</p>
          </div>
          <button onClick={handleLogout} style={{ alignSelf: 'flex-start', padding: '0.6rem 1.4rem', borderRadius: '8px', background: '#e53e3e', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}>
            Log out
          </button>
        </div>
      </div>}

      {activeNav === 'chat' && <div id="main-content" className={activeSidebar ? 'compressed' : ''}>
        <nav id="top-nav">
          <div id="top-nav-profile">
            <div id="top-nav-avatar">
              {selectedEmployee.img ? <img src={selectedEmployee.img} alt={selectedEmployee.name} /> : selectedEmployee.name[0]}
            </div>
            <div id="top-nav-name-wrap">
              <span id="top-nav-name">{selectedEmployee.name}</span>
              <span id="top-nav-title">{selectedEmployee.role}</span>
            </div>
          </div>
        </nav>

        {selectedEmployee.name === 'Watson' ? (
          <div id="main-body">
            {messages.map((msg, i) => (
              <div key={msg.id ?? i} className={msg.is_agent ? 'msg-row agent' : 'msg-row user'}>
                <div className={msg.is_agent ? 'bubble agent' : 'bubble user'}>
                  <div className="bubble-body"><ReactMarkdown>{msg.message_body}</ReactMarkdown></div>
                  <p className="bubble-time">{formatTime(msg.created_at ?? msg.timestamp)}</p>
                </div>
              </div>
            ))}

            {options && (
              <div className="msg-row user">
                <div id="option-pills">
                  {options.map(opt => (
                    <button key={opt.id} className="option-pill" onClick={() => handleOptionSelect(opt)}>
                      {opt.message}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isTyping && (
              <div className="msg-row agent">
                <div className="bubble agent typing-bubble">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        ) : selectedEmployee.name === 'Belfort' ? (
          <div id="main-body" style={{ padding: '30px' }}>
            <div className="belfort-tabs">
              {belfortItps.map(itp => (
                <button
                  key={itp.id}
                  className={`belfort-tab${belfortSelectedItpId === itp.id ? ' active' : ''}`}
                  onClick={() => { setBelfortSelectedItpId(itp.id); setExpandedLeadId(null) }}
                >
                  {itp.name ?? 'Unnamed ITP'}
                </button>
              ))}
            </div>
            <div className="belfort-subtabs">
              <button
                className={`belfort-subtab${belfortSubTab === 'needs_approval' ? ' active' : ''}`}
                onClick={() => { setBelfortSubTab('needs_approval'); setSelectedLead(null) }}
              >
                Need approval
              </button>
              <button
                className={`belfort-subtab${belfortSubTab === 'approved' ? ' active' : ''}`}
                onClick={() => { setBelfortSubTab('approved'); setSelectedLead(null) }}
              >
                Approved
              </button>
            </div>
            {belfortSubTab === 'needs_approval' && (
              <p style={{ margin: '12px 0 4px', fontSize: '13px', color: '#888' }}>
                Please approve or reject all of the following leads that Belfort has found.
              </p>
            )}
            <table className="leads-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>URL</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {belfortLeads.filter(l => belfortSubTab === 'approved' ? l.approved : (!l.approved && !l.rejected)).map(lead => (
                  <tr
                    key={lead.id}
                    className={`leads-row${selectedLead?.id === lead.id ? ' selected' : ''}`}
                    onClick={() => setSelectedLead(lead)}
                  >
                    <td>{lead.title ?? '—'}</td>
                    <td><a href={lead.link} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>{lead.link}</a></td>
                    <td className="leads-score">{lead.score}</td>
                  </tr>
                ))}
                {belfortLeads.filter(l => belfortSubTab === 'approved' ? l.approved : (!l.approved && !l.rejected)).length === 0 && (
                  <tr><td colSpan={3} className="leads-empty">{belfortSubTab === 'approved' ? 'No approved leads yet.' : 'No leads awaiting approval.'}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div id="main-body" />
        )}

        {selectedEmployee.name === 'Watson' && <div id="input-bar">
          <div id="input-wrap">
            <input
              type="text"
              placeholder="Your message"
              id="message-input"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <div id="input-actions">
              <button id="mic-btn" aria-label="Voice input">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="23"/>
                  <line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              </button>
              <button id="send-btn" aria-label="Send" disabled={!input_bar_enabled || !!activeSidebar} onClick={handleSend}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5"/>
                  <polyline points="5 12 12 5 19 12"/>
                </svg>
              </button>
            </div>
          </div>
        </div>}
      </div>}

      {activeNav === 'chat' && selectedLead && (
        <aside className="lead-detail-sidebar">
          <div className="lead-detail-header">
            <button onClick={() => setSelectedLead(null)} className="lead-detail-close">✕</button>
          </div>
          <div id="right-sidebar-body">
            <div className="sidebar-field">
              <label className="sidebar-field-label">Name</label>
              <p style={{ margin: 0, fontSize: '13px', color: '#333' }}>{selectedLead.title ?? '—'}</p>
            </div>
            <div className="sidebar-field">
              <label className="sidebar-field-label">URL</label>
              <a href={selectedLead.link} target="_blank" rel="noreferrer" style={{ fontSize: '13px', color: '#555', wordBreak: 'break-all' }}>{selectedLead.link}</a>
            </div>
            <div className="sidebar-field">
              <label className="sidebar-field-label">Score</label>
              <span style={{ fontSize: '24px', fontWeight: 700 }}>{selectedLead.score}</span>
            </div>
            <div className="sidebar-field">
              <label className="sidebar-field-label">Reason</label>
              <p style={{ margin: 0, fontSize: '13px', color: '#333', lineHeight: 1.6 }}>{selectedLead.score_reason ?? 'No reason provided.'}</p>
            </div>
            {!selectedLead.approved && (
              <>
                <div className="sidebar-field">
                  <textarea
                    className="sidebar-field-input"
                    rows={4}
                    placeholder="Adding the reason you have rejected a lead will help Belfort find better ones next time."
                    value={selectedLead.rejection_reason ?? ''}
                    onChange={e => setSelectedLead(prev => ({ ...prev, rejection_reason: e.target.value }))}
                  />
                </div>
                <div className="lead-detail-actions">
                  <button
                    className="lead-action-btn reject"
                    onClick={async () => {
                      await supabase.from('leads').update({ rejected: true, rejection_reason: selectedLead.rejection_reason ?? null }).eq('id', selectedLead.id)
                      setBelfortLeads(prev => prev.filter(l => l.id !== selectedLead.id))
                      setSelectedLead(null)
                      await checkAndQueueLeadMobilisation(belfortSelectedItpId)
                    }}
                  >
                    Reject
                  </button>
                  <button
                    className="lead-action-btn approve"
                    onClick={async () => {
                      await supabase.from('leads').update({ approved: true }).eq('id', selectedLead.id)
                      fetch(`${API_URL}/api/skills/dispatch`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ employee: 'lead_gen_expert', skill: 'contact_finder', user_details_id: userDetailsId, inputs: { lead_id: selectedLead.id } }),
                      }).catch(err => console.error('[approve] contact_finder dispatch error:', err))
                      const updated = { ...selectedLead, approved: true }
                      setBelfortLeads(prev => prev.map(l => l.id === selectedLead.id ? updated : l))
                      setSelectedLead(null)
                      await checkAndQueueLeadMobilisation(belfortSelectedItpId)
                    }}
                  >
                    Approve
                  </button>
                </div>
              </>
            )}
          </div>
        </aside>
      )}

      {activeNav === 'chat' && activeSidebar && <aside id="right-sidebar">
        {activeSidebar === 'analyse_website' && (
          <>
            <div id="right-sidebar-header"></div>
            <div id="right-sidebar-body">
              {[
                { key: 'website_url', label: '🌐 Website URL' },
                { key: 'company_name', label: '🏭 Organisation Name' },
                { key: 'company_description', label: '✍️ Description' },
                { key: 'problem_solved', label: '🤔 Problem Solved' },
              ].map(({ key, label }) => (
                <div key={key} className="sidebar-field">
                  <label className="sidebar-field-label">{label}</label>
                  <textarea
                    className="sidebar-field-input"
                    value={sidebarData[key] ?? ''}
                    onChange={e => setSidebarData(prev => ({ ...prev, [key]: e.target.value }))}
                    rows={key === 'company_description' || key === 'problem_solved' ? 4 : 1}
                  />
                </div>
              ))}
            </div>
            <div id="right-sidebar-footer">
              <button className="option-pill" onClick={handleSaveCompanyDetails}>
                Looks good. Save my company details.
              </button>
            </div>
          </>
        )}

        {activeSidebar === 'define_itp' && (
          <>
            <div id="right-sidebar-header"></div>
            <div id="right-sidebar-body">
              {[
                { key: 'name', label: '🏷️ Name', rows: 1 },
                { key: 'location', label: '📍 Location', rows: 1 },
                { key: 'itp_summary', label: '🎯 ITP Summary', rows: 4 },
                { key: 'demographics', label: '👤 Demographics', rows: 4 },
                { key: 'pain_points', label: '😣 Pain Points', rows: 4 },
                { key: 'buying_trigger', label: '⚡ Buying Trigger', rows: 4 },
              ].map(({ key, label, rows }) => (
                <div key={key} className="sidebar-field">
                  <label className="sidebar-field-label">{label}</label>
                  <textarea
                    className="sidebar-field-input"
                    value={sidebarData[key] ?? ''}
                    onChange={e => setSidebarData(prev => ({ ...prev, [key]: e.target.value }))}
                    rows={rows}
                  />
                </div>
              ))}
            </div>
            <div id="right-sidebar-footer">
              <button className="option-pill" onClick={async () => {
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
                saveMessage(text, false).then(saved => {
                  if (saved) setMessages(prev => prev.map(m => m.tempId === tempId ? saved : m))
                })
                setActiveSidebar(null)
                startMobilisation('upload_customers')
              }}>
                Looks good.
              </button>
            </div>
          </>
        )}

        {activeSidebar === 'upload_csv' && (
          <>
            <div id="right-sidebar-header"></div>
            <div id="right-sidebar-body">
              <div className="sidebar-field">
                <label className="sidebar-field-label">Download Template</label>
                <button className="sidebar-link-btn" onClick={downloadCsvTemplate}>
                  customers_template.csv
                </button>
              </div>
              <div className="sidebar-field">
                <label className="sidebar-field-label">Upload CSV</label>
                <div
                  className={`csv-drop-zone${csvDragOver ? ' drag-over' : ''}`}
                  onDragOver={e => { e.preventDefault(); setCsvDragOver(true) }}
                  onDragLeave={() => setCsvDragOver(false)}
                  onDrop={handleCsvDrop}
                  onClick={() => document.getElementById('csv-file-input').click()}
                >
                  {csvRows.length > 0
                    ? <span>{csvRows.length} customer{csvRows.length !== 1 ? 's' : ''} uploaded</span>
                    : <span>Drag a CSV here, or click to browse</span>
                  }
                </div>
                <input id="csv-file-input" type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCsvDrop} />
              </div>
              {csvRows.length > 0 && (
                <div className="sidebar-field">
                  <label className="sidebar-field-label">Preview</label>
                  <div className="customer-list">
                    {csvRows.map((r, i) => (
                      <div key={i} className="customer-list-item">
                        <span className="customer-name">{r.organisation_name}</span>
                        {r.organisation_website && <span className="customer-website">{r.organisation_website}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div id="right-sidebar-footer">
              <button className="option-pill" onClick={() => handleSidebarAdvance(csvRows.length > 0 ? 'Done' : 'Skip for now')}>
                {csvRows.length > 0 ? 'Done' : 'Skip for now'}
              </button>
            </div>
          </>
        )}

        {activeSidebar === 'add_manually_customers' && (
          <>
            <div id="right-sidebar-header"></div>
            <div id="right-sidebar-body">
              <div className="sidebar-field">
                <label className="sidebar-field-label">Organisation Name</label>
                <input
                  className="sidebar-field-input"
                  type="text"
                  placeholder="Acme Corp"
                  value={manualCustomerInput.organisation_name}
                  onChange={e => setManualCustomerInput(prev => ({ ...prev, organisation_name: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handleAddManualCustomer()}
                />
              </div>
              <div className="sidebar-field">
                <label className="sidebar-field-label">Website</label>
                <input
                  className="sidebar-field-input"
                  type="text"
                  placeholder="https://acmecorp.com"
                  value={manualCustomerInput.organisation_website}
                  onChange={e => setManualCustomerInput(prev => ({ ...prev, organisation_website: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handleAddManualCustomer()}
                />
              </div>
              <button className="sidebar-add-btn" onClick={handleAddManualCustomer}>+ Add customer</button>
              {manualCustomers.length > 0 && (
                <div className="sidebar-field" style={{ marginTop: '16px' }}>
                  <label className="sidebar-field-label">Added</label>
                  <div className="customer-list">
                    {manualCustomers.map((c, i) => (
                      <div key={i} className="customer-list-item">
                        <span className="customer-name">{c.organisation_name}</span>
                        {c.organisation_website && <span className="customer-website">{c.organisation_website}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div id="right-sidebar-footer">
              <button className="option-pill" onClick={() => handleSidebarAdvance(manualCustomers.length > 0 ? 'Done' : 'Skip for now')}>
                {manualCustomers.length > 0 ? 'Done' : 'Skip for now'}
              </button>
            </div>
          </>
        )}

        {activeSidebar === 'select_itp' && (
          <>
            <div id="right-sidebar-header"></div>
            <div id="right-sidebar-body">
              {itpList.length === 0
                ? <p className="sidebar-field-label">No ITPs found for this account.</p>
                : itpList.map(itp => {
                  const isSelected = selectedItpId === itp.id
                  return (
                    <div
                      key={itp.id}
                      className={`itp-select-card${isSelected ? ' selected' : ''}`}
                    >
                      <div className="itp-select-header" onClick={() => setSelectedItpId(isSelected ? null : itp.id)}>
                        <span className="itp-select-name">{itp.name || 'Unnamed ITP'}</span>
                        {isSelected
                          ? <span className="itp-selected-label">Selected</span>
                          : <span className="itp-chevron">▾</span>
                        }
                      </div>
                      {isSelected && (
                        <div className="itp-select-body">
                          {itp.itp_summary && <><p className="itp-field-heading">🎯 ITP Summary</p><p className="itp-field-text">{itp.itp_summary}</p></>}
                          {itp.itp_demographic && <><p className="itp-field-heading">👤 Demographics</p><p className="itp-field-text">{itp.itp_demographic}</p></>}
                          {itp.itp_pain_points && <><p className="itp-field-heading">😣 Pain Points</p><p className="itp-field-text">{itp.itp_pain_points}</p></>}
                          {itp.itp_buying_trigger && <><p className="itp-field-heading">⚡ Buying Trigger</p><p className="itp-field-text">{itp.itp_buying_trigger}</p></>}
                        </div>
                      )}
                    </div>
                  )
                })
              }
            </div>
            <div id="right-sidebar-footer">
              <button
                className="option-pill"
                disabled={!selectedItpId}
                onClick={async () => {
                  await handleSidebarAdvance('Yes - sounds good.')
                  fetch(`${API_URL}/api/skills/dispatch`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ employee: 'lead_gen_expert', skill: 'target_finder_ten_leads', user_details_id: userDetailsId, inputs: { itp_id: selectedItpId } }),
                  })
                }}
              >
                {selectedItpId ? 'Confirm selection' : 'Choose an ITP'}
              </button>
            </div>
          </>
        )}

        {activeSidebar === 'target_finder_upload_csv' && (
          <>
            <div id="right-sidebar-header"></div>
            <div id="right-sidebar-body">
              <div className="sidebar-field">
                <label className="sidebar-field-label">Download Template</label>
                <button className="sidebar-link-btn" onClick={downloadCsvTemplate}>
                  customers_template.csv
                </button>
              </div>
              <div className="sidebar-field">
                <label className="sidebar-field-label">Upload CSV</label>
                <div
                  className={`csv-drop-zone${csvDragOver ? ' drag-over' : ''}`}
                  onDragOver={e => { e.preventDefault(); setCsvDragOver(true) }}
                  onDragLeave={() => setCsvDragOver(false)}
                  onDrop={handleCsvDrop}
                  onClick={() => document.getElementById('csv-file-input-tf').click()}
                >
                  {csvRows.length > 0
                    ? <span>{csvRows.length} customer{csvRows.length !== 1 ? 's' : ''} uploaded</span>
                    : <span>Drag a CSV here, or click to browse</span>
                  }
                </div>
                <input id="csv-file-input-tf" type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCsvDrop} />
              </div>
              {csvRows.length > 0 && (
                <div className="sidebar-field">
                  <label className="sidebar-field-label">Preview</label>
                  <div className="customer-list">
                    {csvRows.map((r, i) => (
                      <div key={i} className="customer-list-item">
                        <span className="customer-name">{r.organisation_name}</span>
                        {r.organisation_website && <span className="customer-website">{r.organisation_website}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div id="right-sidebar-footer">
              <button className="option-pill" onClick={() => handleSidebarAdvance(csvRows.length > 0 ? 'Done' : 'Skip for now')}>
                {csvRows.length > 0 ? 'Done' : 'Skip for now'}
              </button>
            </div>
          </>
        )}

        {activeSidebar === 'target_finder_add_manually' && (
          <>
            <div id="right-sidebar-header"></div>
            <div id="right-sidebar-body">
              <div className="sidebar-field">
                <label className="sidebar-field-label">Organisation Name</label>
                <input
                  className="sidebar-field-input"
                  type="text"
                  placeholder="Acme Corp"
                  value={manualCustomerInput.organisation_name}
                  onChange={e => setManualCustomerInput(prev => ({ ...prev, organisation_name: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handleAddManualCustomer()}
                />
              </div>
              <div className="sidebar-field">
                <label className="sidebar-field-label">Website</label>
                <input
                  className="sidebar-field-input"
                  type="text"
                  placeholder="https://acmecorp.com"
                  value={manualCustomerInput.organisation_website}
                  onChange={e => setManualCustomerInput(prev => ({ ...prev, organisation_website: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handleAddManualCustomer()}
                />
              </div>
              <button className="sidebar-add-btn" onClick={handleAddManualCustomer}>+ Add customer</button>
              {manualCustomers.length > 0 && (
                <div className="sidebar-field" style={{ marginTop: '16px' }}>
                  <label className="sidebar-field-label">Added</label>
                  <div className="customer-list">
                    {manualCustomers.map((c, i) => (
                      <div key={i} className="customer-list-item">
                        <span className="customer-name">{c.organisation_name}</span>
                        {c.organisation_website && <span className="customer-website">{c.organisation_website}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div id="right-sidebar-footer">
              <button className="option-pill" onClick={() => handleSidebarAdvance(manualCustomers.length > 0 ? 'Done' : 'Skip for now')}>
                {manualCustomers.length > 0 ? 'Done' : 'Skip for now'}
              </button>
            </div>
          </>
        )}
      </aside>}

    </div>
  )
}

export default App
