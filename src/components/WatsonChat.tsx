import React from 'react'
import { Message, StepOption } from '../types/index'
import MessageBubble from './MessageBubble'

interface WatsonChatProps {
  messages: Message[]
  options: StepOption[] | null
  isTyping: boolean
  inputValue: string
  input_bar_enabled: boolean
  activeSidebar: string | null
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
  messagesEndRef,
  onOptionSelect,
  onSend,
  onInputChange,
  onKeyDown,
  formatTime,
}) => {
  return (
    <>
      <div id="main-body">
        {messages.map((msg, i) => (
          <MessageBubble key={msg.id ?? i} message={msg} formatTime={formatTime} />
        ))}

        {options && (
          <div className="msg-row user">
            <div id="option-pills">
              {options.map(opt => (
                <button key={opt.id} className="option-pill" onClick={() => onOptionSelect(opt)}>
                  {opt.message}
                </button>
              ))}
            </div>
          </div>
        )}

        {isTyping && (
          <div className="msg-row agent">
            <div className="bubble agent typing-bubble">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div id="input-bar">
        <div id="input-wrap">
          <input
            type="text"
            placeholder="Your message"
            id="message-input"
            value={inputValue}
            onChange={e => onInputChange(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <div id="input-actions">
            <button id="mic-btn" aria-label="Voice input">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            </button>
            <button id="send-btn" aria-label="Send" disabled={!input_bar_enabled || !!activeSidebar} onClick={onSend}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5"/>
                <polyline points="5 12 12 5 19 12"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default WatsonChat
