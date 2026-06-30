import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import {
  sendVerificationOtp,
  verifyPhoneOtp,
  sendEmailVerificationOtp,
  verifyEmailOtp,
} from '../../api/services/User.Service';
import COLORS from '../../constants/colors';

function shouldShowPhoneVerify(user) {
  if (!user || user.isPhoneVerified) return false;
  if (user.residencyType === 'KSA') return true;
  if (user.residencyType === 'GLOBAL_ELM_OFF') {
    const phone = user.phone || '';
    return phone.startsWith('+966') || phone.startsWith('966');
  }
  return false;
}

const ProfileVerificationSection = ({
  user,
  t,
  isRTL,
  alignText,
  rowStyle,
  onVerified,
}) => {
  const pv = t.profileVerification || {};
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [verificationType, setVerificationType] = useState('phone');
  const [otpValue, setOtpValue] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (resendTimer <= 0) return undefined;
    const timer = setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendTimer]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleSendVerification = async (type) => {
    setSending(true);
    setVerificationType(type);
    setOtpValue('');
    try {
      if (type === 'phone') {
        await sendVerificationOtp();
      } else {
        await sendEmailVerificationOtp();
      }
      setOtpModalVisible(true);
      setResendTimer(60);
    } catch (error) {
      Alert.alert('Error', error.message || pv.sendFailed || 'Failed to send verification code');
    } finally {
      setSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpValue || otpValue.length !== 6) {
      Alert.alert('Error', pv.invalidOtp || 'Please enter a valid 6-digit code');
      return;
    }
    setVerifying(true);
    try {
      if (verificationType === 'phone') {
        await verifyPhoneOtp(otpValue);
      } else {
        await verifyEmailOtp(otpValue);
      }
      setOtpModalVisible(false);
      setOtpValue('');
      if (onVerified) onVerified();
    } catch (error) {
      Alert.alert('Error', error.message || pv.verifyFailed || 'Invalid verification code');
    } finally {
      setVerifying(false);
    }
  };

  const showPhone = shouldShowPhoneVerify(user);
  const showEmail = Boolean(user?.email) && !user?.isEmailVerified;

  if (!showPhone && !showEmail) return null;

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, alignText]}>{pv.title || 'Verification'}</Text>

      {showPhone ? (
        <View style={styles.rowBlock}>
          <View style={[styles.verifyRow, rowStyle]}>
            <View style={styles.verifyInfo}>
              <Text style={[styles.verifyLabel, alignText]}>{pv.phone || 'Phone'}</Text>
              <Text style={[styles.hint, alignText]}>{pv.phoneHint || 'Verify your phone to complete your profile.'}</Text>
            </View>
            <TouchableOpacity
              style={styles.verifyBtn}
              onPress={() => handleSendVerification('phone')}
              disabled={sending}
            >
              {sending && verificationType === 'phone' ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <Text style={styles.verifyBtnText}>{pv.verifyNow || 'Verify Now'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : user?.isPhoneVerified ? (
        <View style={[styles.verifiedBadge, rowStyle]}>
          <Icon name="check-circle" size={16} color={COLORS.success} />
          <Text style={styles.verifiedText}>{pv.phoneVerified || 'Phone verified'}</Text>
        </View>
      ) : null}

      {showEmail ? (
        <View style={styles.rowBlock}>
          <View style={[styles.verifyRow, rowStyle]}>
            <View style={styles.verifyInfo}>
              <Text style={[styles.verifyLabel, alignText]}>{pv.email || 'Email'}</Text>
              <Text style={[styles.hint, alignText]}>{pv.emailHint || 'Verify your email to complete your profile.'}</Text>
            </View>
            <TouchableOpacity
              style={styles.verifyBtn}
              onPress={() => handleSendVerification('email')}
              disabled={sending}
            >
              {sending && verificationType === 'email' ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <Text style={styles.verifyBtnText}>{pv.verifyNow || 'Verify Now'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : user?.isEmailVerified ? (
        <View style={[styles.verifiedBadge, rowStyle]}>
          <Icon name="check-circle" size={16} color={COLORS.success} />
          <Text style={styles.verifiedText}>{pv.emailVerified || 'Email verified'}</Text>
        </View>
      ) : null}

      <Modal visible={otpModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {verificationType === 'phone'
                ? (pv.otpPhoneTitle || 'Enter phone verification code')
                : (pv.otpEmailTitle || 'Enter email verification code')}
            </Text>
            <TextInput
              style={[styles.otpInput, { textAlign: isRTL ? 'right' : 'left' }]}
              value={otpValue}
              onChangeText={setOtpValue}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="000000"
              placeholderTextColor={COLORS.gray400}
            />
            {resendTimer > 0 ? (
              <Text style={styles.resendText}>
                {(pv.resendIn || 'Resend in {{time}}').replace('{{time}}', formatTime(resendTimer))}
              </Text>
            ) : (
              <TouchableOpacity onPress={() => handleSendVerification(verificationType)}>
                <Text style={styles.resendLink}>{pv.resend || 'Resend code'}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={handleVerifyOtp}
              disabled={verifying}
            >
              {verifying ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.confirmBtnText}>{pv.confirm || 'Confirm'}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setOtpModalVisible(false)} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>{t.common?.cancel || 'Cancel'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 12 },
  rowBlock: { marginBottom: 12 },
  verifyRow: { alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  verifyInfo: { flex: 1 },
  verifyLabel: { fontSize: 14, fontWeight: '500', color: COLORS.textPrimary },
  hint: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  verifyBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  verifyBtnText: { color: COLORS.white, fontSize: 13, fontWeight: '600' },
  verifiedBadge: { alignItems: 'center', gap: 6, marginBottom: 8 },
  verifiedText: { fontSize: 13, color: COLORS.success, fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 36,
  },
  modalTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 16 },
  otpInput: {
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 10,
    padding: 14,
    fontSize: 22,
    letterSpacing: 8,
    marginBottom: 12,
    color: COLORS.textPrimary,
  },
  resendText: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 16 },
  resendLink: { fontSize: 13, color: COLORS.primary, textAlign: 'center', marginBottom: 16, fontWeight: '600' },
  confirmBtn: {
    backgroundColor: COLORS.primary,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  confirmBtnText: { color: COLORS.white, fontWeight: '600', fontSize: 15 },
  cancelBtn: { alignItems: 'center', padding: 8 },
  cancelText: { color: COLORS.textSecondary, fontSize: 14 },
});

export default ProfileVerificationSection;
