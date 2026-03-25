import React from 'react'
import { Employee } from '../types/index'
import type { SkillStatus } from '../hooks/useSkillStatus'

// Map display names to employee keys used in skill_status events
const employeeKeyMap: Record<string, string> = {
  Watson: 'cmo',
  Belfort: 'lead_gen_expert',
  Warren: 'business_analyst',
  Pepper: 'office_administrator',
  Draper: 'email_campaign_manager',
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
        const empKey = employeeKeyMap[emp.name]
        const isActive = activeSkills.some(s => s.employee === empKey)
        return (
          <div
            key={emp.name}
            className={`employee-row${selectedEmployee.name === emp.name ? ' selected' : ''}`}
            onClick={() => onSelect(emp)}
          >
            <div className="employee-avatar">
              {emp.img ? <img src={emp.img} alt={emp.name} /> : emp.name[0]}
              {isActive && <span className="employee-activity-dot" />}
            </div>
            <div className="employee-info">
              <span className="employee-name">{emp.name}</span>
              <span className="employee-role">{emp.role}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default EmployeeList
