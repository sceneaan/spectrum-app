import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AppIcon from '../components/ui/AppIcon';
import COLORS from '../constants/colors';

const TAB_ICON_SIZE = { idle: 24, focused: 26 };

export function ShellTabIcon({ pair, color, focused }) {
  return (
    <View style={styles.iconWrap}>
      <AppIcon
        pair={pair}
        focused={focused}
        size={focused ? TAB_ICON_SIZE.focused : TAB_ICON_SIZE.idle}
        color={focused ? COLORS.primaryDark : color}
      />
    </View>
  );
}

export function ShellTabLabel({ color, focused, children }) {
  return (
    <Text
      numberOfLines={2}
      ellipsizeMode="tail"
      style={[
        styles.label,
        { color },
        focused && styles.labelFocused,
      ]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 40,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
    width: '100%',
    paddingHorizontal: 2,
  },
  labelFocused: {
    fontWeight: '700',
  },
});
