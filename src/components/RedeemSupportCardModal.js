import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { useLanguage } from '../store/LanguageContext';
import { useRedeemSupportCard } from '../api/services/SupportCard.Service';
import COLORS from '../constants/colors';
import RiyalText from './RiyalText';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const RedeemSupportCardModal = ({ visible, onClose, onSuccess }) => {
  const { t, isRTL } = useLanguage();
  const [code, setCode] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [redeemedAmount, setRedeemedAmount] = useState(null);
  const redeemMutation = useRedeemSupportCard();

  const handleCodeChange = (text) => {
    // Auto-uppercase and limit to 8 characters
    const formatted = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setCode(formatted.slice(0, 8));
  };

  const handlePaste = async () => {
    try {
      const clipboardContent = await Clipboard.getString();
      handleCodeChange(clipboardContent);
    } catch (error) {
      Alert.alert(
        t.common?.error || 'Error',
        'Failed to paste from clipboard'
      );
    }
  };

  const handleRedeem = async () => {
    if (code.length !== 8) {
      Alert.alert(
        t.common?.error || 'Error',
        t.wallet?.invalidCodeLength || 'Please enter a valid 8-character code'
      );
      return;
    }

    try {
      const result = await redeemMutation.mutateAsync({ code });

      // Extract amount from transaction
      const amount = result?.transaction?.netAmount || result?.amount || 0;
      setRedeemedAmount(amount);
      setShowSuccess(true);

      // Call success callback after a short delay
      setTimeout(() => {
        onSuccess && onSuccess(result);
        handleClose();
      }, 2500);
    } catch (error) {
      console.log('Redeem error details:', error);

      // Provide more helpful error messages
      let errorMessage = error.message || t.wallet?.redeemError || 'Failed to redeem support card';

      // Check if it's a backend translation key
      if (errorMessage.includes('supportCard.notFound')) {
        errorMessage = isRTL
          ? 'بطاقة الدعم غير موجودة أو غير مخصصة لحسابك. يرجى التحقق من:\n\n' +
            '• الرمز صحيح (8 أحرف)\n' +
            '• البطاقة مخصصة لبريدك الإلكتروني\n' +
            '• البطاقة لم تنته صلاحيتها\n' +
            '• البطاقة غير معطلة'
          : 'Support card not found or not assigned to your account. Please check:\n\n' +
            '• The code is correct (8 characters)\n' +
            '• The card is assigned to your email\n' +
            '• The card has not expired\n' +
            '• The card is not inactive';
      } else if (errorMessage.includes('supportCard.fullyRedeemed')) {
        errorMessage = isRTL
          ? 'تم استرداد هذه البطاقة بالكامل بالفعل'
          : 'This support card has already been fully redeemed';
      } else if (errorMessage.includes('supportCard.allFieldsRequired')) {
        errorMessage = isRTL
          ? 'يرجى إدخال رمز البطاقة'
          : 'Please enter the card code';
      } else if (errorMessage.includes('not found') || errorMessage.includes('notFound')) {
        errorMessage = t.wallet?.cardNotFoundOrNotAssigned ||
          'Support card not found or not assigned to your account. Please check:\n\n' +
          '• The code is correct (8 characters)\n' +
          '• The card is assigned to your email\n' +
          '• The card has not expired\n' +
          '• The card is not inactive';
      }

      Alert.alert(
        t.common?.error || 'Error',
        errorMessage
      );
    }
  };

  const handleClose = () => {
    setCode('');
    setShowSuccess(false);
    setRedeemedAmount(null);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.modalContainer}>
          {!showSuccess ? (
            <>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>
                  {t.wallet?.redeemSupportCard || 'Redeem Support Card'}
                </Text>
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                  <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Description */}
              <Text style={styles.description}>
                {t.wallet?.enterCodeDescription || 'Enter your 8-character support card code'}
              </Text>

              {/* Input */}
              <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                  <TextInput
                    value={code}
                    onChangeText={handleCodeChange}
                    placeholder="AB12CD34"
                    placeholderTextColor={COLORS.gray400}
                    maxLength={8}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    autoComplete="off"
                    keyboardType="default"
                    textContentType="none"
                    contextMenuHidden={false}
                    selectTextOnFocus={false}
                    caretHidden={false}
                    style={[
                      styles.input,
                      code.length === 8 && styles.inputValid,
                    ]}
                    editable={!redeemMutation.isPending}
                  />
                </View>
                <TouchableOpacity
                  style={styles.pasteButton}
                  onPress={handlePaste}
                  disabled={redeemMutation.isPending}
                >
                  <Icon name="content-paste" size={20} color={COLORS.primary} />
                </TouchableOpacity>
                <View style={styles.characterCount}>
                  <Text
                    style={[
                      styles.characterCountText,
                      code.length === 8 && styles.characterCountValid,
                    ]}
                  >
                    {code.length}/8
                  </Text>
                </View>
              </View>

              {/* Buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  onPress={handleClose}
                  style={[styles.button, styles.cancelButton]}
                  disabled={redeemMutation.isPending}
                >
                  <Text style={styles.cancelButtonText}>
                    {t.common?.cancel || 'Cancel'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleRedeem}
                  style={[
                    styles.button,
                    styles.redeemButton,
                    (code.length !== 8 || redeemMutation.isPending) && styles.buttonDisabled,
                  ]}
                  disabled={code.length !== 8 || redeemMutation.isPending}
                >
                  {redeemMutation.isPending ? (
                    <ActivityIndicator color={COLORS.white} size="small" />
                  ) : (
                    <Text style={styles.redeemButtonText}>
                      {t.wallet?.redeem || 'Redeem'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            /* Success State */
            <View style={styles.successContainer}>
              <View style={styles.successIcon}>
                <Text style={styles.successIconText}>✓</Text>
              </View>
              <Text style={styles.successTitle}>
                {t.wallet?.redeemSuccess || 'Success!'}
              </Text>
              <Text style={styles.successDescription}>
                {t.wallet?.supportCardRedeemed || 'Support card redeemed successfully'}
              </Text>

              {redeemedAmount !== null && (
                <View style={styles.amountContainer}>
                  <Text style={styles.amountLabel}>
                    {t.wallet?.creditedAmount || 'Credited Amount'}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={styles.plusSign}>+</Text>
                    <RiyalText
                      text={Number(redeemedAmount).toFixed(2)}
                      textStyle={styles.amountValue}
                      size={28}
                    />
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 25,
    paddingBottom: 35,
    maxHeight: '85%',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    flex: 1,
  },
  closeButton: {
    padding: 5,
  },
  closeText: {
    fontSize: 24,
    color: COLORS.gray600,
  },

  // Description
  description: {
    fontSize: 14,
    color: COLORS.gray600,
    marginBottom: 25,
    lineHeight: 20,
  },

  // Input
  inputContainer: {
    marginBottom: 30,
    position: 'relative',
    width: '100%',
  },
  inputWrapper: {
    direction: 'ltr', // Force LTR container
    width: '100%',
  },
  input: {
    backgroundColor: COLORS.gray100,
    borderWidth: 2,
    borderColor: COLORS.gray200,
    borderRadius: 14,
    padding: 18,
    paddingLeft: 55,
    paddingRight: 55,
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
    letterSpacing: 4,
    textAlignVertical: 'center',
    width: '100%',
  },
  inputValid: {
    borderColor: COLORS.success,
    backgroundColor: `${COLORS.success}10`,
  },
  pasteButton: {
    position: 'absolute',
    left: 15,
    top: 20,
    padding: 8,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  characterCount: {
    position: 'absolute',
    right: 15,
    top: 22,
  },
  characterCountText: {
    fontSize: 12,
    color: COLORS.gray500,
    fontWeight: '600',
  },
  characterCountValid: {
    color: COLORS.success,
  },

  // Buttons
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  cancelButton: {
    backgroundColor: COLORS.gray200,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray700,
  },
  redeemButton: {
    backgroundColor: COLORS.primary,
    elevation: 2,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  redeemButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  buttonDisabled: {
    opacity: 0.5,
  },

  // Success State
  successContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${COLORS.success}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successIconText: {
    fontSize: 48,
    color: COLORS.success,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  successDescription: {
    fontSize: 15,
    color: COLORS.gray600,
    marginBottom: 25,
    textAlign: 'center',
  },
  amountContainer: {
    backgroundColor: `${COLORS.success}10`,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: `${COLORS.success}30`,
  },
  amountLabel: {
    fontSize: 13,
    color: COLORS.gray600,
    marginBottom: 8,
  },
  plusSign: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.success,
    marginRight: 4,
  },
  amountValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.success,
  },
});

export default RedeemSupportCardModal;
