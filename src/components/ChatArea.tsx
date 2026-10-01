import React, { useState, useEffect, useRef } from 'react';
import { Chat, Message } from '../types';
import { formatMessageTime, getInitials } from '../utils/helpers';
import {
  Send,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  MoreVertical,
  Trash2,
  Phone,
  ArrowDown,
  Smile,
  Shield,
  Loader2,
} from 'lucide-react';

interface ChatAreaProps {
  chat: Chat;
  messages: Message[];
  onSendMessage: (text: string) => Promise<void>;
  onClearHistory: (chatId: string) => void;
  isSending: boolean;
}

const QUICK_EMOJIS = ['👋', '👍', '😊', '🔥', '🚀', '✅', '🤝'];

export const ChatArea: React.FC<ChatAreaProps> = ({
  chat,
  messages,
  onSendMessage,
  onClearHistory,
  isSending,
}) => {
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
    });
  };

  useEffect(() => {
    scrollToBottom(false);
  }, [chat.chatId]);

  useEffect(() => {
    scrollToBottom(true);
  }, [messages.length]);

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
    setShowScrollBottom(!isNearBottom);
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const textToSend = inputText.trim();
    if (!textToSend || isSending) return;

    setSendError(null);
    setInputText('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      await onSendMessage(textToSend);
      scrollToBottom(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSendError(msg);
      // Restore input text so user does not lose it
      setInputText(textToSend);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    // Auto-adjust textarea height
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const addEmoji = (emoji: string) => {
    setInputText((prev) => prev + emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  const initials = getInitials(chat.name || chat.phoneNumber);

  return (
    <main className="chat-area">
      {/* Chat Top Header */}
      <header className="chat-header">
        <div className="chat-header-user">
          <div
            className="chat-avatar avatar-header"
            style={{ backgroundColor: chat.avatarColor }}
          >
            <span>{initials}</span>
          </div>
          <div className="header-meta">
            <h2 className="header-contact-name">{chat.name}</h2>
            <div className="header-contact-sub">
              <span className="phone-sub">{chat.phoneNumber}</span>
              <span className="bullet-sep">•</span>
              <span className="chat-id-sub" title={chat.chatId}>
                MAX: {chat.chatId}
              </span>
            </div>
          </div>
        </div>

        <div className="chat-header-tools">
          <button
            className="tool-btn"
            onClick={() => {
              if (window.confirm('Очистить историю сообщений в этом чате?')) {
                onClearHistory(chat.chatId);
              }
            }}
            title="Очистить историю чата"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </header>

      {/* Messages Scroll Area */}
      <div
        className="messages-container"
        ref={messagesContainerRef}
        onScroll={handleScroll}
      >
        {/* Intro security badge */}
        <div className="chat-intro-badge">
          <Shield size={14} color="#0077ff" />
          <span>
            Отправка и получение сообщений через <strong>GREEN-API</strong>. Защищенный шлюз мессенджера MAX.
          </span>
        </div>

        {messages.length === 0 ? (
          <div className="empty-chat-placeholder">
            <div className="placeholder-icon">
              <Phone size={32} color="#0077ff" />
            </div>
            <h3>Диалог с {chat.name}</h3>
            <p>
              Напишите первое сообщение, и оно будет немедленно доставлено получателю в мессенджер MAX!
            </p>
          </div>
        ) : (
          <div className="messages-list">
            {messages.map((msg, index) => {
              const isFirstInGroup =
                index === 0 || messages[index - 1].isOutgoing !== msg.isOutgoing;

              return (
                <div
                  key={msg.id || index}
                  className={`message-row ${msg.isOutgoing ? 'row-outgoing' : 'row-incoming'} ${
                    isFirstInGroup ? 'group-first' : ''
                  }`}
                >
                  <div className={`message-bubble ${msg.isOutgoing ? 'bubble-outgoing' : 'bubble-incoming'}`}>
                    {!msg.isOutgoing && msg.senderName && (
                      <span className="msg-sender-title">{msg.senderName}</span>
                    )}

                    <div className="msg-text-content">{msg.text}</div>

                    <div className="msg-meta">
                      <span className="msg-timestamp">
                        {formatMessageTime(msg.timestamp)}
                      </span>

                      {msg.isOutgoing && (
                        <span className="msg-delivery-status" title={`Статус: ${msg.status}`}>
                          {msg.status === 'sending' ? (
                            <Clock size={12} className="status-clock" />
                          ) : msg.status === 'failed' ? (
                            <AlertCircle size={12} color="#e53935" />
                          ) : msg.status === 'read' ? (
                            <CheckCheck size={14} color="#0077ff" />
                          ) : msg.status === 'delivered' ? (
                            <CheckCheck size={14} color="#667781" />
                          ) : (
                            <Check size={14} color="#667781" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Scroll to bottom button */}
        {showScrollBottom && (
          <button
            className="scroll-bottom-fab"
            onClick={() => scrollToBottom(true)}
            title="Прокрутить вниз"
          >
            <ArrowDown size={18} />
          </button>
        )}
      </div>

      {/* Send Error Toast */}
      {sendError && (
        <div className="send-error-toast">
          <AlertCircle size={16} />
          <span>{sendError}</span>
          <button onClick={() => setSendError(null)}>✕</button>
        </div>
      )}

      {/* Quick Emoji Bar */}
      {showEmojiPicker && (
        <div className="quick-emojis-bar">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="emoji-btn"
              onClick={() => addEmoji(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Message Input Container */}
      <footer className="chat-input-bar">
        <form onSubmit={handleSend} className="input-form">
          <button
            type="button"
            className={`btn-input-accessory ${showEmojiPicker ? 'active' : ''}`}
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            title="Эмодзи"
          >
            <Smile size={20} />
          </button>

          <textarea
            ref={textareaRef}
            rows={1}
            value={inputText}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Напишите сообщение в MAX..."
            disabled={isSending}
            autoFocus
          />

          <button
            type="submit"
            className={`btn-send-message ${inputText.trim() ? 'has-text' : ''}`}
            disabled={!inputText.trim() || isSending}
            title="Отправить (Enter)"
          >
            {isSending ? (
              <Loader2 size={18} className="spin" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </form>
      </footer>
    </main>
  );
};
