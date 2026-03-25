import React from 'react'
import { Employee } from '../types/index'

interface EmployeeListProps {
  employees: Employee[]
  selectedEmployee: Employee
  onSelect: (emp: Employee) => void
}

const EmployeeList: React.FC<EmployeeListProps> = ({ employees, selectedEmployee, onSelect }) => {
  return (
    <div id="employee-list">
      {employees.map(emp => (
        <div
          key={emp.name}
          className={`employee-row${selectedEmployee.name === emp.name ? ' selected' : ''}`}
          onClick={() => onSelect(emp)}
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
  )
}

export default EmployeeList
