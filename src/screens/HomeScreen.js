
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, Linking, FlatList, Dimensions, Alert } from 'react-native';
import LottieView from 'lottie-react-native';
import { useNavigation } from '@react-navigation/native';
import { useLanguage } from '../store/LanguageContext';
import { getDynamicData } from '../utils/dataHelper';
import { useGetAllPromotions } from '../api/services/Public.Service';
import { useGetSearchFilters, useSearchProviders } from '../api/services/Search.Service';
import { useGetUpcomingAppointments } from '../api/services/Appointment.Service';
import { useAuthStore } from '../store/authStore';
import Header from '../components/Header';
import Skeleton from '../components/Skeleton';
import ICONS from '../constants/icons';
import COLORS from '../constants/colors';
import moment from 'moment-timezone';
import { getNearestUpcomingAppointment } from '../utils/appointmentFilters';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PROMO_CARD_WIDTH = SCREEN_WIDTH - 40;

const PROMO_THEMES = [
  { bg: '#5DBCD2', anim: require('../assets/animations/promo-pulse.json') },
  { bg: '#4F46E5', anim: require('../assets/animations/promo-dots.json') },
  { bg: '#B45309', anim: require('../assets/animations/promo-orbit.json') },
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

const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const HomeScreen = () => {
   const navigation = useNavigation();
   const { t, isRTL } = useLanguage();
   const data = getDynamicData(isRTL);
   const rowStyle = { flexDirection: isRTL ? 'row-reverse' : 'row' };
   const alignText = { textAlign: isRTL ? 'right' : 'left' };

   const [currentPromoIndex, setCurrentPromoIndex] = useState(0);
   const [nowTick, setNowTick] = useState(0);
   const promoFlatListRef = useRef(null);
   const autoScrollTimer = useRef(null);

   // Check if user is logged in
   const { user, isAuthenticated } = useAuthStore();
   const isLoggedIn = isAuthenticated && user;
   const isPatient = user?.role?.toLowerCase() === 'patient';

   // Fetch upcoming appointments (only for logged in users)
   const { data: upcomingAppointments } = useGetUpcomingAppointments();

   // Refresh join-window UI every 30 seconds
   useEffect(() => {
      const interval = setInterval(() => setNowTick(Date.now()), 30000);
      return () => clearInterval(interval);
   }, []);

   const nearestAppointment = useMemo(
      () => getNearestUpcomingAppointment(upcomingAppointments),
      [upcomingAppointments, nowTick]
   );

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

   // Prepare providers for display - filter active only, then randomly select 5
   const displayProviders = React.useMemo(() => {
      if (!providersData || providersData.length === 0) return [];
      // Backend returns active+published providers sorted by rating
      // Shuffle top 10 and pick 5 for variety
      const shuffled = shuffleArray([...providersData].slice(0, 10));
      return shuffled.slice(0, 5);
   }, [providersData]);

   const promoCards = useMemo(
      () => promotionsData ? promotionsData.filter(p => p.status === 'active') : [],
      [promotionsData]
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

   // Render promo card
   const renderPromoCard = ({ item, index }) => {
      const { bg, anim } = PROMO_THEMES[index % PROMO_THEMES.length];
      const title = item.title || t.home?.defaultPromoTitle || 'Your Health, Our Priority';
      const subtitle = item.subtitle || t.home?.defaultPromoSubtitle || 'Book your session today';

      return (
         <View style={[styles.promoCard, { backgroundColor: bg, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.promoTextBlock, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
               <Text style={[styles.promoTitle, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>{title}</Text>
               <Text style={[styles.promoSub, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>{subtitle}</Text>
               <TouchableOpacity
                  style={styles.promoBtn}
                  onPress={() => navigation.navigate('Main', { screen: 'SearchTab' })}
               >
                  <Text style={styles.promoBtnText}>{t.home?.readMore || 'Read More'}</Text>
               </TouchableOpacity>
            </View>
            <LottieView source={anim} autoPlay loop style={styles.promoLottie} />
         </View>
      );
   };

   return (
      <View style={styles.container}>
         <Header showProfile title={data.user} />
         <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

            {/* Zone 1: Promo Slider with Auto-scroll - Only show if promotions exist */}
            {promoCards.length > 0 && (
               <View style={styles.promoContainer}>
                  <FlatList
                     ref={promoFlatListRef}
                     data={promoCards}
                     renderItem={renderPromoCard}
                     keyExtractor={(item) => item._id || item.id}
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
                     removeClippedSubviews={true}
                     getItemLayout={(data, index) => ({
                        length: PROMO_CARD_WIDTH + 15,
                        offset: (PROMO_CARD_WIDTH + 15) * index,
                        index,
                     })}
                  />

                  {/* Pagination Dots */}
                  {promoCards.length > 1 && (
                     <View style={styles.paginationContainer}>
                        {promoCards.map((_, index) => (
                           <TouchableOpacity
                              key={index}
                              onPress={() => {
                                 setCurrentPromoIndex(index);
                                 promoFlatListRef.current?.scrollToIndex({
                                    index,
                                    animated: true,
                                 });
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

            {/* Upcoming Appointment - Only for logged in users */}
            {isLoggedIn && nearestAppointment && (() => {
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
                  if (diffMinutes < 60) return t('home.inMinutes', { count: diffMinutes }) || `In ${diffMinutes} min`;
                  if (diffHours < 24) return t('home.inHours', { count: diffHours }) || `In ${diffHours} hours`;
                  return t('home.inDays', { count: diffDays }) || `In ${diffDays} days`;
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
                                 onPress={() => {
                                    navigation.navigate('VideoConsultation', {
                                       meetingRoomId: nearestAppointment.roomId,
                                       userID: String(user?.id || user?._id),
                                       userName: user?.fullName || user?.fullNameArabic || 'Patient',
                                    });
                                 }}
                              >
                                 <Image source={ICONS.video || ICONS.camera} style={styles.videoIconImg} />
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
                                 {isRTL
                                    ? `يرجى إتمام الدفع قبل ${moment(nearestAppointment.expiresAt).format('h:mm A')} للحفاظ على موعدك`
                                    : `Complete payment by ${moment(nearestAppointment.expiresAt).format('h:mm A')} to keep your slot`}
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

            {/* Zone 2: How Can We Help You? */}
            <View style={styles.section}>
               <Text style={[styles.helpTitle, alignText]}>
                  {t.home?.howCanWeHelp || 'How Can We Help You?'}
               </Text>
               <Text style={[styles.helpSubtitle, alignText]}>
                  {t.home?.chooseCondition || 'Choose what describes you, and we\'ll help you find the right support'}
               </Text>
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
                     displayIssues.map(issue => (
                        <TouchableOpacity
                           key={issue._id || issue.id}
                           style={styles.issueItem}
                           onPress={() => navigation.navigate('FindTherapist', { preSelectedIssue: issue._id || issue.id })}
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
            </View>

            {/* Zone 3: Top Providers */}
            <View style={styles.section}>
               <Text style={[styles.sectionTitle, alignText]}>{t.home?.topProviders || 'Top Providers'}</Text>
               <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.docSlider}
               >
                  {isProvidersLoading ? (
                     // Skeleton Loading State
                     Array.from({ length: 5 }).map((_, index) => (
                        <View key={index} style={[styles.docCard, { marginEnd: 10 }]}>
                           <Skeleton width="100%" height={100} style={{ marginBottom: 8, borderRadius: 10 }} />
                           <Skeleton width="80%" height={14} style={{ marginBottom: 4 }} />
                           <Skeleton width="60%" height={12} />
                        </View>
                     ))
                  ) : providersError ? (
                     // Error State
                     <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>
                           {t.home?.providersError || 'Error loading providers'}
                        </Text>
                     </View>
                  ) : displayProviders.length === 0 ? (
                     // Empty State
                     <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>
                           {t.home?.noProviders || 'No providers available'}
                        </Text>
                     </View>
                  ) : (
                     // Display randomly selected 5 providers
                     displayProviders.map(provider => {
                        const specialtyName = isRTL
                           ? (provider.specialty?.nameArabic || 'غير محدد')
                           : (provider.specialty?.nameEnglish || 'Not specified');

                        return (
                           <TouchableOpacity
                              key={provider.id}
                              style={styles.docCard}
                              activeOpacity={0.8}
                              onPress={() => navigation.navigate('TherapistProfile', { providerId: provider.id || provider._id })}
                           >
                              <Image
                                 source={provider.profileImage ? { uri: provider.profileImage } : ICONS.defaultAvatar}
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
                              <TouchableOpacity
                                 style={styles.bookNowBtn}
                                 onPress={() => navigation.navigate('TherapistProfile', { providerId: provider.id || provider._id })}
                              >
                                 <Text style={styles.bookNowText}>{t.home?.bookNow || 'Book Now'}</Text>
                              </TouchableOpacity>
                           </TouchableOpacity>
                        );
                     })
                  )}
               </ScrollView>
               <TouchableOpacity
                  style={styles.findMoreBtn}
                  onPress={() => navigation.navigate('Search')}
                  activeOpacity={0.8}
               >
                  <Image source={ICONS.search} style={styles.findMoreIcon} />
                  <Text style={styles.findMoreText}>{t.home?.findMore || 'Find More Providers'}</Text>
                  <Image source={ICONS.chevronRight} style={styles.findMoreChevron} />
               </TouchableOpacity>
            </View>

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

            {/* Zone 5: Join Us */}
            <TouchableOpacity style={[styles.joinContainer, rowStyle]} onPress={openJoinUs}>
               <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                  <Text style={styles.joinTitle}>{t.home?.joinUs || 'Join Us'}</Text>
                  <Text style={styles.joinSub}>{t.home?.joinSub || 'Join our network of healthcare professionals'}</Text>
               </View>
               <Image source={ICONS.general} style={{ width: 30, height: 30, tintColor: COLORS.darkSlateBlue }} />
            </TouchableOpacity>
         </ScrollView>
      </View>
   );
};

const styles = StyleSheet.create({
   container: { flex: 1, backgroundColor: COLORS.background },

   // Promos
   promoContainer: { marginTop: 20, marginBottom: 15 },
   slider: { paddingHorizontal: 20 },
   promoCard: { width: PROMO_CARD_WIDTH, height: 165, borderRadius: 20, paddingHorizontal: 22, paddingVertical: 18, alignItems: 'center', marginEnd: 15, overflow: 'hidden' },
   promoTextBlock: { flex: 1, justifyContent: 'center', paddingEnd: 8 },
   promoTitle: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 5, lineHeight: 21 },
   promoSub: { fontSize: 11, color: 'rgba(255,255,255,0.82)', marginBottom: 14, lineHeight: 16 },
   promoBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', alignSelf: 'flex-start' },
   promoBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
   promoLottie: { width: 110, height: 110 },

   // Pagination
   paginationContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10 },
   paginationDot: { width: 7, height: 7, borderRadius: 4, marginHorizontal: 3 },

   // Widget
   section: { paddingHorizontal: 20, marginBottom: 25 },
   widgetCard: { backgroundColor: COLORS.white, padding: 20, borderRadius: 16, elevation: 3, shadowColor: COLORS.shadow, shadowOpacity: 0.05, shadowRadius: 10 },
   widgetTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary },
   widgetSub: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 15 },
   helpTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.primary, marginBottom: 4 },
   helpSubtitle: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 16 },
   issueGrid: { flexWrap: 'wrap', gap: 12, justifyContent: 'flex-start' },
   issueItem: { alignItems: 'center', width: (Dimensions.get('window').width - 40 - 36) / 4 },
   issueIconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.promo1, justifyContent: 'center', alignItems: 'center', marginBottom: 6, borderWidth: 1, borderColor: COLORS.primary + '20' },
   issueIcon: { width: 32, height: 32 },
   issueText: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 15 },
   findMoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.white, borderRadius: 12, paddingVertical: 14, marginTop: 14, borderWidth: 1.5, borderColor: COLORS.primary, gap: 8 },
   findMoreText: { color: COLORS.primary, fontSize: 15, fontWeight: '700' },
   findMoreIcon: { width: 16, height: 16, tintColor: COLORS.primary },
   findMoreChevron: { width: 12, height: 12, tintColor: COLORS.primary },
   errorText: { fontSize: 12, color: COLORS.error || '#FF0000', textAlign: 'center' },
   errorContainer: { padding: 20, alignItems: 'center', justifyContent: 'center' },
   mainBtn: { backgroundColor: COLORS.primary, padding: 15, borderRadius: 12, alignItems: 'center' },
   mainBtnText: { color: COLORS.white, fontWeight: 'bold', fontSize: 16 },

   // Doctors
   sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 15 },
   docSlider: { marginHorizontal: -20, paddingHorizontal: 20 },
   docCard: { width: 140, backgroundColor: COLORS.white, padding: 10, borderRadius: 12, marginEnd: 10, elevation: 2, shadowColor: COLORS.shadow, shadowOpacity: 0.05, marginBottom: 10 },
   docImg: { width: '100%', height: 100, borderRadius: 10, marginBottom: 8, backgroundColor: COLORS.gray200 },
   docName: { fontSize: 14, fontWeight: 'bold', color: COLORS.textPrimary },
   docSpecialty: { fontSize: 12, color: COLORS.textSecondary, marginVertical: 2 },
   ratingRow: { alignItems: 'center', gap: 4 },
   ratingText: { fontSize: 12, fontWeight: 'bold', color: COLORS.textPrimary },
   bookNowBtn: { backgroundColor: COLORS.primary, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12, alignItems: 'center', marginTop: 8 },
   bookNowText: { color: COLORS.white, fontSize: 12, fontWeight: '600' },

   // Support
   supportCard: { backgroundColor: COLORS.white, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: COLORS.promo1, justifyContent: 'space-between', alignItems: 'center' },
   supportTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.secondary },
   supportSub: { fontSize: 12, color: COLORS.textSecondary, marginVertical: 5 },
   pillBtn: { backgroundColor: COLORS.secondary, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, marginTop: 5 },
   pillBtnText: { color: COLORS.white, fontSize: 12, fontWeight: '600' },
   giftImg: { width: 60, height: 60 },

   // Join
   joinContainer: { marginHorizontal: 20, padding: 20, backgroundColor: COLORS.lavender, borderRadius: 16, justifyContent: 'space-between', alignItems: 'center' },
   joinTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.darkSlateBlue },
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
      backgroundColor: COLORS.white,
      borderRadius: 12,
      flexDirection: 'row',
      overflow: 'hidden',
      elevation: 2,
      shadowColor: COLORS.shadow,
      shadowOpacity: 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
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
      width: 14,
      height: 14,
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
      width: 22,
      height: 22,
      tintColor: COLORS.white,
   },
});

export default HomeScreen;