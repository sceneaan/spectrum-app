
import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, Linking, FlatList, Dimensions, Alert, Pressable } from 'react-native';
import LottieView from 'lottie-react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '../store/LanguageContext';
import { getDynamicData } from '../utils/dataHelper';
import { useGetAllPromotions } from '../api/services/Public.Service';
import { useGetSearchFilters, useSearchProviders } from '../api/services/Search.Service';
import { useGetUpcomingAppointments } from '../api/services/Appointment.Service';
import { useGetMyWallet } from '../api/services/Wallet.Service';
import { useGetUserData } from '../api/services/User.Service';
import { calculatePatientProfileCompletion, getMissingPatientProfileFields } from '../utils/profileCompletion';
import { formatSarAmount } from '../utils/formatMoney';
import RiyalText from '../components/RiyalText';
import Header from '../components/Header';
import Skeleton from '../components/Skeleton';
import { SectionHeader, QuickAction, AppButton, AppText, AppCard } from '../components/ui';
import { useAuthStore } from '../store/authStore';
import SessionCountdownHero from '../components/SessionCountdownHero';
import ProviderThumb from '../components/ProviderThumb';
import { usePreSessionJoin } from '../context/PreSessionJoinContext';
import { getAppointmentTiming } from '../utils/sessionTiming';
import ICONS from '../constants/icons';
import COLORS from '../constants/colors';
import { SPACING, RADIUS, SHADOWS, cardBorder } from '../theme';
import { interpolate } from '../utils/localeHelpers';
import { createScrollToIndexFailedHandler } from '../utils/scrollToIndex';
import haptics from '../utils/haptics';
import useGlassTabBarInset from '../navigation/useGlassTabBarInset';
import moment from 'moment-timezone';
import { getNearestUpcomingAppointment } from '../utils/appointmentFilters';
import {
  resolveHomePromoCards,
  getPromoLocalizedFields,
  handlePromoAction,
} from '../utils/promotions';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PROMO_CARD_WIDTH = SCREEN_WIDTH - 40;

const PROMO_THEMES = [
  { bg: '#5DBCD2', icon: ICONS.calendar },
  { bg: '#4F46E5', icon: ICONS.shield },
  { bg: '#B45309', icon: ICONS.video },
];

const FEATURED_ISSUES = [
  { code: 'depression', iconKey: 'depression', en: 'Depression', ar: 'الاكتئاب' },
  { code: 'generalized-anxiety', iconKey: 'anxiety', en: 'Anxiety & Stress', ar: 'القلق و التوتر' },
  { code: 'ptsd', iconKey: 'trauma', en: 'Panic & Trauma', ar: 'هلع و صدمات' },
  { code: 'social-phobia', iconKey: 'socialPhobia', en: 'Social Phobia', ar: 'الرهاب الاجتماعي' },
  { code: 'ocd', iconKey: 'ocd', en: 'OCD', ar: 'الوسواس القهري' },
  { code: 'adhd', iconKey: 'attention', en: 'Attention & Memory', ar: 'الانتباه و الذاكرة' },
  { code: 'self-esteem', iconKey: 'selfEsteem', en: 'Self-esteem', ar: 'تقدير الذات' },
  { code: 'relationship-issues', iconKey: 'relationships', en: 'Relationships', ar: 'العلاقات' },
];

const PROMO_ITEM_LENGTH = PROMO_CARD_WIDTH + 15;

const HomeScreen = () => {
   const navigation = useNavigation();
   const queryClient = useQueryClient();
   const { t, isRTL } = useLanguage();
   const data = getDynamicData(isRTL);
   const rowStyle = { flexDirection: isRTL ? 'row-reverse' : 'row' };
   const alignText = { textAlign: isRTL ? 'right' : 'left' };
   const tabBarInset = useGlassTabBarInset();

   const [currentPromoIndex, setCurrentPromoIndex] = useState(0);
   const [nowTick, setNowTick] = useState(0);
   const promoFlatListRef = useRef(null);
   const autoScrollTimer = useRef(null);
   const handlePromoScrollToIndexFailed = useCallback(
      createScrollToIndexFailedHandler(promoFlatListRef, PROMO_ITEM_LENGTH),
      [],
   );

   // Check if user is logged in
   const { user, isAuthenticated } = useAuthStore();
   const { requestJoinSession } = usePreSessionJoin();
   const isLoggedIn = isAuthenticated && user;
   const isPatient = user?.role?.toLowerCase() === 'patient';
   const isProvider = user?.role?.toLowerCase() === 'provider';
   const showJoinUs = !(isLoggedIn && (isPatient || isProvider));

   // Fetch upcoming appointments (only for logged in users)
   const { data: upcomingAppointments } = useGetUpcomingAppointments();
   const { data: walletData } = useGetMyWallet();
   const { data: userData } = useGetUserData();

   const profileCompletion = useMemo(
      () => calculatePatientProfileCompletion(userData || user),
      [userData, user],
   );

   const missingProfileFields = useMemo(
      () => getMissingPatientProfileFields(userData || user),
      [userData, user],
   );

   const profileEditParams = useMemo(() => {
      const needsMedical = missingProfileFields.some((field) => field.tab === 'medical');
      return {
         view: 'edit',
         initialTab: needsMedical ? 'medical' : 'patient',
      };
   }, [missingProfileFields]);

   const profileCompletionHint = useMemo(() => {
      const editableMissing = missingProfileFields.filter((field) => field.editable !== false);
      if (editableMissing.length === 0) {
         const verifyMissing = missingProfileFields.filter((field) => field.tab === 'verify');
         if (verifyMissing.length > 0) {
            return t.home?.profileCompletionVerifyHint
               || 'Verify your email or phone to reach 100%';
         }
         return null;
      }
      const labels = editableMissing.slice(0, 2).map((field) => field.label).join(', ');
      const suffix = editableMissing.length > 2 ? '…' : '';
      return (t.home?.profileCompletionMissingHint || 'Still needed: {{fields}}')
         .replace('{{fields}}', `${labels}${suffix}`);
   }, [missingProfileFields, t.home]);

   useFocusEffect(
      useCallback(() => {
         if (isAuthenticated) {
            queryClient.invalidateQueries({ queryKey: ['userData'] });
         }
      }, [isAuthenticated, queryClient]),
   );

   const nearestAppointment = useMemo(
      () => getNearestUpcomingAppointment(upcomingAppointments),
      [upcomingAppointments, nowTick]
   );

   const sessionTiming = useMemo(
      () => getAppointmentTiming(nearestAppointment, nowTick),
      [nearestAppointment, nowTick]
   );

   const showSessionHero = isLoggedIn && isPatient && Boolean(sessionTiming.heroState);

   // Refresh join-window UI every 30 seconds (every second when session hero is visible)
   useEffect(() => {
      const intervalMs = showSessionHero ? 1000 : 30000;
      const interval = setInterval(() => setNowTick(Date.now()), intervalMs);
      return () => clearInterval(interval);
   }, [showSessionHero]);

   // Fetch issue categories for "How Can We Help You?" section
   const { data: searchFilters, isLoading: isFiltersLoading } = useGetSearchFilters();

   const displayIssues = useMemo(() => {
      const issues = searchFilters?.issues || searchFilters?.issueCategories || [];
      return FEATURED_ISSUES.map(fi => {
         const match = issues.find(i => i.code === fi.code);
         return {
            _id: match?._id || match?.id || fi.code,
            code: fi.code,
            icon: ICONS[fi.iconKey],
            displayName: isRTL ? fi.ar : fi.en,
         };
      });
   }, [searchFilters, isRTL]);

   const visibleIssues = useMemo(() => displayIssues.slice(0, 6), [displayIssues]);

   // Fetch top-rated providers (same endpoint as Find Therapist — only active + published)
   const { data: searchResult, isLoading: isProvidersLoading, error: providersError } = useSearchProviders(
      { sort: 'rating', limit: 10 },
      { staleTime: 5 * 60 * 1000 } // Cache for 5 minutes
   );
   const providersData = searchResult?.providers || searchResult || [];

   // Fetch promotions from backend
   const { data: promotionsData } = useGetAllPromotions();

   const openJoinUs = async () => {
      const url = 'https://spectrumclinics.care/#/join-us';
      try {
         const supported = await Linking.canOpenURL(url);
         if (supported) {
            await Linking.openURL(url);
         } else {
            Alert.alert(t.home?.linkError || 'Unable to open link', url);
         }
      } catch (e) {
         Alert.alert(t.home?.linkError || 'Unable to open link', url);
      }
   };

   // Top providers — stable sort by rating (no shuffle)
   const displayProviders = React.useMemo(() => {
      if (!providersData || providersData.length === 0) return [];
      const ratingValue = (provider) => {
         if (typeof provider.rating === 'object') return provider.rating?.average || 0;
         return Number(provider.rating) || 0;
      };
      return [...providersData]
         .sort((a, b) => ratingValue(b) - ratingValue(a))
         .slice(0, 5);
   }, [providersData]);

   const handleQuickVideo = useCallback(() => {
      haptics.light();
      if (!nearestAppointment?.roomId) {
         navigation.navigate('Main', { screen: 'AppointmentsTab' });
         return;
      }

      const timing = getAppointmentTiming(nearestAppointment, nowTick);

      if (timing.isRescheduledUnpaid || nearestAppointment.paymentStatus !== 'Completed') {
         Alert.alert(
            t.home?.completePayment || 'Complete payment',
            t.home?.quickVideoPaymentRequired || 'Complete payment before joining your session',
            [
               { text: t.common?.cancel || 'Cancel', style: 'cancel' },
               {
                  text: t.home?.completePayment || 'Complete payment',
                  onPress: () => navigation.navigate('Checkout', {
                     id: nearestAppointment._id || nearestAppointment.id || nearestAppointment.appointmentId,
                  }),
               },
            ],
         );
         return;
      }

      if (timing.needsApproval) {
         Alert.alert(
            t.home?.awaitingApproval || 'Awaiting Approval',
            t.home?.quickVideoAwaitingApproval || 'This appointment is awaiting provider approval',
         );
         return;
      }

      if (!timing.showVideoButton) {
         Alert.alert(
            t.home?.quickVideo || 'Video',
            t.home?.quickVideoNotReady || 'Your session will be available to join closer to the appointment time',
            [
               { text: t.common?.ok || 'OK', style: 'cancel' },
               {
                  text: t.home?.quickAppointments || 'Appointments',
                  onPress: () => navigation.navigate('Main', { screen: 'AppointmentsTab' }),
               },
            ],
         );
         return;
      }

      requestJoinSession({ appointment: nearestAppointment });
   }, [nearestAppointment, navigation, nowTick, requestJoinSession, t]);

   const promoCards = useMemo(
      () => resolveHomePromoCards(promotionsData, t.home),
      [promotionsData, t.home],
   );


   // Auto-scroll functionality
   useEffect(() => {
      if (promoCards.length > 1) {
         autoScrollTimer.current = setInterval(() => {
            setCurrentPromoIndex((prevIndex) => {
               const nextIndex = (prevIndex + 1) % promoCards.length;
               promoFlatListRef.current?.scrollToIndex({
                  index: nextIndex,
                  animated: true,
               });
               return nextIndex;
            });
         }, 3000); // Change every 3 seconds
      }

      return () => {
         if (autoScrollTimer.current) {
            clearInterval(autoScrollTimer.current);
         }
      };
   }, [promoCards.length]);

   // Handle manual scroll
   const handlePromoScroll = (event) => {
      const contentOffsetX = event.nativeEvent.contentOffset.x;
      const index = Math.round(contentOffsetX / (PROMO_CARD_WIDTH + 15));
      if (index !== currentPromoIndex && index >= 0 && index < promoCards.length) {
         setCurrentPromoIndex(index);
      }
   };

   // Pause auto-scroll on manual interaction
   const handleScrollBeginDrag = () => {
      if (autoScrollTimer.current) {
         clearInterval(autoScrollTimer.current);
      }
   };

   // Resume auto-scroll after manual interaction
   const handleScrollEndDrag = () => {
      if (promoCards.length > 1) {
         setTimeout(() => {
            autoScrollTimer.current = setInterval(() => {
               setCurrentPromoIndex((prevIndex) => {
                  const nextIndex = (prevIndex + 1) % promoCards.length;
                  promoFlatListRef.current?.scrollToIndex({
                     index: nextIndex,
                     animated: true,
                  });
                  return nextIndex;
               });
            }, 3000);
         }, 2000);
      }
   };

   const onPromoPress = useCallback((item) => {
      haptics.light();
      handlePromoAction(item, navigation, Linking, Alert, t.home?.linkError || 'Unable to open link');
   }, [navigation, t.home?.linkError]);

   // Render promo card
   const renderPromoCard = ({ item, index }) => {
      const themeIndex = item.themeIndex ?? index;
      const { bg, icon } = PROMO_THEMES[themeIndex % PROMO_THEMES.length];
      const { title, subtitle, ctaLabel } = getPromoLocalizedFields(item, isRTL);
      const cardHeight = isLoggedIn ? 168 : 148;

      return (
         <Pressable
            style={[styles.promoCard, { backgroundColor: bg, minHeight: cardHeight, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            onPress={() => onPromoPress(item)}
            android_ripple={{ color: 'rgba(255,255,255,0.12)' }}
         >
            <View style={[styles.promoTextBlock, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
               <Text style={[styles.promoEyebrow, { textAlign: isRTL ? 'right' : 'left' }]}>
                  {(t.home?.promoEyebrow || 'Spectrum Care').toUpperCase()}
               </Text>
               <Text style={[styles.promoTitle, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>{title}</Text>
               <Text style={[styles.promoSub, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>{subtitle}</Text>
               <View style={[styles.promoBtn, rowStyle]}>
                  <Text style={styles.promoBtnText}>{ctaLabel || t.home?.bookAppointment || 'Book Appointment'}</Text>
                  <Image source={ICONS.chevronRight} style={[styles.promoBtnChevron, isRTL && { transform: [{ rotate: '180deg' }] }]} />
               </View>
            </View>
            <View style={styles.promoVisual}>
               <View style={styles.promoRingOuter}>
                  <View style={styles.promoRingInner}>
                     <Image source={icon} style={styles.promoIconImg} resizeMode="contain" />
                  </View>
               </View>
            </View>
         </Pressable>
      );
   };

   return (
      <View style={styles.container}>
         <Header showProfile title={data.user} />
         <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.scroll}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarInset }]}
         >

            {isLoggedIn && isPatient && profileCompletion < 100 ? (
               <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={() => navigation.navigate('Profile', profileEditParams)}
               >
                  <AppCard style={styles.dashboardCard} padding={SPACING.lg}>
                     <AppText variant="bodyMedium">{t.home?.profileCompletionTitle || 'Complete your profile'}</AppText>
                     <AppText variant="caption" color={COLORS.textSecondary}>
                        {(t.home?.profileCompletionSubtitle || '{{percent}}% complete — add details for better care')
                           .replace('{{percent}}', String(profileCompletion))}
                     </AppText>
                     {profileCompletionHint ? (
                        <AppText variant="caption" color={COLORS.textSecondary} style={styles.profileHint}>
                           {profileCompletionHint}
                        </AppText>
                     ) : null}
                     <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${profileCompletion}%` }]} />
                     </View>
                     <AppText variant="caption" color={COLORS.primaryDark} style={styles.linkText}>
                        {t.home?.completeProfile || 'Complete profile'}
                     </AppText>
                  </AppCard>
               </TouchableOpacity>
            ) : null}

            {isLoggedIn && isPatient ? (
               <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={() => navigation.navigate('WalletScreen')}
               >
                  <AppCard style={styles.dashboardCard} padding={SPACING.lg}>
                     <AppText variant="caption" color={COLORS.textSecondary}>
                        {t.home?.walletCardTitle || 'Wallet balance'}
                     </AppText>
                     <RiyalText
                        text={formatSarAmount(walletData?.availableBalance ?? walletData?.balance ?? 0)}
                        textStyle={styles.walletAmount}
                     />
                     <AppText variant="caption" color={COLORS.primaryDark} style={styles.linkText}>
                        {t.home?.viewWallet || 'View wallet'}
                     </AppText>
                  </AppCard>
               </TouchableOpacity>
            ) : null}

            {/* Quick actions for logged-in patients */}
            {isLoggedIn && isPatient && (
               <View style={styles.quickActionsGrid}>
                  <View style={styles.quickActionCell}>
                     <QuickAction
                        vectorIcon="search"
                        label={t.home?.quickBook || 'Find Therapist'}
                        onPress={() => navigation.navigate('Main', { screen: 'SearchTab' })}
                        labelLines={1}
                     />
                  </View>
                  <View style={styles.quickActionCell}>
                     <QuickAction
                        vectorIcon="calendar"
                        label={t.home?.quickAppointments || 'Appointments'}
                        onPress={() => navigation.navigate('Main', { screen: 'AppointmentsTab' })}
                        labelLines={1}
                     />
                  </View>
                  <View style={styles.quickActionCell}>
                     <QuickAction
                        vectorIcon="inbox"
                        label={t.home?.quickInbox || 'Messages'}
                        onPress={() => navigation.navigate('Main', { screen: 'InboxTab' })}
                        labelLines={1}
                     />
                  </View>
                  <View style={styles.quickActionCell}>
                     <QuickAction
                        vectorIcon="video"
                        label={t.home?.quickVideo || 'Video'}
                        onPress={handleQuickVideo}
                        labelLines={1}
                     />
                  </View>
                  <View style={styles.quickActionCell}>
                     <QuickAction
                        vectorIcon="practice"
                        label={t.home?.quickRecords || 'Records'}
                        onPress={() => navigation.navigate('MedicalRecordScreen')}
                        labelLines={1}
                     />
                  </View>
                  <View style={styles.quickActionCell}>
                     <QuickAction
                        vectorIcon="wallet"
                        label={t.home?.quickBilling || 'Billing'}
                        onPress={() => navigation.navigate('BillingScreen')}
                        labelLines={1}
                     />
                  </View>
               </View>
            )}

            {showSessionHero && (
               <SessionCountdownHero
                  appointment={nearestAppointment}
                  onJoin={() => requestJoinSession({ appointment: nearestAppointment })}
                  onViewAppointments={() => navigation.navigate('Main', { screen: 'AppointmentsTab' })}
                  onPay={() => navigation.navigate('Checkout', {
                     id: nearestAppointment._id || nearestAppointment.id || nearestAppointment.appointmentId,
                  })}
               />
            )}

            {/* Guest welcome hero */}
            {!isLoggedIn && (
               <View style={styles.guestHero}>
                  <View style={[styles.guestHeroDecor, isRTL ? { left: -30 } : { right: -30 }]} />
                  <View style={[styles.guestHeroTop, rowStyle]}>
                     <View style={styles.guestHeroCopy}>
                        <AppText variant="h2" align={alignText.textAlign} style={styles.guestHeroTitle}>
                           {t.home?.guestHeroTitle || 'Start your care journey'}
                        </AppText>
                        <AppText variant="bodySmall" align={alignText.textAlign} color={COLORS.textSecondary} style={styles.guestHeroSub}>
                           {t.home?.guestHeroSubtitle || 'Licensed therapists. Secure video. Care in Arabic & English.'}
                        </AppText>
                        <View style={[styles.trustRow, rowStyle]}>
                           <View style={[styles.trustChip, rowStyle]}>
                              <Image source={ICONS.shield} style={styles.trustChipIcon} />
                              <AppText variant="caption" style={styles.trustChipText}>
                                 {t.auth?.login?.trustSecure || 'Secure'}
                              </AppText>
                           </View>
                           <View style={[styles.trustChip, rowStyle]}>
                              <Image source={ICONS.verified} style={styles.trustChipIcon} />
                              <AppText variant="caption" style={styles.trustChipText}>
                                 {t.auth?.login?.trustLicensed || 'Licensed'}
                              </AppText>
                           </View>
                        </View>
                     </View>
                     <LottieView
                        source={require('../assets/animations/wellness-hero.json')}
                        autoPlay
                        loop
                        style={styles.guestHeroLottie}
                     />
                  </View>
                  <AppButton
                     title={t.home?.guestCtaButton || 'Sign In'}
                     onPress={() => navigation.navigate('LoginScreen')}
                     size="md"
                     style={styles.guestHeroBtn}
                  />
                  <TouchableOpacity
                     onPress={() => navigation.navigate('Main', { screen: 'SearchTab' })}
                     style={styles.guestBrowseLink}
                     activeOpacity={0.7}
                  >
                     <AppText variant="bodySmall" color={COLORS.primaryDark} style={styles.guestBrowseText}>
                        {t.home?.guestBrowseTherapists || 'Browse therapists without signing in'}
                     </AppText>
                  </TouchableOpacity>
               </View>
            )}

            {/* Upcoming Appointment - compact card when session hero is not shown */}
            {isLoggedIn && nearestAppointment && !showSessionHero && (() => {
               // Calculate time status for the appointment
               const clientTz = nearestAppointment.clientTz || moment.tz.guess();
               const appointmentStart = moment.tz(nearestAppointment.startTime, clientTz);
               const appointmentEnd = moment.tz(nearestAppointment.endTime, clientTz);
               const joinWindowStart = appointmentStart.clone().subtract(10, 'minutes');
               const now = moment.tz(clientTz);

               // Determine appointment status
               const isOngoing = now.isSameOrAfter(appointmentStart) && now.isBefore(appointmentEnd);
               const isInJoinWindow = now.isSameOrAfter(joinWindowStart) && now.isBefore(appointmentEnd);
               const diffMinutes = appointmentStart.diff(now, 'minutes');
               const diffHours = appointmentStart.diff(now, 'hours');
               const diffDays = appointmentStart.diff(now, 'days');

               // Get time badge text
               const getTimeBadgeText = () => {
                  if (isOngoing) return t.home?.ongoing || 'Ongoing';
                  if (diffMinutes <= 0) return t.home?.now || 'Now';
                  if (diffMinutes < 60) return interpolate(t.home?.inMinutes, { count: diffMinutes }) || `In ${diffMinutes} min`;
                  if (diffHours < 24) return interpolate(t.home?.inHours, { count: diffHours }) || `In ${diffHours} hours`;
                  return interpolate(t.home?.inDays, { count: diffDays }) || `In ${diffDays} days`;
               };

               // Check if appointment needs doctor approval
               const needsApproval = nearestAppointment.approvedByDoctor === false;
               const isRescheduledUnpaid =
                  nearestAppointment.status === 'Rescheduled'
                  && nearestAppointment.paymentStatus !== 'Completed'
                  && nearestAppointment.expiresAt;

               // Show video button only for confirmed appointments, 10 minutes before start until end
               const isConfirmed = !needsApproval
                  && nearestAppointment.paymentStatus === 'Completed'
                  && nearestAppointment.status !== 'Pending'
                  && !isRescheduledUnpaid;
               const showVideoButton = isPatient && nearestAppointment.roomId && isInJoinWindow && isConfirmed;

               return (
                  <View style={styles.section}>
                     {/* Header with title and time badge */}
                     <View style={[styles.appointmentHeaderRow, rowStyle]}>
                        <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>
                           {t.home?.nextAppointment || 'Next Appointment'}
                        </Text>
                        <View style={[styles.timeBadge, isOngoing && styles.timeBadgeOngoing]}>
                           <Text style={[styles.timeBadgeText, isOngoing && styles.timeBadgeTextOngoing]}>
                              {getTimeBadgeText()}
                           </Text>
                        </View>
                     </View>

                     {/* Card */}
                     <View style={styles.appointmentCard}>
                        <View style={styles.appointmentAccent} />
                        <View style={[styles.appointmentContent, rowStyle]}>
                           {/* Doctor Image */}
                           <View style={styles.appointmentDoctorImgContainer}>
                              <Image
                                 source={nearestAppointment.provider?.profileImage ? { uri: nearestAppointment.provider.profileImage } : ICONS.defaultAvatar}
                                 style={styles.appointmentDoctorImg}
                              />
                           </View>

                           {/* Doctor Info */}
                           <View style={[styles.appointmentInfo, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                              <Text style={[styles.appointmentDoctorName, alignText]} numberOfLines={1}>
                                 {isRTL
                                    ? (nearestAppointment.provider?.fullNameArabic || nearestAppointment.provider?.fullName || nearestAppointment.providerName)
                                    : (nearestAppointment.provider?.fullNameEnglish || nearestAppointment.provider?.fullName || nearestAppointment.providerName)}
                              </Text>
                              <Text style={[styles.appointmentSpecialty, alignText]} numberOfLines={1}>
                                 {isRTL
                                    ? (nearestAppointment.provider?.specialty?.nameArabic || 'طبيب')
                                    : (nearestAppointment.provider?.specialty?.nameEnglish || 'Doctor')}
                              </Text>
                              {/* Date/Time Badges */}
                              <View style={[styles.appointmentBadges, rowStyle]}>
                                 <View style={styles.appointmentBadge}>
                                    <Image source={ICONS.calendar} style={styles.badgeIcon} />
                                    <Text style={styles.badgeText}>
                                       {moment.utc(nearestAppointment.startTime).isSame(moment(), 'day')
                                          ? (t.home?.today || 'Today')
                                          : moment.utc(nearestAppointment.startTime).format('DD MMM')}
                                    </Text>
                                 </View>
                                 <View style={styles.appointmentBadge}>
                                    <Image source={ICONS.clock || ICONS.time} style={styles.badgeIcon} />
                                    <Text style={styles.badgeText}>
                                       {moment(nearestAppointment.startTime).format('hh:mm A')}
                                    </Text>
                                 </View>
                              </View>
                           </View>

                           {/* Video Button - Only show 10 minutes before appointment */}
                           {showVideoButton && (
                              <TouchableOpacity
                                 style={styles.videoIconBtn}
                                 onPress={() => requestJoinSession({ appointment: nearestAppointment })}
                              >
                                 <Image source={ICONS.video} style={styles.videoIconImg} />
                              </TouchableOpacity>
                           )}
                        </View>

                        {isRescheduledUnpaid && (
                           <TouchableOpacity
                              style={styles.rescheduledPayBanner}
                              onPress={() => navigation.navigate('Checkout', {
                                 id: nearestAppointment._id || nearestAppointment.id || nearestAppointment.appointmentId,
                              })}
                           >
                              <Text style={styles.rescheduledPayText}>
                                 {interpolate(t.home?.paymentDeadlineBanner, {
                                    time: moment(nearestAppointment.expiresAt).format('h:mm A'),
                                 })}
                              </Text>
                           </TouchableOpacity>
                        )}

                        {/* Status Tag */}
                        <View style={{
                           backgroundColor: needsApproval ? '#FFF3CD' : '#E8F5E9',
                           paddingHorizontal: 8,
                           paddingVertical: 4,
                           borderRadius: 12,
                           alignSelf: isRTL ? 'flex-end' : 'flex-start',
                           flexDirection: isRTL ? 'row-reverse' : 'row',
                           alignItems: 'center',
                           gap: 4,
                           marginTop: 8,
                           marginStart: 12,
                        }}>
                           <Text style={{ fontSize: 10 }}>{needsApproval ? '⏳' : '✓'}</Text>
                           <Text style={{ color: needsApproval ? '#F57C00' : '#2E7D32', fontSize: 10, fontWeight: '600' }}>
                              {needsApproval
                                 ? (t.home?.awaitingApproval || 'Awaiting Approval')
                                 : (t.home?.confirmed || 'Confirmed')}
                           </Text>
                        </View>
                     </View>
                  </View>
               );
            })()}

            {/* Top Providers — above the fold */}
            <View style={styles.section}>
               <SectionHeader
                  title={t.home?.topProviders || 'Top Providers'}
                  actionLabel={t.home?.seeMore || 'See more'}
                  onAction={() => navigation.navigate('Main', { screen: 'SearchTab' })}
                  align={alignText.textAlign}
                  style={{ marginBottom: SPACING.md }}
               />
               <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.docSlider}
                  contentContainerStyle={styles.docSliderContent}
               >
                  {isProvidersLoading ? (
                     Array.from({ length: 4 }).map((_, index) => (
                        <View key={index} style={[styles.docCard, { marginEnd: 10 }]}>
                           <Skeleton width="100%" height={100} style={{ marginBottom: 8, borderRadius: 10 }} />
                           <Skeleton width="80%" height={14} style={{ marginBottom: 4 }} />
                           <Skeleton width="60%" height={12} />
                        </View>
                     ))
                  ) : providersError ? (
                     <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>
                           {t.home?.providersError || 'Error loading providers'}
                        </Text>
                     </View>
                  ) : displayProviders.length === 0 ? (
                     <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>
                           {t.home?.noProviders || 'No providers available'}
                        </Text>
                     </View>
                  ) : (
                     displayProviders.map(provider => {
                        const specialtyName = isRTL
                           ? (provider.specialty?.nameArabic || 'غير محدد')
                           : (provider.specialty?.nameEnglish || 'Not specified');

                        const providerId = provider.id || provider._id;
                        const openProfile = () => navigation.navigate('TherapistProfile', { providerId });

                        return (
                           <View key={provider.id} style={styles.docCard}>
                              <Pressable
                                 style={{ flex: 1 }}
                                 onPress={openProfile}
                                 android_ripple={{ color: `${COLORS.primary}22` }}
                              >
                                 <ProviderThumb
                                    uri={provider.profileImage}
                                    style={styles.docImg}
                                 />
                                 <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                                    <Text style={styles.docName} numberOfLines={1}>
                                       {(isRTL ? (provider.fullNameArabic || provider.fullName) : (provider.fullNameEnglish || provider.fullName)) || (t.home?.unknownProvider || 'Unknown')}
                                    </Text>
                                    <Text style={styles.docSpecialty} numberOfLines={1}>
                                       {specialtyName}
                                    </Text>
                                    <View style={[styles.ratingRow, rowStyle]}>
                                       <Image source={ICONS.star} style={{ width: 12, height: 12, tintColor: COLORS.warning }} />
                                       <Text style={styles.ratingText}>{typeof provider.rating === 'object' ? (provider.rating?.average || '5.0') : (provider.rating || '5.0')}</Text>
                                    </View>
                                 </View>
                              </Pressable>
                              <Pressable
                                 style={styles.bookNowBtn}
                                 onPress={() => {
                                    haptics.light();
                                    openProfile();
                                 }}
                                 android_ripple={{ color: `${COLORS.primary}33` }}
                              >
                                 <Text style={styles.bookNowText}>{t.home?.bookNow || 'Book Now'}</Text>
                              </Pressable>
                           </View>
                        );
                     })
                  )}
               </ScrollView>
            </View>

            {/* How Can We Help — 6 conditions + view all */}
            <View style={styles.section}>
               <SectionHeader
                  title={t.home?.howCanWeHelp || 'How Can We Help You?'}
                  subtitle={t.home?.chooseCondition || 'Choose what describes you, and we\'ll help you find the right support'}
                  align={alignText.textAlign}
                  style={{ marginBottom: SPACING.md }}
               />
               <View style={[styles.issueGrid, rowStyle]}>
                  {isFiltersLoading ? (
                     <>
                        {[1, 2, 3, 4, 5, 6].map(i => (
                           <View key={i} style={styles.issueItem}>
                              <Skeleton width={44} height={44} borderRadius={22} />
                              <Skeleton width={55} height={10} style={{ marginTop: 6 }} />
                           </View>
                        ))}
                     </>
                  ) : (
                     visibleIssues.map(issue => (
                        <TouchableOpacity
                           key={issue._id || issue.id}
                           style={styles.issueItem}
                           onPress={() => navigation.navigate('Main', {
                              screen: 'SearchTab',
                              params: { preSelectedIssue: issue._id || issue.id },
                           })}
                           activeOpacity={0.75}
                        >
                           <View style={styles.issueIconCircle}>
                              <Image source={issue.icon} style={styles.issueIcon} />
                           </View>
                           <Text style={styles.issueText} numberOfLines={2}>
                              {issue.displayName}
                           </Text>
                        </TouchableOpacity>
                     ))
                  )}
               </View>
               {!isFiltersLoading && displayIssues.length > 6 && (
                  <TouchableOpacity
                     style={[styles.viewAllBtn, rowStyle]}
                     onPress={() => navigation.navigate('Main', { screen: 'SearchTab' })}
                     activeOpacity={0.8}
                  >
                     <AppText variant="bodySmall" color={COLORS.primary} style={styles.viewAllText}>
                        {t.home?.viewAllConditions || 'View all conditions'}
                     </AppText>
                     <Image source={ICONS.chevronRight} style={styles.viewAllChevron} />
                  </TouchableOpacity>
               )}
            </View>

            {/* Promotions — after browse content */}
            {promoCards.length > 0 && (
               <View style={styles.promoContainer}>
                  <FlatList
                     ref={promoFlatListRef}
                     data={promoCards}
                     renderItem={renderPromoCard}
                     keyExtractor={(item, index) => String(item._id || item.id || item.titleEnglish || `promo-${index}`)}
                     horizontal
                     pagingEnabled={false}
                     showsHorizontalScrollIndicator={false}
                     snapToInterval={PROMO_CARD_WIDTH + 15}
                     decelerationRate="fast"
                     contentContainerStyle={styles.slider}
                     onScroll={handlePromoScroll}
                     onScrollBeginDrag={handleScrollBeginDrag}
                     onScrollEndDrag={handleScrollEndDrag}
                     scrollEventThrottle={16}
                     initialNumToRender={1}
                     maxToRenderPerBatch={2}
                     windowSize={3}
                     removeClippedSubviews
                     getItemLayout={(data, index) => ({
                        length: PROMO_ITEM_LENGTH,
                        offset: PROMO_ITEM_LENGTH * index,
                        index,
                     })}
                     onScrollToIndexFailed={handlePromoScrollToIndexFailed}
                  />
                  {promoCards.length > 1 && (
                     <View style={styles.paginationContainer}>
                        {promoCards.map((_, index) => (
                           <TouchableOpacity
                              key={index}
                              onPress={() => {
                                 setCurrentPromoIndex(index);
                                 promoFlatListRef.current?.scrollToIndex({ index, animated: true });
                              }}
                              style={[
                                 styles.paginationDot,
                                 {
                                    backgroundColor: currentPromoIndex === index ? COLORS.primary : COLORS.gray400,
                                    transform: [{ scale: currentPromoIndex === index ? 1.2 : 1 }],
                                 },
                              ]}
                           />
                        ))}
                     </View>
                  )}
               </View>
            )}

            {/* Zone 4: Support Card */}
            <View style={styles.section}>
               <View style={[styles.supportCard, rowStyle]}>
                  <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                     <Text style={styles.supportTitle}>{t.home?.buyCard || 'Buy a Support Card'}</Text>
                     <Text style={styles.supportSub}>{t.home?.giftHealth || 'Gift health to loved ones'}</Text>
                     <TouchableOpacity style={styles.pillBtn} onPress={() => navigation.navigate('SupportCard')}>
                        <Text style={styles.pillBtnText}>{t.home?.purchase || 'Purchase'}</Text>
                     </TouchableOpacity>
                  </View>
                  <Image source={ICONS.gift} style={styles.giftImg} />
               </View>
            </View>

            {/* Zone 5: Join Us — provider recruitment; hidden for logged-in patients & providers */}
            {showJoinUs ? (
            <TouchableOpacity style={[styles.joinContainer, rowStyle]} onPress={openJoinUs}>
               <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                  <Text style={styles.joinTitle}>{t.home?.joinUs || 'Join Us'}</Text>
                  <Text style={styles.joinSub}>{t.home?.joinSub || 'Join our network of healthcare professionals'}</Text>
               </View>
               <Image source={ICONS.general} style={{ width: 30, height: 30, tintColor: COLORS.darkSlateBlue }} />
            </TouchableOpacity>
            ) : null}
         </ScrollView>
      </View>
   );
};

const styles = StyleSheet.create({
   container: { flex: 1, backgroundColor: COLORS.background },
   scroll: { flex: 1 },
   scrollContent: { paddingTop: SPACING.xl },

   quickActionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: SPACING.lg,
      paddingTop: SPACING.md,
      paddingBottom: SPACING.sm,
   },
   quickActionCell: {
      width: '33.33%',
      paddingHorizontal: SPACING.xs,
      marginBottom: SPACING.lg,
   },
   dashboardCard: {
      marginHorizontal: SPACING.xl,
      marginBottom: SPACING.md,
      ...cardBorder,
      ...SHADOWS.sm,
   },
   progressTrack: {
      height: 8,
      borderRadius: RADIUS.pill,
      backgroundColor: COLORS.surfaceMuted,
      marginTop: SPACING.md,
      overflow: 'hidden',
   },
   progressFill: {
      height: '100%',
      backgroundColor: COLORS.primary,
      borderRadius: RADIUS.pill,
   },
   walletAmount: {
      fontSize: 24,
      fontWeight: '700',
      color: COLORS.textPrimary,
      marginTop: SPACING.xs,
   },
   linkText: { marginTop: SPACING.sm, fontWeight: '600' },
   profileHint: { marginTop: SPACING.xs },
   guestHero: {
      marginHorizontal: SPACING.xl,
      marginTop: SPACING.lg,
      marginBottom: SPACING.xl,
      padding: SPACING.xl,
      backgroundColor: COLORS.primaryLight,
      borderRadius: RADIUS.xl,
      borderWidth: 1,
      borderColor: COLORS.primaryMuted,
      overflow: 'hidden',
      ...SHADOWS.md,
   },
   guestHeroDecor: {
      position: 'absolute',
      top: -40,
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: 'rgba(93, 188, 210, 0.15)',
   },
   guestHeroTop: {
      alignItems: 'center',
      marginBottom: SPACING.lg,
      gap: SPACING.md,
   },
   guestHeroCopy: {
      flex: 1,
      paddingEnd: SPACING.sm,
   },
   guestHeroTitle: {
      color: COLORS.primaryDark,
      marginBottom: SPACING.sm,
      lineHeight: 28,
   },
   guestHeroSub: {
      lineHeight: 20,
      marginBottom: SPACING.md,
   },
   trustRow: {
      flexWrap: 'wrap',
      gap: SPACING.sm,
   },
   trustChip: {
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.65)',
      paddingHorizontal: SPACING.sm,
      paddingVertical: SPACING.xs,
      borderRadius: RADIUS.pill,
      gap: 4,
   },
   trustChipIcon: {
      width: 16,
      height: 16,
      tintColor: COLORS.primaryDark,
   },
   trustChipText: {
      fontWeight: '600',
      color: COLORS.primaryDark,
      fontSize: 11,
   },
   guestHeroLottie: {
      width: 88,
      height: 88,
   },
   guestHeroBtn: {
      marginBottom: SPACING.sm,
   },
   guestBrowseLink: {
      alignItems: 'center',
      paddingVertical: SPACING.xs,
   },
   guestBrowseText: {
      fontWeight: '600',
      textDecorationLine: 'underline',
   },

   // Promos
   promoContainer: { marginBottom: SPACING.lg, paddingHorizontal: SPACING.xl },
   slider: { paddingHorizontal: 0 },
   promoCard: {
      width: PROMO_CARD_WIDTH,
      borderRadius: RADIUS.xl,
      paddingHorizontal: 22,
      paddingVertical: 18,
      alignItems: 'center',
      marginEnd: 15,
      overflow: 'hidden',
      ...SHADOWS.md,
   },
   promoTextBlock: { flex: 1, justifyContent: 'center', paddingEnd: 8 },
   promoEyebrow: {
      fontSize: 9,
      fontWeight: '700',
      color: 'rgba(255,255,255,0.72)',
      letterSpacing: 1.1,
      marginBottom: 6,
   },
   promoTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginBottom: 6, lineHeight: 22 },
   promoSub: { fontSize: 12, color: 'rgba(255,255,255,0.88)', marginBottom: 14, lineHeight: 17 },
   promoBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 6,
      backgroundColor: 'rgba(255,255,255,0.22)',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: RADIUS.pill,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.35)',
   },
   promoBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
   promoBtnChevron: { width: 10, height: 10, tintColor: '#FFFFFF' },
   promoVisual: {
      width: 104,
      height: 104,
      alignItems: 'center',
      justifyContent: 'center',
   },
   promoRingOuter: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: 'rgba(255,255,255,0.16)',
      alignItems: 'center',
      justifyContent: 'center',
   },
   promoRingInner: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: 'rgba(255,255,255,0.28)',
      alignItems: 'center',
      justifyContent: 'center',
   },
   promoIconImg: {
      width: 32,
      height: 32,
      tintColor: '#FFFFFF',
   },

   // Pagination
   paginationContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10 },
   paginationDot: { width: 7, height: 7, borderRadius: 4, marginHorizontal: 3 },

   // Widget
   section: { paddingHorizontal: SPACING.xl, marginBottom: SPACING.xxl },
   widgetCard: {
      backgroundColor: COLORS.surface,
      padding: SPACING.xl,
      borderRadius: RADIUS.lg,
      ...SHADOWS.sm,
      ...cardBorder,
   },
   widgetTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary },
   widgetSub: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 15 },
   helpTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.primary, marginBottom: 4 },
   helpSubtitle: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 16 },
   issueGrid: { flexWrap: 'wrap', gap: 12, justifyContent: 'flex-start' },
   issueItem: { alignItems: 'center', width: (Dimensions.get('window').width - 40 - 36) / 4 },
   issueIconCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: COLORS.primaryLight,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 6,
      borderWidth: 1,
      borderColor: COLORS.primaryMuted,
   },
   issueIcon: { width: 32, height: 32 },
   issueText: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 15 },
   viewAllBtn: {
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: SPACING.md,
      gap: SPACING.xs,
   },
   viewAllText: { fontWeight: '700' },
   viewAllChevron: { width: 12, height: 12, tintColor: COLORS.primary },
   findMoreBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.md,
      paddingVertical: 14,
      marginTop: 14,
      borderWidth: 1.5,
      borderColor: COLORS.primary,
      gap: 8,
      ...SHADOWS.sm,
   },
   findMoreText: { color: COLORS.primary, fontSize: 15, fontWeight: '700' },
   findMoreIcon: { width: 16, height: 16, tintColor: COLORS.primary },
   findMoreChevron: { width: 12, height: 12, tintColor: COLORS.primary },
   errorText: { fontSize: 12, color: COLORS.error || '#FF0000', textAlign: 'center' },
   errorContainer: { padding: 20, alignItems: 'center', justifyContent: 'center' },
   mainBtn: { backgroundColor: COLORS.primary, padding: 15, borderRadius: RADIUS.md, alignItems: 'center', ...SHADOWS.primary },

   // Doctors
   sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 15 },
   docSlider: { marginHorizontal: -SPACING.xl },
   docSliderContent: { paddingHorizontal: SPACING.xl },
   docCard: {
      width: 148,
      backgroundColor: COLORS.surface,
      padding: SPACING.md,
      borderRadius: RADIUS.lg,
      marginEnd: 10,
      marginBottom: 10,
      ...SHADOWS.sm,
      ...cardBorder,
   },
   docImg: { width: '100%', height: 100, borderRadius: 10, marginBottom: 8, backgroundColor: COLORS.gray200 },
   docName: { fontSize: 14, fontWeight: 'bold', color: COLORS.textPrimary },
   docSpecialty: { fontSize: 12, color: COLORS.textSecondary, marginVertical: 2 },
   ratingRow: { alignItems: 'center', gap: 4 },
   ratingText: { fontSize: 12, fontWeight: 'bold', color: COLORS.textPrimary },
   bookNowBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, paddingVertical: 7, paddingHorizontal: 12, alignItems: 'center', marginTop: 8 },
   bookNowText: { color: COLORS.white, fontSize: 12, fontWeight: '600' },

   // Support
   supportCard: {
      backgroundColor: COLORS.surface,
      padding: SPACING.xl,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: COLORS.primaryMuted,
      justifyContent: 'space-between',
      alignItems: 'center',
      ...SHADOWS.sm,
   },
   supportTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.secondary },
   supportSub: { fontSize: 12, color: COLORS.textSecondary, marginVertical: 5 },
   pillBtn: { backgroundColor: COLORS.secondary, paddingHorizontal: 15, paddingVertical: 8, borderRadius: RADIUS.pill, marginTop: 5 },
   pillBtnText: { color: COLORS.white, fontSize: 12, fontWeight: '600' },
   giftImg: { width: 60, height: 60 },

   // Join
   joinContainer: {
      marginHorizontal: SPACING.xl,
      padding: SPACING.xl,
      backgroundColor: COLORS.primaryLight,
      borderRadius: RADIUS.lg,
      justifyContent: 'space-between',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: COLORS.primaryMuted,
      marginBottom: SPACING.xl,
   },
   joinTitle: { fontSize: 16, fontWeight: '700', color: COLORS.primaryDark },
   joinSub: { fontSize: 12, color: COLORS.textSecondary },

   // Upcoming Appointment
   appointmentHeaderRow: {
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
   },
   timeBadge: {
      borderWidth: 1,
      borderColor: COLORS.primary,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 4,
   },
   timeBadgeText: {
      fontSize: 12,
      color: COLORS.primary,
      fontWeight: '500',
   },
   timeBadgeOngoing: {
      backgroundColor: '#22C55E',
      borderColor: '#22C55E',
   },
   timeBadgeTextOngoing: {
      color: COLORS.white,
   },
   appointmentCard: {
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.lg,
      flexDirection: 'row',
      overflow: 'hidden',
      ...SHADOWS.sm,
      ...cardBorder,
   },
   rescheduledPayBanner: {
      backgroundColor: '#FFF3E0',
      marginHorizontal: 12,
      marginBottom: 8,
      padding: 10,
      borderRadius: 8,
   },
   rescheduledPayText: {
      color: '#E65100',
      fontSize: 12,
      fontWeight: '600',
      textAlign: 'center',
   },
   appointmentAccent: {
      width: 4,
      backgroundColor: COLORS.primary,
   },
   appointmentContent: {
      flex: 1,
      padding: 14,
      alignItems: 'center',
      gap: 12,
   },
   appointmentDoctorImgContainer: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: COLORS.promo1,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
   },
   appointmentDoctorImg: {
      width: 56,
      height: 56,
      borderRadius: 28,
   },
   appointmentInfo: {
      flex: 1,
   },
   appointmentDoctorName: {
      fontSize: 16,
      fontWeight: '600',
      color: COLORS.textPrimary,
   },
   appointmentSpecialty: {
      fontSize: 13,
      color: COLORS.textSecondary,
      marginTop: 2,
   },
   appointmentBadges: {
      marginTop: 8,
      gap: 8,
   },
   appointmentBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.gray100,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 14,
      gap: 5,
   },
   badgeIcon: {
      width: 16,
      height: 16,
      tintColor: COLORS.textSecondary,
   },
   badgeText: {
      fontSize: 12,
      color: COLORS.textPrimary,
      fontWeight: '500',
   },
   videoIconBtn: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: COLORS.primary,
      justifyContent: 'center',
      alignItems: 'center',
   },
   videoIconImg: {
      width: 26,
      height: 26,
      tintColor: COLORS.white,
   },
});

export default HomeScreen;