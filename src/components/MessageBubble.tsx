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
    <div className={`msg-col ${message.is_agent ? 'msg-col-left' : 'msg-col-right'}`}>
      <div className={message.is_agent ? 'bubble-agent' : 'bubble-user'}>
        <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{message.message_body}</ReactMarkdown>
      </div>
      <span className="msg-timestamp">{formatTime(message.created_at ?? message.timestamp ?? new Date())}</span>
    </div>
  )
}

export default MessageBubble
