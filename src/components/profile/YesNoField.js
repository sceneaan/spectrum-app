import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import COLORS from '../../constants/colors';

const YesNoField = ({
  label,
  value,
  onChange,
  yesLabel = 'Yes',
  noLabel = 'No',
  alignText,
  rowStyle,
}) => (
  <View style={styles.wrap}>
    <Text style={[styles.label, alignText]}>{label}</Text>
    <View style={[styles.row, rowStyle]}>
      <TouchableOpacity
        style={[styles.chip, value === true && styles.chipYesActive]}
        onPress={() => onChange(true)}
        activeOpacity={0.85}
      >
        <Text style={[styles.chipText, value === true && styles.chipTextActive]}>{yesLabel}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.chip, value === false && styles.chipNoActive]}
        onPress={() => onChange(false)}
        activeOpacity={0.85}
      >
        <Text style={[styles.chipText, value === false && styles.chipTextActive]}>{noLabel}</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { fontSize: 13, color: COLORS.gray700, marginBottom: 8, fontWeight: '500' },
  row: { flexDirection: 'row', gap: 10 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    backgroundColor: COLORS.white,
  },
  chipYesActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipNoActive: { backgroundColor: COLORS.gray600, borderColor: COLORS.gray600 },
  chipText: { fontSize: 13, color: COLORS.gray700, fontWeight: '500' },
  chipTextActive: { color: COLORS.white },
});

export default YesNoField;
