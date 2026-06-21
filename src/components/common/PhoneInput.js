import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet } from 'react-native';
import COLORS from '../../constants/colors';
import ICONS from '../../constants/icons';

// Country codes data
export const COUNTRY_CODES = [
  { code: '+966', country: 'Saudi Arabia', flag: '🇸🇦' },
  { code: '+971', country: 'UAE', flag: '🇦🇪' },
  { code: '+965', country: 'Kuwait', flag: '🇰🇼' },
  { code: '+974', country: 'Qatar', flag: '🇶🇦' },
  { code: '+973', country: 'Bahrain', flag: '🇧🇭' },
  { code: '+968', country: 'Oman', flag: '🇴🇲' },
  { code: '+20', country: 'Egypt', flag: '🇪🇬' },
  { code: '+962', country: 'Jordan', flag: '🇯🇴' },
  { code: '+961', country: 'Lebanon', flag: '🇱🇧' },
  { code: '+1', country: 'USA/Canada', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
];

// Validation function
export const validatePhone = (phone, code) => {
  // Remove any spaces or special characters
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');

  // Validation rules for different countries
  const validationRules = {
    // Saudi Arabia: Mobile starts with 5, total 9 digits (e.g., 501234567)
    '+966': { regex: /^5\d{8}$/, message: 'Saudi number must start with 5 and be 9 digits' },

    // UAE: Mobile and landline, 9 digits starting with 2-9 (e.g., 501234567, 421234567)
    '+971': { regex: /^[2-9]\d{8}$/, message: 'UAE number must be 9 digits and start with 2-9' },

    // Kuwait: 8 digits (e.g., 96512345, 51234567)
    '+965': { regex: /^\d{8}$/, message: 'Kuwait number must be 8 digits' },

    // Qatar: 8 digits (e.g., 33123456, 77123456)
    '+974': { regex: /^\d{8}$/, message: 'Qatar number must be 8 digits' },

    // Bahrain: 8 digits (e.g., 36123456, 17123456)
    '+973': { regex: /^\d{8}$/, message: 'Bahrain number must be 8 digits' },

    // Oman: 8 digits (e.g., 91234567, 24123456)
    '+968': { regex: /^\d{8}$/, message: 'Oman number must be 8 digits' },

    // Egypt: Mobile starts with 1, total 10 digits (e.g., 1012345678)
    '+20': { regex: /^1\d{9}$/, message: 'Egypt number must start with 1 and be 10 digits' },

    // Jordan: Mobile starts with 7, total 9 digits (e.g., 791234567)
    '+962': { regex: /^7\d{8}$/, message: 'Jordan number must start with 7 and be 9 digits' },

    // Lebanon: Mobile and landline, 7-8 digits (e.g., 71123456, 1234567)
    '+961': { regex: /^\d{7,8}$/, message: 'Lebanon number must be 7-8 digits' },

    // USA/Canada: 10 digits (e.g., 2025551234)
    '+1': { regex: /^\d{10}$/, message: 'USA/Canada number must be 10 digits' },

    // UK: 10-11 digits (e.g., 2012345678, 7911123456)
    '+44': { regex: /^\d{10,11}$/, message: 'UK number must be 10-11 digits' },
  };

  const rule = validationRules[code];
  if (rule) {
    return { isValid: rule.regex.test(cleanPhone), message: rule.message };
  }
  // Default validation for other countries
  const isValid = cleanPhone.length >= 7 && cleanPhone.length <= 15;
  return { isValid, message: 'Phone number must be between 7 and 15 digits' };
};

// PhoneInput component
const PhoneInput = ({
  label,
  value,
  onChangeText,
  inputRef,
  onSubmitEditing,
  onFocus,
  returnKeyType,
  alignText = {},
  rowStyle = {},
  isRTL = false,
  error = '',
  countryCode = '+966',
  onCountryCodePress,
  editable = true,
  placeholder = ''
}) => {
  const flagBoxStyle = isRTL
    ? { borderTopRightRadius: 10, borderBottomRightRadius: 10, borderLeftWidth: 0 }
    : { borderTopLeftRadius: 10, borderBottomLeftRadius: 10, borderRightWidth: 0 };

  const phoneFieldStyle = isRTL
    ? { borderTopLeftRadius: 10, borderBottomLeftRadius: 10 }
    : { borderTopRightRadius: 10, borderBottomRightRadius: 10 };

  // Get flag emoji based on country code
  const getFlagEmoji = (code) => {
    const flagMap = {
      '+966': '🇸🇦',
      '+971': '🇦🇪',
      '+965': '🇰🇼',
      '+974': '🇶🇦',
      '+973': '🇧🇭',
      '+968': '🇴🇲',
      '+20': '🇪🇬',
      '+962': '🇯🇴',
      '+961': '🇱🇧',
      '+1': '🇺🇸',
      '+44': '🇬🇧',
    };
    return flagMap[code] || '🇸🇦';
  };

  return (
    <View style={styles.inputGroup}>
      {label && <Text style={[styles.label, alignText]}>{label}</Text>}
      <View style={[styles.phoneContainer, rowStyle]}>
        <TouchableOpacity
          style={[styles.flagBox, flagBoxStyle, rowStyle]}
          onPress={onCountryCodePress}
          disabled={!editable}
        >
          <Text style={{ fontSize: 24, marginHorizontal: 5 }}>{getFlagEmoji(countryCode)}</Text>
          <Text style={{ color: COLORS.textPrimary, fontSize: 12 }}>{countryCode}</Text>
          {editable && (
            <Image source={ICONS.chevronDown} style={{ width: 10, height: 10, tintColor: COLORS.gray600, marginLeft: 3 }} />
          )}
        </TouchableOpacity>
        <TextInput
          ref={inputRef}
          style={[styles.phoneField, phoneFieldStyle, styles.ltrInput]}
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          keyboardType="phone-pad"
          placeholderTextColor={COLORS.gray500}
          placeholder={placeholder}
          textAlign="left"
          writingDirection="ltr"
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          blurOnSubmit={false}
          editable={editable}
        />
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  inputGroup: { marginBottom: 15 },
  label: { fontSize: 14, marginBottom: 8, color: COLORS.textPrimary, fontWeight: '500' },
  phoneContainer: { flexDirection: 'row', height: 50 },
  flagBox: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row'
  },
  phoneField: {
    flex: 1,
    backgroundColor: COLORS.gray200,
    paddingHorizontal: 15,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.gray300,
  },
  ltrInput: {
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  errorText: { color: COLORS.danger, fontSize: 12, marginTop: 5 },
});

export default PhoneInput;