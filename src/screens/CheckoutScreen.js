import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, Image, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Keyboard
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Header from '../components/Header';
import CancellationPolicy from '../components/CancellationPolicy';
import RiyalText from '../components/RiyalText';
import COLORS from '../constants/colors';
import ICONS from '../constants/icons';
import moment from 'moment-timezone';

// Services
import { useCreateTransaction } from '../api/services/Transaction.Service';
import { useCreateCheckoutWithoutShopperUrl, CheckPaymentStatus } from '../api/services/Payment.Service';
import { useGetAppointmentStatus, useCreateAppointment } from '../api/services/Appointment.Service';
import { useGetMyWallet } from '../api/services/Wallet.Service';
import { useApplyDiscountCode } from '../api/services/Discount.Service';
import { CheckSupportCard } from '../api/services/SupportCard.Service';
import { useGetUserProfile } from '../api/services/User.Service';
import { useAuthStore } from '../store/authStore';
import { getUserId } from '../utils/userId';
import { useLanguage } from '../store/LanguageContext';
import { usePaymentMachine } from '../machines/paymentMachine';

// Hooks
import { usePriceCalculation } from '../hooks/usePriceCalculation';

const CheckoutScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { t, i18n } = useTranslation();
  const { t: lang, isRTL } = useLanguage();
  const insets = useSafeAreaInsets();

  const { user } = useAuthStore();
  const patientId = getUserId(user);

  // Parameters passed from DoctorProfileScreen
  // New flow: Receive appointment ID (appointment already created)
  const { id: routeAppointmentId } = route.params || {};

  // API hooks for data
  const { data: walletData } = useGetMyWallet();
  const { data: appointmentStatus } = useGetAppointmentStatus(routeAppointmentId);
  const { data: providerProfile } = useGetUserProfile(appointmentStatus?.provider?.id);
  const { mutate: applyDiscountCode } = useApplyDiscountCode();
  const { mutateAsync: createAppointment, isPending: isCreatingAppointment } = useCreateAppointment();

  // API hooks for payment machine actions
  const { mutate: createTransactionMutation, isPending: isCreatingTransaction } = useCreateTransaction();
  const { mutate: createCheckoutMutation, isPending: isCreatingCheckout } = useCreateCheckoutWithoutShopperUrl();

  // Payment Machine initialization
  const { context, actions } = usePaymentMachine({
    createTransaction: createTransactionMutation,
    createCheckout: createCheckoutMutation,
    checkPaymentStatus: CheckPaymentStatus,
  });

  // Local state for discount/support card inputs
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [supportCardInput, setSupportCardInput] = useState('');
  const [isCheckingSupport, setIsCheckingSupport] = useState(false);
  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);
  const [isProcessingBooking, setIsProcessingBooking] = useState(false);

  // Price calculation
  const priceCalculation = usePriceCalculation({
    appointment: context.appointment,
    userNationality: user?.nationality,
    discountApplied: context.discount,
    supportCardApplied: context.supportCard,
  });

  // Update machine's context when external data changes
  useEffect(() => {
    if (walletData) {
      actions.setWallet(walletData);
    }
  }, [walletData, actions]);

  // Load appointment from API
  useEffect(() => {
    if (appointmentStatus) {
        actions.setAppointment(appointmentStatus);
    }
  }, [appointmentStatus, actions]);

  useEffect(() => {
    if (priceCalculation) {
      actions.updatePricing(priceCalculation);
    }
  }, [priceCalculation, actions]);

  // Handle navigation based on payment machine state
  useEffect(() => {
    if (context.state === 'success' && context.transactionId) {
      Alert.alert(t('common.success') || 'Success', t('checkout.appointmentBooked') || 'Appointment booked successfully!');
      navigation.replace('PaymentSuccessScreen', { appointment: context.appointment, transactionId: context.transactionId });
    } else if (context.state === 'insufficient_funds') {
      Alert.alert(
        lang?.alerts?.insufficientWalletBalance || 'Insufficient Wallet Balance',
        lang?.alerts?.insufficientWalletBalanceMessage || 'Your wallet balance is insufficient for this payment.'
      );
      actions.retry();
    } else if (context.state === 'error') {
      Alert.alert(t('common.error') || 'Error', t('checkout.paymentFailed') || 'Payment failed. Please try again.');
      actions.retry();
    }
  }, [context.state, context.transactionId, context.appointment, navigation, t, actions]);

  const rowStyle = { flexDirection: isRTL ? 'row-reverse' : 'row' };
  const alignText = { textAlign: isRTL ? 'right' : 'left' };

  const handleApplyPromo = () => {
    if (!promoCodeInput.trim()) {
      Alert.alert(t('common.error') || 'Error', t('checkout.enterDiscountCode') || 'Please enter a discount code');
      return;
    }

    setIsApplyingDiscount(true);
    Keyboard.dismiss();

    const payload = {
      code: promoCodeInput.trim(),
      service: context.appointment?.providerService?._id,
      payableAmount: context.appointment?.providerService?.slotPrice || priceCalculation.basePrice || 0,
    };

    applyDiscountCode(payload, {
        onSuccess: async (data) => {
            setIsApplyingDiscount(false);
            actions.applyDiscount(data);

            // If support card is already applied, recalculate it with the new discounted total
            if (context.supportCard && supportCardInput) {
                try {
                    // Calculate new total after discount
                    const discountAmount = data?.amount || 0;
                    const basePrice = context.appointment?.providerService?.slotPrice || priceCalculation.basePrice || 0;
                    const subtotalAfterDiscount = Math.max(0, basePrice - discountAmount);
                    const isSaudi = user?.nationality === 'Saudi Arabia';
                    const taxRate = isSaudi ? 0 : 0.15;
                    const taxAmount = subtotalAfterDiscount * taxRate;
                    const newTotalAmount = Number((subtotalAfterDiscount + taxAmount).toFixed(2));

                    // Re-check support card with new total
                    const result = await CheckSupportCard(supportCardInput, {
                        netAmount: newTotalAmount
                    });

                    if (result && result.isValid) {
                        // Update support card with recalculated amounts
                        actions.applySupportCard({
                            code: supportCardInput,
                            supportCardId: result.supportCard?._id,
                            amount: result.paymentBreakdown?.supportCardAmount || 0,
                            fullValue: result.supportCard?.value || 0,
                            leftoverToWallet: result.supportCard?.remainingValue || 0,
                        });
                    }
                } catch (error) {
                    // Remove support card if recalculation fails
                    actions.removeSupportCard();
                    setSupportCardInput('');
                }
            }

            Alert.alert(t('common.success') || 'Success', t('checkout.discountApplied') || 'Discount applied successfully!');
        },
        onError: (error) => {
            setIsApplyingDiscount(false);

            // Handle specific error cases
            let errorTitle = t('common.error') || 'Error';
            let errorMessage = t('checkout.invalidDiscountCode') || 'Invalid discount code';

            if (error?.message?.includes('providerPendingAcceptance')) {
                errorTitle = t('checkout.discountPendingApproval') || 'Discount Pending Approval';
                errorMessage = isRTL
                    ? 'رمز الخصم بانتظار موافقة مقدم الخدمة. يرجى المحاولة لاحقاً.'
                    : 'This discount code is pending provider approval. Please try again later or use a different code.';
            } else if (error?.message?.includes('expired')) {
                errorMessage = isRTL ? 'انتهت صلاحية رمز الخصم' : 'This discount code has expired';
            } else if (error?.message?.includes('notFound')) {
                errorMessage = isRTL ? 'رمز الخصم غير صحيح' : 'Invalid discount code';
            } else if (error?.response?.data?.message) {
                errorMessage = error.response.data.message;
            }

            Alert.alert(errorTitle, errorMessage);
            actions.removeDiscount();
        }
    });
  };

  const handleRemoveDiscount = async () => {
    actions.removeDiscount();
    setPromoCodeInput('');

    // If support card is already applied, recalculate it with the new total (without discount)
    if (context.supportCard && supportCardInput) {
        try {
            // Calculate new total without discount
            const basePrice = context.appointment?.providerService?.slotPrice || priceCalculation.basePrice || 0;
            const isSaudi = user?.nationality === 'Saudi Arabia';
            const taxRate = isSaudi ? 0 : 0.15;
            const taxAmount = basePrice * taxRate;
            const newTotalAmount = Number((basePrice + taxAmount).toFixed(2));

            // Re-check support card with new total
            const result = await CheckSupportCard(supportCardInput, {
                netAmount: newTotalAmount
            });

            if (result && result.isValid) {
                // Update support card with recalculated amounts
                actions.applySupportCard({
                    code: supportCardInput,
                    supportCardId: result.supportCard?._id,
                    amount: result.paymentBreakdown?.supportCardAmount || 0,
                    fullValue: result.supportCard?.value || 0,
                    leftoverToWallet: result.supportCard?.remainingValue || 0,
                });
            }
        } catch (error) {
            // Remove support card if recalculation fails
            actions.removeSupportCard();
            setSupportCardInput('');
        }
    }
  };

  const handleCheckSupport = async () => {
    if (supportCardInput.length < 4) {
      Alert.alert(t('checkout.invalidCode') || 'Invalid Code', t('checkout.enterValidSupportCard') || 'Please enter a valid support card number.');
      return;
    }

    setIsCheckingSupport(true);
    Keyboard.dismiss();

    try {
        const result = await CheckSupportCard(supportCardInput, {
            netAmount: priceCalculation.totalAmount
        });

        if (result && result.isValid) {
            // Store full support card data including leftover information
            actions.applySupportCard({
                code: supportCardInput,
                supportCardId: result.supportCard?._id,
                amount: result.paymentBreakdown?.supportCardAmount || 0,
                fullValue: result.supportCard?.value || 0,
                leftoverToWallet: result.supportCard?.remainingValue || 0,
            });

            Alert.alert(
                t('common.success') || 'Success',
                result.message || t('checkout.supportCardCovers') || 'Support card verified.'
            );
        } else {
             throw new Error(result?.message || 'Invalid card');
        }
    } catch (error) {
        actions.removeSupportCard();
        const msg = error?.response?.data?.message || error?.message || t('checkout.invalidSupportCardCode') || 'Invalid support card code.';
        Alert.alert(t('checkout.invalidCode') || 'Invalid Code', msg);
    } finally {
        setIsCheckingSupport(false);
    }
  };

  const handleProceed = async () => {
    // Validate appointment exists
    if (!context.appointment) {
        Alert.alert(t('common.error') || 'Error', t('checkout.missingBookingDetails') || 'Appointment not found. Please go back and try again.');
        return;
    }

    setIsProcessingBooking(true);

    // If payment is fully covered by support card, create transaction directly
    if (context.paymentMethod === 'support' && priceCalculation.payableAmount === 0) {
        const transactionData = {
            appointmentId: context.appointment.id || context.appointment._id,
            paymentMethod: 'Support Card',
            supportCardId: context.supportCard?.supportCardId,
            supportCardAmount: context.supportCard?.amount,
            discountId: context.discount?._id,
            status: 'Completed',
        };

        createTransactionMutation(transactionData, {
            onSuccess: (data) => {
                setIsProcessingBooking(false);
                const transactionId = data.transaction?._id;
                if (transactionId) {
                    navigation.navigate('PaymentSuccessScreen', {
                        transactionId,
                        amount: priceCalculation.totalAmount,
                        appointmentId: context.appointment.id || context.appointment._id,
                    });
                }
            },
            onError: (error) => {
                setIsProcessingBooking(false);
                Alert.alert(
                    t('common.error') || 'Error',
                    error?.response?.data?.message || t('checkout.paymentFailed') || 'Payment failed. Please try again.'
                );
            }
        });
        return;
    }

    // If support card partially covers payment, navigate to payment form for remaining
    if (context.paymentMethod === 'support' && priceCalculation.payableAmount > 0) {
        setIsProcessingBooking(false);
        navigation.navigate('PaymentFormScreen', {
            amount: parseFloat(priceCalculation.payableAmount) || 0,
            paymentMethod: 'Credit Card',
            paymentType: 'appointment',
            payload: {
                appointmentId: context.appointment.id || context.appointment._id,
                discountId: context.discount?._id,
                supportCardId: context.supportCard?.supportCardId,
                supportCardAmount: context.supportCard?.amount,
            }
        });
        return;
    }

    // Credit card payment
    if (context.paymentMethod === 'card') {
        setIsProcessingBooking(false);
        navigation.navigate('PaymentFormScreen', {
            amount: parseFloat(priceCalculation.payableAmount) || 0,
            paymentMethod: 'Credit Card',
            paymentType: 'appointment',
            payload: {
                appointmentId: context.appointment.id || context.appointment._id,
                discountId: context.discount?._id,
                supportCardId: context.supportCard?.supportCardId,
            }
        });
    } else if (context.paymentMethod === 'Wallet') {
        setTimeout(() => {
            actions.executePayment();
            setIsProcessingBooking(false);
        }, 100);
    } else {
        setIsProcessingBooking(false);
        Alert.alert(
            t('common.error') || 'Error',
            t('checkout.selectPaymentMethod') || 'Please select a payment method.'
        );
    }
  };

  const PaymentOption = ({ id, label, icon, subLabel }) => {
    const isActive = context.paymentMethod === id;
    return (
      <TouchableOpacity
        style={[styles.payOption, isActive && styles.payOptionActive, rowStyle]}
        onPress={() => actions.setPaymentMethod(id)}
        disabled={context.isLoading || isProcessingBooking}
      >
        <View style={[rowStyle, { alignItems: 'center' }]}>
          <View style={[styles.radio, isActive && styles.radioActive]} />
          <Image source={icon} style={[styles.payIcon, { marginHorizontal: 10 }]} />
          <View>
            <Text style={styles.payLabel}>{label}</Text>
            {subLabel && <Text style={styles.paySub}>{subLabel}</Text>}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const isProcessing = context.isLoading || context.state === 'processing' || isProcessingBooking;

  return (
    <View style={styles.container}>
      <Header showBack onBack={() => navigation.goBack()} title={t('checkout.title') || "Checkout"} />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>

          {/* 1. Appointment Summary Card */}
          <View style={styles.card}>
            <Text style={[styles.cardTitle, alignText]}>{t('checkout.appointmentSummary') || "Appointment Summary"}</Text>
            <View style={[styles.docRow, rowStyle]}>
              <Image
                source={{ uri: providerProfile?.profileImage || context.appointment?.provider?.profileImage || context.appointment?.provider?.user?.profileImage || 'https://randomuser.me/api/portraits/men/32.jpg' }}
                style={styles.smAvatar}
              />
              <View style={{ marginHorizontal: 12, flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text style={styles.boldText}>
                  {i18n.language === 'ar'
                    ? (context.appointment?.provider?.fullNameArabic || context.appointment?.provider?.fullName || context.appointment?.providerName || 'طبيب غير معروف')
                    : (context.appointment?.provider?.fullNameEnglish || context.appointment?.provider?.fullName || context.appointment?.providerName || 'Unknown Doctor')
                  }
                </Text>
                <Text style={styles.grayText}>
                  {i18n.language === 'ar'
                    ? (context.appointment?.providerService?.service?.nameArabic || context.appointment?.serviceName || 'غير محدد')
                    : (context.appointment?.providerService?.service?.nameEnglish || context.appointment?.serviceName || 'Not specified')
                  }
                </Text>
                <Text style={styles.tealText}>
                  {context.appointment?.startTime
                    ? moment.utc(context.appointment.startTime).locale('en').format('MMM D, YYYY') + ' • ' +
                      moment(context.appointment.startTime).locale('en').format('h:mm A')
                    : ''}
                </Text>
              </View>
              <RiyalText text={priceCalculation.basePrice} textStyle={styles.price} size={14} />
            </View>
          </View>


          {/* 3. Discount Code Section */}
          <View style={styles.section}>
            <Text style={[styles.label, alignText]}>{t('checkout.discountCode') || "Discount Code"}</Text>
            <View style={[styles.inputRow, rowStyle]}>
                <Image source={ICONS.gift} style={[styles.inputIcon, isRTL ? { marginLeft: 10 } : { marginRight: 10 }]} />
                <TextInput 
                    style={[styles.flexInput, alignText]}
                    placeholder={t('checkout.enterPromoCode') || "Enter Promo Code"}
                    value={promoCodeInput}
                    onChangeText={setPromoCodeInput}
                    placeholderTextColor={COLORS.gray500}
                    editable={!isProcessing && !context.discount}
                />
                <TouchableOpacity
                    style={[styles.applyBtn, context.discount && { backgroundColor: COLORS.success }]}
                    onPress={context.discount ? handleRemoveDiscount : handleApplyPromo}
                    disabled={isProcessing || isApplyingDiscount}
                >
                     {isApplyingDiscount ? (
                        <ActivityIndicator size="small" color="white" />
                     ) : (
                        <Text style={styles.applyBtnText}>
                            {context.discount ? (t('checkout.remove') || 'Remove') : (t('checkout.apply') || 'Apply')}
                        </Text>
                     )}
                </TouchableOpacity>
            </View>
            {context.discount && (
                <View style={[styles.successText, alignText, { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }]}>
                    <Text style={{ color: COLORS.success }}>
                        {t('checkout.youSaved') || "You saved"}{' '}
                    </Text>
                    <RiyalText text={context.discount.amount} textStyle={{ color: COLORS.success }} size={12} />
                    <Text style={{ color: COLORS.success }}>!</Text>
                </View>
            )}
          </View>

          {/* 4. Payment Method Selection */}
          <View style={styles.section}>
            <Text style={[styles.label, alignText]}>{t('checkout.paymentMethod') || "Payment Method"}</Text>

            <PaymentOption id="Wallet" label={t('checkout.payViaWallet') || "Pay via Wallet"} icon={ICONS.wallet} subLabel={`${t('checkout.walletBalance') || "Wallet Balance"}: ${context.wallet?.availableBalance?.toFixed(2) || '0.00'} SAR`} />
            <PaymentOption id="card" label={t('checkout.payViaCard') || "Pay via Card"} icon={ICONS.creditCard} />
            <PaymentOption id="support" label={t('checkout.payViaSupport') || "Pay via Support Card"} icon={ICONS.gift} />

            {/* Conditional Support Input with CHECK Button */}
            {context.paymentMethod === 'support' && (
              <View style={styles.supportContainer}>
                <Text style={[styles.labelSmall, alignText]}>{t('checkout.enterVoucher') || "Enter Voucher / Card Number"}</Text>
                
                <View style={[styles.inputRow, rowStyle]}>
                    <TextInput
                        style={[styles.flexInput, alignText]}
                        placeholder={t('checkout.supportCardPlaceholder') || "XXXX-XXXX-XXXX"}
                        value={supportCardInput}
                        onChangeText={setSupportCardInput}
                        autoCapitalize="characters"
                        placeholderTextColor={COLORS.gray500}
                        editable={!isProcessing && !context.supportCard}
                    />
                    <TouchableOpacity 
                        style={[styles.checkBtn, context.supportCard && { backgroundColor: COLORS.success }]} 
                        onPress={context.supportCard ? actions.removeSupportCard : handleCheckSupport}
                        disabled={isProcessing || isCheckingSupport}
                    >
                        {isCheckingSupport ? (
                            <ActivityIndicator size="small" color="white" />
                        ) : (
                            <Text style={styles.applyBtnText}>
                                {context.supportCard ? (t('common.remove') || 'Remove') : (t('common.check') || 'Check')}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Support Card Details Display */}
                {context.supportCard && (
                  <View style={[styles.supportCardDetails, { marginTop: 10 }]}>
                    {/* Success Icon & Title */}
                    <View style={[rowStyle, { alignItems: 'center', marginBottom: 10 }]}>
                      <Text style={{ fontSize: 20, marginRight: isRTL ? 0 : 8, marginLeft: isRTL ? 8 : 0, color: COLORS.success }}>✓</Text>
                      <Text style={[styles.successTitle, alignText]}>
                        {t('checkout.supportCardApplied') || 'Support Card Applied'}
                      </Text>
                    </View>

                    {/* Card Details Box */}
                    <View style={styles.cardInfo}>
                      <View style={[rowStyle, styles.infoRow]}>
                        <Text style={[styles.infoLabel, alignText]}>
                          {t('checkout.cardCode') || 'Code'}:
                        </Text>
                        <Text style={styles.infoValue}>{context.supportCard.code}</Text>
                      </View>

                      <View style={[rowStyle, styles.infoRow]}>
                        <Text style={[styles.infoLabel, alignText]}>
                          {t('checkout.cardValue') || 'Card Value'}:
                        </Text>
                        <RiyalText text={context.supportCard.fullValue?.toFixed(2)} textStyle={styles.infoValue} size={12} />
                      </View>

                      <View style={[rowStyle, styles.infoRow]}>
                        <Text style={[styles.infoLabel, alignText]}>
                          {t('checkout.appliedToOrder') || 'Applied to Order'}:
                        </Text>
                        <RiyalText text={context.supportCard.amount?.toFixed(2)} textStyle={[styles.infoValue, { color: COLORS.success, fontWeight: 'bold' }]} size={12} />
                      </View>

                      {context.supportCard.leftoverToWallet > 0 && (
                        <View style={[rowStyle, styles.infoRow, { backgroundColor: COLORS.promo1, padding: 8, borderRadius: 8, marginTop: 5 }]}>
                          <Text style={[styles.infoLabel, alignText, { color: COLORS.primary, fontWeight: '600' }]}>
                            {t('checkout.leftoverToWallet') || 'Leftover to Wallet'}:
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={[styles.infoValue, { color: COLORS.primary, fontWeight: 'bold', marginRight: 5 }]}>+</Text>
                            <RiyalText text={context.supportCard.leftoverToWallet?.toFixed(2)} textStyle={[styles.infoValue, { color: COLORS.primary, fontWeight: 'bold' }]} size={12} />
                          </View>
                        </View>
                      )}
                    </View>

                    {/* Info Message */}
                    {context.supportCard.leftoverToWallet > 0 && (
                      <Text style={[styles.infoMessage, alignText]}>
                        ℹ️ {t('checkout.leftoverWalletInfo') || 'The remaining balance will be added to your wallet after payment.'}
                      </Text>
                    )}

                    {/* Remove Button */}
                    <TouchableOpacity
                      style={styles.removeCardBtn}
                      onPress={actions.removeSupportCard}
                      disabled={isProcessing}
                    >
                      <Text style={styles.removeCardText}>
                        {t('common.remove') || 'Remove'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* 5. Cancellation Policy */}
          <View style={styles.section}>
             <CancellationPolicy />
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <View style={[rowStyle, { justifyContent: 'space-between', marginBottom: 5 }]}>
          <Text style={{ color: COLORS.textSecondary }}>{t('checkout.subtotal') || "Subtotal"}</Text>
          <RiyalText text={priceCalculation.basePrice} textStyle={{ fontSize: 14, color: COLORS.textSecondary }} size={12} />
        </View>

        {priceCalculation.discountAmount > 0 && (
            <View style={[rowStyle, { justifyContent: 'space-between', marginBottom: 5, alignItems: 'center' }]}>
                <Text style={{ color: COLORS.success }}>{t('checkout.discount') || "Discount"}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 14, color: COLORS.success, marginRight: 5 }}>-</Text>
                    <RiyalText text={priceCalculation.discountAmount.toFixed(2)} textStyle={{ fontSize: 14, color: COLORS.success }} size={12} />
                </View>
            </View>
        )}

        {priceCalculation.supportCardAmount > 0 && (
            <View style={[rowStyle, { justifyContent: 'space-between', marginBottom: 5, alignItems: 'center' }]}>
                <Text style={{ color: COLORS.success }}>{t('checkout.supportCard') || "Support Card"}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 14, color: COLORS.success, marginRight: 5 }}>-</Text>
                    <RiyalText text={priceCalculation.supportCardAmount.toFixed(2)} textStyle={{ fontSize: 14, color: COLORS.success }} size={12} />
                </View>
            </View>
        )}

        {priceCalculation.taxAmount > 0 && (
            <View style={[rowStyle, { justifyContent: 'space-between', marginBottom: 5, alignItems: 'center' }]}>
                <Text style={{ color: COLORS.textSecondary }}>{t('checkout.tax') || "Tax"}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 14, color: COLORS.textSecondary, marginRight: 5 }}>+</Text>
                    <RiyalText text={priceCalculation.taxAmount.toFixed(2)} textStyle={{ fontSize: 14, color: COLORS.textSecondary }} size={12} />
                </View>
            </View>
        )}

        <View style={[styles.divider, { marginVertical: 10 }]} />

        <View style={[rowStyle, { justifyContent: 'space-between', marginBottom: 15 }]}>
          <Text style={{ color: COLORS.textPrimary, fontWeight: 'bold', fontSize: 16 }}>{t('checkout.orderTotal') || "Order Total"}</Text>
          <RiyalText text={priceCalculation.payableAmount.toFixed(2)} textStyle={{ fontWeight: 'bold', fontSize: 20, color: COLORS.primary }} size={16} />
        </View>

        <TouchableOpacity 
            style={[styles.payBtn, isProcessing && { backgroundColor: COLORS.gray500 }]} 
            onPress={handleProceed}
            disabled={isProcessing}
        >
          <Text style={styles.payBtnText}>
            {isProcessing ? (t('common.processing') || 'Processing...') : (context.paymentMethod === 'card' ? (t('checkout.proceedToPayment') || 'Proceed to Payment') : (t('checkout.confirmAndPay') || 'Confirm & Pay'))}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Card Style
  card: { backgroundColor: COLORS.white, borderRadius: 16, padding: 20, marginBottom: 20, shadowColor: COLORS.shadow, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  cardTitle: { fontSize: 12, color: COLORS.gray500, marginBottom: 15, fontWeight: '600' },

  docRow: { alignItems: 'center' },
  smAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.gray200 },
  boldText: { fontWeight: 'bold', color: COLORS.textPrimary, fontSize: 15 },
  grayText: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  tealText: { fontSize: 12, color: COLORS.primary, fontWeight: 'bold', marginTop: 4 },
  price: { fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary },

  section: { marginBottom: 20 },
  label: { fontWeight: '600', marginBottom: 10, color: COLORS.textPrimary, fontSize: 14 },
  labelSmall: { fontSize: 12, color: COLORS.primary, marginBottom: 6, fontWeight: '600' },

  // Inputs
  inputArea: { backgroundColor: COLORS.white, borderRadius: 12, padding: 15, height: 80, textAlignVertical: 'top', borderWidth: 1, borderColor: COLORS.border, color: COLORS.textPrimary },
  reasonText: { fontSize: 14, color: COLORS.textPrimary, lineHeight: 20 },

  // New Input Row Styles (Promo & Support)
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingRight: 8, height: 50 },
  inputIcon: { width: 18, height: 18, tintColor: COLORS.gray500 },
  flexInput: { flex: 1, paddingHorizontal: 10, color: COLORS.textPrimary, height: '100%' },
  
  applyBtn: { backgroundColor: COLORS.gray800, paddingVertical: 8, paddingHorizontal: 15, borderRadius: 8 },
  checkBtn: { backgroundColor: COLORS.primary, paddingVertical: 8, paddingHorizontal: 15, borderRadius: 8, minWidth: 70, alignItems: 'center' },
  applyBtnText: { color: COLORS.white, fontSize: 12, fontWeight: 'bold' },
  successText: { color: COLORS.success, fontSize: 12, marginTop: 5, fontWeight: '600' },

  // Payment Options
  payOption: { backgroundColor: COLORS.white, padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  payOptionActive: { borderColor: COLORS.primary, backgroundColor: COLORS.highlight },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: COLORS.disabled, marginRight: 10 },
  radioActive: { borderColor: COLORS.primary, borderWidth: 6 },
  payIcon: { width: 24, height: 24, resizeMode: 'contain' },
  payLabel: { fontWeight: 'bold', color: COLORS.textPrimary },
  paySub: { fontSize: 10, color: COLORS.textSecondary },

  // Support Animation Box
  supportContainer: { backgroundColor: COLORS.highlight, padding: 15, borderRadius: 12, marginTop: -5, marginBottom: 10, borderWidth: 1, borderColor: COLORS.primary, borderTopWidth: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 },

  // Support Card Details Display
  supportCardDetails: {
    backgroundColor: '#f0fff4',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.success,
    flex: 1,
  },
  cardInfo: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
  },
  infoRow: {
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  infoLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  infoMessage: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: 5,
    lineHeight: 16,
  },
  removeCardBtn: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fed7d7',
    borderRadius: 8,
    alignSelf: 'center',
  },
  removeCardText: {
    color: '#e53e3e',
    fontSize: 12,
    fontWeight: '600',
  },

  // Footer
  footer: { backgroundColor: COLORS.white, paddingTop: 20, paddingHorizontal: 20, borderTopWidth: 1, borderColor: COLORS.gray200, shadowColor: COLORS.shadow, shadowOpacity: 0.05, elevation: 10 },
  divider: { height: 1, backgroundColor: COLORS.gray200 },
  payBtn: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, alignItems: 'center' },
  payBtnText: { color: COLORS.white, fontWeight: 'bold', fontSize: 16 }
});

export default CheckoutScreen;
