import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';
import COLORS from '../../constants/colors';
import { RADIUS, SPACING, SHADOWS } from '../../theme';

const VARIANT_STYLES = {
  primary: {
    button: { backgroundColor: COLORS.primary },
    text: { color: COLORS.white },
    shadow: SHADOWS.primary,
  },
  secondary: {
    button: { backgroundColor: COLORS.secondary },
    text: { color: COLORS.white },
    shadow: SHADOWS.sm,
  },
  outline: {
    button: {
      backgroundColor: COLORS.surface,
      borderWidth: 1.5,
      borderColor: COLORS.primary,
    },
    text: { color: COLORS.primary },
    shadow: {},
  },
  danger: {
    button: {
      backgroundColor: COLORS.surface,
      borderWidth: 1.5,
      borderColor: COLORS.danger,
    },
    text: { color: COLORS.danger },
    shadow: {},
  },
  ghost: {
    button: { backgroundColor: COLORS.primaryLight },
    text: { color: COLORS.primaryDark },
    shadow: {},
  },
};

const SIZES = {
  sm: { height: 40, paddingHorizontal: SPACING.lg, fontSize: 14 },
  md: { height: 50, paddingHorizontal: SPACING.xl, fontSize: 16 },
  lg: { height: 54, paddingHorizontal: SPACING.xxl, fontSize: 17 },
};

const AppButton = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  textStyle,
  fullWidth = true,
  accessibilityLabel,
  ...rest
}) => {
  const v = VARIANT_STYLES[variant] || VARIANT_STYLES.primary;
  const s = SIZES[size] || SIZES.md;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      {...rest}
      style={[
        styles.base,
        v.button,
        v.shadow,
        {
          height: s.height,
          paddingHorizontal: s.paddingHorizontal,
          opacity: disabled ? 0.55 : 1,
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.text.color} />
      ) : (
        <Text style={[styles.text, v.text, { fontSize: s.fontSize }, textStyle]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: { width: '100%' },
  text: { fontWeight: '600' },
});

export default AppButton;
