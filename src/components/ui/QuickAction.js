import React from 'react';
import { TouchableOpacity, View, Image, StyleSheet } from 'react-native';
import AppText from './AppText';
import COLORS from '../../constants/colors';
import { RADIUS, SPACING } from '../../theme';

const QuickAction = ({ icon, label, onPress, tintColor = COLORS.primary }) => (
  <TouchableOpacity style={styles.item} onPress={onPress} activeOpacity={0.75}>
    <View style={[styles.iconWrap, { borderColor: `${tintColor}33` }]}>
      <View style={[styles.iconTintBg, { backgroundColor: `${tintColor}14` }]}>
        <Image
          source={icon}
          style={[styles.icon, { tintColor }]}
          resizeMode="contain"
        />
      </View>
    </View>
    <AppText variant="caption" align="center" style={styles.label} numberOfLines={2}>
      {label}
    </AppText>
  </TouchableOpacity>
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
