import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Alert } from 'react-native';
import Header from '../../components/Header';
import { AppText, AppCard, AppButton } from '../../components/ui';
import { showToast } from '../../components/InAppToast';
import { useLanguage } from '../../store/LanguageContext';
import { useAdminSendNotifications } from '../../api/services/Notification.Service';
import COLORS from '../../constants/colors';
import { SPACING, RADIUS } from '../../theme';

const AdminNotificationsScreen = () => {
  const { t } = useLanguage();
  const ad = t.adminDashboard || {};
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const { mutate: sendNotification, isPending } = useAdminSendNotifications();

  const handleSend = () => {
    if (!title.trim() || !message.trim()) {
      Alert.alert(t.common?.error || 'Error', ad.notificationFieldsRequired || 'Title and message are required');
      return;
    }
    sendNotification(
      { title: title.trim(), message: message.trim(), target: 'all' },
      {
        onSuccess: () => {
          showToast({
            type: 'success',
            title: t.common?.success || 'Success',
            message: ad.notificationSent || 'Notification sent',
          });
          setTitle('');
          setMessage('');
        },
        onError: () => {
          showToast({
            type: 'error',
            title: t.common?.error || 'Error',
            message: ad.notificationFailed || 'Could not send notification',
          });
        },
      },
    );
  };

  return (
    <View style={styles.container}>
      <Header showBack title={ad.notificationsTitle || 'Send notification'} />
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="bodySmall" color={COLORS.textSecondary} style={styles.hint}>
          {ad.notificationsHint || 'Broadcast a push notification to app users.'}
        </AppText>
        <AppCard padding={SPACING.lg}>
          <AppText variant="caption" color={COLORS.textSecondary}>{ad.notificationTitle || 'Title'}</AppText>
          <TextInput
            value={title}
            onChangeText={setTitle}
            style={styles.input}
            placeholder={ad.notificationTitlePlaceholder || 'Notification title'}
            placeholderTextColor={COLORS.gray500}
          />
          <AppText variant="caption" color={COLORS.textSecondary} style={styles.label}>
            {ad.notificationMessage || 'Message'}
          </AppText>
          <TextInput
            value={message}
            onChangeText={setMessage}
            style={[styles.input, styles.textArea]}
            multiline
            placeholder={ad.notificationMessagePlaceholder || 'Notification message'}
            placeholderTextColor={COLORS.gray500}
          />
          <AppButton
            label={ad.sendNotification || 'Send'}
            onPress={handleSend}
            loading={isPending}
            style={styles.sendBtn}
          />
        </AppCard>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingBottom: 40 },
  hint: { marginBottom: SPACING.lg, lineHeight: 20 },
  input: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    color: COLORS.textPrimary,
  },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  label: { marginTop: SPACING.sm },
  sendBtn: { marginTop: SPACING.md },
});

export default AdminNotificationsScreen;
