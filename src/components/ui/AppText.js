import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { TYPOGRAPHY } from '../../theme';

const VARIANTS = {
  display: TYPOGRAPHY.display,
  h1: TYPOGRAPHY.h1,
  h2: TYPOGRAPHY.h2,
  h3: TYPOGRAPHY.h3,
  body: TYPOGRAPHY.body,
  bodyMedium: TYPOGRAPHY.bodyMedium,
  bodySmall: TYPOGRAPHY.bodySmall,
  caption: TYPOGRAPHY.caption,
  label: TYPOGRAPHY.label,
  button: TYPOGRAPHY.button,
};

const AppText = ({
  variant = 'body',
  style,
  color,
  align,
  children,
  ...props
}) => (
  <Text
    style={[
      VARIANTS[variant] || VARIANTS.body,
      color ? { color } : null,
      align ? { textAlign: align } : null,
      style,
    ]}
    {...props}
  >
    {children}
  </Text>
);

export default AppText;
