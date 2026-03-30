import React from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'
import { Message } from '../types/index'

interface MessageBubbleProps {
  message: Message
  formatTime: (date: string | Date) => string
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, formatTime }) => {
  if (message.is_divider) {
    return (
      <div className="chat-session-divider">
        <span className="chat-session-divider-text">{message.message_body}</span>
      </div>
    )
  }

  if (message.is_status) {
    return (
      <p className="skill-status-text">{message.message_body}</p>
    )
  }

  return (
    <div className={`msg-col ${message.is_agent ? 'msg-col-left' : 'msg-col-right'}`}>
      <div className={message.is_agent ? 'bubble-agent' : 'bubble-user'}>
        <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{message.message_body}</ReactMarkdown>
      </div>
      <span className="msg-timestamp">{formatTime(message.created_at ?? message.timestamp ?? new Date())}</span>
    </div>
  )
}

export default MessageBubble
