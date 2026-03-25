export interface Employee {
  name: string
  role: string
  img: string
}

export interface Message {
  id?: string
  tempId?: string
  message_body: string
  is_agent: boolean
  created_at?: string
  timestamp?: Date
  sidebar?: string
  sidebar_info?: Record<string, any>
}

export interface MobilisationStep {
  id: string
  type: 'free_type' | 'option_set' | 'ai_message' | 'ai_message_with_options' | 'end_flow' | 'sidebar' | 'validate'
  messages: string[]
  next_id?: string
  response_key?: string
  options?: StepOption[]
  sidebar?: string
}

export interface StepOption {
  id: number
  message: string
  next_id?: string
}

export interface Lead {
  id: string
  title: string | null
  link: string
  score: number
  score_reason: string | null
  approved?: boolean
  rejected?: boolean
  rejection_reason?: string | null
}

export interface ITP {
  id: string
  name: string | null
  account_id?: string
  itp_summary?: string | null
  itp_demographic?: string | null
  itp_pain_points?: string | null
  itp_buying_trigger?: string | null
  location?: string | null
  created_at?: string
}

export interface CustomerInput {
  organisation_name: string
  organisation_website: string
}
