import React, { useState, useEffect, useCallback } from 'react';
import { GreenApiCredentials, Chat, Message } from './types';
import { sendTextMessage, formatPhoneAndChatId } from './services/api';
import { useGreenApiPolling } from './hooks/useGreenApiPolling';
import { playNotificationSound } from './utils/sound';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { EmptyState } from './components/EmptyState';
import { AuthModal } from './components/AuthModal';
import { NewChatModal } from './components/NewChatModal';
import { getAvatarColor } from './utils/helpers';
import './style.css';

const STORAGE_KEYS = {
  CREDENTIALS: 'green_api_credentials',
  CHATS: 'green_api_chats',
  MESSAGES: 'green_api_messages',
  SOUND: 'green_api_sound_enabled',
};

export const App: React.FC = () => {
  // 1. Credentials
  const [credentials, setCredentials] = useState<GreenApiCredentials | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CREDENTIALS);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // 2. Chats
  const [chats, setChats] = useState<Chat[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CHATS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // 3. Messages indexed by chatId
  const [messages, setMessages] = useState<Record<string, Message[]>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MESSAGES);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // 4. Active Chat
  const [activeChatId, setActiveChatId] = useState<string | null>(() => {
    return chats.length > 0 ? chats[0].chatId : null;
  });

  // 5. Sound notifications
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SOUND);
    return saved !== null ? saved === 'true' : true;
  });

  // 6. UI Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(() => !credentials?.idInstance);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);

  // Persistence effects
  useEffect(() => {
    if (credentials) {
      localStorage.setItem(STORAGE_KEYS.CREDENTIALS, JSON.stringify(credentials));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CREDENTIALS);
    }
  }, [credentials]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SOUND, String(soundEnabled));
  }, [soundEnabled]);

  // Handle incoming or polled messages
  const handleIncomingMessage = useCallback(
    (newMsg: Message) => {
      // 1. Append message to chat history avoiding duplicate IDs
      setMessages((prev) => {
        const chatMsgs = prev[newMsg.chatId] || [];
        // Avoid duplicate messages
        if (chatMsgs.some((m) => m.id === newMsg.id)) {
          return prev;
        }
        return {
          ...prev,
          [newMsg.chatId]: [...chatMsgs, newMsg],
        };
      });

      // 2. Update chat list
      setChats((prev) => {
        const existingIndex = prev.findIndex((c) => c.chatId === newMsg.chatId);

        if (existingIndex >= 0) {
          const updated = [...prev];
          const current = updated[existingIndex];
          const isCurrentActive = activeChatId === newMsg.chatId;

          updated[existingIndex] = {
            ...current,
            lastMessage: newMsg,
            unreadCount: isCurrentActive || newMsg.isOutgoing
              ? 0
              : current.unreadCount + 1,
          };
          // Move updated chat to top
          const [chatItem] = updated.splice(existingIndex, 1);
          return [chatItem, ...updated];
        } else {
          // If message is from a new sender, create chat automatically
          const { displayPhone } = formatPhoneAndChatId(newMsg.chatId);
          const newChat: Chat = {
            chatId: newMsg.chatId,
            phoneNumber: displayPhone,
            name: newMsg.senderName || displayPhone,
            avatarColor: getAvatarColor(newMsg.chatId),
            lastMessage: newMsg,
            unreadCount: activeChatId === newMsg.chatId || newMsg.isOutgoing ? 0 : 1,
            createdAt: Date.now(),
          };
          return [newChat, ...prev];
        }
      });

      // 3. Play chime sound if message is incoming
      if (!newMsg.isOutgoing && soundEnabled) {
        playNotificationSound();
      }
    },
    [activeChatId, soundEnabled]
  );

  // Handle status updates for sent messages
  const handleMessageStatusUpdate = useCallback((idMessage: string, status: string) => {
    setMessages((prev) => {
      let updated = false;
      const next: Record<string, Message[]> = {};

      for (const [chatId, msgs] of Object.entries(prev)) {
        const msgIdx = msgs.findIndex((m) => m.id === idMessage);
        if (msgIdx >= 0) {
          updated = true;
          const copy = [...msgs];
          let mappedStatus: Message['status'] = 'sent';
          if (status === 'delivered') mappedStatus = 'delivered';
          if (status === 'read') mappedStatus = 'read';

          copy[msgIdx] = {
            ...copy[msgIdx],
            status: mappedStatus,
          };
          next[chatId] = copy;
        } else {
          next[chatId] = msgs;
        }
      }

      return updated ? next : prev;
    });
  }, []);

  // Background long polling hook
  const {
    pollingStatus,
    lastError: pollingError,
    receivedCount,
    restartPolling,
  } = useGreenApiPolling({
    credentials,
    onNewMessage: handleIncomingMessage,
    onMessageStatusUpdate: handleMessageStatusUpdate,
    playSound: soundEnabled,
  });

  // Select chat
  const handleSelectChat = (chatId: string) => {
    setActiveChatId(chatId);
    // Mark as read
    setChats((prev) =>
      prev.map((c) => (c.chatId === chatId ? { ...c, unreadCount: 0 } : c))
    );
  };

  // Create or open chat
  const handleCreateChat = (newChat: Chat) => {
    const existing = chats.find((c) => c.chatId === newChat.chatId);
    if (existing) {
      setActiveChatId(existing.chatId);
    } else {
      setChats((prev) => [newChat, ...prev]);
      setActiveChatId(newChat.chatId);
    }
  };

  // Delete chat
  const handleDeleteChat = (chatId: string) => {
    setChats((prev) => prev.filter((c) => c.chatId !== chatId));
    setMessages((prev) => {
      const next = { ...prev };
      delete next[chatId];
      return next;
    });
    if (activeChatId === chatId) {
      const remaining = chats.filter((c) => c.chatId !== chatId);
      setActiveChatId(remaining.length > 0 ? remaining[0].chatId : null);
    }
  };

  // Clear chat history
  const handleClearHistory = (chatId: string) => {
    setMessages((prev) => ({
      ...prev,
      [chatId]: [],
    }));
    setChats((prev) =>
      prev.map((c) => (c.chatId === chatId ? { ...c, lastMessage: undefined } : c))
    );
  };

  // Send message
  const handleSendMessage = async (text: string) => {
    if (!credentials) {
      setIsAuthModalOpen(true);
      throw new Error('Требуется авторизация в GREEN-API');
    }
    if (!activeChatId) {
      throw new Error('Чат не выбран');
    }

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      chatId: activeChatId,
      sender: 'me',
      text,
      timestamp: Date.now(),
      isOutgoing: true,
      status: 'sending',
    };

    // Optimistic append
    setMessages((prev) => ({
      ...prev,
      [activeChatId]: [...(prev[activeChatId] || []), optimisticMsg],
    }));

    setIsSending(true);

    try {
      // API call to SendMessage
      const response = await sendTextMessage(credentials, activeChatId, text);

      // Update message ID and status
      setMessages((prev) => {
        const list = prev[activeChatId] || [];
        return {
          ...prev,
          [activeChatId]: list.map((m) =>
            m.id === tempId
              ? { ...m, id: response.idMessage, status: 'sent' }
              : m
          ),
        };
      });

      // Update last message in chat list
      setChats((prev) => {
        const idx = prev.findIndex((c) => c.chatId === activeChatId);
        if (idx === -1) return prev;
        const copy = [...prev];
        copy[idx] = {
          ...copy[idx],
          lastMessage: {
            ...optimisticMsg,
            id: response.idMessage,
            status: 'sent',
          },
        };
        const [moved] = copy.splice(idx, 1);
        return [moved, ...copy];
      });
    } catch (err) {
      // Mark optimistic message as failed
      setMessages((prev) => {
        const list = prev[activeChatId] || [];
        return {
          ...prev,
          [activeChatId]: list.map((m) =>
            m.id === tempId ? { ...m, status: 'failed' } : m
          ),
        };
      });
      throw err;
    } finally {
      setIsSending(false);
    }
  };

  // Logout / Switch instance
  const handleLogout = () => {
    if (window.confirm('Вы действительно хотите выйти и сменить инстанс GREEN-API?')) {
      setCredentials(null);
      setIsAuthModalOpen(true);
    }
  };

  const activeChat = chats.find((c) => c.chatId === activeChatId);
  const activeMessages = activeChatId ? messages[activeChatId] || [] : [];

  return (
    <div className="app-layout">
      {/* Sidebar with Chat list */}
      <Sidebar
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={handleSelectChat}
        onOpenNewChat={() => setIsNewChatModalOpen(true)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onDeleteChat={handleDeleteChat}
        credentials={credentials}
        pollingStatus={pollingStatus}
        pollingError={pollingError}
        receivedCount={receivedCount}
        onRestartPolling={restartPolling}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled((prev) => !prev)}
        onLogout={handleLogout}
      />

      {/* Main Chat Area or Empty state */}
      {activeChat ? (
        <ChatArea
          chat={activeChat}
          messages={activeMessages}
          onSendMessage={handleSendMessage}
          onClearHistory={handleClearHistory}
          isSending={isSending}
        />
      ) : (
        <EmptyState
          onOpenNewChat={() => setIsNewChatModalOpen(true)}
          instanceId={credentials?.idInstance}
        />
      )}

      {/* Modals */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSave={(newCreds) => {
          setCredentials(newCreds);
        }}
        initialCredentials={credentials}
        canCloseWithoutSaving={Boolean(credentials?.idInstance)}
      />

      <NewChatModal
        isOpen={isNewChatModalOpen}
        onClose={() => setIsNewChatModalOpen(false)}
        onCreateChat={handleCreateChat}
        existingChatIds={chats.map((c) => c.chatId)}
      />
    </div>
  );
};
export default App;
