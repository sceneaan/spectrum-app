import React from 'react';
import { Pressable, View, Image, StyleSheet } from 'react-native';
import AppText from './AppText';
import AppIcon, { QUICK_ACTION_ICONS } from './AppIcon';
import COLORS from '../../constants/colors';
import { RADIUS, SPACING } from '../../theme';

const QuickAction = ({ icon, vectorIcon, label, onPress, tintColor = COLORS.primary }) => (
  <Pressable style={styles.item} onPress={onPress} android_ripple={{ color: `${tintColor}22` }}>
    <View style={[styles.iconWrap, { borderColor: `${tintColor}33` }]}>
      <View style={[styles.iconTintBg, { backgroundColor: `${tintColor}14` }]}>
        {vectorIcon ? (
          <AppIcon
            name={QUICK_ACTION_ICONS[vectorIcon] || vectorIcon}
            size={30}
            color={tintColor}
          />
        ) : (
          <Image
            source={icon}
            style={[styles.icon, { tintColor }]}
            resizeMode="contain"
          />
        )}
      </View>
    </View>
    <AppText variant="caption" align="center" style={styles.label} numberOfLines={2}>
      {label}
    </AppText>
  </Pressable>
);

const styles = StyleSheet.create({
  item: {
    flex: 1,
    alignItems: 'center',
    maxWidth: 88,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  iconTintBg: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 30,
    height: 30,
  },
  label: {
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
});

export default QuickAction;
