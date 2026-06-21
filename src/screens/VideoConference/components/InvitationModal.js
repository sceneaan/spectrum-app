import React, { useState } from 'react';
import {
  View,
  Text,
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
import COLORS from '../../../constants/colors';

const PRIMARY_COLOR = '#65bed6';

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
            <Text style={styles.headerTitle}>
              {t('video_conference.send_invitation', 'Send Invitation')}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Icon name="close" size={24} color="#1E293B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Phone Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {t('video_conference.phone_number', 'Phone Number')}
              </Text>
              <View style={styles.phoneInputRow}>
                {/* Country Code Selector */}
                <TouchableOpacity
                  style={styles.countrySelector}
                  onPress={() => setShowCountryPicker(!showCountryPicker)}
                >
                  <Text style={styles.countryCode}>{selectedCountry.code}</Text>
                  <Icon name="arrow-drop-down" size={20} color="#64748B" />
                </TouchableOpacity>

                {/* Phone Input */}
                <TextInput
                  style={styles.phoneInput}
                  placeholder="5XXXXXXXX"
                  placeholderTextColor="#94A3B8"
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
                        <Text style={styles.countryOptionCode}>{country.code}</Text>
                        <Text style={styles.countryOptionLabel}>{country.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Message (Optional) */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {t('video_conference.invitation_message', 'Message (Optional)')}
              </Text>
              <TextInput
                style={styles.messageInput}
                placeholder={t(
                  'video_conference.invitation_message_placeholder',
                  'Add a personal message to the invitation...'
                )}
                placeholderTextColor="#94A3B8"
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
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Icon name="send" size={20} color="white" />
                  <Text style={styles.sendButtonText}>
                    {t('video_conference.send_invitation', 'Send Invitation')}
                  </Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: 'white',
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
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
  },
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
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  phoneInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  countryCode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  phoneInput: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    fontSize: 16,
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  countryDropdown: {
    marginTop: 8,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
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
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  countryOptionSelected: {
    backgroundColor: 'rgba(101, 190, 214, 0.1)',
  },
  countryOptionCode: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    width: 50,
  },
  countryOptionLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  messageInput: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    fontSize: 14,
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  sendButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default InvitationModal;
