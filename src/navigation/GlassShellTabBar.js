import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShellTabIcon, ShellTabLabel } from './shellTabBar';
import COLORS from '../constants/colors';
import { SPACING, RADIUS, SHADOWS } from '../theme';

const LENS_SPRING = {
  friction: 8,
  tension: 140,
  useNativeDriver: false,
};

const BAR_HEIGHT = 62;

function GlassBarBackground() {
  if (Platform.OS === 'ios') {
    return (
      <>
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType="light"
          blurAmount={28}
          reducedTransparencyFallbackColor={COLORS.surface}
        />
        <View style={styles.glassFallback} pointerEvents="none" />
      </>
    );
  }
  return <View style={styles.glassFallback} pointerEvents="none" />;
}

export function getGlassTabBarHeight(insets) {
  return BAR_HEIGHT + SPACING.xs + Math.max(insets.bottom, SPACING.sm);
}

export function getGlassTabBarInset(insets) {
  return getGlassTabBarHeight(insets) + SPACING.lg + SPACING.md;
}

function GlassShellTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const [layouts, setLayouts] = useState({});
  const lensX = useRef(new Animated.Value(0)).current;
  const lensW = useRef(new Animated.Value(0)).current;
  const lensReady = useRef(false);

  const animateLens = useCallback((layout) => {
    if (!layout) return;

    if (!lensReady.current) {
      lensX.setValue(layout.x);
      lensW.setValue(layout.width);
      lensReady.current = true;
      return;
    }

    Animated.parallel([
      Animated.spring(lensX, { toValue: layout.x, ...LENS_SPRING }),
      Animated.spring(lensW, { toValue: layout.width, ...LENS_SPRING }),
    ]).start();
  }, [lensW, lensX]);

  useEffect(() => {
    const activeKey = state.routes[state.index]?.key;
    if (activeKey && layouts[activeKey]) {
      animateLens(layouts[activeKey]);
    }
  }, [state.index, state.routes, layouts, animateLens]);

  useEffect(() => {
    lensReady.current = false;
  }, [state.routes.length]);

  const onTabLayout = useCallback((routeKey, event) => {
    const { x, width } = event.nativeEvent.layout;
    setLayouts((prev) => ({ ...prev, [routeKey]: { x, width } }));
  }, []);

  const barTotalHeight = getGlassTabBarHeight(insets);

  return (
    <View style={styles.shell}>
      <View
        style={[styles.shellBackdrop, { height: barTotalHeight }]}
        pointerEvents="none"
      />
      <View style={[styles.outer, { marginBottom: Math.max(insets.bottom, SPACING.sm) }]}>
        <View style={styles.glassBar}>
          <GlassBarBackground />
          <View style={styles.glassVeil} pointerEvents="none" />
          <View style={styles.glassTint} pointerEvents="none" />
          <View style={styles.glassHighlight} pointerEvents="none" />

          <View style={styles.tabsRow}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.lens,
              {
                left: lensX,
                width: lensW,
              },
            ]}
          />

          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const label = options.tabBarLabel ?? options.title ?? route.name;
            const isFocused = state.index === index;
            const activeColor = options.tabBarActiveTintColor ?? COLORS.primaryDark;
            const inactiveColor = options.tabBarInactiveTintColor ?? COLORS.gray600;
            const color = isFocused ? activeColor : inactiveColor;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            };

            const content = (
              <View style={styles.tabInner}>
                {options.tabBarIcon?.({ focused: isFocused, color, size: 24 })}
                <ShellTabLabel color={color} focused={isFocused}>
                  {label}
                </ShellTabLabel>
              </View>
            );

            const buttonProps = {
              accessibilityRole: 'button',
              accessibilityState: isFocused ? { selected: true } : {},
              accessibilityLabel: options.tabBarAccessibilityLabel,
              testID: options.tabBarButtonTestID,
              onPress,
              onLongPress,
              style: styles.tabItem,
            };

            if (options.tabBarButton) {
              return (
                <View
                  key={route.key}
                  style={styles.tabItemWrap}
                  onLayout={(event) => onTabLayout(route.key, event)}
                >
                  {options.tabBarButton({ ...buttonProps, children: content })}
                </View>
              );
            }

            return (
              <Pressable
                key={route.key}
                {...buttonProps}
                onLayout={(event) => onTabLayout(route.key, event)}
              >
                {content}
              </Pressable>
            );
          })}
          </View>
        </View>
      </View>
    </View>
  );
}

export function createGlassTabNavigatorOptions() {
  return {
    headerShown: false,
    tabBarActiveTintColor: COLORS.primaryDark,
    tabBarInactiveTintColor: COLORS.gray600,
    tabBarAllowFontScaling: false,
    animation: 'fade',
    transitionSpec: {
      animation: 'timing',
      config: { duration: 240 },
    },
    tabBarStyle: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'transparent',
      borderTopWidth: 0,
      elevation: 0,
      shadowOpacity: 0,
    },
    sceneStyle: {
      backgroundColor: COLORS.background,
    },
  };
}

const styles = StyleSheet.create({
  shell: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    pointerEvents: 'box-none',
    zIndex: 100,
    elevation: 100,
  },
  shellBackdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.borderLight,
  },
  outer: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xs,
    backgroundColor: 'transparent',
  },
  glassBar: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth + 0.5,
    borderColor: 'rgba(255,255,255,0.92)',
    backgroundColor: COLORS.surface,
    ...SHADOWS.lg,
  },
  glassFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Platform.select({
      ios: 'rgba(255,255,255,0.72)',
      android: 'rgba(255,255,255,0.97)',
      default: 'rgba(255,255,255,0.94)',
    }),
  },
  glassVeil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Platform.select({
      ios: 'rgba(255,255,255,0.35)',
      android: 'rgba(255,255,255,0.08)',
      default: 'rgba(255,255,255,0.2)',
    }),
  },
  glassHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  glassTint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(93,188,210,0.1)',
  },
  tabsRow: {
    flexDirection: 'row',
    height: BAR_HEIGHT,
    alignItems: 'center',
    paddingHorizontal: SPACING.xs,
  },
  lens: {
    position: 'absolute',
    top: 7,
    height: BAR_HEIGHT - 14,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(232,247,250,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(58,157,181,0.28)',
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  tabItemWrap: {
    flex: 1,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xs,
  },
});

export default GlassShellTabBar;
