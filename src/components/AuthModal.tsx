import React, { useState } from 'react';
import { GreenApiCredentials } from '../types';
import { getStateInstance, normalizeApiUrl } from '../services/api';
import { KeyRound, Server, ShieldCheck, AlertCircle, Loader2, ExternalLink, X } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (creds: GreenApiCredentials) => void;
  initialCredentials?: GreenApiCredentials | null;
  canCloseWithoutSaving?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialCredentials,
  canCloseWithoutSaving = false,
}) => {
  const [apiUrl, setApiUrl] = useState(
    initialCredentials?.apiUrl || 'https://api.green-api.com'
  );
  const [idInstance, setIdInstance] = useState(
    initialCredentials?.idInstance || ''
  );
  const [apiTokenInstance, setApiTokenInstance] = useState(
    initialCredentials?.apiTokenInstance || ''
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanId = idInstance.trim();
    const cleanToken = apiTokenInstance.trim();
    const cleanUrl = normalizeApiUrl(apiUrl);

    if (!cleanId) {
      setError('Пожалуйста, введите idInstance');
      return;
    }
    if (!cleanToken) {
      setError('Пожалуйста, введите apiTokenInstance');
      return;
    }

    setIsLoading(true);
    try {
      const creds: GreenApiCredentials = {
        apiUrl: cleanUrl,
        idInstance: cleanId,
        apiTokenInstance: cleanToken,
      };

      // Verify credentials with GREEN-API
      const statusRes = await getStateInstance(creds);
      setSuccessMsg(`Подключено успешно! Статус инстанса: ${statusRes.stateInstance}`);

      setTimeout(() => {
        onSave(creds);
        onClose();
      }, 600);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Ошибка проверки учетных данных: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div className="modal-icon-badge">
              <KeyRound size={22} color="#0077ff" />
            </div>
            <div>
              <h3>Авторизация GREEN-API</h3>
              <p className="modal-subtitle">
                Введите учетные данные вашего инстанса GREEN-API
              </p>
            </div>
          </div>
          {canCloseWithoutSaving && (
            <button className="btn-icon-close" onClick={onClose} title="Закрыть">
              <X size={20} />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="alert-box alert-error">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="alert-box alert-success">
              <ShieldCheck size={18} />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="idInstance">
              idInstance <span className="required-star">*</span>
            </label>
            <div className="input-with-icon">
              <input
                id="idInstance"
                type="text"
                value={idInstance}
                onChange={(e) => setIdInstance(e.target.value)}
                placeholder="Например: 1101823456"
                required
                autoFocus
              />
            </div>
            <span className="form-hint">
              Числовой идентификатор вашего инстанса в кабинете GREEN-API
            </span>
          </div>

          <div className="form-group">
            <label htmlFor="apiTokenInstance">
              apiTokenInstance <span className="required-star">*</span>
            </label>
            <div className="input-with-icon">
              <input
                id="apiTokenInstance"
                type="password"
                value={apiTokenInstance}
                onChange={(e) => setApiTokenInstance(e.target.value)}
                placeholder="Вставьте токен инстанса"
                required
              />
            </div>
            <span className="form-hint">
              Секретный токен авторизации инстанса
            </span>
          </div>

          <div className="form-group">
            <label htmlFor="apiUrl">
              <Server size={14} style={{ display: 'inline', marginRight: 4 }} />
              API URL (сервер)
            </label>
            <input
              id="apiUrl"
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://api.green-api.com"
            />
            <span className="form-hint">
              По умолчанию: <code>https://api.green-api.com</code> (или хост из личного кабинета)
            </span>
          </div>

          <div className="info-callout">
            <p>
              Где взять эти данные?
            </p>
            <a
              href="https://console.green-api.com"
              target="_blank"
              rel="noreferrer"
              className="external-link"
            >
              Перейти в личный кабинет GREEN-API <ExternalLink size={14} />
            </a>
          </div>

          <div className="modal-actions">
            {canCloseWithoutSaving && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={isLoading}
              >
                Отмена
              </button>
            )}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="spin" />
                  Проверка подключения...
                </>
              ) : (
                'Подключиться'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
