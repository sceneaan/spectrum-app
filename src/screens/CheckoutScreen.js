import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, ScrollView, TextInput, TouchableOpacity, Image, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Keyboard
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Header from '../components/Header';
import { AdaptiveContainer, AppText, AppCard, AppButton } from '../components/ui';
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
import { formatLocalizedDate, formatLocalizedTime } from '../utils/formatLocaleDate';
import Skeleton from '../components/Skeleton';

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
  const { data: appointmentStatus, isLoading: appointmentLoading } = useGetAppointmentStatus(routeAppointmentId);
  const { data: providerProfile } = useGetUserProfile(
    appointmentStatus?.provider?._id || appointmentStatus?.provider?.id,
  );
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
  const paymentSuccessHandled = useRef(false);

  // Price calculation
  const priceCalculation = usePriceCalculation({
    appointment: context.appointment,
    userNationality: user?.nationality,
    discountApplied: context.discount,
    supportCardApplied: context.supportCard,
  });

  // Redirect when checkout opened without a valid appointment id
  useEffect(() => {
    if (!routeAppointmentId) {
      Alert.alert(
        t('common.error') || 'Error',
        t('checkout.missingBookingDetails') || 'Appointment not found. Please go back and try again.',
        [{ text: t('common.ok') || 'OK', onPress: () => navigation.goBack() }],
      );
    }
  }, [routeAppointmentId, navigation, t]);

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
      if (paymentSuccessHandled.current) return;
      paymentSuccessHandled.current = true;
      setIsProcessingBooking(false);
      Alert.alert(t('common.success') || 'Success', t('checkout.appointmentBooked') || 'Appointment booked successfully!');
      navigation.replace('PaymentSuccessScreen', { appointment: context.appointment, transactionId: context.transactionId });
    } else if (context.state === 'insufficient_funds') {
      setIsProcessingBooking(false);
      Alert.alert(
        lang?.alerts?.insufficientWalletBalance || 'Insufficient Wallet Balance',
        lang?.alerts?.insufficientWalletBalanceMessage || 'Your wallet balance is insufficient for this payment.'
      );
      actions.retry();
    } else if (context.state === 'error') {
      setIsProcessingBooking(false);
      Alert.alert(t('common.error') || 'Error', t('checkout.paymentFailed') || 'Payment failed. Please try again.');
      actions.retry();
    } else if (context.state === 'idle') {
      paymentSuccessHandled.current = false;
    }
  }, [context.state, context.transactionId, navigation, t, lang, actions]);

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
    if (
      isProcessingBooking
      || isCreatingTransaction
      || paymentSuccessHandled.current
      || context.isLoading
      || context.state === 'processing'
    ) return;

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
                if (paymentSuccessHandled.current) return;
                const transactionId = data?.transaction?._id || data?.transaction?.id;
                if (transactionId) {
                    paymentSuccessHandled.current = true;
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
        actions.executePayment();
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
            <AppText variant="bodyMedium" style={styles.payLabel}>{label}</AppText>
            {subLabel && <AppText variant="caption" style={styles.paySub}>{subLabel}</AppText>}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const isProcessing = context.isLoading || context.state === 'processing' || isProcessingBooking || isCreatingTransaction;
  const showAppointmentLoading = Boolean(routeAppointmentId) && appointmentLoading && !context.appointment;

  if (showAppointmentLoading) {
    return (
      <View style={styles.container}>
        <Header showBack onBack={() => navigation.goBack()} title={t('checkout.title') || 'Checkout'} />
        <View style={{ padding: 20 }}>
          <Skeleton width="100%" height={120} style={{ marginBottom: 16, borderRadius: 12 }} />
          <Skeleton width="100%" height={80} style={{ marginBottom: 16, borderRadius: 12 }} />
          <Skeleton width="100%" height={160} style={{ borderRadius: 12 }} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header showBack onBack={() => navigation.goBack()} title={t('checkout.title') || "Checkout"} />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
          <AdaptiveContainer>
          <AppCard style={{ marginBottom: 20 }}>
            <AppText variant="label" color={COLORS.gray500} style={[styles.cardTitle, alignText]}>{t('checkout.appointmentSummary') || "Appointment Summary"}</AppText>
            <View style={[styles.docRow, rowStyle]}>
              <Image
                source={
                  (providerProfile?.profileImage || context.appointment?.provider?.profileImage || context.appointment?.provider?.user?.profileImage)
                    ? { uri: providerProfile?.profileImage || context.appointment?.provider?.profileImage || context.appointment?.provider?.user?.profileImage }
                    : ICONS.defaultAvatar
                }
                style={styles.smAvatar}
              />
              <View style={{ marginHorizontal: 12, flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <AppText variant="bodyMedium" style={styles.boldText}>
                  {i18n.language === 'ar'
                    ? (context.appointment?.provider?.fullNameArabic || context.appointment?.provider?.fullName || context.appointment?.providerName || 'طبيب غير معروف')
                    : (context.appointment?.provider?.fullNameEnglish || context.appointment?.provider?.fullName || context.appointment?.providerName || 'Unknown Doctor')
                  }
                </AppText>
                <AppText variant="caption" color={COLORS.textSecondary} style={{ marginTop: 2 }}>
                  {i18n.language === 'ar'
                    ? (context.appointment?.providerService?.service?.nameArabic || context.appointment?.serviceName || 'غير محدد')
                    : (context.appointment?.providerService?.service?.nameEnglish || context.appointment?.serviceName || 'Not specified')
                  }
                </AppText>
                <AppText variant="caption" color={COLORS.primary} style={styles.tealText}>
                  {context.appointment?.startTime
                    ? `${formatLocalizedDate(context.appointment.startTime, 'MMM D, YYYY', isRTL)} • ${formatLocalizedTime(context.appointment.startTime, 'h:mm A', isRTL)}`
                    : ''}
                </AppText>
              </View>
              <RiyalText text={priceCalculation.basePrice} textStyle={styles.price} size={14} />
            </View>
          </AppCard>


          {/* 3. Discount Code Section */}
          <View style={styles.section}>
            <AppText variant="label" style={[styles.label, alignText]}>{t('checkout.discountCode') || "Discount Code"}</AppText>
            <View style={[styles.inputRow, rowStyle]}>
                <Image source={ICONS.gift} style={[styles.inputIcon, isRTL ? { marginLeft: 10 } : { marginRight: 10 }]} />
                <TextInput 
                    style={[styles.flexInput, alignText]}
                    placeholder={t('checkout.enterPromoCode') || "Enter Promo Code"}
                    value={promoCodeInput}
                    onChangeText={setPromoCodeInput}
                    placeholderTextColor={COLORS.gray500}
                    editable={!isProcessing && !context.discount}
                    accessibilityLabel={t('checkout.enterPromoCode') || 'Enter Promo Code'}
                />
                <TouchableOpacity
                    style={[styles.applyBtn, context.discount && { backgroundColor: COLORS.success }]}
                    onPress={context.discount ? handleRemoveDiscount : handleApplyPromo}
                    disabled={isProcessing || isApplyingDiscount}
                >
                     {isApplyingDiscount ? (
                        <ActivityIndicator size="small" color="white" />
                     ) : (
                        <AppText variant="button" style={styles.applyBtnText}>
                            {context.discount ? (t('checkout.remove') || 'Remove') : (t('checkout.apply') || 'Apply')}
                        </AppText>
                     )}
                </TouchableOpacity>
            </View>
            {context.discount && (
                <View style={[styles.successText, alignText, { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }]}>
                    <AppText variant="caption" color={COLORS.success}>
                        {t('checkout.youSaved') || "You saved"}{' '}
                    </AppText>
                    <RiyalText text={context.discount.amount} textStyle={{ color: COLORS.success }} size={12} />
                    <AppText variant="caption" color={COLORS.success}>!</AppText>
                </View>
            )}
          </View>

          {/* 4. Payment Method Selection */}
          <View style={styles.section}>
            <AppText variant="label" style={[styles.label, alignText]}>{t('checkout.paymentMethod') || "Payment Method"}</AppText>

            <PaymentOption id="Wallet" label={t('checkout.payViaWallet') || "Pay via Wallet"} icon={ICONS.wallet} subLabel={`${t('checkout.walletBalance') || "Wallet Balance"}: ${context.wallet?.availableBalance?.toFixed(2) || '0.00'} SAR`} />
            <PaymentOption id="card" label={t('checkout.payViaCard') || "Pay via Card"} icon={ICONS.creditCard} />
            <PaymentOption id="support" label={t('checkout.payViaSupport') || "Pay via Support Card"} icon={ICONS.gift} />

            {/* Conditional Support Input with CHECK Button */}
            {context.paymentMethod === 'support' && (
              <View style={styles.supportContainer}>
                <AppText variant="label" color={COLORS.primary} style={[styles.labelSmall, alignText]}>{t('checkout.enterVoucher') || "Enter Voucher / Card Number"}</AppText>
                
                <View style={[styles.inputRow, rowStyle]}>
                    <TextInput
                        style={[styles.flexInput, alignText]}
                        placeholder={t('checkout.supportCardPlaceholder') || "XXXX-XXXX-XXXX"}
                        value={supportCardInput}
                        onChangeText={setSupportCardInput}
                        autoCapitalize="characters"
                        placeholderTextColor={COLORS.gray500}
                        editable={!isProcessing && !context.supportCard}
                        accessibilityLabel={t('checkout.supportCardPlaceholder') || 'Support card number'}
                    />
                    <TouchableOpacity 
                        style={[styles.checkBtn, context.supportCard && { backgroundColor: COLORS.success }]} 
                        onPress={context.supportCard ? actions.removeSupportCard : handleCheckSupport}
                        disabled={isProcessing || isCheckingSupport}
                    >
                        {isCheckingSupport ? (
                            <ActivityIndicator size="small" color="white" />
                        ) : (
                            <AppText variant="button" style={styles.applyBtnText}>
                                {context.supportCard ? (t('common.remove') || 'Remove') : (t('common.check') || 'Check')}
                            </AppText>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Support Card Details Display */}
                {context.supportCard && (
                  <View style={[styles.supportCardDetails, { marginTop: 10 }]}>
                    {/* Success Icon & Title */}
                    <View style={[rowStyle, { alignItems: 'center', marginBottom: 10 }]}>
                      <AppText style={{ fontSize: 20, marginRight: isRTL ? 0 : 8, marginLeft: isRTL ? 8 : 0, color: COLORS.success }}>✓</AppText>
                      <AppText variant="bodyMedium" color={COLORS.success} style={[styles.successTitle, alignText]}>
                        {t('checkout.supportCardApplied') || 'Support Card Applied'}
                      </AppText>
                    </View>

                    {/* Card Details Box */}
                    <View style={styles.cardInfo}>
                      <View style={[rowStyle, styles.infoRow]}>
                        <AppText variant="caption" color={COLORS.textSecondary} style={[styles.infoLabel, alignText]}>
                          {t('checkout.cardCode') || 'Code'}:
                        </AppText>
                        <AppText variant="bodySmall" style={styles.infoValue}>{context.supportCard.code}</AppText>
                      </View>

                      <View style={[rowStyle, styles.infoRow]}>
                        <AppText variant="caption" color={COLORS.textSecondary} style={[styles.infoLabel, alignText]}>
                          {t('checkout.cardValue') || 'Card Value'}:
                        </AppText>
                        <RiyalText text={context.supportCard.fullValue?.toFixed(2)} textStyle={styles.infoValue} size={12} />
                      </View>

                      <View style={[rowStyle, styles.infoRow]}>
                        <AppText variant="caption" color={COLORS.textSecondary} style={[styles.infoLabel, alignText]}>
                          {t('checkout.appliedToOrder') || 'Applied to Order'}:
                        </AppText>
                        <RiyalText text={context.supportCard.amount?.toFixed(2)} textStyle={[styles.infoValue, { color: COLORS.success, fontWeight: 'bold' }]} size={12} />
                      </View>

                      {context.supportCard.leftoverToWallet > 0 && (
                        <View style={[rowStyle, styles.infoRow, { backgroundColor: COLORS.promo1, padding: 8, borderRadius: 8, marginTop: 5 }]}>
                          <AppText variant="caption" color={COLORS.primary} style={[styles.infoLabel, alignText, { fontWeight: '600' }]}>
                            {t('checkout.leftoverToWallet') || 'Leftover to Wallet'}:
                          </AppText>
                          <View style={[rowStyle, { alignItems: 'center' }]}>
                            <AppText variant="bodySmall" color={COLORS.primary} style={[styles.infoValue, { fontWeight: 'bold', marginEnd: 5 }]}>+</AppText>
                            <RiyalText text={context.supportCard.leftoverToWallet?.toFixed(2)} textStyle={[styles.infoValue, { color: COLORS.primary, fontWeight: 'bold' }]} size={12} />
                          </View>
                        </View>
                      )}
                    </View>

                    {/* Info Message */}
                    {context.supportCard.leftoverToWallet > 0 && (
                      <View style={[rowStyle, { alignItems: 'flex-start', marginTop: 5 }]}>
                        <Image
                          source={ICONS.info}
                          style={{
                            width: 14,
                            height: 14,
                            marginRight: isRTL ? 0 : 6,
                            marginLeft: isRTL ? 6 : 0,
                            marginTop: 1,
                            tintColor: COLORS.textSecondary,
                          }}
                        />
                        <AppText variant="caption" color={COLORS.textSecondary} style={[styles.infoMessage, alignText, { flex: 1 }]}>
                          {t('checkout.leftoverWalletInfo') || 'The remaining balance will be added to your wallet after payment.'}
                        </AppText>
                      </View>
                    )}

                    {/* Remove Button */}
                    <TouchableOpacity
                      style={styles.removeCardBtn}
                      onPress={actions.removeSupportCard}
                      disabled={isProcessing}
                    >
                      <AppText variant="caption" color={COLORS.danger} style={styles.removeCardText}>
                        {t('common.remove') || 'Remove'}
                      </AppText>
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

          </AdaptiveContainer>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <View style={[rowStyle, { justifyContent: 'space-between', marginBottom: 5 }]}>
          <AppText variant="bodySmall" color={COLORS.textSecondary}>{t('checkout.subtotal') || "Subtotal"}</AppText>
          <RiyalText text={priceCalculation.basePrice} textStyle={{ fontSize: 14, color: COLORS.textSecondary }} size={12} />
        </View>

        {priceCalculation.discountAmount > 0 && (
            <View style={[rowStyle, { justifyContent: 'space-between', marginBottom: 5, alignItems: 'center' }]}>
                <AppText variant="bodySmall" color={COLORS.success}>{t('checkout.discount') || "Discount"}</AppText>
                <View style={[rowStyle, { alignItems: 'center' }]}>
                    <AppText variant="bodySmall" color={COLORS.success} style={{ marginEnd: 5 }}>-</AppText>
                    <RiyalText text={priceCalculation.discountAmount.toFixed(2)} textStyle={{ fontSize: 14, color: COLORS.success }} size={12} />
                </View>
            </View>
        )}

        {priceCalculation.supportCardAmount > 0 && (
            <View style={[rowStyle, { justifyContent: 'space-between', marginBottom: 5, alignItems: 'center' }]}>
                <AppText variant="bodySmall" color={COLORS.success}>{t('checkout.supportCard') || "Support Card"}</AppText>
                <View style={[rowStyle, { alignItems: 'center' }]}>
                    <AppText variant="bodySmall" color={COLORS.success} style={{ marginEnd: 5 }}>-</AppText>
                    <RiyalText text={priceCalculation.supportCardAmount.toFixed(2)} textStyle={{ fontSize: 14, color: COLORS.success }} size={12} />
                </View>
            </View>
        )}

        {priceCalculation.taxAmount > 0 && (
            <View style={[rowStyle, { justifyContent: 'space-between', marginBottom: 5, alignItems: 'center' }]}>
                <AppText variant="bodySmall" color={COLORS.textSecondary}>{t('checkout.tax') || "Tax"}</AppText>
                <View style={[rowStyle, { alignItems: 'center' }]}>
                    <AppText variant="bodySmall" color={COLORS.textSecondary} style={{ marginEnd: 5 }}>+</AppText>
                    <RiyalText text={priceCalculation.taxAmount.toFixed(2)} textStyle={{ fontSize: 14, color: COLORS.textSecondary }} size={12} />
                </View>
            </View>
        )}

        <View style={[styles.divider, { marginVertical: 10 }]} />

        <View style={[rowStyle, { justifyContent: 'space-between', marginBottom: 15 }]}>
          <AppText variant="bodyMedium" style={{ fontWeight: 'bold' }}>{t('checkout.orderTotal') || "Order Total"}</AppText>
          <RiyalText text={priceCalculation.payableAmount.toFixed(2)} textStyle={{ fontWeight: 'bold', fontSize: 20, color: COLORS.primary }} size={16} />
        </View>

        <AppButton
            title={context.paymentMethod === 'card' ? (t('checkout.proceedToPayment') || 'Proceed to Payment') : (t('checkout.confirmAndPay') || 'Confirm & Pay')}
            onPress={handleProceed}
            disabled={isProcessing}
            loading={isProcessing}
            accessibilityLabel={context.paymentMethod === 'card' ? (t('checkout.proceedToPayment') || 'Proceed to Payment') : (t('checkout.confirmAndPay') || 'Confirm and Pay')}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  cardTitle: { marginBottom: 15 },

  docRow: { alignItems: 'center' },
  smAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.gray200 },
  boldText: { fontWeight: 'bold' },
  tealText: { fontWeight: 'bold', marginTop: 4 },
  price: { fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary },

  section: { marginBottom: 20 },
  label: { marginBottom: 10 },
  labelSmall: { marginBottom: 6 },

  // Inputs
  inputArea: { backgroundColor: COLORS.white, borderRadius: 12, padding: 15, height: 80, textAlignVertical: 'top', borderWidth: 1, borderColor: COLORS.border, color: COLORS.textPrimary },
  reasonText: { fontSize: 14, color: COLORS.textPrimary, lineHeight: 20 },

  // New Input Row Styles (Promo & Support)
  inputRow: { alignItems: 'center', backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingEnd: 8, height: 50 },
  inputIcon: { width: 18, height: 18, tintColor: COLORS.gray500 },
  flexInput: { flex: 1, paddingHorizontal: 10, color: COLORS.textPrimary, height: '100%' },
  
  applyBtn: { backgroundColor: COLORS.gray800, paddingVertical: 8, paddingHorizontal: 15, borderRadius: 8 },
  checkBtn: { backgroundColor: COLORS.primary, paddingVertical: 8, paddingHorizontal: 15, borderRadius: 8, minWidth: 70, alignItems: 'center' },
  applyBtnText: { color: COLORS.white },
  successText: { marginTop: 5 },

  // Payment Options
  payOption: { backgroundColor: COLORS.white, padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  payOptionActive: { borderColor: COLORS.primary, backgroundColor: COLORS.highlight },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: COLORS.disabled, marginEnd: 10 },
  radioActive: { borderColor: COLORS.primary, borderWidth: 6 },
  payIcon: { width: 24, height: 24, resizeMode: 'contain' },
  payLabel: {},
  paySub: { marginTop: 2 },

  // Support Animation Box
  supportContainer: { backgroundColor: COLORS.highlight, padding: 15, borderRadius: 12, marginTop: -5, marginBottom: 10, borderWidth: 1, borderColor: COLORS.primary, borderTopWidth: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 },

  // Support Card Details Display
  supportCardDetails: {
    backgroundColor: COLORS.secureBg,
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  successTitle: {
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
  infoLabel: {},
  infoValue: {
    fontWeight: '600',
  },
  infoMessage: {
    fontStyle: 'italic',
    lineHeight: 16,
  },
  removeCardBtn: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.errorBg,
    borderRadius: 8,
    alignSelf: 'center',
  },
  removeCardText: {
    fontWeight: '600',
  },

  // Footer
  footer: { backgroundColor: COLORS.white, paddingTop: 20, paddingHorizontal: 20, borderTopWidth: 1, borderColor: COLORS.gray200, shadowColor: COLORS.shadow, shadowOpacity: 0.05, elevation: 10 },
  divider: { height: 1, backgroundColor: COLORS.gray200 },
});

export default CheckoutScreen;
