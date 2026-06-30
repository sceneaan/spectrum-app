import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { showToast } from '../../components/InAppToast';
import { useNavigation } from '@react-navigation/native';
import DropDownPicker from 'react-native-dropdown-picker';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useLanguage } from '../../store/LanguageContext';
import Header from '../../components/Header';
import { AppText, AppButton, AppCard, EmptyState } from '../../components/ui';
import COLORS from '../../constants/colors';
import ICONS from '../../constants/icons';
import { useGetAssociatedPatients } from '../../api/services/Appointment.Service';
import { useProviderCreateThread } from '../../api/services/Thread.Service';
import { uploadAttachment, validateFile } from '../../api/services/Upload.Service';
import { formatFileSize } from '../../utils/fileUtils';
import { formatPersonName } from '../../utils/displayName';
import { SPACING, RADIUS } from '../../theme';
import DocumentPicker from 'react-native-document-picker';

const MESSAGE_TYPES = [
  { value: 'General', labelKey: 'general' },
  { value: 'Urgent', labelKey: 'urgent' },
  { value: 'Prescription Related', labelKey: 'prescription' },
];

const ProviderNewMessageScreen = () => {
  const { t, isRTL } = useLanguage();
  const navigation = useNavigation();
  const pd = t.providerDashboard || {};
  const cm = t.composeMessage || {};

  const [msgType, setMsgType] = useState('General');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [patientOpen, setPatientOpen] = useState(false);
  const [patientValue, setPatientValue] = useState(null);
  const [patientItems, setPatientItems] = useState([]);

  const { data: patients, isLoading: patientsLoading } = useGetAssociatedPatients();
  const { mutate: createThread, isPending: isSending } = useProviderCreateThread();
  const [isUploading, setIsUploading] = useState(false);

  const rowStyle = { flexDirection: isRTL ? 'row-reverse' : 'row' };
  const alignText = isRTL ? 'right' : 'left';

  useEffect(() => {
    if (!patients?.length) {
      setPatientItems([]);
      return;
    }
    const items = patients.map((item) => ({
      label: formatPersonName(item.name) || item.email || item.phone || pd.patient || 'Patient',
      value: item._id,
    }));
    setPatientItems(items);
  }, [patients, pd.patient]);

  const handleFileUpload = async () => {
    try {
      const results = await DocumentPicker.pick({
        type: [DocumentPicker.types.pdf, DocumentPicker.types.images],
      });
      const file = results[0];
      const validation = validateFile(file, 'attachment');
      if (!validation.isValid) {
        showToast({ type: 'error', title: t.common?.error || 'Error', message: validation.error });
        return;
      }

      setIsUploading(true);
      try {
        const uploadResponse = await uploadAttachment(file);
        setSelectedFile({
          ...file,
          fileId: uploadResponse?.fileId,
          url: uploadResponse?.url || '',
        });
      } catch (uploadErr) {
        showToast({
          type: 'error',
          title: t.common?.error || 'Error',
          message: uploadErr.message || cm.fileUploadFailed || 'File upload failed',
        });
      } finally {
        setIsUploading(false);
      }
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        showToast({
          type: 'error',
          title: t.common?.error || 'Error',
          message: cm.fileUploadFailed || 'File upload failed',
        });
      }
    }
  };

  const handleSubmit = () => {
    if (!patientValue) {
      showToast({ type: 'error', title: t.common?.error || 'Error', message: pd.selectPatientError || 'Please select a patient' });
      return;
    }
    if (!subject.trim()) {
      showToast({ type: 'error', title: t.common?.error || 'Error', message: cm.subjectEmpty || 'Please enter a subject' });
      return;
    }
    if (!message.trim()) {
      showToast({ type: 'error', title: t.common?.error || 'Error', message: cm.emptyMessage || 'Please enter a message' });
      return;
    }

    const payload = {
      patient: patientValue,
      subject: subject.trim(),
      type: msgType,
      body: message.trim(),
      attachment: selectedFile ? {
        fileId: selectedFile.fileId,
        url: selectedFile.url,
        size: selectedFile.size,
        name: selectedFile.name,
        type: selectedFile.type,
      } : null,
    };

    createThread(payload, {
      onSuccess: (thread) => {
        const patient = patients?.find((p) => String(p._id) === String(patientValue));
        const threadForChat = {
          ...thread,
          patient: thread?.patient || {
            _id: patientValue,
            fullName: patient?.name,
            fullNameEnglish: patient?.name,
          },
        };
        navigation.replace('ChatDetails', { thread: threadForChat });
      },
      onError: () => {
        showToast({
          type: 'error',
          title: t.common?.error || 'Error',
          message: cm.messageFailed || 'Failed to send message',
        });
      },
    });
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        <Header
          showBack
          onBack={() => navigation.goBack()}
          title={pd.composeTitle || cm.title || 'New message'}
        />

        {patientsLoading ? (
          <View style={styles.loader}>
            <ActivityIndicator color={COLORS.primary} />
          </View>
        ) : !patientItems.length ? (
          <View style={styles.content}>
            <EmptyState
              title={pd.noPatientsCompose || 'No patients available yet'}
              subtitle={pd.noPatients || 'Patients appear after you have appointments together.'}
              actionLabel={t.common?.back || 'Back'}
              onAction={() => navigation.goBack()}
            />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <AppText variant="label" style={[styles.label, { textAlign: alignText }]}>
              {pd.composeToPatient || cm.to || 'To'}
            </AppText>
            <DropDownPicker
              open={patientOpen}
              value={patientValue}
              items={patientItems}
              setOpen={setPatientOpen}
              setValue={setPatientValue}
              setItems={setPatientItems}
              placeholder={pd.selectPatient || 'Select patient'}
              style={styles.dropdown}
              dropDownContainerStyle={styles.dropdownList}
              listMode="SCROLLVIEW"
              zIndex={3000}
              zIndexInverse={1000}
            />

            <AppText variant="label" style={[styles.label, { textAlign: alignText, marginTop: SPACING.lg }]}>
              {cm.messageType || 'Message type'}
            </AppText>
            <View style={[styles.chipRow, rowStyle]}>
              {MESSAGE_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[styles.chip, msgType === type.value && styles.chipActive]}
                  onPress={() => setMsgType(type.value)}
                >
                  <AppText
                    variant="caption"
                    color={msgType === type.value ? COLORS.primaryDark : COLORS.textSecondary}
                    style={styles.chipText}
                  >
                    {cm[type.labelKey] || type.value}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>

            <AppText variant="label" style={[styles.label, { textAlign: alignText }]}>
              {cm.subject || 'Subject'}
            </AppText>
            <TextInput
              style={[styles.input, { textAlign: alignText }]}
              placeholder={cm.enterSubject || 'Enter subject'}
              placeholderTextColor={COLORS.gray500}
              value={subject}
              onChangeText={setSubject}
            />

            <AppText variant="label" style={[styles.label, { textAlign: alignText }]}>
              {cm.message || 'Message'}
            </AppText>
            <TextInput
              style={[styles.input, styles.textArea, { textAlign: alignText }]}
              placeholder={cm.typeMessage || 'Type your message...'}
              placeholderTextColor={COLORS.gray500}
              multiline
              value={message}
              onChangeText={setMessage}
            />

            <AppText variant="label" style={[styles.label, { textAlign: alignText }]}>
              {cm.attachments || 'Attachments (optional)'}
            </AppText>
            {selectedFile ? (
              <AppCard style={styles.fileCard} padding={SPACING.md}>
                <View style={[rowStyle, styles.fileRow]}>
                  <Image source={ICONS.file} style={styles.fileIcon} />
                  <View style={styles.fileMeta}>
                    <AppText variant="bodySmall" numberOfLines={1}>{selectedFile.name}</AppText>
                    <AppText variant="caption" color={COLORS.textSecondary}>
                      {formatFileSize(selectedFile.size)}
                    </AppText>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedFile(null)}>
                    <Icon name="times" size={16} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
              </AppCard>
            ) : (
              <TouchableOpacity style={styles.attachBox} onPress={handleFileUpload} disabled={isUploading}>
                {isUploading ? (
                  <ActivityIndicator color={COLORS.primary} />
                ) : (
                  <View style={rowStyle}>
                    <Image source={ICONS.paperclip} style={styles.attachIcon} />
                    <AppText variant="bodySmall" color={COLORS.primaryDark} style={styles.attachLabel}>
                      {cm.addFiles || 'Add files'}
                    </AppText>
                  </View>
                )}
              </TouchableOpacity>
            )}
          </ScrollView>
        )}

        <View style={styles.footer}>
          <AppButton
            title={cm.sendMessage || 'Send message'}
            onPress={handleSubmit}
            loading={isSending}
            disabled={isSending || isUploading || patientsLoading}
            fullWidth
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  label: { marginBottom: SPACING.sm, fontWeight: '600' },
  dropdown: {
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    minHeight: 48,
    marginBottom: SPACING.sm,
  },
  dropdownList: {
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
  },
  chipRow: { flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.lg },
  chip: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primaryMuted,
  },
  chipText: { fontWeight: '600' },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
    color: COLORS.textPrimary,
    fontSize: 15,
  },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  attachBox: {
    backgroundColor: COLORS.surface,
    padding: SPACING.xl,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.primaryMuted,
  },
  attachIcon: { width: 18, height: 18, tintColor: COLORS.primary, marginEnd: SPACING.sm },
  attachLabel: { fontWeight: '600' },
  fileCard: { marginBottom: SPACING.md },
  fileRow: { alignItems: 'center' },
  fileIcon: { width: 24, height: 24, tintColor: COLORS.primary, marginEnd: SPACING.md },
  fileMeta: { flex: 1, minWidth: 0 },
  footer: {
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
});

export default ProviderNewMessageScreen;
