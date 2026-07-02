import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLanguage } from '../store/LanguageContext';
import { useAuthStore } from '../store/authStore';
import { fullLogout } from '../utils/fullLogout';
import { verifyElmIdentity } from '../api/services/Elm.Service';
import { updateElmVerification, useGetUserData, UpdateProfile } from '../api/services/User.Service';
import Header from '../components/Header';
import COLORS from '../constants/colors';
import ICONS from '../constants/icons';
import { AppText, AppCard } from '../components/ui';

const parseUserDob = (dobValue) => {
  if (!dobValue) return null;
  const parsed = new Date(dobValue);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const INTERNATIONAL_NATIONALITIES = [
  'Egypt', 'United Arab Emirates', 'Jordan', 'Lebanon', 'Palestine', 'Syria', 'Iraq',
  'Kuwait', 'Oman', 'Bahrain', 'Qatar', 'Pakistan', 'India', 'Bangladesh', 'Philippines',
  'United Kingdom', 'United States', 'Canada', 'France', 'Germany', 'Other',
];

const ElmVerificationRequiredScreen = ({ navigation }) => {
  const { t, isRTL } = useLanguage();
  const ev = t.elmVerification || {};
  const { user, setAuth, setElmVerificationDeferred } = useAuthStore();
  const { data: userData } = useGetUserData();
  const profile = userData || user;

  const [nationalId, setNationalId] = useState(profile?.nationalId || '');
  const [dobFormat, setDobFormat] = useState('gregorian');
  const [dob, setDob] = useState(() => parseUserDob(profile?.dob));
  const [hijriDob, setHijriDob] = useState('');
  const [hijriYear, setHijriYear] = useState('1410');
  const [hijriMonth, setHijriMonth] = useState('01');
  const [hijriDay, setHijriDay] = useState('01');
  const [showHijriPicker, setShowHijriPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('residency');
  const [elmData, setElmData] = useState(null);
  const [intlFullName, setIntlFullName] = useState(profile?.fullName || '');
  const [intlGender, setIntlGender] = useState(profile?.gender || '');
  const [intlNationality, setIntlNationality] = useState(
    profile?.nationality && profile.nationality !== 'Saudi Arabia' ? profile.nationality : '',
  );
  const [intlNationalId, setIntlNationalId] = useState(profile?.nationalId || '');
  const [showNationalityPicker, setShowNationalityPicker] = useState(false);

  useEffect(() => {
    if (profile?.nationalId && !nationalId) {
      setNationalId(profile.nationalId);
    }
    if (profile?.dob && !dob) {
      setDob(parseUserDob(profile.dob));
    }
  }, [profile?.nationalId, profile?.dob, nationalId, dob]);

  // Defer ELM gate only while the international form step is active (not after leaving the screen).
  useEffect(() => {
    setElmVerificationDeferred(step === 'international');
  }, [step, setElmVerificationDeferred]);

  useEffect(() => () => setElmVerificationDeferred(false), [setElmVerificationDeferred]);

  const formatDate = (date) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [tempDate, setTempDate] = useState(null);

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (selectedDate) setDob(selectedDate);
    } else {
      if (selectedDate) setTempDate(selectedDate);
    }
  };

  const confirmDate = () => {
    if (tempDate) setDob(tempDate);
    setShowDatePicker(false);
    setTempDate(null);
  };

  // Hijri date helpers
  const HIJRI_YEARS = Array.from({ length: 1447 - 1320 + 1 }, (_, i) => String(1320 + i));
  const HIJRI_MONTHS = [
    { value: '01', label: isRTL ? 'محرم' : '01 - Muharram' },
    { value: '02', label: isRTL ? 'صفر' : '02 - Safar' },
    { value: '03', label: isRTL ? 'ربيع الأول' : '03 - Rabi I' },
    { value: '04', label: isRTL ? 'ربيع الثاني' : '04 - Rabi II' },
    { value: '05', label: isRTL ? 'جمادى الأولى' : '05 - Jumada I' },
    { value: '06', label: isRTL ? 'جمادى الآخرة' : '06 - Jumada II' },
    { value: '07', label: isRTL ? 'رجب' : '07 - Rajab' },
    { value: '08', label: isRTL ? 'شعبان' : '08 - Shaban' },
    { value: '09', label: isRTL ? 'رمضان' : '09 - Ramadan' },
    { value: '10', label: isRTL ? 'شوال' : '10 - Shawwal' },
    { value: '11', label: isRTL ? 'ذو القعدة' : '11 - Dhul Qadah' },
    { value: '12', label: isRTL ? 'ذو الحجة' : '12 - Dhul Hijjah' },
  ];
  const HIJRI_DAYS = Array.from({ length: 30 }, (_, i) => String(i + 1).padStart(2, '0'));

  const confirmHijriDate = () => {
    setHijriDob(`${hijriYear}-${hijriMonth}-${hijriDay}`);
    setShowHijriPicker(false);
  };

  const handleInternationalSubmit = async () => {
    if (!intlFullName.trim()) {
      Alert.alert(ev.errorTitle || (isRTL ? 'خطأ' : 'Error'), ev.fullNameRequired || 'Full name is required');
      return;
    }
    if (!intlGender) {
      Alert.alert(ev.errorTitle || (isRTL ? 'خطأ' : 'Error'), ev.genderRequired || 'Gender is required');
      return;
    }
    if (!intlNationality) {
      Alert.alert(ev.errorTitle || (isRTL ? 'خطأ' : 'Error'), ev.nationalityRequired || 'Nationality is required');
      return;
    }
    if (!intlNationalId.trim()) {
      Alert.alert(ev.errorTitle || (isRTL ? 'خطأ' : 'Error'), ev.idRequired || 'ID or passport number is required');
      return;
    }
    if (!dob) {
      Alert.alert(ev.errorTitle || (isRTL ? 'خطأ' : 'Error'), ev.dobRequired || 'Date of birth is required');
      return;
    }

    setLoading(true);
    try {
      const formattedDob = formatDate(dob);
      await UpdateProfile({
        fullName: intlFullName.trim(),
        gender: intlGender.toLowerCase(),
        nationality: intlNationality,
        dob: formattedDob,
        nationalId: intlNationalId.trim(),
      });

      const result = await updateElmVerification({
        nationalId: intlNationalId.trim(),
        dob: formattedDob,
        elmVerified: false,
        elmData: {},
        elmDisabled: true,
      });

      const updatedUser = result?.user || result;
      setElmVerificationDeferred(false);
      setAuth({
        user: {
          ...user,
          ...(typeof updatedUser === 'object' ? updatedUser : {}),
          elmDisabled: true,
          elmVerified: false,
          fullName: intlFullName.trim(),
          gender: intlGender,
          nationality: intlNationality,
          nationalId: intlNationalId.trim(),
          dob: formattedDob,
        },
        token: useAuthStore.getState().token,
        refreshToken: useAuthStore.getState().refreshToken,
      });

      setStep('success');
      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        });
      }, 1500);
    } catch (error) {
      Alert.alert(
        ev.errorTitle || (isRTL ? 'خطأ' : 'Error'),
        error.message || ev.internationalFailed || 'Could not save your information',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    // Validate National ID
    if (!nationalId || nationalId.length !== 10) {
      Alert.alert(
        isRTL ? 'خطأ' : 'Error',
        isRTL ? 'يرجى إدخال رقم هوية صحيح من 10 أرقام' : 'Please enter a valid 10-digit National ID'
      );
      return;
    }

    if (!nationalId.startsWith('1') && !nationalId.startsWith('2')) {
      Alert.alert(
        isRTL ? 'خطأ' : 'Error',
        isRTL
          ? 'رقم الهوية يجب أن يبدأ بـ 1 (سعودي) أو 2 (إقامة)'
          : 'National ID must start with 1 (Saudi NIN) or 2 (Iqama)'
      );
      return;
    }

    // Validate DOB
    let formattedDob;
    if (dobFormat === 'gregorian') {
      if (!dob) {
        Alert.alert(
          isRTL ? 'خطأ' : 'Error',
          isRTL ? 'يرجى اختيار تاريخ الميلاد' : 'Please select date of birth'
        );
        return;
      }
      formattedDob = formatDate(dob);
    } else {
      if (!hijriDob || !/^\d{4}-\d{2}-\d{2}$/.test(hijriDob)) {
        Alert.alert(
          isRTL ? 'خطأ' : 'Error',
          isRTL ? 'يرجى إدخال تاريخ الميلاد الهجري بالصيغة YYYY-MM-DD' : 'Please enter Hijri DOB in format YYYY-MM-DD'
        );
        return;
      }
      formattedDob = hijriDob;
    }

    setLoading(true);
    try {
      const result = await verifyElmIdentity(nationalId, formattedDob);

      if (result.success) {
        setElmData(result.data);
        setStep('confirm');
      } else {
        Alert.alert(
          isRTL ? 'خطأ' : 'Error',
          result.message || (isRTL ? 'فشل التحقق من الهوية' : 'Identity verification failed')
        );
      }
    } catch (error) {
      Alert.alert(
        isRTL ? 'خطأ' : 'Error',
        error.message || (isRTL ? 'فشل التحقق من الهوية. يرجى المحاولة مرة أخرى' : 'Verification failed. Please try again.')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const formattedDob = dobFormat === 'hijri'
        ? (hijriDob || null)
        : (dob ? formatDate(dob) : null);

      const payload = {
        nationalId,
        dob: formattedDob,
        hijriDob: dobFormat === 'hijri' ? (hijriDob || null) : null,
        elmVerified: true,
        elmData,
      };

      const result = await updateElmVerification(payload);

      if (result) {
        setElmVerificationDeferred(false);
        // Update local auth state
        setAuth({
          user: {
            ...user,
            elmVerified: true,
            elmVerificationData: elmData,
            fullName: elmData.fullName,
            gender: elmData.gender,
            nationality: elmData.nationality,
            nationalId,
          },
          token: useAuthStore.getState().token,
          refreshToken: useAuthStore.getState().refreshToken,
        });

        setStep('success');

        // Navigate to home after delay
        setTimeout(() => {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Main' }],
          });
        }, 1500);
      }
    } catch (error) {
      Alert.alert(
        isRTL ? 'خطأ' : 'Error',
        error.message || (isRTL ? 'فشل تحديث البيانات' : 'Failed to update information')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      isRTL ? 'تسجيل الخروج' : 'Logout',
      isRTL ? 'هل أنت متأكد من تسجيل الخروج؟' : 'Are you sure you want to logout?',
      [
        { text: isRTL ? 'إلغاء' : 'Cancel', style: 'cancel' },
        {
          text: isRTL ? 'تسجيل الخروج' : 'Logout',
          style: 'destructive',
          onPress: async () => {
            await fullLogout();
            navigation.reset({
              index: 0,
              routes: [{ name: 'LoginScreen' }],
            });
          },
        },
      ]
    );
  };

  const handleBack = () => {
    if (step === 'confirm') {
      setStep('input');
      setElmData(null);
      return;
    }

    if (step === 'input' || step === 'international') {
      setStep('residency');
      return;
    }

    if (step === 'success') return;

    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('Main');
  };

  const renderResidencyStep = () => (
    <>
      <Text style={[styles.label, isRTL && styles.rtlText]}>
        {ev.residencyPrompt || (isRTL ? 'أين تقيم؟' : 'Where do you reside?')}
      </Text>
      <TouchableOpacity style={styles.residencyCard} onPress={() => setStep('input')}>
        <Text style={styles.residencyTitle}>{ev.ksaResident || (isRTL ? 'المملكة العربية السعودية' : 'Saudi Arabia')}</Text>
        <Text style={styles.residencyHint}>
          {ev.ksaResidentHint || (isRTL ? 'التحقق عبر نظام علم' : 'Verify with Saudi ELM (NIN / Iqama)')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.residencyCard} onPress={() => setStep('international')}>
        <Text style={styles.residencyTitle}>{ev.internationalResident || (isRTL ? 'خارج السعودية' : 'Outside Saudi Arabia')}</Text>
        <Text style={styles.residencyHint}>
          {ev.internationalResidentHint || (isRTL ? 'أدخل بياناتك يدوياً' : 'Enter your details manually — no ELM required')}
        </Text>
      </TouchableOpacity>
    </>
  );

  const renderInternationalStep = () => (
    <>
      <View style={styles.inputGroup}>
        <Text style={[styles.label, isRTL && styles.rtlText]}>{ev.fullName || (isRTL ? 'الاسم الكامل' : 'Full name')}</Text>
        <TextInput
          style={[styles.input, isRTL && styles.rtlInput]}
          value={intlFullName}
          onChangeText={setIntlFullName}
          placeholderTextColor={COLORS.gray400}
        />
      </View>
      <View style={styles.inputGroup}>
        <Text style={[styles.label, isRTL && styles.rtlText]}>{ev.gender || (isRTL ? 'الجنس' : 'Gender')}</Text>
        <View style={[styles.genderRow, isRTL && { flexDirection: 'row-reverse' }]}>
          {['Male', 'Female'].map((option) => (
            <TouchableOpacity
              key={option}
              style={[styles.genderChip, intlGender === option && styles.genderChipActive]}
              onPress={() => setIntlGender(option)}
            >
              <Text style={[styles.genderChipText, intlGender === option && styles.genderChipTextActive]}>
                {option === 'Male' ? (ev.male || 'Male') : (ev.female || 'Female')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View style={styles.inputGroup}>
        <Text style={[styles.label, isRTL && styles.rtlText]}>{ev.nationality || (isRTL ? 'الجنسية' : 'Nationality')}</Text>
        <TouchableOpacity style={styles.input} onPress={() => setShowNationalityPicker(true)}>
          <Text style={{ color: intlNationality ? COLORS.textPrimary : COLORS.gray400 }}>
            {intlNationality || ev.selectNationality || 'Select nationality'}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.inputGroup}>
        <Text style={[styles.label, isRTL && styles.rtlText]}>{ev.idOrPassport || (isRTL ? 'رقم الهوية / جواز السفر' : 'ID / Passport number')}</Text>
        <TextInput
          style={[styles.input, isRTL && styles.rtlInput]}
          value={intlNationalId}
          onChangeText={setIntlNationalId}
          placeholderTextColor={COLORS.gray400}
        />
      </View>
      <View style={styles.inputGroup}>
        <Text style={[styles.label, isRTL && styles.rtlText]}>{ev.dob || (isRTL ? 'تاريخ الميلاد' : 'Date of birth')}</Text>
        <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
          <Text style={{ color: dob ? COLORS.textPrimary : COLORS.gray400 }}>
            {dob ? formatDate(dob) : ev.selectDob || 'Select date'}
          </Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={[styles.primaryButton, loading && styles.buttonDisabled]}
        onPress={handleInternationalSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Text style={styles.primaryButtonText}>{ev.continue || (isRTL ? 'متابعة' : 'Continue')}</Text>
        )}
      </TouchableOpacity>
      {showNationalityPicker && (
        <View style={styles.nationalityPicker}>
          <ScrollView style={{ maxHeight: 180 }}>
            {INTERNATIONAL_NATIONALITIES.map((country) => (
              <TouchableOpacity
                key={country}
                style={styles.nationalityItem}
                onPress={() => {
                  setIntlNationality(country);
                  setShowNationalityPicker(false);
                }}
              >
                <Text style={styles.nationalityItemText}>{country}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </>
  );

  const renderInputStep = () => (
    <>
      {/* National ID */}
      <View style={styles.inputGroup}>
        <Text style={[styles.label, isRTL && styles.rtlText]}>
          {isRTL ? 'رقم الهوية / الإقامة' : 'National ID / Iqama'}
        </Text>
        <TextInput
          style={[styles.input, isRTL && styles.rtlInput]}
          placeholder={isRTL ? 'أدخل رقم الهوية' : 'Enter ID number'}
          placeholderTextColor={COLORS.gray400}
          value={nationalId}
          onChangeText={setNationalId}
          keyboardType="numeric"
          maxLength={10}
        />
      </View>

      {/* DOB Format Toggle */}
      <View style={styles.inputGroup}>
        <Text style={[styles.label, isRTL && styles.rtlText]}>
          {isRTL ? 'تنسيق التاريخ' : 'Date Format'}
        </Text>
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, dobFormat === 'gregorian' && styles.toggleButtonActive]}
            onPress={() => setDobFormat('gregorian')}
          >
            <Text style={[styles.toggleText, dobFormat === 'gregorian' && styles.toggleTextActive]}>
              {isRTL ? 'ميلادي' : 'Gregorian'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, dobFormat === 'hijri' && styles.toggleButtonActive]}
            onPress={() => setDobFormat('hijri')}
          >
            <Text style={[styles.toggleText, dobFormat === 'hijri' && styles.toggleTextActive]}>
              {isRTL ? 'هجري' : 'Hijri'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* DOB Input */}
      {dobFormat === 'gregorian' ? (
        <View style={styles.inputGroup}>
          <Text style={[styles.label, isRTL && styles.rtlText]}>
            {isRTL ? 'تاريخ الميلاد (ميلادي)' : 'Date of Birth (Gregorian)'}
          </Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={[styles.dateButtonText, !dob && styles.placeholder]}>
              {dob ? formatDate(dob) : (isRTL ? 'اختر التاريخ' : 'Select date')}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <View style={styles.pickerContainer}>
              <DateTimePicker
                value={tempDate || dob || new Date(1990, 0, 1)}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                maximumDate={new Date()}
                minimumDate={new Date(1940, 0, 1)}
                style={{ height: 180 }}
                themeVariant="light"
                textColor={COLORS.textPrimary}
              />
              {Platform.OS === 'ios' && (
                <TouchableOpacity style={styles.pickerDoneBtn} onPress={confirmDate}>
                  <Text style={styles.pickerDoneText}>
                    {isRTL ? 'تم' : 'Done'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      ) : (
        <View style={styles.inputGroup}>
          <Text style={[styles.label, isRTL && styles.rtlText]}>
            {isRTL ? 'تاريخ الميلاد (هجري)' : 'Date of Birth (Hijri)'}
          </Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowHijriPicker(true)}
          >
            <Text style={[styles.dateButtonText, !hijriDob && styles.placeholder]}>
              {hijriDob || (isRTL ? 'اختر التاريخ' : 'Select date')}
            </Text>
          </TouchableOpacity>
          {showHijriPicker && (
            <View style={styles.pickerContainer}>
              <View style={styles.hijriPickerRow}>
                {/* Year */}
                <View style={styles.hijriPickerCol}>
                  <Text style={styles.hijriPickerLabel}>{isRTL ? 'السنة' : 'Year'}</Text>
                  <ScrollView style={styles.hijriScrollCol} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                    {HIJRI_YEARS.map(y => (
                      <TouchableOpacity
                        key={y}
                        style={[styles.hijriOption, hijriYear === y && styles.hijriOptionActive]}
                        onPress={() => setHijriYear(y)}
                      >
                        <Text style={[styles.hijriOptionText, hijriYear === y && styles.hijriOptionTextActive]}>{y}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                {/* Month */}
                <View style={styles.hijriPickerCol}>
                  <Text style={styles.hijriPickerLabel}>{isRTL ? 'الشهر' : 'Month'}</Text>
                  <ScrollView style={styles.hijriScrollCol} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                    {HIJRI_MONTHS.map(m => (
                      <TouchableOpacity
                        key={m.value}
                        style={[styles.hijriOption, hijriMonth === m.value && styles.hijriOptionActive]}
                        onPress={() => setHijriMonth(m.value)}
                      >
                        <Text style={[styles.hijriOptionText, hijriMonth === m.value && styles.hijriOptionTextActive]}>{m.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                {/* Day */}
                <View style={styles.hijriPickerCol}>
                  <Text style={styles.hijriPickerLabel}>{isRTL ? 'اليوم' : 'Day'}</Text>
                  <ScrollView style={styles.hijriScrollCol} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                    {HIJRI_DAYS.map(d => (
                      <TouchableOpacity
                        key={d}
                        style={[styles.hijriOption, hijriDay === d && styles.hijriOptionActive]}
                        onPress={() => setHijriDay(d)}
                      >
                        <Text style={[styles.hijriOptionText, hijriDay === d && styles.hijriOptionTextActive]}>{d}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
              <TouchableOpacity style={styles.pickerDoneBtn} onPress={confirmHijriDate}>
                <Text style={styles.pickerDoneText}>{isRTL ? 'تم' : 'Done'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Verify Button */}
      <TouchableOpacity
        style={[styles.primaryButton, loading && styles.buttonDisabled]}
        onPress={handleVerify}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Text style={styles.primaryButtonText}>
            {isRTL ? 'تحقق من الهوية' : 'Verify Identity'}
          </Text>
        )}
      </TouchableOpacity>
    </>
  );

  const renderConfirmStep = () => (
    <>
      {/* Verified Data Display */}
      <View style={styles.verifiedContainer}>
        <View style={styles.verifiedHeader}>
          <Text style={styles.verifiedIcon}>✓</Text>
          <Text style={styles.verifiedTitle}>
            {isRTL ? 'تم التحقق من الهوية' : 'Identity Verified'}
          </Text>
        </View>

        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>{isRTL ? 'الاسم' : 'Name'}</Text>
          <Text style={styles.dataValue}>{elmData?.fullName}</Text>
        </View>
        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>{isRTL ? 'الجنس' : 'Gender'}</Text>
          <Text style={[styles.dataValue, { textTransform: 'capitalize' }]}>{elmData?.gender}</Text>
        </View>
        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>{isRTL ? 'الجنسية' : 'Nationality'}</Text>
          <Text style={styles.dataValue}>{elmData?.nationality}</Text>
        </View>
      </View>

      <Text style={styles.confirmText}>
        {isRTL
          ? 'هل هذه المعلومات صحيحة؟ اضغط تأكيد للمتابعة'
          : 'Is this information correct? Click confirm to continue'}
      </Text>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => {
            setStep('input');
            setElmData(null);
          }}
        >
          <Text style={styles.secondaryButtonText}>
            {isRTL ? 'رجوع' : 'Back'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryButton, styles.flex1, loading && styles.buttonDisabled]}
          onPress={handleConfirm}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.primaryButtonText}>
              {isRTL ? 'تأكيد' : 'Confirm'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </>
  );

  const renderSuccessStep = () => (
    <View style={styles.successContainer}>
      <View style={styles.successIcon}>
        <Text style={styles.successIconText}>✓</Text>
      </View>
      <Text style={styles.successTitle}>
        {isRTL ? 'تم التحقق بنجاح!' : 'Verification Complete!'}
      </Text>
      <Text style={styles.successText}>
        {isRTL ? 'جاري تحويلك...' : 'Redirecting...'}
      </Text>
      <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Header
        showBack
        onBack={handleBack}
        title={ev.title || (isRTL ? 'التحقق من الهوية' : 'Identity Verification')}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.iconContainer}>
            <Image source={ICONS.shield} style={styles.shieldIcon} resizeMode="contain" />
          </View>
          <AppText variant="h2" align="center" style={styles.title}>
            {step === 'international'
              ? (ev.internationalTitle || (isRTL ? 'بيانات المقيم خارج السعودية' : 'International resident details'))
              : step === 'residency'
                ? (ev.residencyTitle || (isRTL ? 'اختر نوع الإقامة' : 'Choose residency type'))
                : (ev.heroTitle || (isRTL ? 'التحقق من الهوية مطلوب' : 'Identity Verification Required'))}
          </AppText>
          <AppText variant="bodySmall" align="center" color={COLORS.textSecondary} style={styles.subtitle}>
            {step === 'international'
              ? (ev.internationalSubtitle || (isRTL ? 'أدخل بياناتك للمتابعة بدون تحقق علم' : 'Enter your details to continue without ELM verification'))
              : step === 'residency'
                ? (ev.residencySubtitle || (isRTL ? 'اختر الخيار المناسب لإكمال التسجيل' : 'Select the option that applies to you'))
                : (ev.heroSubtitle || (isRTL
                  ? 'لحماية سجلاتك الطبية، يرجى التحقق من هويتك عبر نظام ELM'
                  : 'To protect your medical records, please verify your identity via ELM'))}
          </AppText>
        </View>

        {/* Main Card */}
        <AppCard style={styles.card}>
          {step === 'residency' && renderResidencyStep()}
          {step === 'international' && renderInternationalStep()}
          {step === 'input' && renderInputStep()}
          {step === 'confirm' && renderConfirmStep()}
          {step === 'success' && renderSuccessStep()}
        </AppCard>

        {/* Logout Link */}
        {step !== 'success' && (
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <AppText variant="bodySmall" color={COLORS.danger} style={styles.logoutText}>
              {isRTL ? 'تسجيل الخروج' : 'Logout'}
            </AppText>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryLight,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 8,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 30,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  shieldIcon: {
    width: 40,
    height: 40,
    tintColor: COLORS.white,
  },
  title: {
    marginBottom: 10,
  },
  subtitle: {
    paddingHorizontal: 20,
  },
  card: {
    marginBottom: 0,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 8,
  },
  rtlText: {
    textAlign: 'right',
  },
  input: {
    backgroundColor: COLORS.gray100,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.dark,
  },
  rtlInput: {
    textAlign: 'right',
  },
  toggleContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  toggleButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: COLORS.gray100,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: COLORS.primary,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.gray500,
  },
  toggleTextActive: {
    color: COLORS.white,
  },
  dateButton: {
    backgroundColor: COLORS.gray100,
    borderRadius: 12,
    padding: 16,
  },
  dateButtonText: {
    fontSize: 16,
    color: COLORS.dark,
  },
  placeholder: {
    color: COLORS.gray400,
  },
  pickerContainer: {
    backgroundColor: COLORS.gray100,
    borderRadius: 12,
    marginTop: 8,
    overflow: 'hidden',
  },
  pickerDoneBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    alignItems: 'center',
  },
  pickerDoneText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  hijriPickerRow: {
    flexDirection: 'row',
    height: 200,
  },
  hijriPickerCol: {
    flex: 1,
  },
  hijriPickerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingVertical: 8,
    backgroundColor: COLORS.gray100,
  },
  hijriScrollCol: {
    flex: 1,
  },
  hijriOption: {
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  hijriOptionActive: {
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    marginHorizontal: 4,
  },
  hijriOptionText: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  hijriOptionTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  secondaryButton: {
    backgroundColor: COLORS.gray100,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flex: 1,
  },
  secondaryButtonText: {
    color: COLORS.dark,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  flex1: {
    flex: 1,
  },
  verifiedContainer: {
    backgroundColor: COLORS.secureBg,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.secureBorder,
  },
  verifiedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  verifiedIcon: {
    fontSize: 20,
    color: COLORS.success,
    marginRight: 8,
  },
  verifiedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.success,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dataLabel: {
    fontSize: 14,
    color: COLORS.gray500,
  },
  dataValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
  },
  confirmText: {
    fontSize: 14,
    color: COLORS.gray500,
    textAlign: 'center',
    marginBottom: 15,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.secureBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successIconText: {
    fontSize: 40,
    color: COLORS.success,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: 10,
  },
  successText: {
    fontSize: 14,
    color: COLORS.gray500,
  },
  logoutButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 14,
    color: COLORS.gray500,
    textDecorationLine: 'underline',
  },
  residencyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  residencyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  residencyHint: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 10,
  },
  genderChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.gray300,
  },
  genderChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  genderChipText: {
    color: COLORS.gray700,
    fontWeight: '500',
  },
  genderChipTextActive: {
    color: COLORS.white,
  },
  nationalityPicker: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: 10,
    backgroundColor: COLORS.white,
  },
  nationalityItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  nationalityItemText: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
});

export default ElmVerificationRequiredScreen;
