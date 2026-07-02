import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useResponsive, CONTENT_MAX_WIDTH, NARROW_FORM_MAX_WIDTH } from '../../utils/responsive';

/**
 * Centers content on tablets with a max readable width.
 * @param {'default' | 'form' | 'wide' | 'full'} variant
 */
const AdaptiveContainer = ({
  children,
  style,
  variant = 'default',
  noPadding = false,
}) => {
  const { contentWidth, horizontalPadding, isTablet } = useResponsive();

  const maxWidth =
    variant === 'form'
      ? NARROW_FORM_MAX_WIDTH
      : variant === 'wide'
        ? contentWidth
        : variant === 'full'
          ? undefined
          : isTablet
            ? contentWidth
            : CONTENT_MAX_WIDTH;

  return (
    <View
      style={[
        styles.base,
        maxWidth != null && styles.centered,
        maxWidth != null && { maxWidth },
        !noPadding && { paddingHorizontal: horizontalPadding },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    width: '100%',
  },
  centered: {
    alignSelf: 'center',
  },
});

export default AdaptiveContainer;
