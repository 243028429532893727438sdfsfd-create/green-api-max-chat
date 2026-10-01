/**
 * Formats a timestamp into a human-friendly messenger time string
 */
export function formatMessageTime(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function formatChatListTime(timestamp?: number): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();

  // If today
  if (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  ) {
    return formatMessageTime(timestamp);
  }

  // If yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  ) {
    return 'Вчера';
  }

  // Otherwise dd.mm.yy
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${day}.${month}`;
}

/**
 * Returns a consistent pleasant avatar color based on a string seed (e.g. chatId)
 */
const AVATAR_COLORS = [
  '#0077ff',
  '#00a884',
  '#7b1fa2',
  '#c2185b',
  '#0288d1',
  '#00897b',
  '#f57c00',
  '#e64a19',
  '#5c6bc0',
  '#2e7d32',
];

export function getAvatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

/**
 * Extracts clean initials from phone or name without brackets/punctuation
 */
export function getInitials(nameOrPhone: string): string {
  if (!nameOrPhone) return '?';
  // Strip parentheses, brackets, special punctuation
  const clean = nameOrPhone.replace(/[()[\]{}_,.;:!?"'«»]/g, ' ').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  // If digits/phone
  const digits = clean.replace(/\D/g, '');
  if (digits.length >= 2) {
    return digits.slice(-2);
  }
  return clean.slice(0, 2).toUpperCase();
}
