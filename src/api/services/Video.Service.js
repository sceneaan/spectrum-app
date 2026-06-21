import { postRequest } from '../index';

const MODEL_NAME = 'video';

/**
 * Get Twilio video token for authenticated users
 * @param {string} roomId - The room ID to join
 * @returns {Promise<{token: string, identity: string, roomName: string}>}
 */
export async function getVideoToken(roomId) {
  try {
    const response = await postRequest(`${MODEL_NAME}/token`, { roomId });
    return response.data?.data || response.data;
  } catch (error) {
    if (__DEV__) console.error('[VideoService] Failed to get video token:', error);
    throw error;
  }
}

/**
 * Get Twilio video token for guest users
 * @param {string} roomId - The room ID to join
 * @param {string} guestName - The guest's display name
 * @param {string} guestToken - Optional guest invitation token
 * @returns {Promise<{token: string, identity: string, roomName: string}>}
 */
export async function getGuestVideoToken(roomId, guestName, guestToken = null) {
  try {
    const response = await postRequest(`${MODEL_NAME}/guest-token`, {
      roomId,
      guestName,
      guestToken,
    });
    return response.data?.data || response.data;
  } catch (error) {
    if (__DEV__) console.error('[VideoService] Failed to get guest video token:', error);
    throw error;
  }
}
