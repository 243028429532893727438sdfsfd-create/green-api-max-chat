import { useEffect, useRef, useState, useCallback } from 'react';
import { GreenApiCredentials, Message } from '../types';
import { receiveNotification, deleteNotification } from '../services/api';

interface UseGreenApiPollingProps {
  credentials: GreenApiCredentials | null;
  onNewMessage: (message: Message) => void;
  onMessageStatusUpdate?: (idMessage: string, status: string) => void;
  playSound?: boolean;
}

export type PollingStatus = 'idle' | 'polling' | 'processing' | 'error';

export function useGreenApiPolling({
  credentials,
  onNewMessage,
  onMessageStatusUpdate,
}: UseGreenApiPollingProps) {
  const [pollingStatus, setPollingStatus] = useState<PollingStatus>('idle');
  const [lastError, setLastError] = useState<string | null>(null);
  const [receivedCount, setReceivedCount] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Keep references to prevent stale closures in the async loop
  const credentialsRef = useRef(credentials);
  credentialsRef.current = credentials;

  const onNewMessageRef = useRef(onNewMessage);
  onNewMessageRef.current = onNewMessage;

  const onMessageStatusUpdateRef = useRef(onMessageStatusUpdate);
  onMessageStatusUpdateRef.current = onMessageStatusUpdate;

  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  const activeLoopRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const startPolling = useCallback(async () => {
    if (!credentialsRef.current?.idInstance || !credentialsRef.current?.apiTokenInstance) {
      setPollingStatus('idle');
      return;
    }

    if (activeLoopRef.current) return;
    activeLoopRef.current = true;
    setLastError(null);

    while (activeLoopRef.current) {
      if (isPausedRef.current) {
        setPollingStatus('idle');
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }

      const creds = credentialsRef.current;
      if (!creds?.idInstance || !creds?.apiTokenInstance) {
        break;
      }

      try {
        setPollingStatus('polling');
        abortControllerRef.current = new AbortController();

        // 1. Receive notification from GREEN-API queue (HTTP API polling)
        const notification = await receiveNotification(
          creds,
          5,
          abortControllerRef.current.signal
        );

        if (!activeLoopRef.current) break;

        if (notification && notification.receiptId) {
          setPollingStatus('processing');
          setLastError(null);
          setReceivedCount((prev) => prev + 1);

          const { receiptId, body } = notification;

          // 2. Process incoming message notification
          if (
            body.typeWebhook === 'incomingMessageReceived' ||
            body.typeWebhook === 'outgoingMessageReceived' ||
            body.typeWebhook === 'outgoingAPIMessageReceived'
          ) {
            const isOutgoing =
              body.typeWebhook === 'outgoingMessageReceived' ||
              body.typeWebhook === 'outgoingAPIMessageReceived';

            const rawChatId = body.senderData?.chatId || '';
            const text =
              body.messageData?.textMessageData?.textMessage ||
              body.messageData?.extendedTextMessageData?.text ||
              (body.messageData?.typeMessage ? `[${body.messageData.typeMessage}]` : '');

            if (text && rawChatId) {
              const msgTimestamp = body.timestamp
                ? body.timestamp * 1000
                : Date.now();

              const message: Message = {
                id: body.idMessage || `msg-${Date.now()}-${Math.random()}`,
                chatId: rawChatId,
                sender: isOutgoing ? 'me' : (body.senderData?.sender || rawChatId),
                senderName: body.senderData?.senderName || body.senderData?.chatName,
                text,
                timestamp: msgTimestamp,
                isOutgoing,
                status: isOutgoing ? 'sent' : 'delivered',
              };

              onNewMessageRef.current(message);
            }
          } else if (body.typeWebhook === 'outgoingMessageStatus') {
            const idMessage = body.idMessage;
            const status = body.statusData?.status;
            if (idMessage && status && onMessageStatusUpdateRef.current) {
              onMessageStatusUpdateRef.current(idMessage, status);
            }
          }

          // 3. Confirm receipt by deleting notification from GREEN-API queue
          try {
            await deleteNotification(creds, receiptId);
          } catch (delErr: unknown) {
            console.error('Ошибка при удалении уведомления:', delErr);
          }

          // Brief tick before next poll
          await new Promise((r) => setTimeout(r, 100));
        } else {
          // Timeout with no messages in queue, loop again with brief pause
          setPollingStatus('idle');
          await new Promise((r) => setTimeout(r, 400));
        }
      } catch (err: unknown) {
        if (!activeLoopRef.current) break;

        // If it was an abort error, break or continue
        if (err instanceof Error && err.name === 'AbortError') {
          continue;
        }

        const msg = err instanceof Error ? err.message : String(err);
        console.error('Ошибка очереди GREEN-API:', msg);
        setLastError(msg);
        setPollingStatus('error');

        // Backoff after error before trying again
        await new Promise((r) => setTimeout(r, 3000));
      }
    }

    activeLoopRef.current = false;
    setPollingStatus('idle');
  }, []);

  const stopPolling = useCallback(() => {
    activeLoopRef.current = false;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setPollingStatus('idle');
  }, []);

  useEffect(() => {
    if (credentials?.idInstance && credentials?.apiTokenInstance && !isPaused) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => {
      stopPolling();
    };
  }, [credentials, isPaused, startPolling, stopPolling]);

  return {
    pollingStatus,
    lastError,
    receivedCount,
    isPaused,
    setIsPaused,
    restartPolling: () => {
      stopPolling();
      setTimeout(startPolling, 200);
    },
  };
}
