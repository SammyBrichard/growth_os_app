import type { SkillStatus } from '../hooks/useSkillStatus'

interface SkillStatusBubbleProps {
  activeSkills: SkillStatus[]
}

export default function SkillStatusBubble({ activeSkills }: SkillStatusBubbleProps) {
  if (activeSkills.length === 0) return null

  return (
    <>
      {activeSkills.map((skill) => (
        <div key={`${skill.employee}/${skill.skill}`} className="msg-animate">
          <p className="skill-status-text">
            {skill.message ?? `Working on it...`}
          </p>
        </div>
      ))}
    </>
  )
}
