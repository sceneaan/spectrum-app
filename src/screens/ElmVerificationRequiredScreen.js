import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLanguage } from '../store/LanguageContext';
import { useAuthStore } from '../store/authStore';
import { verifyElmIdentity } from '../api/services/Elm.Service';
import { updateElmVerification } from '../api/services/User.Service';
import COLORS from '../constants/colors';

const ElmVerificationRequiredScreen = ({ navigation }) => {
  const { t, isRTL } = useLanguage();
  const { user, setAuth, logout } = useAuthStore();

  const [nationalId, setNationalId] = useState(user?.nationalId || '');
  const [dobFormat, setDobFormat] = useState('gregorian');
  const [dob, setDob] = useState(null);
  const [hijriDob, setHijriDob] = useState('');
  const [hijriYear, setHijriYear] = useState('1410');
  const [hijriMonth, setHijriMonth] = useState('01');
  const [hijriDay, setHijriDay] = useState('01');
  const [showHijriPicker, setShowHijriPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('input'); // 'input' | 'confirm' | 'success'
  const [elmData, setElmData] = useState(null);

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
      const payload = {
        nationalId,
        dob: dob ? formatDate(dob) : null,
        hijriDob: hijriDob || null,
        elmVerified: true,
        elmData,
      };

      const result = await updateElmVerification(payload);

      if (result) {
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
          onPress: () => {
            logout();
            navigation.reset({
              index: 0,
              routes: [{ name: 'LoginScreen' }],
            });
          },
        },
      ]
    );
  };

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
                textColor="#333333"
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
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Text style={styles.shieldIcon}>🛡️</Text>
          </View>
          <Text style={styles.title}>
            {isRTL ? 'التحقق من الهوية مطلوب' : 'Identity Verification Required'}
          </Text>
          <Text style={styles.subtitle}>
            {isRTL
              ? 'لحماية سجلاتك الطبية، يرجى التحقق من هويتك عبر نظام ELM'
              : 'To protect your medical records, please verify your identity via ELM'}
          </Text>
        </View>

        {/* Main Card */}
        <View style={styles.card}>
          {step === 'input' && renderInputStep()}
          {step === 'confirm' && renderConfirmStep()}
          {step === 'success' && renderSuccessStep()}
        </View>

        {/* Logout Link */}
        {step !== 'success' && (
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>
              {isRTL ? 'تسجيل الخروج' : 'Logout'}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8F4F8',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
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
    fontSize: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.gray500,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
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
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  verifiedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  verifiedIcon: {
    fontSize: 20,
    color: '#16A34A',
    marginRight: 8,
  },
  verifiedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#16A34A',
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successIconText: {
    fontSize: 40,
    color: '#16A34A',
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
});

export default ElmVerificationRequiredScreen;
