import React from 'react';
import { Pressable, View, Image, StyleSheet } from 'react-native';
import AppText from './AppText';
import AppIcon, { QUICK_ACTION_ICONS } from './AppIcon';
import COLORS from '../../constants/colors';
import { RADIUS, SPACING } from '../../theme';

const QuickAction = ({
  icon,
  vectorIcon,
  label,
  onPress,
  tintColor = COLORS.primary,
  badge,
  style,
  labelLines = 2,
}) => (
  <Pressable
    style={[styles.item, style]}
    onPress={onPress}
    android_ripple={{ color: `${tintColor}22` }}
  >
    <View style={[styles.iconWrap, { borderColor: `${tintColor}33` }]}>
      <View style={[styles.iconTintBg, { backgroundColor: `${tintColor}14` }]}>
        {vectorIcon ? (
          <AppIcon
            name={QUICK_ACTION_ICONS[vectorIcon] || vectorIcon}
            size={26}
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
      {badge > 0 ? (
        <View style={styles.badge}>
          <AppText variant="caption" style={styles.badgeText}>
            {badge > 9 ? '9+' : badge}
          </AppText>
        </View>
      ) : null}
    </View>
    <AppText
      variant="caption"
      align="center"
      style={styles.label}
      numberOfLines={labelLines}
      adjustsFontSizeToFit={labelLines === 1}
      minimumFontScale={0.85}
    >
      {label}
    </AppText>
  </Pressable>
);

const styles = StyleSheet.create({
  item: {
    alignItems: 'center',
    alignSelf: 'stretch',
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
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
  label: {
    fontWeight: '600',
    color: COLORS.textPrimary,
    fontSize: 11,
    lineHeight: 14,
    minHeight: 28,
  },
});

export default QuickAction;
