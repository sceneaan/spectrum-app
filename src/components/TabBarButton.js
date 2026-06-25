import React, { useRef } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import haptics from '../utils/haptics';

const LONG_PRESS_DELAY = 420;

const TabBarButton = ({
  onPress,
  onLongPress,
  onPressIn,
  onPressOut,
  accessibilityState,
  accessibilityLabel,
  children,
  style,
  testID,
}) => {
  const longPressTriggered = useRef(false);
  const anchorRef = useRef(null);

  const handleLongPress = () => {
    if (!onLongPress) return;

    const trigger = (anchor) => {
      longPressTriggered.current = true;
      haptics.light();
      onLongPress(anchor);
    };

    if (anchorRef.current?.measureInWindow) {
      anchorRef.current.measureInWindow((x, y, width, height) => {
        trigger({ x, y, width, height });
      });
      return;
    }

    trigger(null);
  };

  const handlePress = (event) => {
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }
    onPress?.(event);
  };

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={LONG_PRESS_DELAY}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityRole="button"
      accessibilityState={accessibilityState}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={onLongPress ? 'Press and hold for shortcuts' : undefined}
      style={[style, styles.fill]}
      testID={testID}
    >
      <View ref={anchorRef} collapsable={false} style={styles.fill}>
        {children}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default TabBarButton;
