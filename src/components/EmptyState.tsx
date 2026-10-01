import React from 'react';
import { MessageSquareDashed, Plus, ShieldCheck, Zap } from 'lucide-react';

interface EmptyStateProps {
  onOpenNewChat: () => void;
  instanceId?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  onOpenNewChat,
  instanceId,
}) => {
  return (
    <div className="empty-chat-state">
      <div className="empty-content">
        <div className="empty-logo-circle">
          <MessageSquareDashed size={44} color="#0077ff" />
        </div>
        <h2>MAX Web Messenger</h2>
        <p className="empty-desc">
          Отправка и получение сообщений через <strong>GREEN-API</strong>.
          Выберите существующий диалог из списка слева или начните новую переписку.
        </p>

        <button className="btn btn-primary btn-large" onClick={onOpenNewChat}>
          <Plus size={20} />
          Написать сообщение
        </button>

        <div className="empty-features-grid">
          <div className="feature-item">
            <Zap size={18} color="#0077ff" />
            <div>
              <strong>Мгновенная отправка</strong>
              <span>Метод SendMessage мессенджера MAX</span>
            </div>
          </div>
          <div className="feature-item">
            <ShieldCheck size={18} color="#00a884" />
            <div>
              <strong>Получение по HTTP API</strong>
              <span>Очередь уведомлений ReceiveNotification</span>
            </div>
          </div>
        </div>

        {instanceId && (
          <div className="empty-instance-pill">
            Подключен инстанс: <code>{instanceId}</code>
          </div>
        )}
      </div>
    </div>
  );
};
