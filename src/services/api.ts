import {
  GreenApiCredentials,
  SendMessageResponse,
  ReceiveNotificationResponse,
  DeleteNotificationResponse,
  InstanceStatusResponse,
} from '../types';

/**
 * Normalizes API URL (removes trailing slashes, ensures https:// prefix)
 */
export function normalizeApiUrl(url?: string): string {
  if (!url || !url.trim()) {
    return 'https://api.green-api.com';
  }
  let cleaned = url.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = 'https://' + cleaned;
  }
  return cleaned;
}

/**
 * Formats a phone number or chat identifier into standard GREEN-API format:
 * e.g. "89991234567" -> "79991234567@c.us"
 * and provides a human-friendly display format: "+7 (999) 123-45-67"
 */
export function formatPhoneAndChatId(input: string): {
  chatId: string;
  displayPhone: string;
  rawDigits: string;
} {
  const trimmed = input.trim();

  // If already formatted as a chatId (contains @)
  if (trimmed.includes('@')) {
    const parts = trimmed.split('@');
    const digits = parts[0].replace(/\D/g, '');
    return {
      chatId: trimmed,
      displayPhone: formatPhoneDisplay(digits || parts[0]),
      rawDigits: digits || parts[0],
    };
  }

  // Extract all digits
  let digits = trimmed.replace(/\D/g, '');

  // Convert leading 8 (typical Russian national prefix) to 7 if 11 digits
  if (digits.length === 11 && digits.startsWith('8')) {
    digits = '7' + digits.slice(1);
  } else if (digits.length === 10) {
    // If user entered 10 digits (e.g. 9991234567), default to RU (+7)
    digits = '7' + digits;
  }

  // Standard Green API recipient format for user chat
  const chatId = `${digits}@c.us`;
  const displayPhone = formatPhoneDisplay(digits);

  return {
    chatId,
    displayPhone,
    rawDigits: digits,
  };
}

/**
 * Formats digits into a readable phone string
 */
export function formatPhoneDisplay(digits: string): string {
  if (digits.startsWith('7') && digits.length === 11) {
    return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`;
  }
  if (digits.length > 5) {
    return `+${digits}`;
  }
  return digits;
}

/**
 * Sends a text message via GREEN-API SendMessage endpoint
 * Docs: https://green-api.com/v3/docs/api/sending/SendMessage/
 */
export async function sendTextMessage(
  credentials: GreenApiCredentials,
  chatId: string,
  message: string
): Promise<SendMessageResponse> {
  const apiUrl = normalizeApiUrl(credentials.apiUrl);
  const url = `${apiUrl}/waInstance${credentials.idInstance}/sendMessage/${credentials.apiTokenInstance}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chatId,
      message,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(
      `Ошибка отправки (${response.status}): ${errText || response.statusText}`
    );
  }

  return response.json();
}

/**
 * Receives an incoming notification from the GREEN-API queue via HTTP API
 * Docs: https://green-api.com/v3/docs/api/receiving/technology-http-api/ReceiveNotification/
 */
export async function receiveNotification(
  credentials: GreenApiCredentials,
  receiveTimeout = 5,
  signal?: AbortSignal
): Promise<ReceiveNotificationResponse | null> {
  const apiUrl = normalizeApiUrl(credentials.apiUrl);
  const url = `${apiUrl}/waInstance${credentials.idInstance}/receiveNotification/${credentials.apiTokenInstance}?receiveTimeout=${receiveTimeout}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
    signal,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(
      `Ошибка получения уведомления (${response.status}): ${errText || response.statusText}`
    );
  }

  const text = await response.text();
  if (!text || text.trim() === '' || text.trim() === 'null') {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (err) {
    console.warn('Failed to parse receiveNotification response:', text);
    return null;
  }
}

/**
 * Deletes a processed notification from the GREEN-API queue
 * Docs: https://green-api.com/v3/docs/api/receiving/technology-http-api/DeleteNotification/
 */
export async function deleteNotification(
  credentials: GreenApiCredentials,
  receiptId: number
): Promise<DeleteNotificationResponse> {
  const apiUrl = normalizeApiUrl(credentials.apiUrl);
  const url = `${apiUrl}/waInstance${credentials.idInstance}/deleteNotification/${credentials.apiTokenInstance}/${receiptId}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(
      `Ошибка удаления уведомления (${response.status}): ${errText || response.statusText}`
    );
  }

  return response.json();
}

/**
 * Gets the current state of the GREEN-API instance
 */
export async function getStateInstance(
  credentials: GreenApiCredentials
): Promise<InstanceStatusResponse> {
  const apiUrl = normalizeApiUrl(credentials.apiUrl);
  const url = `${apiUrl}/waInstance${credentials.idInstance}/getStateInstance/${credentials.apiTokenInstance}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(
      `Ошибка проверки инстанса (${response.status}): ${errText || response.statusText}`
    );
  }

  return response.json();
}
