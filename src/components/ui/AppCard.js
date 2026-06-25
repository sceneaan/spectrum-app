import React from 'react';
import { View, StyleSheet } from 'react-native';
import COLORS from '../../constants/colors';
import { RADIUS, SPACING, SHADOWS, cardBorder } from '../../theme';

const AppCard = ({
  children,
  style,
  padding = SPACING.xl,
  elevated = true,
  muted = false,
}) => (
  <View
    style={[
      styles.card,
      elevated && SHADOWS.sm,
      cardBorder,
      muted && styles.muted,
      { padding },
      style,
    ]}
  >
    {children}
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  muted: {
    backgroundColor: COLORS.surfaceMuted,
  },
});

export default AppCard;
