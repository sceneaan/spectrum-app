import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import { AppText } from '../../../components/ui';
import COLORS from '../../../constants/colors';

const COUNTRY_CODES = [
  { code: '+966', country: 'SA', label: 'Saudi Arabia' },
  { code: '+971', country: 'AE', label: 'UAE' },
  { code: '+965', country: 'KW', label: 'Kuwait' },
  { code: '+973', country: 'BH', label: 'Bahrain' },
  { code: '+974', country: 'QA', label: 'Qatar' },
  { code: '+968', country: 'OM', label: 'Oman' },
  { code: '+20', country: 'EG', label: 'Egypt' },
  { code: '+962', country: 'JO', label: 'Jordan' },
  { code: '+961', country: 'LB', label: 'Lebanon' },
  { code: '+1', country: 'US', label: 'USA' },
  { code: '+44', country: 'UK', label: 'UK' },
];

const InvitationModal = ({
  visible,
  onClose,
  onSend,
  isLoading = false,
}) => {
  const { t } = useTranslation();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (!phoneNumber.trim()) {
      return;
    }
    onSend({
      phone: `${selectedCountry.code}${phoneNumber}`,
      message: message.trim(),
    });
  };

  const handleClose = () => {
    setPhoneNumber('');
    setMessage('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <AppText variant="h3" color={COLORS.slateText} style={styles.headerTitle}>
              {t('videoConsultation.sendInvitation', 'Send Invitation')}
            </AppText>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={COLORS.slateText} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Phone Number */}
            <View style={styles.inputGroup}>
              <AppText variant="label" color={COLORS.slateText} style={styles.inputLabel}>
                {t('videoConsultation.phoneNumber', 'Phone Number')}
              </AppText>
              <View style={styles.phoneInputRow}>
                {/* Country Code Selector */}
                <TouchableOpacity
                  style={styles.countrySelector}
                  onPress={() => setShowCountryPicker(!showCountryPicker)}
                >
                  <AppText variant="bodyMedium" color={COLORS.slateText} style={styles.countryCode}>{selectedCountry.code}</AppText>
                  <Icon name="arrow-drop-down" size={20} color={COLORS.slateTextMuted} />
                </TouchableOpacity>

                {/* Phone Input */}
                <TextInput
                  style={styles.phoneInput}
                  placeholder={t('videoConsultation.phonePlaceholder', '5XXXXXXXX')}
                  placeholderTextColor={COLORS.gray500}
                  keyboardType="phone-pad"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  maxLength={15}
                />
              </View>

              {/* Country Picker Dropdown */}
              {showCountryPicker && (
                <View style={styles.countryDropdown}>
                  <ScrollView style={styles.countryList} nestedScrollEnabled>
                    {COUNTRY_CODES.map((country) => (
                      <TouchableOpacity
                        key={country.code}
                        style={[
                          styles.countryOption,
                          selectedCountry.code === country.code && styles.countryOptionSelected,
                        ]}
                        onPress={() => {
                          setSelectedCountry(country);
                          setShowCountryPicker(false);
                        }}
                      >
                        <AppText variant="label" color={COLORS.slateText} style={styles.countryOptionCode}>{country.code}</AppText>
                        <AppText variant="bodySmall" color={COLORS.slateTextMuted} style={styles.countryOptionLabel}>{country.label}</AppText>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Message (Optional) */}
            <View style={styles.inputGroup}>
              <AppText variant="label" color={COLORS.slateText} style={styles.inputLabel}>
                {t('videoConsultation.invitationMessage', 'Message (Optional)')}
              </AppText>
              <TextInput
                style={styles.messageInput}
                placeholder={t(
                  'videoConsultation.invitationMessagePlaceholder',
                  'Add a personal message to the invitation...'
                )}
                placeholderTextColor={COLORS.gray500}
                multiline
                numberOfLines={3}
                value={message}
                onChangeText={setMessage}
                maxLength={200}
              />
            </View>
          </ScrollView>

          {/* Send Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.sendButton, (!phoneNumber.trim() || isLoading) && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!phoneNumber.trim() || isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <Icon name="send" size={20} color={COLORS.white} />
                  <AppText variant="button" color={COLORS.white} style={styles.sendButtonText}>
                    {t('videoConsultation.sendInvitation', 'Send Invitation')}
                  </AppText>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slateBorder,
  },
  headerTitle: {},
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    marginBottom: 8,
  },
  phoneInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.slateMuted,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.slateBorder,
  },
  countryCode: {},
  phoneInput: {
    flex: 1,
    backgroundColor: COLORS.slateMuted,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    fontSize: 16,
    color: COLORS.slateText,
    borderWidth: 1,
    borderColor: COLORS.slateBorder,
  },
  countryDropdown: {
    marginTop: 8,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.slateBorder,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  countryList: {
    maxHeight: 200,
  },
  countryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slateMuted,
    gap: 12,
  },
  countryOptionSelected: {
    backgroundColor: COLORS.primaryLight,
  },
  countryOptionCode: {
    width: 50,
  },
  countryOptionLabel: {},
  messageInput: {
    backgroundColor: COLORS.slateMuted,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    fontSize: 14,
    color: COLORS.slateText,
    borderWidth: 1,
    borderColor: COLORS.slateBorder,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.slateBorder,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.gray500,
  },
  sendButtonText: {},
});

export default InvitationModal;
