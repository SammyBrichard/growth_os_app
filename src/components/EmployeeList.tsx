import React from 'react'
import { Employee } from '../types/index'
import type { SkillStatus } from '../hooks/useSkillStatus'

const AGENT_EMOJIS: Record<string, string> = {
  Watson: '◆', Belfort: '◇', Warren: '△', Pepper: '○', Draper: '▽'
}

const AGENT_SKILL_MAP: Record<string, string> = {
  Watson: 'cmo', Belfort: 'lead_gen_expert', Warren: 'business_analyst',
  Pepper: 'office_administrator', Draper: 'email_campaign_manager'
}

interface EmployeeListProps {
  employees: Employee[]
  selectedEmployee: Employee
  onSelect: (emp: Employee) => void
  activeSkills: SkillStatus[]
}

const EmployeeList: React.FC<EmployeeListProps> = ({ employees, selectedEmployee, onSelect, activeSkills }) => {
  return (
    <div id="employee-list">
      {employees.map(emp => {
        const empKey = AGENT_SKILL_MAP[emp.name]
        const activeSkill = activeSkills.find(s => s.employee === empKey)
        const isActive = selectedEmployee.name === emp.name
        return (
          <div
            key={emp.name}
            className={`agent-item${isActive ? ' active' : ''}`}
            onClick={() => onSelect(emp)}
          >
            <span className="agent-emoji">{AGENT_EMOJIS[emp.name] ?? '●'}</span>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span className={`agent-name${isActive ? ' active' : ''}`}>{emp.name}</span>
              <span className="agent-role">{emp.role}</span>
              {activeSkill && (
                <span className="agent-working">{activeSkill.sidebar_message ?? 'Working...'}</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default EmployeeList
