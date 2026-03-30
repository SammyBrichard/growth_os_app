import { useEffect, useRef } from 'react'
import watsonImg from './assets/Watson.png'
import belfortImg from './assets/Belfort.png'
import warrenImg from './assets/Warren.png'
import pepperImg from './assets/Pepper.png'
import draperImg from './assets/Watson.png'
import { useState } from 'react'
import type { Employee } from './types/index'
import supabase from './services/supabase'

import useAuth from './hooks/useAuth'
import useUserDetails from './hooks/useUserDetails'
import useMessages from './hooks/useMessages'
import useMobilisation from './hooks/useMobilisation'
import useBelfort from './hooks/useBelfort'
import useCampaigns from './hooks/useCampaigns'
import useSkillStatus from './hooks/useSkillStatus'

import Layout from './components/Layout'
import EmployeeList from './components/EmployeeList'
import WatsonChat from './components/WatsonChat'
import BelfortTargets from './components/BelfortTargets'
import CampaignManager from './components/CampaignManager'
import TargetDetailSidebar from './components/TargetDetailSidebar'
import RightSidebar from './components/RightSidebar'
import SettingsPanel from './components/SettingsPanel'
import ContactDetailSidebar from './components/ContactDetailSidebar'
import type { CampaignContact } from './hooks/useCampaigns'

import './App.css'

const API_URL = import.meta.env.VITE_API_URL
const CLIENT_URL = import.meta.env.VITE_CLIENT_URL

const employees: Employee[] = [
  { name: 'Watson', role: 'Chief Marketing Officer', img: watsonImg },
  { name: 'Belfort', role: 'Lead Generation Expert', img: belfortImg },
  { name: 'Warren', role: 'Business Analyst', img: warrenImg },
  { name: 'Pepper', role: 'Office Administrator', img: pepperImg },
  { name: 'Draper', role: 'Campaign Manager', img: draperImg },
]

export default function App() {
  const [activeNav, setActiveNav] = useState('chat')
  const [selectedEmployee, setSelectedEmployee] = useState<Employee>(employees[0])
  const [selectedCampaignContact, setSelectedCampaignContact] = useState<CampaignContact | null>(null)
  const [fromClient] = useState(() => {
    // Detect magic link redirect: Supabase puts tokens in the hash fragment
    const hash = window.location.hash
    return hash.includes('access_token') || hash.includes('type=magiclink')
  })

  const { user } = useAuth()
  const ud = useUserDetails({ user })
  const msg = useMessages({ userFirstNameRef: ud.userFirstNameRef, saveMessage: ud.saveMessage })
  const mob = useMobilisation({
    userDetailsId: ud.userDetailsId,
    accountId: ud.accountId,
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
  const camp = useCampaigns({
    accountId: ud.accountId,
    userDetailsId: ud.userDetailsId,
    selectedEmployee,
    firstname: ud.userFirstNameRef?.current,
  })
  const { activeSkills } = useSkillStatus({ userDetailsId: ud.userDetailsId })

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

        // Welcome back: contextual greeting + state restoration
        if (msgs.length > 0) {
          try {
            const wbRes = await fetch(`${API_URL}/api/messages/welcome-back`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ user_details_id: details.id }),
            })
            const wb = await wbRes.json()
            if (!wb.skip && wb.restore) {
              if (wb.restore.sidebar) {
                mob.setActiveSidebar(wb.restore.sidebar)
                mob.setSidebarData(() => wb.restore.sidebar_info ?? {})
              }
              if (wb.restore.mobilisation) {
                mob.resumeMobilisation(wb.restore.mobilisation, wb.restore.step_id, details.id)
              }
            }
          } catch (err) {
            console.error('[welcome-back] error:', err)
          }
        }
      }
    })()
  }, [user])

  // Load ITPs when sidebar opens
  useEffect(() => {
    if ((mob.activeSidebar === 'select_itp' || mob.activeSidebar === 'select_campaign_itp') && ud.accountId) {
      mob.loadItpList()
    }
  }, [mob.activeSidebar])

  // Track previous message count to detect genuinely new messages
  const prevMessageCount = useRef(0)

  // Check for latest sidebar-bearing message (only on NEW messages, not initial load)
  useEffect(() => {
    const isNewMessage = msg.messages.length > prevMessageCount.current
    prevMessageCount.current = msg.messages.length

    if (!isNewMessage) return

    const latest = msg.messages[msg.messages.length - 1]
    if (latest?.sidebar) {
      mob.setActiveSidebar(latest.sidebar)
      mob.setSidebarData(() => latest.sidebar_info ?? {})
    }
    if (latest?.navigate_to) {
      const target = employees.find(e => e.name === latest.navigate_to)
      if (target) setSelectedEmployee(target)
    }
    if (latest?.is_agent && !mob.mobilisation_active) {
      mob.setInputBarEnabled(true)
    }
  }, [msg.messages])

  // Watson tab: check queued mobilisations
  useEffect(() => {
    if (selectedEmployee.name === 'Watson') {
      if (ud.userDetailsId && !mob.mobilisation_active && !mob.queueChecked) {
        mob.setQueueChecked(true)
        mob.checkQueuedMobilisations()
      }
    }
    if (selectedEmployee.name !== 'Watson') mob.setQueueChecked(false)
  }, [selectedEmployee, mob.mobilisation_active, ud.userDetailsId])

  async function handleApprovalComplete(approved: number, rejected: number, hasReasons: boolean) {
    mob.setActiveSidebar(null)

    // Check total approved across all rounds
    const { data: allLeads } = await supabase
      .from('leads')
      .select('id')
      .eq('itp_id', mob.sidebarData.itp_id)
      .eq('approved', true)

    const totalApproved = allLeads?.length ?? 0

    if (totalApproved >= 10) {
      // ITP is validated — trigger campaign creation
      mob.startMobilisation('ten_approved_leads_found')
    } else if (rejected > 0 && hasReasons) {
      // Need to refine ITP and find more
      fetch(`${API_URL}/api/skills/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee: 'lead_gen_expert',
          skill: 'itp_refiner',
          user_details_id: ud.userDetailsId,
          inputs: { itp_id: mob.sidebarData.itp_id },
        }),
      }).catch(err => console.error('itp_refiner dispatch error:', err))
    } else {
      // Rejections without reasons — just find more
      fetch(`${API_URL}/api/skills/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee: 'lead_gen_expert',
          skill: 'target_finder_ten_leads',
          user_details_id: ud.userDetailsId,
          inputs: { itp_id: mob.sidebarData.itp_id },
        }),
      }).catch(err => console.error('target_finder dispatch error:', err))
    }
  }

  async function handleTemplateApprove(updatedSequence: any[]) {
    const campaignId = mob.sidebarData.campaign_id
    const firstEmail = updatedSequence[0] ?? {}
    await supabase
      .from('campaigns')
      .update({
        subject_line: firstEmail.subject ?? '',
        email_template: firstEmail.body ?? '',
        email_sequence: updatedSequence,
      })
      .eq('id', campaignId)

    mob.setActiveSidebar(null)
    await mob.startMobilisation('review_campaign')
    // Set campaign_id AFTER startMobilisation (which clears responses)
    mob.mobilisationResponsesRef.current = { ...mob.mobilisationResponsesRef.current, campaign_id: campaignId }
    mob.setMobilisationResponses((prev: Record<string, string>) => ({ ...prev, campaign_id: campaignId }))
  }

  async function handleSenderSelect(senderId: string) {
    // Save sender_id directly to the campaign in DB so sync_to_smartlead picks it up
    const campaignId = mob.mobilisationResponsesRef.current.campaign_id
    if (campaignId) {
      await supabase.from('campaigns').update({ sender_id: senderId }).eq('id', campaignId)
    }
    mob.mobilisationResponsesRef.current = { ...mob.mobilisationResponsesRef.current, sender_id: senderId }
    mob.setMobilisationResponses((prev: Record<string, string>) => ({ ...prev, sender_id: senderId }))
    mob.handleSidebarAdvance('Sender selected')
  }

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
          activeSkills={activeSkills}
        />
      }
    >
      {activeNav === 'settings' && (
        <SettingsPanel userDetailsId={ud.userDetailsId} onLogout={handleLogout} />
      )}

      {activeNav === 'chat' && (<>
        {/* Employee panel — visible when not on Watson */}
        <div id="employee-panel" className={selectedEmployee.name === 'Watson' ? 'panel-hidden' : 'panel-visible'}>
          <div className="dashboard-topbar">
            <div className="topbar-agent-status">
              <span className="topbar-agent-icon">◆</span>
              <span className="topbar-agent-name">{selectedEmployee.name}</span>
              <span className="topbar-active-dot">● Active</span>
            </div>
            <div className="topbar-nav">
              <button
                className={`topbar-nav-link${selectedEmployee.name === 'Draper' ? ' active' : ''}`}
                onClick={() => setSelectedEmployee(employees.find(e => e.name === 'Draper')!)}
              >
                Campaigns
              </button>
              <button className="topbar-nav-link">Analytics</button>
              <button className="topbar-nav-link" onClick={() => setActiveNav('settings')}>Settings</button>
            </div>
          </div>
          {selectedEmployee.name === 'Belfort' && (
            <BelfortTargets
              belfortItps={bel.belfortItps}
              belfortSelectedItpId={bel.belfortSelectedItpId}
              belfortLeads={bel.belfortLeads}
              belfortSubTab={bel.belfortSubTab}
              selectedLead={bel.selectedLead}
              onSelectItp={(id) => { bel.setBelfortSelectedItpId(id); bel.setExpandedLeadId(null) }}
              onSelectSubTab={(tab) => { bel.setBelfortSubTab(tab as 'needs_approval' | 'approved'); bel.setSelectedLead(null) }}
              onSelectLead={bel.setSelectedLead}
            />
          )}
          {selectedEmployee.name === 'Draper' && (
            <CampaignManager
              campaigns={camp.campaigns}
              selectedCampaign={camp.selectedCampaign}
              onSelectCampaign={camp.setSelectedCampaign}
              campaignContacts={camp.campaignContacts}
              campaignItp={camp.campaignItp}
              selectedContact={selectedCampaignContact}
              onSelectContact={setSelectedCampaignContact}
              draperSummary={camp.draperSummary}
            />
          )}
        </div>

        {/* Watson chat — always rendered, transitions between full and sidebar */}
        <div id="watson-panel" className={`${selectedEmployee.name === 'Watson' ? 'watson-full' : (mob.activeSidebar || bel.selectedLead || selectedCampaignContact) ? 'watson-hidden' : 'watson-sidebar'}${fromClient ? ' from-client' : ''}${camp.selectedCampaign ? ' watson-narrow' : ''}`}>
          {selectedEmployee.name !== 'Watson' && (
            <div className="watson-sidebar-header">
              <div className="topbar-agent-status">
                <span className="topbar-agent-icon">◆</span>
                <span className="topbar-agent-name">Watson</span>
                <span className="topbar-active-dot">● Active</span>
              </div>
            </div>
          )}
          {selectedEmployee.name === 'Watson' && (
            <div className="dashboard-topbar">
              <div className="topbar-agent-status">
                <span className="topbar-agent-icon">◆</span>
                <span className="topbar-agent-name">Watson</span>
                <span className="topbar-active-dot">● Active</span>
              </div>
              <div className="topbar-nav">
                <button
                  className={`topbar-nav-link${selectedEmployee.name === 'Draper' ? ' active' : ''}`}
                  onClick={() => setSelectedEmployee(employees.find(e => e.name === 'Draper')!)}
                >
                  Campaigns
                </button>
                <button className="topbar-nav-link">Analytics</button>
                <button className="topbar-nav-link" onClick={() => setActiveNav('settings')}>Settings</button>
              </div>
            </div>
          )}
          <WatsonChat
            messages={msg.messages}
            options={mob.options}
            isTyping={msg.isTyping}
            inputValue={mob.inputValue}
            input_bar_enabled={mob.input_bar_enabled}
            activeSidebar={mob.activeSidebar}
            activeSkills={activeSkills}
            messagesEndRef={msg.messagesEndRef}
            onOptionSelect={mob.handleOptionSelect}
            onSend={mob.handleSend}
            onInputChange={(v) => mob.setInputValue(v)}
            onKeyDown={mob.handleKeyDown}
            formatTime={msg.formatTime}
            compact={selectedEmployee.name !== 'Watson'}
          />
        </div>
      </>)}

      {activeNav === 'chat' && bel.selectedLead && (
        <TargetDetailSidebar
          lead={bel.selectedLead}
          onClose={() => bel.setSelectedLead(null)}
          onApprove={bel.approveLead}
          onReject={(lead, reason) => bel.rejectLead({ ...lead, rejection_reason: reason })}
        />
      )}

      {activeNav === 'chat' && selectedCampaignContact && (
        <ContactDetailSidebar
          contact={selectedCampaignContact}
          onClose={() => setSelectedCampaignContact(null)}
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
          onApprovalComplete={handleApprovalComplete}
          accountId={ud.accountId}
          onTemplateApprove={handleTemplateApprove}
          onSenderSelect={handleSenderSelect}
          onClose={() => mob.setActiveSidebar(null)}
          narrow={!!camp.selectedCampaign}
        />
      )}
    </Layout>
  )
}
