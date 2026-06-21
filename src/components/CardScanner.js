/**
 * CardScanner Component
 * Uses react-native-vision-camera and ML Kit text recognition to scan credit card numbers
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import COLORS from '../constants/colors';

// Try to import camera modules, but gracefully handle if not available
let Camera, useCameraDevice, useCameraPermission, TextRecognition;
let cameraAvailable = true;

try {
  const visionCamera = require('react-native-vision-camera');
  Camera = visionCamera.Camera;
  useCameraDevice = visionCamera.useCameraDevice;
  useCameraPermission = visionCamera.useCameraPermission;
  TextRecognition = require('@react-native-ml-kit/text-recognition').default;
} catch (error) {
  console.log('[CardScanner] Camera modules not available:', error.message);
  cameraAvailable = false;
}

const CardScanner = ({ visible, onClose, onCardScanned }) => {
  // If camera not available, show unavailable message
  if (!cameraAvailable || !useCameraPermission) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionTitle}>Card Scanner Unavailable</Text>
          <Text style={styles.permissionText}>
            The card scanner feature is not available on this device. Please enter your card details manually.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={onClose}>
            <Text style={styles.permissionButtonText}>OK</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState('Position card in frame');
  const cameraRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const cardFoundRef = useRef(false);

  useEffect(() => {
    if (visible && !hasPermission) {
      requestPermission();
    }
  }, [visible, hasPermission]);

  useEffect(() => {
    if (visible && hasPermission && device) {
      // Reset card found flag when modal opens
      cardFoundRef.current = false;
      // Start auto-scanning when camera is ready
      startAutoScan();
    } else {
      // Reset when modal closes
      cardFoundRef.current = false;
    }

    return () => {
      // Clean up on unmount or when modal closes
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
    };
  }, [visible, hasPermission, device]);

  const startAutoScan = () => {
    // Auto-scan every 2 seconds
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }

    scanIntervalRef.current = setInterval(() => {
      if (!isScanning && cameraRef.current) {
        scanCard();
      }
    }, 2000);
  };

  const extractCardNumber = (text) => {
    // Remove all whitespace and non-digit characters
    const cleaned = text.replace(/\s/g, '').replace(/[^0-9]/g, '');

    // Credit cards are typically 15-16 digits
    // Look for sequences of 13-19 digits
    const cardNumberPattern = /\d{13,19}/g;
    const matches = cleaned.match(cardNumberPattern);

    if (matches && matches.length > 0) {
      // Return the first match that looks like a valid card number
      for (const match of matches) {
        // Basic Luhn algorithm check for validity
        if (isValidCardNumber(match) && match.length >= 15 && match.length <= 16) {
          return match;
        }
      }
      // If no valid card found, return first long enough match
      return matches.find(m => m.length >= 15 && m.length <= 16) || null;
    }

    return null;
  };

  // Simple Luhn algorithm validation
  const isValidCardNumber = (cardNumber) => {
    if (!cardNumber || cardNumber.length < 13) return false;

    let sum = 0;
    let isEven = false;

    for (let i = cardNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cardNumber[i]);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  };

  const scanCard = async () => {
    // Prevent scanning if card already found or already scanning
    if (!cameraRef.current || isScanning || cardFoundRef.current) return;

    try {
      setIsScanning(true);
      setScanMessage('Scanning...');

      // Take a photo
      const photo = await cameraRef.current.takePhoto({
        qualityPrioritization: 'quality',
        flash: 'off',
        enableAutoStabilization: true,
      });

      if (!photo) {
        setIsScanning(false);
        setScanMessage('Position card in frame');
        return;
      }

      // Perform text recognition
      const result = await TextRecognition.recognize(photo.path);

      if (result && result.text) {
        console.log('[CardScanner] Detected text:', result.text);

        // Extract card number from detected text
        const cardNumber = extractCardNumber(result.text);

        if (cardNumber && !cardFoundRef.current) {
          console.log('[CardScanner] Card number found:', cardNumber);

          // Mark card as found to prevent duplicate scanning
          cardFoundRef.current = true;
          setScanMessage('Card detected!');

          // Stop auto-scanning FIRST
          if (scanIntervalRef.current) {
            clearInterval(scanIntervalRef.current);
            scanIntervalRef.current = null;
          }

          // Call callback with scanned card number
          onCardScanned(cardNumber);

          // Close modal immediately
          setIsScanning(false);
          setScanMessage('Position card in frame');
          onClose();

          return;
        }
      }

      setIsScanning(false);
      setScanMessage('Position card in frame');
    } catch (error) {
      console.error('[CardScanner] Scan error:', error);
      setIsScanning(false);
      setScanMessage('Scan failed, try again');
    }
  };

  const handleManualCapture = () => {
    scanCard();
  };

  const handleClose = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }
    setIsScanning(false);
    setScanMessage('Position card in frame');
    onClose();
  };

  if (!hasPermission) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            We need camera access to scan your credit card
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  if (!device) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionTitle}>Camera Not Available</Text>
          <Text style={styles.permissionText}>
            No camera device found on this device
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={handleClose}>
            <Text style={styles.permissionButtonText}>OK</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={styles.container}>
        <Camera
          ref={cameraRef}
          style={styles.camera}
          device={device}
          isActive={visible}
          photo={true}
        />

        {/* Overlay - Outside Camera to ensure touch events work */}
        <View style={styles.overlay} pointerEvents="box-none">
          {/* Close button - positioned absolutely to ensure visibility */}
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>

          {/* Top overlay */}
          <View style={styles.overlayTop} pointerEvents="none" />

          {/* Card frame */}
          <View style={styles.cardFrameContainer} pointerEvents="none">
            <View style={styles.cardFrame}>
              <View style={[styles.corner, styles.cornerTopLeft]} />
              <View style={[styles.corner, styles.cornerTopRight]} />
              <View style={[styles.corner, styles.cornerBottomLeft]} />
              <View style={[styles.corner, styles.cornerBottomRight]} />
            </View>
          </View>

          {/* Bottom overlay */}
          <View style={styles.overlayBottom} pointerEvents="box-none">
            <Text style={styles.instructionText}>{scanMessage}</Text>

            {isScanning && (
              <ActivityIndicator size="large" color="#fff" style={styles.loader} />
            )}

            <TouchableOpacity
              style={styles.captureButton}
              onPress={handleManualCapture}
              disabled={isScanning}
            >
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>

            <Text style={styles.helpText}>
              Auto-scanning or tap to capture manually
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-start',
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#000',
    fontWeight: 'bold',
  },
  cardFrameContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardFrame: {
    width: 300,
    height: 190,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#9CA3AF',
    borderStyle: 'dashed',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#9CA3AF',
    borderWidth: 3,
  },
  cornerTopLeft: {
    top: -2,
    left: -2,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 12,
  },
  cornerTopRight: {
    top: -2,
    right: -2,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 12,
  },
  cornerBottomLeft: {
    bottom: -2,
    left: -2,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
  },
  cornerBottomRight: {
    bottom: -2,
    right: -2,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 12,
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 50,
  },
  instructionText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  loader: {
    marginBottom: 20,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
  helpText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 15,
    textAlign: 'center',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 20,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 15,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 30,
    textAlign: 'center',
  },
  permissionButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    marginBottom: 15,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    paddingVertical: 15,
    paddingHorizontal: 40,
  },
  cancelButtonText: {
    color: COLORS.gray600,
    fontSize: 16,
  },
});

export default CardScanner;
