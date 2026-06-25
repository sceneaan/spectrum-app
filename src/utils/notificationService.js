import EncryptedStorage from 'react-native-encrypted-storage';
import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setNotificationToken } from '@api/services/User.Service';

const NOTIFY_TOKEN_KEY = 'notifyToken';

async function persistNotifyToken(token) {
    if (!token) return;
    await EncryptedStorage.setItem(NOTIFY_TOKEN_KEY, token);
    // Remove legacy plaintext copy if present
    try {
        await AsyncStorage.removeItem(NOTIFY_TOKEN_KEY);
    } catch {
        // ignore
    }
}

async function readStoredNotifyToken() {
    try {
        const encrypted = await EncryptedStorage.getItem(NOTIFY_TOKEN_KEY);
        if (encrypted) return encrypted;
    } catch {
        // fall through to migration
    }

    try {
        const legacy = await AsyncStorage.getItem(NOTIFY_TOKEN_KEY);
        if (legacy) {
            await persistNotifyToken(legacy);
            return legacy;
        }
    } catch {
        // ignore
    }
    return null;
}

// State management to prevent repetitive calls
let isTokenRetrievalInProgress = false;
let retryTimeoutId = null;
let maxRetryAttempts = 3;
let currentRetryAttempt = 0;

async function getToken(role, oldToken) {
    // Prevent multiple simultaneous calls
    if (isTokenRetrievalInProgress) {
        return;
    }

    // Check if we've exceeded max retry attempts
    if (currentRetryAttempt >= maxRetryAttempts) {
        return;
    }

    isTokenRetrievalInProgress = true;
    currentRetryAttempt++;

    try {
        if (Platform.OS === 'ios') {
            await new Promise(resolve => setTimeout(resolve, 1000));

            const apnsToken = await messaging().getAPNSToken();

            if (!apnsToken) {
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Check again
                const apnsTokenRetry = await messaging().getAPNSToken();
                if (!apnsTokenRetry) {
                    scheduleRetry(oldToken, 10000);
                    return;
                }
            }
        }

        const token = await messaging().getToken();

        if (token) {
            try {
                if (role === 'patient') {
                    await setNotificationToken({ notificationToken: token });
                }
                // Reset retry counter on success
                currentRetryAttempt = 0;
            } catch (apiError) {
                console.log('ERROR updating token on server:', apiError);
            }
        }

        await persistNotifyToken(token);

    } catch (error) {
        console.log('ERROR getting FCM Token:', error);
        console.log('Error details:', {
            message: error.message,
            code: error.code,
            stack: error.stack,
        });

        // If it's an APNS token error on iOS, schedule a retry
        if (Platform.OS === 'ios' &&
            error.message &&
            error.message.includes('No APNS token specified')) {
            scheduleRetry(role, oldToken, 5000);
        }
    } finally {
        isTokenRetrievalInProgress = false;
    }
}

// Helper function to schedule retries with proper cleanup
function scheduleRetry(role, oldToken, delay) {
    // Clear any existing timeout
    if (retryTimeoutId) {
        clearTimeout(retryTimeoutId);
    }

    retryTimeoutId = setTimeout(() => {
        retryTimeoutId = null;
        getToken(role, oldToken);
    }, delay);
}

// Function to reset retry state and clean up timeouts
export function resetTokenRetrievalState() {
    isTokenRetrievalInProgress = false;
    currentRetryAttempt = 0;

    if (retryTimeoutId) {
        clearTimeout(retryTimeoutId);
        retryTimeoutId = null;
    }
}

// Function to check if token retrieval is in progress
export function isTokenRetrievalActive() {
    return isTokenRetrievalInProgress;
}

async function requestNotificationPermission() {
    try {
        if (Platform.OS === 'android') {
            const { requestNotifications } = require('react-native-permissions');

            try {
                const result = await requestNotifications(['alert', 'sound', 'badge']);

                if (result.status === 'granted') {
                    return true;
                } else if (result.status === 'blocked') {
                    return false;
                } else {
                    return false;
                }
            } catch (permissionError) {
                console.log('Error requesting Android notification permission:', permissionError);
                const { checkNotifications } = require('react-native-permissions');
                try {
                    const checkResult = await checkNotifications();
                    return checkResult.status === 'granted';
                } catch (checkError) {
                    console.log('Error checking Android notification permission:', checkError);
                    return false;
                }
            }
        } else {
            // For iOS, return true as permission is handled by messaging().requestPermission()
            return true;
        }
    } catch (error) {
        console.log('ERROR in requestNotificationPermission:', error);
        return false;
    }
}

export async function requestUserPermission(role, oldToken) {
    // Reset retry counter when starting fresh
    currentRetryAttempt = 0;

    const isNotificationPermissionGranted = await requestNotificationPermission();

    if (isNotificationPermissionGranted) {
        try {
            const authStatus = await messaging().requestPermission();

            const enabled =
                authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                authStatus === messaging.AuthorizationStatus.PROVISIONAL;

            if (enabled) {
                if (Platform.OS === 'ios') {
                    // APNS token may lag behind permission grant on iOS
                    setTimeout(() => {
                        getToken(role, oldToken);
                    }, 2000);
                } else {
                    await getToken(role, oldToken);
                }
            }
        } catch (error) {
            console.log('ERROR requesting notification permission:', error);
            console.log('Permission error details:', {
                message: error.message,
                code: error.code,
                stack: error.stack,
            });
        }
    }
}

// Function to check current notification permission status
export async function checkNotificationPermission() {
    try {
        if (Platform.OS === 'android') {
            // For Android, check notification permission using react-native-permissions
            try {
                const { checkNotifications } = require('react-native-permissions');
                const result = await checkNotifications();

                // Map Android permission status to messaging permission status
                if (result.status === 'granted') {
                    return messaging.AuthorizationStatus.AUTHORIZED;
                } else if (result.status === 'blocked') {
                    return messaging.AuthorizationStatus.DENIED;
                } else {
                    return messaging.AuthorizationStatus.NOT_DETERMINED;
                }
            } catch (permissionError) {
                console.log('Error checking Android notification permission:', permissionError);
                // Fallback to messaging permission check
                const authStatus = await messaging().hasPermission();
                return authStatus;
            }
        } else {
            // iOS
            const authStatus = await messaging().hasPermission();
            return authStatus;
        }
    } catch (error) {
        console.log('ERROR checking notification permission:', error);
        return null;
    }
}

// Function to get current FCM token with retry logic
export async function getCurrentToken() {
    try {
        console.log('Getting current FCM token...');

        // On iOS, ensure APNS token is available first
        if (Platform.OS === 'ios') {
            const apnsToken = await messaging().getAPNSToken();
            console.log('APNS token check:', apnsToken ? 'Available' : 'Not available');

            if (!apnsToken) {
                console.log('APNS token not available, cannot get FCM token yet');
                return null;
            }
        }

        const token = await messaging().getToken();
        return token;
    } catch (error) {
        console.log('ERROR getting current FCM token:', error);
        return null;
    }
}

// Function to manually retry getting FCM token (useful for debugging)
export async function retryGetToken() {
    // Reset state before manual retry
    resetTokenRetrievalState();

    const oldToken = await readStoredNotifyToken();
    await getToken('patient', oldToken);
}

// Function to check if notification service is properly initialized
export async function checkNotificationServiceStatus() {
    try {
        const permission = await messaging().hasPermission();

        if (Platform.OS === 'ios') {
            await messaging().getAPNSToken();
        }

        const fcmToken = await messaging().getToken();

        return {
            permission,
            apnsToken: Platform.OS === 'ios' ? await messaging().getAPNSToken() : 'N/A',
            fcmToken,
        };
    } catch (error) {
        console.log('ERROR checking notification service status:', error);
        return null;
    }
}

// Function specifically for Android notification permission handling
export async function requestAndroidNotificationPermission() {
    if (Platform.OS !== 'android') {
        console.log('This function is only for Android');
        return false;
    }

    try {
        const { requestNotifications, checkNotifications } = require('react-native-permissions');

        // First check current permission status
        const currentStatus = await checkNotifications();

        if (currentStatus.status === 'granted') {
            return true;
        }

        if (currentStatus.status === 'blocked') {
            return false;
        }

        // Request permission
        const result = await requestNotifications(['alert', 'sound', 'badge']);

        if (result.status === 'granted') {
            return true;
        } else {
            return false;
        }
    } catch (error) {
        console.log('ERROR requesting Android notification permission:', error);
        return false;
    }
}

// Function to open Android notification settings if permission is blocked
export async function openAndroidNotificationSettings() {
    if (Platform.OS !== 'android') {
        return false;
    }

    try {
        const { openSettings } = require('react-native-permissions');
        await openSettings();
        return true;
    } catch (error) {
        console.log('ERROR opening Android notification settings:', error);
        return false;
    }
}

// Function to check if Android notification permission is required (Android 13+)
export function isAndroidNotificationPermissionRequired() {
    if (Platform.OS !== 'android') {
        return false;
    }

    // Android 13+ (API level 33+) requires POST_NOTIFICATIONS permission
    const { Platform: RNPlatform } = require('react-native');
    return RNPlatform.Version >= 33;
}

// Function to get comprehensive notification permission status
export async function getNotificationPermissionStatus() {
    try {
        if (Platform.OS === 'android') {
            const { checkNotifications } = require('react-native-permissions');
            const result = await checkNotifications();

            return {
                platform: 'android',
                status: result.status,
                granted: result.status === 'granted',
                blocked: result.status === 'blocked',
                unavailable: result.status === 'unavailable',
                denied: result.status === 'denied',
                details: result,
            };
        } else {
            // iOS
            const authStatus = await messaging().hasPermission();
            return {
                platform: 'ios',
                status: authStatus,
                granted: authStatus === messaging.AuthorizationStatus.AUTHORIZED,
                blocked: authStatus === messaging.AuthorizationStatus.DENIED,
                unavailable: false,
                denied: authStatus === messaging.AuthorizationStatus.DENIED,
                details: { authStatus },
            };
        }
    } catch (error) {
        console.log('ERROR getting notification permission status:', error);
        return {
            platform: Platform.OS,
            status: 'error',
            granted: false,
            blocked: false,
            unavailable: false,
            denied: false,
            error: error.message,
        };
    }
}