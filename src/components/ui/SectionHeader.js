import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import AppText from './AppText';
import COLORS from '../../constants/colors';
import { SPACING } from '../../theme';

const SectionHeader = ({
  title,
  subtitle,
  actionLabel,
  onAction,
  align = 'left',
  style,
}) => (
  <View style={[styles.container, style]}>
    <View style={styles.textBlock}>
      <AppText variant="h3" align={align} style={styles.title}>
        {title}
      </AppText>
      {subtitle ? (
        <AppText variant="bodySmall" align={align} style={styles.subtitle}>
          {subtitle}
        </AppText>
      ) : null}
    </View>
    {actionLabel && onAction ? (
      <TouchableOpacity onPress={onAction} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <AppText variant="bodySmall" color={COLORS.primary} style={styles.action}>
          {actionLabel}
        </AppText>
      </TouchableOpacity>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  textBlock: { flex: 1 },
  title: { marginBottom: SPACING.xs },
  subtitle: { lineHeight: 20 },
  action: { fontWeight: '600', marginTop: 2 },
});

export default SectionHeader;
