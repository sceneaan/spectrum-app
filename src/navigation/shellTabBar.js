import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AppIcon from '../components/ui/AppIcon';
import COLORS from '../constants/colors';
import { SPACING, RADIUS, SHADOWS } from '../theme';

const TAB_ICON_SIZE = { idle: 24, focused: 26 };

export function ShellTabIcon({ pair, color, focused }) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <AppIcon
        pair={pair}
        focused={focused}
        size={focused ? TAB_ICON_SIZE.focused : TAB_ICON_SIZE.idle}
        color={focused ? COLORS.primaryDark : color}
      />
    </View>
  );
}

export function ShellTabLabel({ color, children }) {
  return (
    <Text
      numberOfLines={2}
      ellipsizeMode="tail"
      allowFontScaling={false}
      style={[styles.label, { color }]}
    >
      {children}
    </Text>
  );
}

export function createShellTabBarScreenOptions(insets) {
  const tabBarHeight = 64 + insets.bottom;

  return {
    headerShown: false,
    tabBarActiveTintColor: COLORS.primary,
    tabBarInactiveTintColor: COLORS.gray500,
    tabBarAllowFontScaling: false,
    tabBarStyle: {
      height: tabBarHeight,
      paddingBottom: Math.max(insets.bottom, SPACING.sm),
      paddingTop: SPACING.xs,
      backgroundColor: COLORS.surface,
      borderTopWidth: 0,
      ...SHADOWS.md,
    },
    tabBarItemStyle: styles.tabItem,
    tabBarIconStyle: styles.tabIcon,
    tabBarLabel: (props) => <ShellTabLabel {...props} />,
  };
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 40,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
  },
  iconWrapActive: {
    backgroundColor: COLORS.primaryLight,
  },
  label: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
    width: '100%',
    paddingHorizontal: 2,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    marginBottom: 0,
  },
});
