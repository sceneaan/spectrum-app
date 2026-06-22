import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, TextInput, Modal, FlatList, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Keyboard, InteractionManager, TouchableWithoutFeedback } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useLanguage } from '../store/LanguageContext';
import { useCreateSupportCard } from '../api/services/SupportCard.Service';
import Header from '../components/Header';
import PhoneInput, { validatePhone, COUNTRY_CODES } from '../components/common/PhoneInput';
import ICONS from '../constants/icons';
import COLORS from '../constants/colors';

const SupportCardScreen = () => {
  const navigation = useNavigation();
  const { t, isRTL } = useLanguage();

  // Refs
  const scrollViewRef = useRef(null);
  const phoneInputRef = useRef(null);
  const phoneInputSectionRef = useRef(null);

  // State
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [customAmount, setCustomAmount] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+966');
  const [phoneError, setPhoneError] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  // API Hook
  const { mutate: createSupportCard, isPending } = useCreateSupportCard();

  // RTL helpers
  const alignText = { textAlign: isRTL ? 'right' : 'left' };
  const rowStyle = { flexDirection: isRTL ? 'row-reverse' : 'row' };

  // Predefined amounts
  const amounts = [100, 150, 200, 250];

  // Calculate total amount
  const getTotalAmount = () => {
    const baseAmount = selectedAmount || 0;
    const customAmountValue = parseFloat(customAmount) || 0;
    return baseAmount + customAmountValue;
  };

  // Handle amount selection
  const handleAmountSelection = (amount) => {
    setSelectedAmount(amount);
  };

  // Handle custom amount change
  const handleCustomAmountChange = (value) => {
    // Allow only numbers and decimal point
    const numericValue = value.replace(/[^0-9.]/g, '');
    setCustomAmount(numericValue);
  };

  // Handle phone number change
  const handlePhoneChange = (value) => {
    setRecipientPhone(value);
    // Clear error as user types
    setPhoneError('');

    // Validate in real-time only if there's a value
    if (value.trim()) {
      const validation = validatePhone(value, countryCode);
      if (!validation.isValid) {
        setPhoneError(validation.message);
      }
    }
  };

  // Handle country code selection
  const handleCountryCodeSelection = (item) => {
    setCountryCode(item.code);
    setModalVisible(false);

    // Re-validate phone number with new country code
    if (recipientPhone) {
      const validation = validatePhone(recipientPhone, item.code);
      setPhoneError(validation.isValid ? '' : validation.message);
    }
  };

  // Handle continue to payment
  const handleContinuePayment = () => {
    const totalAmount = getTotalAmount();

    // Validate total amount
    if (totalAmount <= 0) {
      Alert.alert(
        t.supportCard?.error || 'Error',
        t.supportCard?.totalAmountMustBeGreaterThanZero || 'Total amount must be greater than zero'
      );
      return;
    }

    // Validate phone number
    if (!recipientPhone.trim()) {
      setPhoneError(t.supportCard?.invalidRecipientMobileNumber || 'Phone number is required');
      Alert.alert(
        t.supportCard?.error || 'Error',
        t.supportCard?.invalidRecipientMobileNumber || 'Phone number is required'
      );
      return;
    }

    const phoneValidation = validatePhone(recipientPhone, countryCode);
    if (!phoneValidation.isValid) {
      setPhoneError(phoneValidation.message);
      Alert.alert(t.supportCard?.error || 'Error', phoneValidation.message);
      return;
    }

    // Format phone: remove spaces, +, -, (), and add country code
    const formattedPhone = `${countryCode}${recipientPhone}`.replace(/[\s\+\-\(\)]/g, '');

    createSupportCard(
      {
        amount: totalAmount,
        phoneNumber: formattedPhone,
      },
      {
        onSuccess: (data) => {

          // Navigate to PaymentFormScreen
          // Ensure amount is a number for native iOS module compatibility
          const numericAmount = parseFloat(totalAmount) || 0;
          navigation.navigate('PaymentFormScreen', {
            paymentType: 'support_card',
            amount: numericAmount,
            originScreen: 'SupportCard',
            payload: {
              supportCardId: data._id || data.id,
              phoneNumber: formattedPhone,
              amount: numericAmount,
            },
          });
        },
        onError: (error) => {
          Alert.alert(
            t.supportCard?.error || 'Error',
            t.supportCard?.failedToCreateSupportCard || 'Failed to create support card'
          );
        },
      }
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Header
        showBack
        onBack={() => navigation.goBack()}
        title={t.supportCard?.title || 'Support Card'}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1 }}>
            <ScrollView
              ref={scrollViewRef}
              style={{ padding: 20 }}
              contentContainerStyle={{ paddingBottom: 400 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
        {/* Hero Section */}
        <View style={styles.hero}>
          <Image source={ICONS.gift} style={{ width: 70, height: 70 }} />
          <Text style={[styles.subtitle, { marginTop: 10 }]}>
            {t.supportCard?.giftHealth || 'Give the gift of health'}
          </Text>
        </View>

        {/* Select Amount */}
        <Text style={[styles.title, alignText]}>
          {t.supportCard?.selectAmount || 'Select Support Amount'}
        </Text>
        <Text style={[styles.description, alignText, { marginBottom: 15 }]}>
          {t.supportCard?.chooseAmount || 'Choose an amount or enter a custom value'}
        </Text>

        <View style={[styles.grid, rowStyle]}>
          {amounts.map((amt) => (
            <TouchableOpacity
              key={amt}
              style={[
                styles.amtBtn,
                selectedAmount === amt && styles.activeAmt,
              ]}
              onPress={() => handleAmountSelection(amt)}
            >
              <Text
                style={{
                  fontWeight: 'bold',
                  color: selectedAmount === amt ? COLORS.primary : COLORS.textPrimary,
                }}
              >
                {t.supportCard?.sar || 'SAR'} {amt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Custom Amount */}
        <Text style={[styles.label, alignText]}>
          {t.supportCard?.customAmount || 'Custom Amount (Optional)'}
        </Text>
        <TextInput
          style={[styles.input, alignText]}
          placeholder={t.supportCard?.customPlaceholder || 'Enter custom amount'}
          keyboardType="numeric"
          value={customAmount}
          onChangeText={handleCustomAmountChange}
          placeholderTextColor={COLORS.gray500}
        />

        {/* Recipient Phone Number */}
        <View ref={phoneInputSectionRef}>
          <PhoneInput
            label={t.supportCard?.recipientMobile || 'Recipient Mobile Number'}
            value={recipientPhone}
            onChangeText={handlePhoneChange}
            inputRef={phoneInputRef}
            onFocus={() => {
              // Use InteractionManager to defer scroll until after animations complete
              // This prevents freezing the UI
              InteractionManager.runAfterInteractions(() => {
                // Simplified scroll - just scroll to end
                scrollViewRef.current?.scrollToEnd({ animated: true });
              });
            }}
            alignText={alignText}
            rowStyle={{}}
            isRTL={false}
            error={phoneError}
            countryCode={countryCode}
            onCountryCodePress={() => setModalVisible(true)}
            placeholder={t.supportCard?.recipientPlaceholder || '512345678'}
          />
        </View>

        {/* Total Amount Box */}
        <View style={styles.totalBox}>
          <Text style={{ color: COLORS.gray600 }}>
            {t.supportCard?.totalAmount || 'Total Amount'}
          </Text>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: COLORS.primary, marginTop: 5 }}>
            {t.supportCard?.sar || 'SAR'} {getTotalAmount()}
          </Text>
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={[styles.payBtn, isPending && styles.payBtnDisabled]}
          onPress={handleContinuePayment}
          disabled={isPending}
        >
          {isPending ? (
            <ActivityIndicator color={COLORS.white} size="small" />
          ) : (
            <Text style={{ color: 'white', fontWeight: 'bold' }}>
              {t.supportCard?.continuePayment || 'Continue to Payment'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Terms */}
        <Text style={[styles.termsText, alignText]}>
          {t.supportCard?.termsAgreement || 'By purchasing, you agree to our Terms and Conditions'}
        </Text>
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* Country Code Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {t.supportCard?.selectCountryCode || 'Select Country Code'}
            </Text>

            <FlatList
              data={COUNTRY_CODES}
              keyExtractor={(item) => item.code}
              style={{ maxHeight: 400 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, rowStyle, { justifyContent: 'space-between' }]}
                  onPress={() => handleCountryCodeSelection(item)}
                >
                  <View style={[rowStyle, { alignItems: 'center' }]}>
                    <Text style={{ fontSize: 24, marginRight: 10, marginLeft: isRTL ? 10 : 0 }}>
                      {item.flag}
                    </Text>
                    <Text style={styles.modalItemText}>{item.country}</Text>
                  </View>
                  <Text style={[styles.modalItemText, { color: COLORS.primary }]}>
                    {item.code}
                  </Text>
                </TouchableOpacity>
              )}
            />

            <TouchableOpacity
              style={[styles.modalConfirmBtn, { backgroundColor: COLORS.gray200 }]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={{ color: COLORS.textPrimary }}>
                {t.common?.cancel || 'Cancel'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    marginBottom: 30,
    padding: 20,
    backgroundColor: COLORS.white,
    borderRadius: 16,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 8,
    color: COLORS.textPrimary,
  },
  subtitle: {
    color: COLORS.secondary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  description: {
    fontSize: 14,
    color: COLORS.gray600,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  amtBtn: {
    width: '48%',
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: COLORS.white,
  },
  activeAmt: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.promo1,
  },
  label: {
    marginVertical: 10,
    fontWeight: '600',
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: COLORS.textPrimary,
    marginBottom: 20,
  },
  totalBox: {
    backgroundColor: COLORS.promo1,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginVertical: 20,
  },
  payBtn: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  payBtnDisabled: {
    backgroundColor: COLORS.gray400,
  },
  termsText: {
    marginTop: 15,
    fontSize: 12,
    color: COLORS.gray600,
    textAlign: 'center',
    marginBottom: 30,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 15,
  },
  modalItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderColor: COLORS.gray100,
  },
  modalItemText: {
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  modalConfirmBtn: {
    marginTop: 10,
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
});

export default SupportCardScreen;
