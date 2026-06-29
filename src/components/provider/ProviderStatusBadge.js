import React from 'react';
import { View, StyleSheet } from 'react-native';
import AppText from '../ui/AppText';
import COLORS from '../../constants/colors';
import { RADIUS, SPACING } from '../../theme';

const STATUS_COLORS = {
  pending: { bg: '#FFF4E5', text: '#B45309' },
  accepted: { bg: COLORS.primaryLight, text: COLORS.primaryDark },
  approved: { bg: '#E8F8EF', text: '#15803D' },
  completed: { bg: '#E8F8EF', text: '#15803D' },
  rejected: { bg: '#FEE2E2', text: COLORS.danger },
  declined: { bg: '#FEE2E2', text: COLORS.danger },
  cancelled: { bg: COLORS.surfaceMuted, text: COLORS.textSecondary },
  open: { bg: COLORS.primaryLight, text: COLORS.primaryDark },
  closed: { bg: COLORS.surfaceMuted, text: COLORS.textSecondary },
  in_progress: { bg: '#EEF2FF', text: '#4338CA' },
  'in-progress': { bg: '#EEF2FF', text: '#4338CA' },
};

const ProviderStatusBadge = ({ status, label }) => {
  const key = String(status || '').toLowerCase().replace(/\s+/g, '_');
  const palette = STATUS_COLORS[key] || { bg: COLORS.surfaceMuted, text: COLORS.textSecondary };
  const text = label || status || '—';

  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      <AppText variant="caption" style={{ color: palette.text, fontWeight: '600' }}>
        {text}
      </AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.pill,
  },
});

export default ProviderStatusBadge;
