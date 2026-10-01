import React, { useState } from 'react';
import { Chat, GreenApiCredentials } from '../types';
import { PollingStatus } from '../hooks/useGreenApiPolling';
import { formatChatListTime, getInitials } from '../utils/helpers';
import {
  MessageSquarePlus,
  KeyRound,
  Search,
  Volume2,
  VolumeX,
  LogOut,
  RefreshCw,
  Check,
  CheckCheck,
  Trash2,
  X,
  Activity,
} from 'lucide-react';

interface SidebarProps {
  chats: Chat[];
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onOpenNewChat: () => void;
  onOpenAuth: () => void;
  onDeleteChat: (chatId: string) => void;
  credentials: GreenApiCredentials | null;
  pollingStatus: PollingStatus;
  pollingError: string | null;
  receivedCount: number;
  onRestartPolling: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  chats,
  activeChatId,
  onSelectChat,
  onOpenNewChat,
  onOpenAuth,
  onDeleteChat,
  credentials,
  pollingStatus,
  pollingError,
  receivedCount,
  onRestartPolling,
  soundEnabled,
  onToggleSound,
  onLogout,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredChats = chats.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.phoneNumber.toLowerCase().includes(q) ||
      c.chatId.toLowerCase().includes(q) ||
      (c.lastMessage?.text && c.lastMessage.text.toLowerCase().includes(q))
    );
  });

  return (
    <aside className="sidebar">
      {/* Sidebar Top Header */}
      <div className="sidebar-header">
        <div className="sidebar-user-info" onClick={onOpenAuth} title="Настройки инстанса">
          <div className="max-logo-badge">
            <span>MAX</span>
          </div>
          <div className="user-details">
            <span className="user-title">
              {credentials?.idInstance ? `ID: ${credentials.idInstance}` : 'GREEN-API'}
            </span>
            <span className="user-status-text">
              <span className={`status-dot ${pollingStatus === 'error' ? 'dot-red' : 'dot-green'}`} />
              {credentials?.idInstance ? 'Подключен' : 'Не авторизован'}
            </span>
          </div>
        </div>

        <div className="sidebar-header-actions">
          <button
            className="action-btn"
            onClick={onToggleSound}
            title={soundEnabled ? 'Звук включен' : 'Звук выключен'}
          >
            {soundEnabled ? <Volume2 size={19} /> : <VolumeX size={19} color="#888" />}
          </button>

          <button
            className="action-btn"
            onClick={onOpenNewChat}
            title="Новый чат"
          >
            <MessageSquarePlus size={19} />
          </button>

          <button
            className="action-btn"
            onClick={onOpenAuth}
            title="Сменить инстанс / Настройки"
          >
            <KeyRound size={19} />
          </button>

          <button
            className="action-btn btn-logout"
            onClick={onLogout}
            title="Выйти из аккаунта"
          >
            <LogOut size={19} />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="search-bar-wrap">
        <div className="search-input-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Поиск или новый чат..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="search-clear-btn"
              onClick={() => setSearchQuery('')}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Chat List */}
      <div className="chat-list-container">
        {filteredChats.length === 0 ? (
          <div className="empty-chat-list">
            {chats.length === 0 ? (
              <>
                <p>У вас еще нет активных диалогов</p>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={onOpenNewChat}
                >
                  <MessageSquarePlus size={16} /> Создать новый чат
                </button>
              </>
            ) : (
              <p>Чатов по запросу «{searchQuery}» не найдено</p>
            )}
          </div>
        ) : (
          <ul className="chat-list">
            {filteredChats.map((chat) => {
              const isActive = chat.chatId === activeChatId;
              const lastMsg = chat.lastMessage;
              const initials = getInitials(chat.name || chat.phoneNumber);

              return (
                <li
                  key={chat.chatId}
                  className={`chat-item ${isActive ? 'active' : ''}`}
                  onClick={() => onSelectChat(chat.chatId)}
                >
                  <div
                    className="chat-avatar"
                    style={{ backgroundColor: chat.avatarColor }}
                  >
                    <span>{initials}</span>
                  </div>

                  <div className="chat-info">
                    <div className="chat-row-top">
                      <span className="chat-name">{chat.name}</span>
                      <span className="chat-time">
                        {formatChatListTime(lastMsg?.timestamp || chat.createdAt)}
                      </span>
                    </div>

                    <div className="chat-row-bottom">
                      <div className="chat-last-message">
                        {lastMsg ? (
                          <>
                            {lastMsg.isOutgoing && (
                              <span className="msg-status-icon">
                                {lastMsg.status === 'read' ? (
                                  <CheckCheck size={14} color="#0077ff" />
                                ) : lastMsg.status === 'delivered' ? (
                                  <CheckCheck size={14} color="#888" />
                                ) : (
                                  <Check size={14} color="#888" />
                                )}
                              </span>
                            )}
                            <span className="last-msg-text">{lastMsg.text}</span>
                          </>
                        ) : (
                          <span className="no-msgs-yet">Нет сообщений</span>
                        )}
                      </div>

                      <div className="chat-badges">
                        {chat.unreadCount > 0 && (
                          <span className="unread-badge">{chat.unreadCount}</span>
                        )}
                        <button
                          className="btn-delete-chat"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Удалить чат с ${chat.name}?`)) {
                              onDeleteChat(chat.chatId);
                            }
                          }}
                          title="Удалить чат"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Polling Footer Status */}
      <div className="sidebar-footer-status">
        <div className="status-indicator-group" title={pollingError || 'Опрос очереди HTTP API'}>
          <Activity
            size={14}
            className={`polling-pulse ${pollingStatus === 'polling' ? 'pulse-anim' : ''}`}
            color={
              pollingStatus === 'error'
                ? '#e53935'
                : pollingStatus === 'processing'
                ? '#f57c00'
                : '#00a884'
            }
          />
          <span className="footer-status-text">
            {pollingStatus === 'error'
              ? 'Ошибка сети'
              : pollingStatus === 'processing'
              ? 'Обработка...'
              : 'HTTP API: онлайн'}
          </span>
          {receivedCount > 0 && (
            <span className="received-badge" title="Получено уведомлений за сессию">
              +{receivedCount}
            </span>
          )}
        </div>

        <button
          className="btn-icon-tiny"
          onClick={onRestartPolling}
          title="Перезапустить опрос очереди"
        >
          <RefreshCw size={13} />
        </button>
      </div>
    </aside>
  );
};
