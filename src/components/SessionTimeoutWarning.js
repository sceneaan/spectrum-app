import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import COLORS from '../constants/colors';

/**
 * Session Timeout Warning Modal
 * Displays a warning when user session is about to expire due to inactivity
 * Compliant with Saudi healthcare regulations (NCA ECC, SHIE)
 */
const SessionTimeoutWarning = ({
  visible,
  remainingTime,
  onExtend,
  onLogout,
  warningDuration,
}) => {
  const { t } = useTranslation();

  // Calculate remaining seconds and percentage
  const remainingSeconds = Math.ceil(remainingTime / 1000);
  const remainingMinutes = Math.floor(remainingSeconds / 60);
  const remainingSecondsDisplay = remainingSeconds % 60;
  const progressPercent = Math.round((remainingTime / warningDuration) * 100);

  // Format time display
  const timeDisplay = remainingMinutes > 0
    ? `${remainingMinutes}:${remainingSecondsDisplay.toString().padStart(2, '0')}`
    : `${remainingSeconds}s`;

  // Determine color based on remaining time
  const timerColor = remainingSeconds <= 30 ? COLORS.danger : COLORS.warning;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Timer Icon */}
          <View style={[styles.iconContainer, { borderColor: timerColor }]}>
            <Text style={[styles.timerText, { color: timerColor }]}>
              {timeDisplay}
            </Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>
            {t('session.timeoutWarning.title', 'Session Expiring Soon')}
          </Text>

          {/* Message */}
          <Text style={styles.message}>
            {t(
              'session.timeoutWarning.message',
              'Your session will expire due to inactivity. Would you like to stay logged in?'
            )}
          </Text>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${progressPercent}%`,
                  backgroundColor: timerColor,
                },
              ]}
            />
          </View>

          {/* Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.extendBtn}
              onPress={onExtend}
              activeOpacity={0.8}
            >
              <Text style={styles.extendBtnText}>
                {t('session.timeoutWarning.stayLoggedIn', 'Stay Logged In')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={onLogout}
              activeOpacity={0.8}
            >
              <Text style={styles.logoutBtnText}>
                {t('session.timeoutWarning.logout', 'Logout')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Security Notice */}
          <Text style={styles.notice}>
            {t(
              'session.timeoutWarning.securityNotice',
              'For your security, sessions automatically expire after 15 minutes of inactivity.'
            )}
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  timerText: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: COLORS.gray600,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  progressContainer: {
    width: '100%',
    height: 6,
    backgroundColor: COLORS.gray200,
    borderRadius: 3,
    marginBottom: 24,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  extendBtn: {
    width: '100%',
    padding: 14,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  extendBtnText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 16,
  },
  logoutBtn: {
    width: '100%',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.danger,
    alignItems: 'center',
  },
  logoutBtnText: {
    color: COLORS.danger,
    fontWeight: '600',
    fontSize: 16,
  },
  notice: {
    fontSize: 11,
    color: COLORS.gray500,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 16,
  },
});

export default SessionTimeoutWarning;
