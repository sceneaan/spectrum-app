/**
 * Security Utilities for Payment Protection
 * Includes: Jailbreak/Root Detection, Biometric Authentication, SSL Pinning
 */

import { Platform, Alert } from 'react-native';
import ReactNativeBiometrics from 'react-native-biometrics';
import JailMonkey from 'jail-monkey';

const rnBiometrics = new ReactNativeBiometrics();

// ============================================
// 1. JAILBREAK / ROOT DETECTION
// ============================================

/**
 * Detects if the device is jailbroken (iOS) or rooted (Android)
 * @returns {Promise<{isCompromised: boolean, reason: string|null}>}
 */
export const detectJailbreak = async () => {
  try {
    // Skip security checks in development mode
    if (__DEV__) {
      console.log('[Security] Development mode - security checks bypassed');
      return {
        isCompromised: false,
        reason: null,
        details: {
          devMode: true,
          isJailBroken: false,
          canMockLocation: false,
          trustFall: true,
          isOnExternalStorage: false,
          AdbEnabled: false,
        },
      };
    }

    const isJailBroken = JailMonkey.isJailBroken();
    const canMockLocation = JailMonkey.canMockLocation(); // Android only
    const trustFall = JailMonkey.trustFall(); // Additional checks
    const isOnExternalStorage = JailMonkey.isOnExternalStorage(); // Android only
    const AdbEnabled = JailMonkey.AdbEnabled(); // Android only - Developer mode

    const compromised = isJailBroken || canMockLocation || !trustFall || isOnExternalStorage || AdbEnabled;

    let reason = null;
    if (isJailBroken) reason = 'Device is jailbroken/rooted';
    else if (canMockLocation) reason = 'Mock location is enabled';
    else if (!trustFall) reason = 'Device security checks failed';
    else if (isOnExternalStorage) reason = 'App is running from external storage';
    else if (AdbEnabled) reason = 'Developer/ADB mode is enabled';

    return {
      isCompromised: compromised,
      reason,
      details: {
        isJailBroken,
        canMockLocation,
        trustFall,
        isOnExternalStorage,
        AdbEnabled,
      },
    };
  } catch (error) {
    console.error('Jailbreak detection error:', error);
    // Fail-safe: Don't block on error
    return {
      isCompromised: false,
      reason: 'Detection unavailable',
    };
  }
};

/**
 * Shows alert if device is compromised and returns whether to proceed
 * @param {object} options - Configuration options
 * @returns {Promise<boolean>} - true if user should be allowed to proceed
 */
export const checkDeviceSecurity = async (options = {}) => {
  const {
    blockOnCompromise = false, // If true, completely blocks; if false, shows warning
    customTitle = 'Security Warning',
    customMessage = 'Your device appears to be jailbroken/rooted. Payment features may be restricted for security.',
  } = options;

  const result = await detectJailbreak();

  if (result.isCompromised) {
    console.warn('[Security] Device compromised:', result.reason);

    if (blockOnCompromise) {
      return new Promise((resolve) => {
        Alert.alert(
          customTitle,
          `${customMessage}\n\nReason: ${result.reason}`,
          [
            {
              text: 'OK',
              onPress: () => resolve(false),
            },
          ],
          { cancelable: false }
        );
      });
    } else {
      // Show warning but allow to proceed
      return new Promise((resolve) => {
        Alert.alert(
          customTitle,
          `${customMessage}\n\nReason: ${result.reason}\n\nDo you want to continue anyway?`,
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => resolve(false),
            },
            {
              text: 'Continue',
              style: 'default',
              onPress: () => resolve(true),
            },
          ],
          { cancelable: false }
        );
      });
    }
  }

  return true; // Device is secure, proceed
};

// ============================================
// 2. BIOMETRIC AUTHENTICATION
// ============================================

/**
 * Checks if biometric authentication is available
 * @returns {Promise<{available: boolean, biometryType: string|null}>}
 */
export const checkBiometricAvailability = async () => {
  try {
    const { available, biometryType } = await rnBiometrics.isSensorAvailable();

    return {
      available,
      biometryType, // 'TouchID', 'FaceID', 'Biometrics' (Android)
      compatible: available,
      enrolled: available,
    };
  } catch (error) {
    console.error('Biometric check error:', error);
    return {
      available: false,
      biometryType: null,
    };
  }
};

/**
 * Prompts for biometric authentication
 * @param {object} options - Authentication options
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export const authenticateWithBiometrics = async (options = {}) => {
  const {
    promptMessage = 'Authenticate to continue with payment',
    cancelLabel = 'Cancel',
  } = options;

  try {
    // Skip biometric authentication in development mode
    if (__DEV__) {
      console.log('[Security] Development mode - biometric authentication bypassed');
      return {
        success: true,
        error: null,
      };
    }

    // Check availability first
    const availability = await checkBiometricAvailability();

    if (!availability.available) {
      return {
        success: false,
        error: availability.compatible
          ? 'No biometrics enrolled. Please set up Face ID/Touch ID in device settings.'
          : 'Biometric authentication is not available on this device.',
      };
    }

    // Attempt authentication
    const { success } = await rnBiometrics.simplePrompt({
      promptMessage,
      cancelButtonText: cancelLabel,
    });

    if (success) {
      return {
        success: true,
        error: null,
      };
    } else {
      // User cancelled or failed
      return {
        success: false,
        error: 'Authentication failed or cancelled',
      };
    }
  } catch (error) {
    console.error('Biometric authentication error:', error);
    return {
      success: false,
      error: error.message || 'Authentication error',
    };
  }
};

/**
 * Shows biometric prompt and returns result
 * @param {object} options - Configuration options
 * @returns {Promise<boolean>} - true if authenticated
 */
export const requireBiometricAuth = async (options = {}) => {
  const result = await authenticateWithBiometrics(options);

  if (!result.success && result.error) {
    Alert.alert(
      'Authentication Failed',
      result.error,
      [{ text: 'OK' }]
    );
  }

  return result.success;
};

// ============================================
// 3. SSL CERTIFICATE PINNING
// ============================================

/**
 * SSL Certificate Pinning Configuration
 * NOTE: For React Native, certificate pinning requires native modules
 * This provides the configuration and validation helpers
 */

/**
 * Certificate pins for your API domains
 * IMPORTANT: Replace with your actual certificate hashes
 *
 * To get certificate hash:
 * 1. openssl s_client -servername yourdomain.com -connect yourdomain.com:443 | openssl x509 -pubkey -noout | openssl pkey -pubin -outform der | openssl dgst -sha256 -binary | openssl enc -base64
 * 2. Or use online tools like SSL Labs
 */
export const SSL_PINS = {
  // Example pins - REPLACE with your actual API certificate pins
  'api.yourapp.com': [
    'sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
    'sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=', // Backup pin
  ],
  // Add more domains as needed
};

/**
 * Validates SSL certificate pinning configuration
 * @returns {object} Validation result
 */
export const validateSSLPinConfig = () => {
  const domains = Object.keys(SSL_PINS);

  if (domains.length === 0) {
    console.warn('[Security] No SSL pins configured');
    return {
      valid: false,
      message: 'SSL pinning not configured',
    };
  }

  // Check if using example/placeholder pins
  const hasPlaceholderPins = domains.some(domain =>
    SSL_PINS[domain].some(pin => pin.includes('AAAA') || pin.includes('BBBB'))
  );

  if (hasPlaceholderPins) {
    console.warn('[Security] Using placeholder SSL pins - Update with real certificate hashes');
    return {
      valid: false,
      message: 'Using placeholder SSL pins',
    };
  }

  return {
    valid: true,
    message: `SSL pinning configured for ${domains.length} domain(s)`,
  };
};

/**
 * Instructions for implementing SSL pinning
 *
 * For iOS (using TrustKit):
 * 1. Install: npm install react-native-ssl-pinning
 * 2. Configure in Info.plist or programmatically
 * 3. Use pinned fetch instead of regular fetch
 *
 * For Android (using OkHttp):
 * 1. Install: npm install react-native-ssl-pinning
 * 2. Configure in MainApplication.java
 * 3. Use pinned fetch instead of regular fetch
 *
 * Alternative: Use react-native-cert-pinner
 */

/**
 * Wrapper for fetch with SSL pinning (requires native module)
 * This is a placeholder - actual implementation requires native SSL pinning library
 */
export const pinnedFetch = async (url, options = {}) => {
  // TODO: Implement actual SSL pinning using native module like react-native-ssl-pinning
  // For now, this uses regular fetch with validation warning

  const pinConfig = validateSSLPinConfig();

  if (!pinConfig.valid) {
    console.warn('[Security] SSL pinning not properly configured:', pinConfig.message);
  }

  // This would be replaced with actual pinned fetch from native module
  // Example: return sslPinning.fetch(url, options);

  return fetch(url, options);
};

// ============================================
// 4. COMBINED SECURITY CHECK
// ============================================

/**
 * Performs comprehensive security check before sensitive operations
 * @param {object} options - Configuration options
 * @returns {Promise<{allowed: boolean, failureReason: string|null}>}
 */
export const performSecurityCheck = async (options = {}) => {
  const {
    requireBiometric = false,
    checkJailbreak = true,
    blockOnJailbreak = false,
  } = options;

  try {
    // Step 1: Check device security (jailbreak/root)
    if (checkJailbreak) {
      const deviceSecure = await checkDeviceSecurity({
        blockOnCompromise: blockOnJailbreak,
      });

      if (!deviceSecure) {
        return {
          allowed: false,
          failureReason: 'Device security check failed',
        };
      }
    }

    // Step 2: Require biometric authentication if enabled
    if (requireBiometric) {
      const bioAuth = await requireBiometricAuth({
        promptMessage: 'Authenticate to process payment',
      });

      if (!bioAuth) {
        return {
          allowed: false,
          failureReason: 'Biometric authentication required',
        };
      }
    }

    // All checks passed
    return {
      allowed: true,
      failureReason: null,
    };
  } catch (error) {
    console.error('[Security] Security check error:', error);
    return {
      allowed: false,
      failureReason: error.message || 'Security check failed',
    };
  }
};

// ============================================
// 5. EXPORT ALL
// ============================================

export default {
  // Jailbreak detection
  detectJailbreak,
  checkDeviceSecurity,

  // Biometric authentication
  checkBiometricAvailability,
  authenticateWithBiometrics,
  requireBiometricAuth,

  // SSL pinning
  SSL_PINS,
  validateSSLPinConfig,
  pinnedFetch,

  // Combined check
  performSecurityCheck,
};
