import React from 'react';
import { View, TouchableOpacity, StyleSheet, Image } from 'react-native';
import Modal from 'react-native-modal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from './ui';
import COLORS from '../constants/colors';
import { SPACING, RADIUS, SHADOWS } from '../theme';

const TabShortcutSheet = ({
  visible,
  title,
  subtitle,
  actions = [],
  onClose,
  isRTL,
}) => {
  const insets = useSafeAreaInsets();
  const rowStyle = { flexDirection: isRTL ? 'row-reverse' : 'row' };

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      style={styles.modal}
      backdropOpacity={0.45}
      useNativeDriver
      hideModalContentWhileAnimating
    >
      <View style={[styles.sheet, { paddingBottom: insets.bottom + SPACING.lg }]}>
        <View style={styles.handle} />
        <AppText variant="h3" align={isRTL ? 'right' : 'left'} style={styles.title}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="bodySmall" color={COLORS.textSecondary} align={isRTL ? 'right' : 'left'} style={styles.subtitle}>
            {subtitle}
          </AppText>
        ) : null}

        <View style={styles.actions}>
          {actions.map((action) => (
            <TouchableOpacity
              key={action.key}
              style={[
                styles.actionRow,
                rowStyle,
                action.disabled && styles.actionDisabled,
                action.emphasis && styles.actionEmphasis,
              ]}
              onPress={() => {
                if (action.disabled) return;
                onClose();
                action.onPress?.();
              }}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={action.label}
            >
              {action.icon ? (
                <View style={[styles.iconWrap, action.emphasis && styles.iconWrapEmphasis]}>
                  <Image source={action.icon} style={styles.icon} />
                </View>
              ) : null}
              <View style={{ flex: 1 }}>
                <AppText variant="bodyMedium" align={isRTL ? 'right' : 'left'}>
                  {action.label}
                </AppText>
                {action.hint ? (
                  <AppText variant="caption" color={COLORS.textSecondary} align={isRTL ? 'right' : 'left'}>
                    {action.hint}
                  </AppText>
                ) : null}
              </View>
              {action.badge ? (
                <View style={styles.badge}>
                  <AppText variant="caption" style={styles.badgeText}>{action.badge}</AppText>
                </View>
              ) : null}
            </TouchableOpacity>
          ))}
        </View>
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
    ...SHADOWS.md,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.borderLight,
    marginBottom: SPACING.lg,
  },
  title: {
    marginBottom: SPACING.xs,
  },
  subtitle: {
    marginBottom: SPACING.lg,
  },
  actions: {
    gap: SPACING.sm,
  },
  actionRow: {
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surfaceMuted,
  },
  actionEmphasis: {
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  actionDisabled: {
    opacity: 0.45,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapEmphasis: {
    backgroundColor: COLORS.primary,
  },
  icon: {
    width: 20,
    height: 20,
    tintColor: COLORS.primaryDark,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '700',
  },
});

export default TabShortcutSheet;
