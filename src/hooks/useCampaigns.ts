import { useState, useEffect, useCallback } from 'react'
import supabase from '../services/supabase'

interface Campaign {
  id: string
  name: string
  status: string
  num_emails: number
  tone: string | null
  subject_line: string | null
  email_template: string | null
  itp_id: string | null
  created_at: string
  contact_count?: number
}

interface CampaignContact {
  id: string
  contact_id: string
  status: string
  sent_at: string | null
  opened_at: string | null
  replied_at: string | null
  email_body: string | null
  contact?: {
    first_name: string
    last_name: string
    email: string
    role: string | null
  }
}

interface UseCampaignsParams {
  accountId: string | null
  selectedEmployee: { name: string }
}

export type { Campaign, CampaignContact }

export default function useCampaigns({ accountId, selectedEmployee }: UseCampaignsParams) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [campaignContacts, setCampaignContacts] = useState<CampaignContact[]>([])

  const fetchCampaigns = useCallback(async () => {
    if (!accountId) return
    const { data } = await supabase
      .from('campaigns')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
    const campaignList = (data ?? []) as Campaign[]

    // Fetch contact counts for each campaign
    const ids = campaignList.map(c => c.id)
    if (ids.length > 0) {
      const { data: ccData } = await supabase
        .from('campaign_contacts')
        .select('campaign_id')
        .in('campaign_id', ids)
      const counts: Record<string, number> = {}
      for (const row of (ccData ?? []) as { campaign_id: string }[]) {
        counts[row.campaign_id] = (counts[row.campaign_id] ?? 0) + 1
      }
      for (const c of campaignList) {
        c.contact_count = counts[c.id] ?? 0
      }
    }

    setCampaigns(campaignList)
  }, [accountId])

  // Load campaigns when Draper is selected
  useEffect(() => {
    if (selectedEmployee.name === 'Draper' && accountId) {
      fetchCampaigns()
    }
  }, [selectedEmployee, accountId, fetchCampaigns])

  // Fetch contacts when a campaign is selected
  useEffect(() => {
    if (!selectedCampaign) {
      setCampaignContacts([])
      return
    }
    supabase
      .from('campaign_contacts')
      .select('*, contacts(first_name, last_name, email, role)')
      .eq('campaign_id', selectedCampaign.id)
      .then(({ data }) => {
        const contacts = (data ?? []).map((row: any) => ({
          ...row,
          contact: row.contacts ?? undefined,
        })) as CampaignContact[]
        setCampaignContacts(contacts)
      })
  }, [selectedCampaign])

  return {
    campaigns,
    selectedCampaign,
    setSelectedCampaign,
    campaignContacts,
    refreshCampaigns: fetchCampaigns,
  }
}
