import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import AppText from './AppText';
import AppButton from './AppButton';
import COLORS from '../../constants/colors';
import { SPACING } from '../../theme';

const EmptyState = ({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
  actionVariant = 'primary',
}) => (
  <View style={styles.container}>
    {icon ? <Image source={icon} style={styles.icon} /> : null}
    <AppText variant="h3" align="center" style={styles.title}>
      {title}
    </AppText>
    {subtitle ? (
      <AppText variant="bodySmall" align="center" style={styles.subtitle}>
        {subtitle}
      </AppText>
    ) : null}
    {actionLabel && onAction ? (
      <AppButton
        title={actionLabel}
        onPress={onAction}
        variant={actionVariant}
        size="sm"
        fullWidth={false}
        style={styles.action}
      />
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xxxl,
    paddingVertical: SPACING.huge,
  },
  icon: {
    width: 72,
    height: 72,
    tintColor: COLORS.gray400,
    marginBottom: SPACING.lg,
    opacity: 0.85,
  },
  title: { marginBottom: SPACING.sm },
  subtitle: { marginBottom: SPACING.lg, lineHeight: 22 },
  action: { minWidth: 140, paddingHorizontal: SPACING.xxl },
});

export default EmptyState;
