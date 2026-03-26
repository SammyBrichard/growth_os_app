import React from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'
import { Message } from '../types/index'

interface MessageBubbleProps {
  message: Message
  formatTime: (date: string | Date) => string
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, formatTime }) => {
  return (
    <div className={message.is_agent ? 'msg-row agent' : 'msg-row user'}>
      <div className={message.is_agent ? 'bubble agent' : 'bubble user'}>
        <div className="bubble-body">
          <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{message.message_body}</ReactMarkdown>
        </div>
        <p className="bubble-time">{formatTime(message.created_at ?? message.timestamp ?? new Date())}</p>
      </div>
    </div>
  )
}

export default MessageBubble
