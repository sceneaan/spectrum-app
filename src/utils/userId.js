/**
 * Normalize user/entity IDs from API responses (id vs _id vs appointmentId).
 */

export function getUserId(user) {
  if (!user) return null;
  const id = user.id ?? user._id;
  return id != null ? String(id) : null;
}

export function getEntityId(entity) {
  if (entity == null) return null;
  if (typeof entity === 'string' || typeof entity === 'number') {
    return String(entity);
  }
  const id = entity.id ?? entity._id ?? entity.appointmentId;
  return id != null ? String(id) : null;
}

export function getProviderId(provider) {
  if (provider == null) return null;
  if (typeof provider === 'string' || typeof provider === 'number') {
    return String(provider);
  }
  return getEntityId(provider);
}
