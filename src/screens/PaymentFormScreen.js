import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
  BackHandler,
  NativeModules,
  NativeEventEmitter,
  InteractionManager,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import COLORS from '../constants/colors';
import ICONS from '../constants/icons';
import {
  useCreateSupportCardCheckout,
  useCreateCheckoutWithoutShopperUrl,
  CheckPaymentStatus,
  checkSupportCardStatus,
} from '../api/services/Payment.Service';
import * as Sentry from '@sentry/react-native';

const { Hyperpay: HyperPayModule } = NativeModules;
const HyperPayModuleFinal = HyperPayModule;

// Pre-initialize event emitter to avoid freeze on first use
let hyperPayEventEmitter = null;
const getHyperPayEventEmitter = () => {
  if (!hyperPayEventEmitter && HyperPayModuleFinal) {
    hyperPayEventEmitter = new NativeEventEmitter(HyperPayModuleFinal);
  }
  return hyperPayEventEmitter;
};

const CARD_PATTERNS = {
  VISA: /^4[0-9]{0,15}$/,
  MASTER: /^5[1-5][0-9]{0,14}$/,
};

const MADA_BINS = [
  '400861', '401757', '407197', '407395', '409201', '410685', '417633', '419593',
  '422817', '422818', '422819', '428331', '428671', '428672', '428673', '431361',
  '432328', '434107', '439954', '440533', '440647', '440795', '445564', '446393',
  '446404', '446672', '455036', '455708', '457865', '458456', '462220', '468540',
  '468541', '468542', '468543', '483010', '483011', '483012', '484783', '486094',
  '486095', '486096', '489317', '489318', '489319', '493428',
  '504300', '508160', '513213', '521076', '524130', '524514', '529415', '529741',
  '530111', '530906', '531095', '532013', '535825', '535989', '536023', '537767',
  '539931', '543085', '543357', '549760', '554180', '557606', '558848', '585265',
  '588884', '588885', '588886', '589005', '589206', '604906', '605141', '636120',
  '968201', '968202', '968203', '968204', '968205', '968206', '968207', '968208',
  '968209', '968210', '968211',
];

const isMadaCard = (number) => {
  const cleanNumber = number.replace(/\s/g, '');
  return MADA_BINS.some(bin => cleanNumber.startsWith(bin));
};

const PaymentFormScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { t, i18n } = useTranslation(); // Updated for spectrum-app3 pattern
  const isRTL = i18n.dir() === 'rtl'; // Updated for spectrum-app3 pattern

  const { amount, paymentMethod, originScreen, paymentType, payload } = route.params || {};

  const [checkoutId, setCheckoutId] = useState(null);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);

  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [cvv, setCvv] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('VISA');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStatusChecking, setIsStatusChecking] = useState(false);
  const [cardHolderError, setCardHolderError] = useState('');
  const [isFormReady, setIsFormReady] = useState(false);
  const [detectedBrand, setDetectedBrand] = useState(null); // For showing detected brand

  const cardNumberRef = useRef(null);
  const cardHolderRef = useRef(null);
  const expiryMonthRef = useRef(null);
  const expiryYearRef = useRef(null);
  const cvvRef = useRef(null);
  const isMountedRef = useRef(true);

  // Hooks for creating checkouts
  const { mutate: createSupportCardCheckoutMutation } = useCreateSupportCardCheckout();
  const { mutate: createAppointmentCheckoutMutation } = useCreateCheckoutWithoutShopperUrl();

  // Effect to update form readiness
  useEffect(() => {
    const { valid } = validateForm();
    setIsFormReady(valid);
  }, [cardNumber, cardHolder, expiryMonth, expiryYear, cvv]);

  // Effect to create checkout ID when component mounts or selectedBrand changes
  useEffect(() => {
    if (!amount || !paymentType || !payload) {
      setCheckoutError(t('payment.missingPaymentDetails') || "Missing payment details");
      return;
    }

    // Only create checkout session automatically for Apple Pay
    if (paymentMethod !== 'Apple Pay') {
      setCheckoutId(null); // Ensure checkoutId is null for card payments until submit
      setIsCheckoutLoading(false);
      return;
    }

    const createNewCheckoutSession = () => {
      setIsCheckoutLoading(true);
      setCheckoutError(null);
      setCheckoutId(null); // Clear previous checkoutId

      // Map frontend brand to backend payment method
      let backendPaymentMethod = selectedBrand; 
      if (selectedBrand === 'VISA' || selectedBrand === 'MASTER') {
        backendPaymentMethod = 'VISA_MASTERCARD';
      } else if (paymentMethod === 'Apple Pay') {
        backendPaymentMethod = 'apple_pay';
      }

      const commonCheckoutPayload = {
        ...payload, 
        amount: amount,
        paymentMethod: backendPaymentMethod.toLowerCase(), 
      };

      const callbacks = {
        onSuccess: (data) => {
          console.log('Checkout session created:', data);
          if (data.id) {
            setCheckoutId(data.id);
          } else {
            setCheckoutError(t('payment.invalidCheckoutResponse') || "Invalid checkout response");
          }
          setIsCheckoutLoading(false);
        },
        onError: (err) => {
          console.error('Error creating checkout session:', err);
          setCheckoutError(err.message || t('payment.failedToCreateSession') || "Failed to create session");
          setIsCheckoutLoading(false);
        },
      };

      switch (paymentType) {
        case 'support_card':
          createSupportCardCheckoutMutation(commonCheckoutPayload, callbacks);
          break;
        case 'appointment':
          createAppointmentCheckoutMutation(commonCheckoutPayload, callbacks);
          break;
        default:
          setCheckoutError(`${t('payment.unknownPaymentType') || "Unknown Type"}: ${paymentType}`);
          setIsCheckoutLoading(false);
          break;
      }
    };

    createNewCheckoutSession();
  }, [selectedBrand, amount, paymentType, payload, paymentMethod]);


  useEffect(() => {
    const backAction = () => {
      handleBack();
      return true; 
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, []);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Pre-initialize HyperPay event emitter on mount to avoid freeze
  useEffect(() => {
    InteractionManager.runAfterInteractions(() => {
      getHyperPayEventEmitter();
    });
  }, []);

  useEffect(() => {
    setTimeout(() => {
      if (paymentMethod !== 'Apple Pay') {
        cardNumberRef.current?.focus();
      }
    }, 300);
  }, [paymentMethod]);

  // Handle card number input
  const handleCardNumberChange = (text) => {
    const sanitized = text.replace(/[^0-9]/g, '');
    const formatted = sanitized.replace(/(.{4})/g, '$1 ').trim();
    setCardNumber(formatted);

    // Auto-detect and set card brand (real-time detection)
    if (sanitized.length >= 6) {
      let brand = null;
      if (isMadaCard(sanitized)) {
        brand = 'MADA';
        setSelectedBrand('MADA');
      } else if (CARD_PATTERNS.VISA.test(sanitized)) {
        brand = 'VISA';
        setSelectedBrand('VISA');
      } else if (CARD_PATTERNS.MASTER.test(sanitized)) {
        brand = 'MASTER';
        setSelectedBrand('MASTER');
      }
      setDetectedBrand(brand);
    } else {
      setDetectedBrand(null);
    }

    if (sanitized.length === 16) {
      cardHolderRef.current?.focus();
    }
  };

  // Validate form
  const validateForm = () => {
    const cleanCardNumber = cardNumber.replace(/\s/g, '');
    
    if (cleanCardNumber.length !== 16) {
      return { valid: false, error: t('payment.invalidCardNumber') || "Invalid Card Number" };
    }

    if (!cardHolder.trim() || cardHolder.trim().length < 3) {
      return { valid: false, error: t('payment.invalidCardHolder') || "Invalid Card Holder" };
    }

    const monthNum = parseInt(expiryMonth);
    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return { valid: false, error: t('payment.invalidExpiryMonth') || "Invalid Month" };
    }

    const yearNum = parseInt(expiryYear);
    const currentYear = new Date().getFullYear() % 100;
    if (isNaN(yearNum) || yearNum < currentYear) {
      return { valid: false, error: t('payment.invalidExpiryYear') || "Invalid Year" };
    }

    if (cvv.length < 3) {
      return { valid: false, error: t('payment.invalidCVV') || "Invalid CVV" };
    }

    return { valid: true };
  };

  // Handle Apple Pay
  const handleApplePaySubmit = async () => {
    if (isSubmitting || isStatusChecking) {
      return;
    }

    console.log('🍎 [Apple Pay] Starting Apple Pay flow...');

    // Start Sentry transaction for Apple Pay
    const transaction = Sentry.startSpan({
      name: 'apple_pay_payment',
      op: 'payment',
    }, () => {});

    Sentry.addBreadcrumb({
      category: 'payment',
      message: 'Apple Pay flow started',
      level: 'info',
      data: { paymentType, amount },
    });

    setIsSubmitting(true);
    setCheckoutError(null);

    // Use InteractionManager to avoid blocking UI thread
    InteractionManager.runAfterInteractions(async () => {
      try {
        // Step 1: Create Checkout Session for Apple Pay with timeout
        console.log('🍎 [Apple Pay] Creating checkout session...');
        const newCheckoutId = await Promise.race([
          new Promise((resolve, reject) => {
            const commonCheckoutPayload = {
              ...payload,
              amount: amount,
              paymentMethod: 'apple_pay',
            };

            const callbacks = {
              onSuccess: (data) => {
                Sentry.addBreadcrumb({
                  category: 'payment',
                  message: 'Apple Pay checkout session created',
                  level: 'info',
                  data: { checkoutId: data.id },
                });
                if (data.id) {
                  resolve(data.id);
                } else {
                  reject(new Error(t('payment.invalidCheckoutResponse') || "Invalid response"));
                }
              },
              onError: (err) => {
                console.error('🍎 [Apple Pay] Checkout session creation failed:', err);
                Sentry.captureException(err, {
                  tags: { payment_method: 'apple_pay', stage: 'checkout_creation' },
                  extra: { paymentType, amount, payload },
                });
                reject(err.message ? new Error(err.message) : new Error(t('payment.failedToCreateSession') || "Failed session"));
              },
            };

            switch (paymentType) {
              case 'support_card':
                createSupportCardCheckoutMutation(commonCheckoutPayload, callbacks);
                break;
              case 'appointment':
                createAppointmentCheckoutMutation(commonCheckoutPayload, callbacks);
                break;
              default:
                reject(new Error(`${t('payment.unknownPaymentType')}: ${paymentType}`));
                break;
            }
          }),
          new Promise((_, reject) =>
            setTimeout(() => {
              Sentry.captureMessage('Apple Pay Checkout Session Timeout', {
                level: 'error',
                tags: { payment_method: 'apple_pay', stage: 'checkout_timeout' },
                extra: { paymentType, amount, payload, timeout_duration: '90s' },
              });
              reject(new Error(t('payment.checkoutTimeout') || 'Checkout session timeout. Please try again.'));
            }, 90000)
          )
        ]);

        if (!isMountedRef.current) {
          setIsSubmitting(false);
          return;
        }

        // Step 2: Call HyperPay SDK with the new checkoutId
        console.log('🍎 [Apple Pay] Checkout ID received:', newCheckoutId);
        console.log('🍎 [Apple Pay] Setting up HyperPay SDK event listener...');

        // Use pre-initialized event emitter to avoid freeze
        const eventEmitter = getHyperPayEventEmitter();
        if (!eventEmitter) {
          throw new Error('Payment module not available');
        }
        let timeoutId = null;

        const subscription = eventEmitter.addListener('PaymentStatusEvent', async (event) => {
          console.log('🍎 [Apple Pay] PaymentStatusEvent received:', JSON.stringify(event, null, 2));

          if (timeoutId) clearTimeout(timeoutId);
          subscription.remove();
          if (!isMountedRef.current) return;

          if (event.status === 'applepay_success') {
            setIsSubmitting(false);
            setIsStatusChecking(true);

            try {
              // Step 3: Call backend to verify payment status
              const statusPayload = {
                checkoutId: event.checkoutID || newCheckoutId,
                paymentMethod: 'apple_pay', // Apple Pay always uses apple_pay payment method
                ...payload,
              };

              console.log('[PaymentForm] Apple Pay status check payload:', JSON.stringify(statusPayload, null, 2));

              let statusResult;
              switch (paymentType) {
                case 'support_card':
                  statusResult = await checkSupportCardStatus(statusPayload);
                  break;
                case 'appointment':
                  statusResult = await CheckPaymentStatus(statusPayload);
                  break;
                default:
                  throw new Error(`Unknown payment type for status check: ${paymentType}`);
              }

              if (!isMountedRef.current) return;
              setIsStatusChecking(false);

              // Step 4: Navigate to the correct success screen
              if (statusResult.success) {
                handleSuccess(paymentType, statusResult.data);
              } else {
                throw new Error(statusResult.message || t('payment.statusVerificationFailed'));
              }
            } catch (statusError) {
              if (!isMountedRef.current) return;
              setIsStatusChecking(false);
              let errorMessage = t('payment.paymentFailed') || "Payment Failed";
              if (statusError instanceof Error) {
                errorMessage = statusError.message;
              }
              Alert.alert(t('alerts.error') || "Error", errorMessage);
            }
          } else if (event.status === 'apple_pay_cancelled') {
            setIsSubmitting(false);
          } else {
            setIsSubmitting(false);
            Alert.alert(
              t('alerts.error') || "Error",
              event.message || t('payment.paymentFailed') || "Payment Failed"
            );
          }
        });

        // Add timeout for HyperPay SDK response (90 seconds - Apple Pay needs more time)
        timeoutId = setTimeout(() => {
          console.log('🍎 [Apple Pay] Timeout reached - no response from HyperPay SDK');

          // Capture timeout error in Sentry
          Sentry.captureMessage('Apple Pay SDK Timeout - No response from HyperPay', {
            level: 'error',
            tags: {
              payment_method: 'apple_pay',
              stage: 'sdk_timeout',
              timeout_duration: '90s',
            },
            extra: {
              checkoutId: newCheckoutId,
              paymentType,
              amount,
              payload,
              platform: Platform.OS,
              platformVersion: Platform.Version,
            },
          });

          subscription.remove();
          if (isMountedRef.current) {
            setIsSubmitting(false);
            Alert.alert(
              t('alerts.error') || "Error",
              t('payment.applePayTimeout') || 'Apple Pay timed out. Please try again.'
            );
          }
        }, 90000);

        // Call HyperPay SDK
        try {
          // Ensure amount is a number (NSNumber) - not a string
          const numericAmount = parseFloat(amount) || 0;
          console.log('🍎 [Apple Pay] Calling HyperPay ApplepayPayments with checkoutId:', newCheckoutId, 'amount:', numericAmount);

          Sentry.addBreadcrumb({
            category: 'payment',
            message: 'Calling HyperPay Apple Pay SDK',
            level: 'info',
            data: { checkoutId: newCheckoutId, amount: numericAmount },
          });

          HyperPayModuleFinal.ApplepayPayments(newCheckoutId, numericAmount);
        } catch (sdkError) {
          console.error('🍎 [Apple Pay] HyperPay SDK error:', sdkError);

          Sentry.captureException(sdkError, {
            tags: { payment_method: 'apple_pay', stage: 'sdk_call' },
            extra: { checkoutId: newCheckoutId, amount, paymentType },
          });

          if (timeoutId) clearTimeout(timeoutId);
          subscription.remove();
          throw sdkError;
        }
      } catch (error) {
        console.error('🍎 [Apple Pay] Error in Apple Pay flow:', error);

        Sentry.captureException(error, {
          tags: { payment_method: 'apple_pay', stage: 'flow_error' },
          extra: { paymentType, amount, payload },
        });

        if (!isMountedRef.current) return;

        setIsSubmitting(false);
        setIsStatusChecking(false);

        const errorMessage = error instanceof Error ? error.message : t('payment.paymentFailed');
        console.error('🍎 [Apple Pay] Showing error to user:', errorMessage);

        Alert.alert(
          t('alerts.error') || "Error",
          errorMessage
        );
      }
    });
  };

  // Handle card payment submit
  const handleSubmit = async () => {
    if (isSubmitting || isStatusChecking) {
      return;
    }

    Keyboard.dismiss();

    const validation = validateForm();
    if (!validation.valid) {
      Alert.alert(t('alerts.error') || "Error", validation.error);
      return;
    }

    // Start Sentry tracking for card payment
    Sentry.addBreadcrumb({
      category: 'payment',
      message: 'Card payment flow started',
      level: 'info',
      data: { paymentType, amount, cardBrand: selectedBrand },
    });

    setIsSubmitting(true);
    setCheckoutError(null);

    try {
      // Step 1: Create Checkout Session with timeout
      const newCheckoutId = await Promise.race([
        new Promise((resolve, reject) => {
          let backendPaymentMethod = selectedBrand;
          if (selectedBrand === 'VISA' || selectedBrand === 'MASTER') {
            backendPaymentMethod = 'VISA_MASTERCARD';
          }

          const commonCheckoutPayload = {
            ...payload,
            amount: amount,
            paymentMethod: backendPaymentMethod.toLowerCase(),
          };

          const callbacks = {
            onSuccess: (data) => {
              Sentry.addBreadcrumb({
                category: 'payment',
                message: 'Card checkout session created',
                level: 'info',
                data: { checkoutId: data.id, cardBrand: selectedBrand },
              });
              if (data.id) {
                resolve(data.id);
              } else {
                reject(new Error(t('payment.invalidCheckoutResponse') || "Invalid Response"));
              }
            },
            onError: (err) => {
              Sentry.captureException(err, {
                tags: { payment_method: 'card', stage: 'checkout_creation', card_brand: selectedBrand },
                extra: { paymentType, amount, payload },
              });
              reject(err.message ? new Error(err.message) : new Error(t('payment.failedToCreateSession') || "Failed session"));
            },
          };

          switch (paymentType) {
            case 'support_card':
              createSupportCardCheckoutMutation(commonCheckoutPayload, callbacks);
              break;
            case 'appointment':
              createAppointmentCheckoutMutation(commonCheckoutPayload, callbacks);
              break;
            default:
              reject(new Error(`${t('payment.unknownPaymentType')}: ${paymentType}`));
              break;
          }
        }),
        new Promise((_, reject) =>
          setTimeout(() => {
            Sentry.captureMessage('Card Payment Checkout Session Timeout', {
              level: 'error',
              tags: { payment_method: 'card', stage: 'checkout_timeout', card_brand: selectedBrand },
              extra: { paymentType, amount, payload, timeout_duration: '30s' },
            });
            reject(new Error(t('payment.checkoutTimeout') || 'Checkout session timeout. Please try again.'));
          }, 30000)
        )
      ]);

      if (!isMountedRef.current) {
        setIsSubmitting(false);
        return;
      }

      // Step 2: Call HyperPay SDK with the new checkoutId
      const brand = selectedBrand;
      const cleanCardNumber = cardNumber.replace(/\s/g, '');

      const eventEmitter = new NativeEventEmitter(HyperPayModuleFinal);
      let timeoutId = null;

      const subscription = eventEmitter.addListener('PaymentStatusEvent', async (event) => {
        console.log('🟡 [PaymentForm] PaymentStatusEvent received:', event);

        if (timeoutId) clearTimeout(timeoutId);
        subscription.remove();
        if (!isMountedRef.current) return;

        if (event.status === 'success' || event.resourcePath) {
           setIsSubmitting(false);
           setIsStatusChecking(true);
           
           try {
             // Map frontend brand to backend payment method format
            let backendPaymentMethodForStatus = selectedBrand; 
            if (selectedBrand === 'VISA' || selectedBrand === 'MASTER') {
              backendPaymentMethodForStatus = 'VISA_MASTERCARD';
            }

            // Extract checkout ID if contained in resourcePath
            let extractedCheckoutId = event.resourcePath || newCheckoutId;
            // Basic extraction logic if needed, though backend often handles raw paths

            const statusPayload = {
              checkoutId: extractedCheckoutId,
              paymentMethod: backendPaymentMethodForStatus.toLowerCase(), 
              ...payload,
            };

            let statusResult;
            switch (paymentType) {
              case 'support_card':
                statusResult = await checkSupportCardStatus(statusPayload);
                break;
              case 'appointment':
                statusResult = await CheckPaymentStatus(statusPayload);
                break;
              default:
                throw new Error(`Unknown payment type for status check: ${paymentType}`);
            }

            if (!isMountedRef.current) return;
            setIsStatusChecking(false);

            if (statusResult.success) {
               handleSuccess(paymentType, statusResult.data);
            } else {
               Alert.alert("Payment Failed", statusResult.message || "Status verification failed");
            }
           } catch (e) {
             setIsStatusChecking(false);
             Alert.alert("Error", e.message);
           }
        } else {
           setIsSubmitting(false);
           Alert.alert("Payment Failed", event.message || "Transaction was not successful");
        }
      });

      // Add timeout for HyperPay SDK response (60 seconds)
      timeoutId = setTimeout(() => {
        // Capture timeout error in Sentry
        Sentry.captureMessage('Card Payment SDK Timeout - No response from HyperPay', {
          level: 'error',
          tags: {
            payment_method: 'card',
            stage: 'sdk_timeout',
            card_brand: selectedBrand,
            timeout_duration: '60s',
          },
          extra: {
            checkoutId: newCheckoutId,
            paymentType,
            amount,
            payload,
            platform: Platform.OS,
            platformVersion: Platform.Version,
          },
        });

        subscription.remove();
        if (isMountedRef.current) {
          setIsSubmitting(false);
          Alert.alert(
            t('alerts.error') || "Error",
            t('payment.cardPaymentTimeout') || 'Payment processing timed out. Please try again.'
          );
        }
      }, 60000);

      console.log('Calling HyperPay SDK with checkoutId:', newCheckoutId);

      Sentry.addBreadcrumb({
        category: 'payment',
        message: 'Calling HyperPay Card SDK',
        level: 'info',
        data: { checkoutId: newCheckoutId, cardBrand: brand },
      });

      // Call HyperPay SDK with error handling
      try {
        HyperPayModuleFinal.transactionPayment(
          newCheckoutId,
          brand,
          cardHolder.trim(),
          cleanCardNumber,
          `20${expiryYear}`,
          expiryMonth,
          cvv,
          'DB'
        );
      } catch (sdkError) {
        Sentry.captureException(sdkError, {
          tags: { payment_method: 'card', stage: 'sdk_call', card_brand: brand },
          extra: { checkoutId: newCheckoutId, amount, paymentType },
        });
        if (timeoutId) clearTimeout(timeoutId);
        subscription.remove();
        throw sdkError;
      }

    } catch (error) {
      Sentry.captureException(error, {
        tags: { payment_method: 'card', stage: 'flow_error', card_brand: selectedBrand },
        extra: { paymentType, amount, payload },
      });

      if (!isMountedRef.current) return;

      setIsSubmitting(false);
      setIsStatusChecking(false);
      Alert.alert(t('alerts.error') || "Error", error.message);
    }
  };

  const handleSuccess = (type, data) => {
      // Navigate to correct success screen based on payment type
      if (type === 'support_card') {
        // Navigate to Support Card Success Screen
        navigation.reset({
          index: 0,
          routes: [{ name: 'SupportCardSuccessScreen' }],
        });
      } else {
        // Navigate to generic Payment Success Screen for appointments
        // Extract appointment details from the response data
        const appointmentData = data?.appointment || data?.appointmentDetails || data;

        navigation.reset({
          index: 0,
          routes: [{
            name: 'PaymentSuccessScreen',
            params: {
              paymentType: type,
              appointment: type === 'appointment' ? appointmentData : null,
              transactionId: data?.transactionId || data?._id || null,
            }
          }],
        });
      }
  }

  const handleBack = () => {
    if (isSubmitting) {
      Alert.alert(
        t('alerts.warning') || "Warning",
        t('payment.paymentInProgress') || "Payment in progress",
        [
          { text: t('alerts.cancel') || "Cancel", style: 'cancel' },
          {
            text: t('payment.exitAnyway') || "Exit",
            style: 'destructive',
            onPress: () => {
              navigation.goBack();
            },
          },
        ]
      );
      return;
    }
    navigation.goBack();
  };

  if (isCheckoutLoading || isStatusChecking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>
             {isCheckoutLoading ? (t('payment.creatingCheckoutSession') || "Creating session...") : (t('payment.verifying') || "Verifying...")}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Header */}
        <View style={[styles.header, isRTL && styles.headerRTL]}>
          <TouchableOpacity onPress={handleBack} style={styles.closeButton}>
            <Image source={ICONS.back} style={styles.backIcon} />
          </TouchableOpacity>
          <Text style={styles.title}>{t('payment.enterCardDetails') || "Enter Card Details"}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            {/* Form */}
            <View style={styles.form}>
            <View style={styles.brandSelectorContainer}>
              {/* Apple Pay Button */}
              <TouchableOpacity
                style={styles.applePayButton}
                onPress={handleApplePaySubmit}
                disabled={isSubmitting}
              >
                <Text style={{color: 'white', fontWeight: 'bold', fontSize: 18}}> Pay</Text>
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{t('payment.orPayWith') || "Or pay with"}</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Other Brands */}
              <View style={[styles.brandContainer, isRTL && { flexDirection: 'row-reverse' }]}>
                {['VISA', 'MASTER', 'MADA'].map((brand) => (
                  <TouchableOpacity
                    key={brand}
                    style={[
                      styles.brandButton,
                      selectedBrand === brand && styles.brandButtonSelected,
                    ]}
                    onPress={() => setSelectedBrand(brand)}
                    disabled={isSubmitting}
                  >
                    <Image
                      source={
                        brand === 'VISA'
                          ? require('../assets/images/visa.png')
                          : brand === 'MASTER'
                          ? require('../assets/images/master.png')
                          : brand === 'MADA'
                          ? require('../assets/images/mada.png')
                          : null
                      }
                      style={styles.brandButtonImage}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Card Details Form */}
            <>
              {/* Card Number */}
              <View style={styles.fieldContainer}>
                <View style={[styles.labelRow, isRTL && { flexDirection: 'row-reverse' }]}>
                  <Text style={styles.fieldLabel}>{t('payment.cardNumber') || "Card Number"}</Text>
                  {detectedBrand && (
                    <View style={styles.detectedBrandBadge}>
                      <Image
                        source={
                          detectedBrand === 'VISA'
                            ? require('../assets/images/visa.png')
                            : detectedBrand === 'MASTER'
                            ? require('../assets/images/master.png')
                            : detectedBrand === 'MADA'
                            ? require('../assets/images/mada.png')
                            : null
                        }
                        style={styles.cardBrandImage}
                        resizeMode="contain"
                      />
                    </View>
                  )}
                </View>
                <TextInput
                  ref={cardNumberRef}
                  style={[
                    styles.textInput,
                    isRTL && styles.textInputRTL
                  ]}
                  value={cardNumber}
                  onChangeText={handleCardNumberChange}
                  editable={!isSubmitting}
                  textAlign={isRTL ? 'right' : 'left'}
                  keyboardType="number-pad"
                  placeholder="0000 0000 0000 0000"
                  placeholderTextColor="#999"
                />
              </View>

              {/* Card Holder */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>{t('payment.cardHolder') || "Card Holder"}</Text>
                <TextInput
                  ref={cardHolderRef}
                  style={[
                    styles.textInput,
                    isRTL && styles.textInputRTL,
                    cardHolderError && styles.errorField,
                  ]}
                  value={cardHolder}
                  onChangeText={(text) => {
                    setCardHolder(text);
                    setCardHolderError('');
                  }}
                  editable={!isSubmitting}
                  textAlign={isRTL ? 'right' : 'left'}
                  onSubmitEditing={() => expiryMonthRef.current?.focus()}
                  placeholder="Name on card"
                />
              </View>

              {/* Expiry & CVV */}
              <View style={[styles.row, styles.expiryRow, isRTL && styles.rowRTL]}>
                <View style={[styles.fieldContainer, styles.expiryFieldContainer, { flex: 1, marginRight: isRTL ? 0 : 10, marginLeft: isRTL ? 10 : 0 }]}>
                  <Text style={[styles.fieldLabel, styles.expiryLabel]}>{t('payment.expiryMonth') || "Expiry\nMonth"}</Text>
                  <TextInput
                    ref={expiryMonthRef}
                    style={[styles.textInput, isRTL && styles.textInputRTL]}
                    value={expiryMonth}
                    onChangeText={(text) => {
                      const sanitized = text.replace(/[^0-9]/g, '').slice(0, 2);
                      setExpiryMonth(sanitized);
                      if (sanitized.length === 2) {
                        expiryYearRef.current?.focus();
                      }
                    }}
                    placeholder="MM"
                    keyboardType="numeric"
                    maxLength={2}
                    editable={!isSubmitting}
                    textAlign={isRTL ? 'right' : 'left'}
                  />
                </View>

                <View style={[styles.fieldContainer, styles.expiryFieldContainer, { flex: 1, marginRight: isRTL ? 0 : 10, marginLeft: isRTL ? 10 : 0 }]}>
                  <Text style={[styles.fieldLabel, styles.expiryLabel]}>{t('payment.expiryYear') || "Expiry\nYear"}</Text>
                  <TextInput
                    ref={expiryYearRef}
                    style={[styles.textInput, isRTL && styles.textInputRTL]}
                    value={expiryYear}
                    onChangeText={(text) => {
                      const sanitized = text.replace(/[^0-9]/g, '').slice(0, 2);
                      setExpiryYear(sanitized);
                      if (sanitized.length === 2) {
                        cvvRef.current?.focus();
                      }
                    }}
                    placeholder="YY"
                    keyboardType="numeric"
                    maxLength={2}
                    editable={!isSubmitting}
                    textAlign={isRTL ? 'right' : 'left'}
                  />
                </View>

                <View style={[styles.fieldContainer, styles.expiryFieldContainer, { flex: 1 }]}>
                  <Text style={[styles.fieldLabel, styles.expiryLabel]}>{t('payment.cvv') || "CVV"}</Text>
                  <TextInput
                    ref={cvvRef}
                    style={[styles.textInput, isRTL && styles.textInputRTL]}
                    value={cvv}
                    onChangeText={(text) => {
                      const sanitized = text.replace(/[^0-9]/g, '').slice(0, 4);
                      setCvv(sanitized);
                      if (sanitized.length >= 3) {
                        Keyboard.dismiss();
                      }
                    }}
                    placeholder="123"
                    keyboardType="numeric"
                    maxLength={4}
                    secureTextEntry
                    editable={!isSubmitting}
                    textAlign={isRTL ? 'right' : 'left'}
                  />
                </View>
              </View>
            </>

            {/* Amount */}
            <View style={styles.amountContainer}>
              <Text style={styles.amountLabel}>{t('payment.totalAmount') || "Total Amount"}:</Text>
              <Text style={{fontSize: 20, color: COLORS.primary, fontWeight: 'bold'}}>{amount} SAR</Text>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                isFormReady && !isSubmitting && styles.submitButtonReady,
                isSubmitting && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!isFormReady || isSubmitting || isStatusChecking}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : isStatusChecking ? (
                <Text style={styles.submitButtonText}>{t('payment.verifying') || "Verifying..."}</Text>
              ) : (
                <Text style={styles.submitButtonText}>
                  {t('payment.submitPayment') || "Pay Now"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
          </TouchableWithoutFeedback>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: COLORS.primary,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  closeButton: {
    padding: 8,
  },
  backIcon: {
    width: 24,
    height: 24,
    tintColor: COLORS.gray700
  },
  title: {
    fontSize: 20,
    color: '#333',
    fontWeight: 'bold'
  },
  form: {
    padding: 20,
  },
  fieldContainer: {
    marginBottom: 15,
  },
  fieldLabel: {
    fontSize: 16,
    color: '#555',
    marginBottom: 2,
    fontWeight: '600'
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  detectedBrandBadge: {
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray300,
  },
  cardBrandImage: {
    width: 40,
    height: 24,
  },
  textInput: {
    width: '100%',
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#000',
  },
  textInputRTL: {
    textAlign: 'right',
  },
  errorField: {
    borderColor: '#ef4444',
    borderWidth: 2,
    backgroundColor: '#fef2f2',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  expiryRow: {
    alignItems: 'flex-end',
  },
  expiryFieldContainer: {
    marginBottom: 0,
  },
  expiryLabel: {
    marginBottom: 5,
  },
  amountContainer: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginTop: 5,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  amountLabel: {
    fontSize: 16,
    color: '#555',
    marginBottom: 5,
  },
  submitButton: {
    width: '100%',
    height: 50,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonReady: {
    backgroundColor: '#22c55e', // Green color when form is ready
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold'
  },
  brandContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 15,
  },
  brandButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    height: 55,
    flex: 1,
    marginHorizontal: 5,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
  },
  brandButtonSelected: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  brandButtonImage: {
    width: '100%',
    height: '100%',
  },
  brandSelectorContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 15,
  },
  applePayButton: {
    width: '100%',
    height: 60,
    backgroundColor: '#000',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 15,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ccc',
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#666',
    fontWeight: '600'
  },
});

export default PaymentFormScreen;