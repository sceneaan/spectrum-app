import React, { useEffect, useRef } from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
} from 'react-native';
import { AppText } from './ui';
import COLORS from '../constants/colors';
import { SPACING, SHADOWS } from '../theme';

const BUBBLE_SIZE = 52;
const FAN_X = 44;
const FAN_Y = 56;

const TabRadialShortcuts = ({
  visible,
  anchor,
  items = [],
  onClose,
  isRTL,
}) => {
  const leftAnim = useRef(new Animated.Value(0)).current;
  const rightAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      leftAnim.setValue(0);
      rightAnim.setValue(0);
      fadeAnim.setValue(0);
      return;
    }

    Animated.parallel([
      Animated.spring(leftAnim, {
        toValue: 1,
        tension: 88,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.spring(rightAnim, {
        toValue: 1,
        tension: 88,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 140,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, leftAnim, rightAnim, fadeAnim]);

  if (!visible || !anchor || items.length === 0) return null;

  const centerX = anchor.x + anchor.width / 2;
  const originTop = anchor.y + anchor.height * 0.35 - BUBBLE_SIZE / 2;
  const originLeft = centerX - BUBBLE_SIZE / 2;

  const ordered = isRTL ? [...items].reverse() : items;
  const [leftItem, rightItem] = ordered;

  const renderBubble = (item, side, anim) => {
    if (!item) return null;

    const fanDirection = side === 'left' ? -1 : 1;
    const translateX = anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, fanDirection * FAN_X],
    });
    const translateY = anim.interpolate({
      inputRange: [0, 1],
      outputRange: [8, -FAN_Y],
    });
    const scale = anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.4, 1],
    });

    return (
      <Animated.View
        key={item.key}
        style={[
          styles.bubbleWrap,
          {
            left: originLeft,
            top: originTop,
            opacity: fadeAnim,
            transform: [{ translateX }, { translateY }, { scale }],
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.bubble, item.emphasis && styles.bubbleEmphasis]}
          onPress={() => {
            onClose();
            item.onPress?.();
          }}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={item.label}
        >
          <Image
            source={item.icon}
            style={[styles.bubbleIcon, item.emphasis && styles.bubbleIconEmphasis]}
          />
        </TouchableOpacity>
        <AppText variant="caption" align="center" style={styles.bubbleLabel} numberOfLines={1}>
          {item.label}
        </AppText>
      </Animated.View>
    );
  };

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          {renderBubble(leftItem, 'left', leftAnim)}
          {renderBubble(rightItem, 'right', rightAnim)}
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.28)',
  },
  bubbleWrap: {
    position: 'absolute',
    width: BUBBLE_SIZE + 28,
    alignItems: 'center',
  },
  bubble: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.primaryLight,
    ...SHADOWS.md,
  },
  bubbleEmphasis: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryDark,
  },
  bubbleIcon: {
    width: 26,
    height: 26,
    tintColor: COLORS.primaryDark,
  },
  bubbleIconEmphasis: {
    tintColor: COLORS.white,
  },
  bubbleLabel: {
    marginTop: SPACING.xs,
    maxWidth: 76,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
});

export default TabRadialShortcuts;
