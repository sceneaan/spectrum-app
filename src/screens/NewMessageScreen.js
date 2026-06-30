import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useLanguage } from '../store/LanguageContext';
import Header from '../components/Header';
import COLORS from '../constants/colors';
import ICONS from '../constants/icons';
import DropDownPicker from 'react-native-dropdown-picker';
import { useGetMyProviders } from '@api/services/MedicalReports.Service';
import { usePatientCreateThread } from '@api/services/Thread.Service';
import { useGetCompletedAppointments } from '@api/services/Appointment.Service';
import { uploadAttachment, validateFile } from '@api/services/Upload.Service';
import DocumentPicker from 'react-native-document-picker';
import { formatFileSize } from '@utils/fileUtils';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { getMessagingEligibility } from '../utils/messagingEligibility';

const NewMessageScreen = () => {
  const { t, isRTL } = useLanguage();
  const navigation = useNavigation();
  
  // Form State
  const [msgType, setMsgType] = useState('General'); // Default type
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  
  // Provider Dropdown State
  const [providerOpen, setProviderOpen] = useState(false);
  const [providerValue, setProviderValue] = useState(null);
  const [providerItems, setProviderItems] = useState([]);

  // API Hooks
  const { data: userProviders } = useGetMyProviders();
  const { data: appointments, isLoading: appointmentsLoading } = useGetCompletedAppointments();
  const { mutate: createThread, isLoading: isSending } = usePatientCreateThread();
  const [isUploading, setIsUploading] = useState(false);

  // Check if the selected provider has a completed appointment within the last 30 days
  const hasRecentAppointment = (providerId) => {
    const eligibility = getMessagingEligibility(appointments, providerId);
    if (eligibility === null) return !appointmentsLoading;
    return eligibility;
  };

  const canMessageProvider = providerValue
    ? hasRecentAppointment(providerValue)
    : !appointmentsLoading;

  // Populate Providers
  useEffect(() => {
    if (userProviders) {
      const items = userProviders.map(item => ({
        label: isRTL
          ? (item.provider?.fullNameArabic || item.provider?.fullName || 'طبيب غير معروف')
          : (item.provider?.fullNameEnglish || item.provider?.fullName || 'Unknown Doctor'),
        value: item.provider?.id
      }));
      setProviderItems(items);
    }
  }, [userProviders, isRTL]);

  const rowStyle = { flexDirection: isRTL ? 'row-reverse' : 'row' };
  const alignText = { textAlign: isRTL ? 'right' : 'left' };

  const handleFileUpload = async () => {
    try {
      const results = await DocumentPicker.pick({
        type: [DocumentPicker.types.pdf, DocumentPicker.types.images],
      });

      const file = results[0];

      // Validate file before upload
      const validation = validateFile(file, 'attachment');
      if (!validation.isValid) {
        Alert.alert(t.common?.error || 'Error', validation.error);
        return;
      }

      setIsUploading(true);

      try {
        // Use secure upload function
        const uploadResponse = await uploadAttachment(file);


        // Store file info with both fileId (new) and url (legacy)
        setSelectedFile({
          ...file,
          fileId: uploadResponse?.fileId, // New secure field
          url: uploadResponse?.url || '', // Legacy field
        });
      } catch (uploadErr) {
        Alert.alert(t.common?.error || 'Error', uploadErr.message || t.composeMessage?.fileUploadFailed || 'File upload failed');
      } finally {
        setIsUploading(false);
      }
    } catch (err) {
      // DocumentPicker.isCancel(err) is treated as no-op
    }
  };

  const handleRemoveFile = () => {
      setSelectedFile(null);
  };

  const handleSubmit = () => {
      if (!providerValue) {
          Alert.alert(t.common?.error || 'Error', t.composeMessage?.selectProviderError || 'Please select a provider');
          return;
      }
      // Check if the last appointment with this provider is within 30 days
      if (!hasRecentAppointment(providerValue)) {
          Alert.alert(
              t.common?.error || 'Error',
              isRTL
                  ? 'لا يمكنك إرسال رسالة إلى هذا الطبيب. يجب أن يكون آخر موعد مكتمل خلال الـ 30 يومًا الماضية.'
                  : 'You cannot message this doctor. Your last completed appointment must be within the past 30 days.'
          );
          return;
      }
      if (!subject.trim()) {
          Alert.alert(t.common?.error || 'Error', t.composeMessage?.subjectEmpty || 'Please enter a subject');
          return;
      }
      if (!message.trim()) {
          Alert.alert(t.common?.error || 'Error', t.composeMessage?.emptyMessage || 'Please enter a message');
          return;
      }

      // Include both fileId (new secure) and url (legacy) for backward compatibility
      const payload = {
        subject: subject.trim(),
        type: msgType,
        provider: providerValue,
        patient: null,
        body: message.trim(),
        attachment: selectedFile ? {
          fileId: selectedFile.fileId, // New secure field
          url: selectedFile.url, // Legacy field for backward compatibility
          size: selectedFile.size,
          name: selectedFile.name,
          type: selectedFile.type,
        } : null,
      };

      createThread(payload, {
          onSuccess: () => {
              Alert.alert(t.common?.success || 'Success', t.composeMessage?.messageSent || 'Message sent successfully', [
                  { text: t.common?.ok || 'OK', onPress: () => navigation.goBack() }
              ]);
          },
          onError: (err) => {
              Alert.alert(t.common?.error || 'Error', t.composeMessage?.messageFailed || 'Failed to send message');
          }
      });
  };

  const TypeChip = ({ label, value }) => (
    <TouchableOpacity
      onPress={() => setMsgType(value)}
      style={[styles.chip, msgType === value && styles.activeChip]}
    >
      <Text style={[styles.chipText, msgType === value && styles.activeChipText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={styles.container}>
      <Header showBack onBack={() => navigation.goBack()} title={t.composeMessage?.title || t.newMessage || 'New Message'} />

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">

        {/* Provider Select */}
        <Text style={[styles.label, alignText]}>{t.composeMessage?.to || 'To :'}</Text>

        <DropDownPicker
            open={providerOpen}
            value={providerValue}
            items={providerItems}
            setOpen={setProviderOpen}
            setValue={setProviderValue}
            setItems={setProviderItems}
            placeholder={t.composeMessage?.selectProvider || "Select Provider"}
            style={[styles.input, { zIndex: 1000 }]}
            dropDownContainerStyle={{ borderColor: COLORS.gray200 }}
            listMode="SCROLLVIEW"
            zIndex={1000}
            zIndexInverse={3000}
        />

        {/* Warning if provider has no recent appointment */}
        {providerValue && !canMessageProvider && (
          <View style={styles.warningBanner}>
            <Icon name="exclamation-circle" size={16} color={COLORS.warning || '#f59e0b'} />
            <Text style={styles.warningText}>
              {t.messaging?.expiredBanner || 'You cannot message this doctor. Your last completed appointment must be within the past 30 days.'}
            </Text>
          </View>
        )}

        {/* Message Type */}
        <Text style={[styles.label, alignText]}>{t.composeMessage?.messageType || 'Message Type :'}</Text>
        <View style={[rowStyle, { gap: 10, marginBottom: 20, flexWrap: 'wrap' }]}>
          <TypeChip label={t.composeMessage?.general || 'General'} value="General" />
          <TypeChip label={t.composeMessage?.urgent || 'Urgent'} value="Urgent" />
          <TypeChip label={t.composeMessage?.prescription || 'Prescription'} value="Prescription Related" />
        </View>

        {/* Subject */}
        <Text style={[styles.label, alignText]}>{t.composeMessage?.subject || 'Subject :'}</Text>
        <TextInput
          style={[styles.input, alignText]}
          placeholder={t.composeMessage?.enterSubject || 'Enter Subject'}
          value={subject}
          onChangeText={setSubject}
        />

        {/* Message Body */}
        <Text style={[styles.label, alignText]}>{t.composeMessage?.message || 'Message :'}</Text>
        <TextInput
          style={[styles.input, alignText, styles.textArea]}
          placeholder={t.composeMessage?.typeMessage || 'Type your message here...'}
          multiline
          value={message}
          onChangeText={setMessage}
        />

        {/* Attachments */}
        <Text style={[styles.label, alignText]}>{t.composeMessage?.attachments || 'Attachments (Optional) :'}</Text>
        
        {selectedFile ? (
             <View style={styles.filePreview}>
                 <View style={[rowStyle, { alignItems: 'center', flex: 1 }]}>
                     <Image source={ICONS.file} style={{ width: 24, height: 24, tintColor: COLORS.primary }} />
                     <View style={{ marginHorizontal: 10, flex: 1 }}>
                         <Text numberOfLines={1} style={{ color: COLORS.textPrimary, fontWeight: '600' }}>{selectedFile.name}</Text>
                         <Text style={{ color: COLORS.gray500, fontSize: 12 }}>{formatFileSize(selectedFile.size)}</Text>
                     </View>
                 </View>
                 <TouchableOpacity onPress={handleRemoveFile}>
                     <Text style={{ color: COLORS.error, fontWeight: 'bold' }}>X</Text>
                 </TouchableOpacity>
             </View>
        ) : (
            <TouchableOpacity style={styles.attachBox} onPress={handleFileUpload} disabled={isUploading}>
            {isUploading ? (
                <ActivityIndicator color={COLORS.primary} />
            ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Image source={ICONS.paperclip} style={{ width: 20, height: 20, tintColor: COLORS.primary }} />
                    <Text style={{ color: COLORS.primary, fontWeight: 'bold', marginLeft: 8 }}>{t.composeMessage?.addFiles || 'Add Files'}</Text>
                </View>
            )}
            </TouchableOpacity>
        )}

      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.sendBtn, !canMessageProvider && styles.sendBtnDisabled]}
          onPress={handleSubmit}
          disabled={isSending || isUploading || !canMessageProvider}
        >
          {isSending ? (
              <ActivityIndicator color={COLORS.white} />
          ) : (
              <Text style={{ color: COLORS.white, fontWeight: 'bold', fontSize: 16 }}>{t.composeMessage?.sendMessage || 'Send Message'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 8, marginTop: 5 },
  input: { backgroundColor: COLORS.white, borderRadius: 12, padding: 15, borderWidth: 1, borderColor: COLORS.gray200, marginBottom: 15, fontSize: 14, color: COLORS.textPrimary },
  textArea: { height: 120, textAlignVertical: 'top' },

  chip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.gray200, marginEnd: 8, marginBottom: 5 },
  activeChip: { backgroundColor: COLORS.promo1, borderColor: COLORS.primary },
  chipText: { color: COLORS.gray600, fontSize: 12 },
  activeChipText: { color: COLORS.primary, fontWeight: 'bold' },

  attachBox: { backgroundColor: COLORS.white, padding: 20, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: COLORS.primary },
  
  filePreview: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.offWhite, padding: 15, borderRadius: 12, borderWidth: 1, borderColor: COLORS.gray200 },

  footer: { padding: 20, backgroundColor: COLORS.white, borderTopWidth: 1, borderColor: COLORS.gray200 },
  sendBtn: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: COLORS.gray400 || '#9ca3af', opacity: 0.7 },

  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    gap: 8,
  },
  warningText: {
    color: '#92400e',
    fontSize: 13,
    flex: 1,
  },
});

export default NewMessageScreen;