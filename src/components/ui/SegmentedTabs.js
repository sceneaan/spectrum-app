import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import AppText from './AppText';
import COLORS from '../../constants/colors';
import { RADIUS, SPACING, SHADOWS } from '../../theme';

const SegmentedTabs = ({ options, activeKey, onChange, isRTL }) => (
  <View style={[styles.container, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
    {options.map((option) => {
      const isActive = option.key === activeKey;
      return (
        <TouchableOpacity
          key={option.key}
          style={[styles.tab, isActive && styles.tabActive]}
          onPress={() => onChange(option.key)}
          activeOpacity={0.8}
        >
          <AppText
            variant="bodySmall"
            align="center"
            color={isActive ? COLORS.white : COLORS.textSecondary}
            style={isActive ? styles.activeLabel : styles.label}
          >
            {option.label}
          </AppText>
        </TouchableOpacity>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.lg,
    padding: SPACING.xs,
    marginBottom: SPACING.xl,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderRadius: RADIUS.md,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
    ...SHADOWS.sm,
  },
  label: { fontWeight: '600' },
  activeLabel: { fontWeight: '700' },
});

export default SegmentedTabs;
