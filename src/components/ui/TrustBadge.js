import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import AppText from './AppText';
import COLORS from '../../constants/colors';
import { RADIUS, SPACING } from '../../theme';

const TrustBadge = ({ icon, label, isRTL }) => (
  <View style={[styles.badge, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
    {icon ? <Image source={icon} style={styles.icon} /> : null}
    <AppText variant="caption" color={COLORS.textSecondary} style={styles.label}>
      {label}
    </AppText>
  </View>
);

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  icon: {
    width: 16,
    height: 16,
    tintColor: COLORS.primary,
  },
  label: {
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default TrustBadge;
