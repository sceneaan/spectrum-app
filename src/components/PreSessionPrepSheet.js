import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import Modal from 'react-native-modal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../store/LanguageContext';
import { AppText, AppButton } from './ui';
import COLORS from '../constants/colors';
import ICONS from '../constants/icons';
import { SPACING, RADIUS } from '../theme';
import {
  checkSessionMediaPermissions,
  requestSessionMediaPermissions,
  showMediaPermissionAlert,
} from '../utils/sessionPrep';
import haptics from '../utils/haptics';

const CheckRow = ({ icon, label, ok, pendingLabel, okLabel }) => (
  <View style={styles.checkRow}>
    <Image source={icon} style={styles.checkIcon} />
    <View style={{ flex: 1 }}>
      <AppText variant="bodyMedium">{label}</AppText>
      <AppText variant="caption" color={ok ? COLORS.success : COLORS.textSecondary}>
        {ok ? okLabel : pendingLabel}
      </AppText>
    </View>
    <AppText variant="bodyMedium">{ok ? '✓' : '…'}</AppText>
  </View>
);

const PreSessionPrepSheet = ({ visible, session, onClose, onJoin }) => {
  const { t, isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const [permissions, setPermissions] = useState({ camera: false, microphone: false, allGranted: false });
  const [checking, setChecking] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let mounted = true;
    checkSessionMediaPermissions().then((result) => {
      if (mounted) setPermissions(result);
    });
    return () => { mounted = false; };
  }, [visible]);

  const refreshPermissions = async () => {
    setChecking(true);
    const result = await requestSessionMediaPermissions(t);
    setPermissions(result);
    setChecking(false);
    return result;
  };

  const handleJoin = async () => {
    setJoining(true);
    let result = permissions;
    if (!result.allGranted) {
      result = await refreshPermissions();
    }
    setJoining(false);

    if (!result.allGranted) {
      showMediaPermissionAlert(t);
      return;
    }

    haptics.success();
    onJoin?.();
  };

  const tips = [
    t.sessionPrep?.tipQuiet || 'Find a quiet, private space',
    t.sessionPrep?.tipHeadphones || 'Headphones improve audio clarity',
    t.sessionPrep?.tipReady || 'Be ready a few minutes early',
  ];

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      style={styles.modal}
      backdropOpacity={0.5}
      useNativeDriver
      hideModalContentWhileAnimating
    >
      <View style={[styles.sheet, { paddingBottom: insets.bottom + SPACING.lg }]}>
        <View style={styles.handle} />
        <AppText variant="h3" align={isRTL ? 'right' : 'left'}>
          {t.sessionPrep?.title || 'Prepare for your session'}
        </AppText>
        {session?.providerName ? (
          <AppText variant="bodySmall" color={COLORS.textSecondary} align={isRTL ? 'right' : 'left'} style={styles.subtitle}>
            {t.sessionPrep?.withProvider || 'With'} {session.providerName}
          </AppText>
        ) : null}

        <View style={styles.card}>
          <CheckRow
            icon={ICONS.camera}
            label={t.sessionPrep?.camera || 'Camera'}
            ok={permissions.camera}
            okLabel={t.sessionPrep?.ready || 'Ready'}
            pendingLabel={t.sessionPrep?.needsAccess || 'Access needed'}
          />
          <CheckRow
            icon={ICONS.audio}
            label={t.sessionPrep?.microphone || 'Microphone'}
            ok={permissions.microphone}
            okLabel={t.sessionPrep?.ready || 'Ready'}
            pendingLabel={t.sessionPrep?.needsAccess || 'Access needed'}
          />
        </View>

        <View style={styles.tips}>
          {tips.map((tip) => (
            <AppText key={tip} variant="bodySmall" color={COLORS.textSecondary} align={isRTL ? 'right' : 'left'}>
              • {tip}
            </AppText>
          ))}
        </View>

        <AppButton
          title={t.sessionPrep?.joinNow || 'Join session'}
          onPress={handleJoin}
          loading={joining || checking}
          size="md"
          style={styles.joinBtn}
        />
        <AppButton
          title={t.messaging?.cancel || t.common?.goBack || 'Cancel'}
          onPress={onClose}
          variant="ghost"
          size="sm"
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.borderLight,
    marginBottom: SPACING.lg,
  },
  subtitle: {
    marginTop: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  card: {
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  checkIcon: {
    width: 22,
    height: 22,
    tintColor: COLORS.primaryDark,
  },
  tips: {
    gap: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  joinBtn: {
    marginBottom: SPACING.sm,
  },
});

export default PreSessionPrepSheet;
