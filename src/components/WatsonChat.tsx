import React from 'react'
import { Message, StepOption } from '../types/index'
import MessageBubble from './MessageBubble'
import SkillStatusBubble from './SkillStatusBubble'
import type { SkillStatus } from '../hooks/useSkillStatus'

interface WatsonChatProps {
  messages: Message[]
  options: StepOption[] | null
  isTyping: boolean
  inputValue: string
  input_bar_enabled: boolean
  activeSidebar: string | null
  activeSkills: SkillStatus[]
  messagesEndRef: React.RefObject<HTMLDivElement | null>
  onOptionSelect: (opt: StepOption) => void
  onSend: () => void
  onInputChange: (value: string) => void
  onKeyDown: (e: React.KeyboardEvent) => void
  formatTime: (date: string | Date) => string
}

const WatsonChat: React.FC<WatsonChatProps> = ({
  messages,
  options,
  isTyping,
  inputValue,
  input_bar_enabled,
  activeSidebar,
  activeSkills,
  messagesEndRef,
  onOptionSelect,
  onSend,
  onInputChange,
  onKeyDown,
  formatTime,
}) => {
  return (
    <>
      <div className="chat-messages">
        {messages.map((msg, i) => {
          // Show agent label above first message in a consecutive run of agent messages
          const showLabel = msg.is_agent && (i === 0 || !messages[i - 1]?.is_agent)
          return (
            <div key={msg.id ?? i} className="msg-animate">
              {showLabel && <div className="agent-label">WATSON</div>}
              <MessageBubble message={msg} formatTime={formatTime} />
            </div>
          )
        })}

        {options && (
          <div className="msg-animate">
            <div className="options-row">
              {options.map(opt => (
                <button key={opt.id} className="option-pill" onClick={() => onOptionSelect(opt)}>
                  {opt.message}
                </button>
              ))}
            </div>
          </div>
        )}

        {isTyping && (
          <div className="msg-animate">
            <div className="typing-dots">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          </div>
        )}

        <SkillStatusBubble activeSkills={activeSkills} />

        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <div className="chat-input-line">
          <input
            type="text"
            placeholder="Your message"
            className="chat-input"
            value={inputValue}
            onChange={e => onInputChange(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <button
            className="chat-send-btn"
            disabled={!input_bar_enabled || !!activeSidebar}
            onClick={onSend}
          >
            Send
          </button>
        </div>
      </div>
    </>
  )
}

export default WatsonChat
