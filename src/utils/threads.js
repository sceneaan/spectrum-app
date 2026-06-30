/** Normalize thread list payloads from patient/provider list APIs. */
export function normalizeThreadList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return data.threads || data.docs || [];
}

export function getThreadUnreadCount(thread) {
  if (typeof thread?.providerUnreadCount === 'number') return thread.providerUnreadCount;
  if (typeof thread?.unreadCount === 'number') return thread.unreadCount;
  return thread?.hasUnread ? 1 : 0;
}

export function threadHasUnread(thread) {
  return getThreadUnreadCount(thread) > 0;
}

export function resolveUserId(user) {
  if (!user) return null;
  return user.id || user._id || null;
}

export function isMessageFromUser(message, currentUser) {
  const currentUserId = resolveUserId(currentUser);
  if (!currentUserId || !message) return false;

  const sender = message.sender;
  const senderId = typeof sender === 'object' ? resolveUserId(sender) : sender;
  if (senderId && String(senderId) === String(currentUserId)) return true;

  const senderEmail = typeof sender === 'object' ? sender?.email : null;
  return Boolean(senderEmail && currentUser?.email && senderEmail === currentUser.email);
}
