import type { SkillStatus } from '../hooks/useSkillStatus'

// Map employee names to their display names
const employeeNames: Record<string, string> = {
  lead_gen_expert: 'Belfort',
  business_analyst: 'Warren',
  email_campaign_manager: 'Draper',
  office_administrator: 'Pepper',
}

interface SkillStatusBubbleProps {
  activeSkills: SkillStatus[]
}

export default function SkillStatusBubble({ activeSkills }: SkillStatusBubbleProps) {
  if (activeSkills.length === 0) return null

  return (
    <>
      {activeSkills.map((skill) => (
        <div key={`${skill.employee}/${skill.skill}`} className="msg-row agent">
          <div className="bubble agent skill-status-bubble">
            <div className="skill-status-content">
              <span className="skill-status-spinner" />
              <span className="skill-status-text">
                {skill.message ?? `${employeeNames[skill.employee] ?? skill.employee} is working on it...`}
              </span>
            </div>
          </div>
        </div>
      ))}
    </>
  )
}
