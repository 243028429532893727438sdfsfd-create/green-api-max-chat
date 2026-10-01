import React, { useState } from 'react';
import { formatPhoneAndChatId, formatPhoneDisplay } from '../services/api';
import { getAvatarColor } from '../utils/helpers';
import { Chat } from '../types';
import { MessageSquarePlus, X, Phone, User, CheckCircle2 } from 'lucide-react';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateChat: (chat: Chat) => void;
  existingChatIds: string[];
}

export const NewChatModal: React.FC<NewChatModalProps> = ({
  isOpen,
  onClose,
  onCreateChat,
  existingChatIds,
}) => {
  const [phoneInput, setPhoneInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const preview = phoneInput.trim() ? formatPhoneAndChatId(phoneInput) : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!phoneInput.trim()) {
      setError('Введите номер телефона получателя');
      return;
    }

    const { chatId, displayPhone, rawDigits } = formatPhoneAndChatId(phoneInput);

    if (rawDigits.length < 5 && !chatId.includes('@')) {
      setError('Номер телефона слишком короткий (минимум 5 цифр)');
      return;
    }

    const chatName = nameInput.trim() || displayPhone;
    const avatarColor = getAvatarColor(chatId);

    const newChat: Chat = {
      chatId,
      phoneNumber: displayPhone,
      name: chatName,
      avatarColor,
      unreadCount: 0,
      createdAt: Date.now(),
    };

    onCreateChat(newChat);
    setPhoneInput('');
    setNameInput('');
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div className="modal-icon-badge">
              <MessageSquarePlus size={22} color="#0077ff" />
            </div>
            <div>
              <h3>Новый чат MAX</h3>
              <p className="modal-subtitle">
                Укажите номер телефона получателя для начала переписки
              </p>
            </div>
          </div>
          <button className="btn-icon-close" onClick={onClose} title="Закрыть">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="new-chat-form">
          {error && (
            <div className="alert-box alert-error">
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="phoneNumber">
              <Phone size={14} style={{ display: 'inline', marginRight: 4 }} />
              Номер телефона получателя <span className="required-star">*</span>
            </label>
            <input
              id="phoneNumber"
              type="text"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder="+7 (999) 123-45-67 или 79991234567"
              autoFocus
              required
            />
            <span className="form-hint">
              Поддерживаются номера РФ (+7), РБ (+375) и международные форматы
            </span>
          </div>

          <div className="form-group">
            <label htmlFor="contactName">
              <User size={14} style={{ display: 'inline', marginRight: 4 }} />
              Имя контакта (необязательно)
            </label>
            <input
              id="contactName"
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Например: Иван Иванов"
            />
          </div>

          {preview && (
            <div className="chat-preview-box">
              <div className="preview-label">Предпросмотр данных чата:</div>
              <div className="preview-item">
                <span className="p-key">Чат ID:</span>
                <code className="p-val">{preview.chatId}</code>
              </div>
              <div className="preview-item">
                <span className="p-key">Отображаемый номер:</span>
                <span className="p-val">{preview.displayPhone}</span>
              </div>
              {existingChatIds.includes(preview.chatId) && (
                <div className="preview-warn">
                  ℹ Чат с этим контактом уже есть в вашем списке (откроется существующий)
                </div>
              )}
            </div>
          )}

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!phoneInput.trim()}
            >
              <CheckCircle2 size={18} />
              Открыть чат
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
