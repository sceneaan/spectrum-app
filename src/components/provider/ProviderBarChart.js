import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import AppText from '../ui/AppText';
import COLORS from '../../constants/colors';
import { SPACING, RADIUS } from '../../theme';

const ProviderBarChart = ({
  data = [],
  labels = [],
  color = COLORS.primary,
  height = 140,
  formatValue,
}) => {
  const max = useMemo(() => Math.max(...data, 1), [data]);

  if (!data.length) {
    return (
      <View style={[styles.empty, { height }]}>
        <AppText variant="caption" color={COLORS.textSecondary} align="center">
          No data for this period
        </AppText>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={[styles.chart, { height }]}>
        {data.map((value, index) => {
          const barHeight = Math.max(4, (value / max) * (height - 24));
          return (
            <View key={`${labels[index] || index}`} style={styles.barCol}>
              <AppText variant="caption" color={COLORS.textSecondary} numberOfLines={1}>
                {formatValue ? formatValue(value) : value}
              </AppText>
              <View style={[styles.barTrack, { height: height - 28 }]}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: barHeight,
                      backgroundColor: color,
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>
      <View style={styles.labels}>
        {labels.map((label, index) => (
          <AppText
            key={`${label}-${index}`}
            variant="caption"
            color={COLORS.textSecondary}
            align="center"
            numberOfLines={1}
            style={styles.label}
          >
            {label}
          </AppText>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: SPACING.xs,
  },
  barCol: { flex: 1, alignItems: 'center' },
  barTrack: {
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '72%',
    borderRadius: RADIUS.sm,
    minHeight: 4,
  },
  labels: {
    flexDirection: 'row',
    marginTop: SPACING.sm,
    justifyContent: 'space-between',
  },
  label: { flex: 1 },
  empty: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.lg,
  },
});

export default ProviderBarChart;
