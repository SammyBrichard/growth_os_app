import { useEffect } from 'react'
import watsonImg from './assets/Watson.png'
import belfortImg from './assets/Belfort.png'
import warrenImg from './assets/Warren.png'
import pepperImg from './assets/Pepper.png'
import { useState } from 'react'
import type { Employee } from './types/index'
import supabase from './services/supabase'

import useAuth from './hooks/useAuth'
import useUserDetails from './hooks/useUserDetails'
import useMessages from './hooks/useMessages'
import useMobilisation from './hooks/useMobilisation'
import useBelfort from './hooks/useBelfort'

import Layout from './components/Layout'
import EmployeeList from './components/EmployeeList'
import WatsonChat from './components/WatsonChat'
import BelfortTargets from './components/BelfortTargets'
import TargetDetailSidebar from './components/TargetDetailSidebar'
import RightSidebar from './components/RightSidebar'
import SettingsPanel from './components/SettingsPanel'

import './App.css'

const API_URL = import.meta.env.VITE_API_URL
const CLIENT_URL = import.meta.env.VITE_CLIENT_URL

const employees: Employee[] = [
  { name: 'Watson', role: 'Chief Marketing Officer', img: watsonImg },
  { name: 'Belfort', role: 'Lead Generation Expert', img: belfortImg },
  { name: 'Warren', role: 'Business Analyst', img: warrenImg },
  { name: 'Pepper', role: 'Office Administrator', img: pepperImg },
]

export default function App() {
  const [activeNav, setActiveNav] = useState('chat')
  const [selectedEmployee, setSelectedEmployee] = useState<Employee>(employees[0])

  const { user } = useAuth()
  const ud = useUserDetails({ user })
  const msg = useMessages({ userFirstNameRef: ud.userFirstNameRef, saveMessage: ud.saveMessage })
  const mob = useMobilisation({
    userDetailsId: ud.userDetailsId,
    user,
    setMessages: msg.setMessages,
    setIsTyping: msg.setIsTyping,
    showStepMessages: msg.showStepMessages,
    saveMessage: ud.saveMessage,
  })
  const bel = useBelfort({
    accountId: ud.accountId,
    userDetailsId: ud.userDetailsId,
    selectedEmployee,
  })

  // Initialise user details + wire up subscriptions once user is loaded
  useEffect(() => {
    if (!user || ud.initialiseRan.current) return
    ud.initialiseRan.current = true
    ;(async () => {
      const details = await ud.initialise()
      if (!details) return
      const msgs = await ud.loadMessages(details.id)
      msg.setMessages(msgs)
      ud.subscribeToMessages(details.id, {
        setIsTyping: msg.setIsTyping,
        setMessages: msg.setMessages,
        startMobilisation: mob.startMobilisation,
      })
      if (!details.signup_complete) {
        if (details.active_mobilisation && details.active_step_id) {
          mob.resumeMobilisation(details.active_mobilisation, details.active_step_id, details.id)
        } else {
          mob.startMobilisation('sign_up_get_website')
        }
      } else {
        mob.setInputBarEnabled(true)
      }
    })()
  }, [user])

  // Auto-scroll on new messages or typing
  useEffect(() => {
    msg.messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msg.messages, msg.isTyping])

  // Auto-scroll when sidebar opens
  useEffect(() => {
    if (mob.activeSidebar) {
      setTimeout(() => msg.messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 150)
    }
    if (mob.activeSidebar === 'select_itp' && ud.accountId) {
      mob.loadItpList(ud.accountId)
    }
  }, [mob.activeSidebar])

  // Check for latest sidebar-bearing message
  useEffect(() => {
    const latest = msg.messages[msg.messages.length - 1]
    if (latest?.sidebar) {
      mob.setActiveSidebar(latest.sidebar)
      mob.setSidebarData(() => latest.sidebar_info ?? {})
    }
    if (latest?.is_agent && !mob.mobilisation_active) {
      mob.setInputBarEnabled(true)
    }
  }, [msg.messages])

  // Watson tab: check queued mobilisations
  useEffect(() => {
    if (selectedEmployee.name === 'Watson') {
      setTimeout(() => msg.messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      if (ud.userDetailsId && !mob.mobilisation_active && !mob.queueChecked) {
        mob.setQueueChecked(true)
        mob.checkQueuedMobilisations()
      }
    }
    if (selectedEmployee.name !== 'Watson') mob.setQueueChecked(false)
  }, [selectedEmployee, mob.mobilisation_active, ud.userDetailsId])

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = CLIENT_URL
  }

  if (user === undefined) return null
  if (user === null) return <p>Not logged in</p>

  return (
    <Layout
      activeNav={activeNav}
      setActiveNav={setActiveNav}
      employeeList={
        <EmployeeList
          employees={employees}
          selectedEmployee={selectedEmployee}
          onSelect={setSelectedEmployee}
        />
      }
    >
      {activeNav === 'settings' && (
        <SettingsPanel userDetailsId={ud.userDetailsId} onLogout={handleLogout} />
      )}

      {activeNav === 'chat' && (
        <div id="main-content" className={mob.activeSidebar ? 'compressed' : ''}>
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
            <WatsonChat
              messages={msg.messages}
              options={mob.options}
              isTyping={msg.isTyping}
              inputValue={mob.inputValue}
              input_bar_enabled={mob.input_bar_enabled}
              activeSidebar={mob.activeSidebar}
              messagesEndRef={msg.messagesEndRef}
              onOptionSelect={mob.handleOptionSelect}
              onSend={mob.handleSend}
              onInputChange={(v) => mob.setInputValue(v)}
              onKeyDown={mob.handleKeyDown}
              formatTime={msg.formatTime}
            />
          ) : selectedEmployee.name === 'Belfort' ? (
            <BelfortTargets
              belfortItps={bel.belfortItps}
              belfortSelectedItpId={bel.belfortSelectedItpId}
              belfortTargets={bel.belfortLeads}
              belfortSubTab={bel.belfortSubTab}
              selectedTarget={bel.selectedLead}
              onSelectItp={(id) => { bel.setBelfortSelectedItpId(id); bel.setExpandedLeadId(null) }}
              onSelectSubTab={(tab) => { bel.setBelfortSubTab(tab as 'needs_approval' | 'approved'); bel.setSelectedLead(null) }}
              onSelectTarget={bel.setSelectedLead}
            />
          ) : (
            <div id="main-body" />
          )}
        </div>
      )}

      {activeNav === 'chat' && bel.selectedLead && (
        <TargetDetailSidebar
          target={bel.selectedLead}
          onClose={() => bel.setSelectedLead(null)}
          onApprove={bel.approveLead}
          onReject={(lead, reason) => bel.rejectLead({ ...lead, rejection_reason: reason })}
        />
      )}

      {activeNav === 'chat' && mob.activeSidebar && (
        <RightSidebar
          activeSidebar={mob.activeSidebar}
          sidebarData={mob.sidebarData}
          setSidebarData={mob.setSidebarData}
          onSaveCompanyDetails={mob.handleSaveCompanyDetails}
          onSidebarAdvance={mob.handleSidebarAdvance}
          onSaveItp={mob.handleSaveItp}
          itpList={mob.itpList}
          selectedItpId={mob.selectedItpId}
          setSelectedItpId={mob.setSelectedItpId}
          manualCustomers={mob.manualCustomers}
          manualCustomerInput={mob.manualCustomerInput}
          setManualCustomerInput={mob.setManualCustomerInput}
          onAddManualCustomer={mob.handleAddManualCustomer}
          csvRows={mob.csvRows}
          csvDragOver={mob.csvDragOver}
          setCsvDragOver={mob.setCsvDragOver}
          onCsvDrop={mob.handleCsvDrop}
          onDownloadCsvTemplate={mob.downloadCsvTemplate}
          userDetailsId={ud.userDetailsId}
          API_URL={API_URL}
        />
      )}
    </Layout>
  )
}
