import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, TextInput, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../store/LanguageContext';
import Header from '../components/Header';
import COLORS from '../constants/colors';
import ICONS from '../constants/icons';
import { useAuthStore } from '../store/authStore';
import { useGetUserProfile } from '../api/services/User.Service';
import { useGetAvailabilityByProviderId, useGetSlots } from '../api/services/Availablity.Service';
import { useCreateAppointment } from '../api/services/Appointment.Service';
import { getRequest } from '../api';
// Removed private file imports - credentials section removed from UI
import moment from 'moment-timezone';

// Styles for memoized components (defined first so they can be used by components)
const sectionHeaderStyles = StyleSheet.create({
   iconCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.promo1, alignItems: 'center', justifyContent: 'center', marginHorizontal: 8 },
   headerIcon: { width: 14, height: 14, tintColor: COLORS.primary },
   sectionTitle: { fontSize: 15, fontWeight: 'bold', color: COLORS.textPrimary },
});

const dateItemStyles = StyleSheet.create({
   dateBox: { width: 65, height: 75, borderRadius: 14, borderWidth: 1, borderColor: COLORS.gray200, alignItems: 'center', justifyContent: 'center', marginHorizontal: 5, backgroundColor: COLORS.white },
   activeDate: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
   dayText: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 5 },
   dateText: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary },
   activeText: { color: COLORS.white },
});

const slotItemStyles = StyleSheet.create({
   slotBtn: { width: '30%', paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.gray200, alignItems: 'center', backgroundColor: COLORS.white, marginBottom: 10 },
   activeSlot: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
   slotText: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary },
   activeText: { color: COLORS.white },
});

// Memoized SectionHeader component - moved outside to prevent recreation on every render
const SectionHeader = React.memo(({ icon, title, rowStyle, alignText }) => (
   <View style={[rowStyle, { alignItems: 'center', marginBottom: 10 }]}>
      <View style={sectionHeaderStyles.iconCircle}>
         <Image source={icon} style={sectionHeaderStyles.headerIcon} />
      </View>
      <Text style={[sectionHeaderStyles.sectionTitle, alignText]}>{title}</Text>
   </View>
));

// Memoized DateItem component
const DateItem = React.memo(({ item, isSelected, isRTL, onPress }) => (
   <TouchableOpacity
      style={[
         dateItemStyles.dateBox,
         isSelected && dateItemStyles.activeDate,
         isRTL && { transform: [{ scaleX: -1 }] }
      ]}
      onPress={onPress}
   >
      <Text style={[dateItemStyles.dayText, isSelected && dateItemStyles.activeText]}>{item.weekday}</Text>
      <Text style={[dateItemStyles.dateText, isSelected && dateItemStyles.activeText]}>{item.day}</Text>
   </TouchableOpacity>
));

// Memoized SlotItem component
const SlotItem = React.memo(({ slot, isSelected, isRTL, onPress }) => (
   <TouchableOpacity
      style={[slotItemStyles.slotBtn, isSelected && slotItemStyles.activeSlot]}
      onPress={onPress}
   >
      <Text style={[slotItemStyles.slotText, isSelected && slotItemStyles.activeText]}>
         {isRTL ? slot.formattedTimeAr : slot.formattedTime}
      </Text>
   </TouchableOpacity>
));

const DoctorProfileScreen = () => {
   const navigation = useNavigation();
   const route = useRoute();
   const { t, isRTL } = useLanguage();
   const insets = useSafeAreaInsets();

   // Get current user from auth store
   const { user, isAuthenticated, token } = useAuthStore();

   // --- Get doctor from route params ---
   const { doctor } = route.params || {};

   // --- API Calls ---
   // Use optional chaining to prevent crashes when doctor is undefined
   const { data: userProfile, isLoading: isLoadingProfile, error: profileError } = useGetUserProfile(doctor?.id);
   const { data: availabilityData, isLoading: isLoadingAvailability, error: availabilityError } = useGetAvailabilityByProviderId(doctor?.id);
   const { mutateAsync: createAppointment, isPending: isCreatingAppointment } = useCreateAppointment();

   // Removed private file hooks - credentials section removed from UI

   // Validate doctor data AFTER all hooks are called (Rules of Hooks)
   useEffect(() => {
      if (!doctor || !doctor.id) {
         Alert.alert('Error', 'Doctor information not available');
         navigation.goBack();
      }
   }, [doctor, navigation]);

   // Log errors for debugging
   useEffect(() => {
      if (profileError) {
         console.error('Profile Error:', profileError);
      }
      if (availabilityError) {
         console.error('Availability Error:', availabilityError);
      }
   }, [profileError, availabilityError]);

   const [patientsCount, setPatientsCount] = useState(0);
   const [selectedDate, setSelectedDate] = useState(null);
   const [selectedTime, setSelectedTime] = useState(null);
   const [firstAvailableDate, setFirstAvailableDate] = useState(null);
   const [reason, setReason] = useState('');

   // Memoize reason change handler to prevent re-renders
   const handleReasonChange = useCallback((text) => {
      setReason(text);
   }, []);

   // Memoize date selection handler
   const handleDateSelect = useCallback((fullDate) => {
      setSelectedDate(fullDate);
      setSelectedTime(null);
   }, []);

   // Memoize time selection handler
   const handleTimeSelect = useCallback((slot) => {
      setSelectedTime(slot);
   }, []);

   // Ref for ScrollView only
   const scrollViewRef = useRef(null);

   // --- Fetch Patients Count ---
   useEffect(() => {
      const getPatientsCount = async () => {
         try {
            const response = await getRequest(`/relation/patients/count/${doctor?.id}`);
            if (response.data.data.count) {
               setPatientsCount(response.data.data.count);
            }
         } catch (error) {
            console.log('Error fetching patients count:', error);
         }
      };
      getPatientsCount();
   }, [doctor?.id]);

   // --- Fetch Slots for Selected Date ---
   // Memoize currentTime - only update when selectedDate changes, not on every render
   const [currentTime] = useState(() => moment().locale('en').format('YYYY-MM-DD HH:mm:ss'));
   const shouldFetchSlots = !!(selectedDate && availabilityData?.timezone && doctor?.id);

   // Memoize the query object to prevent unnecessary refetches
   const slotsQuery = useMemo(() => ({
      date: selectedDate && availabilityData?.timezone
         ? moment(selectedDate).locale('en').tz(availabilityData.timezone).format('YYYY-MM-DD')
         : selectedDate
         ? moment(selectedDate).locale('en').format('YYYY-MM-DD')
         : null,
      slotDuration: doctor?.slotDuration,
      currentTime: currentTime,
   }), [selectedDate, availabilityData?.timezone, doctor?.slotDuration, currentTime]);

   const { data: slotsData, isLoading: isLoadingSlots, error: slotsError } = useGetSlots(
      doctor?.id,
      slotsQuery,
      {
         enabled: shouldFetchSlots,
         placeholderData: (previousData) => previousData,
         staleTime: 1000 * 60 * 5, // Data is fresh for 5 minutes
         gcTime: 1000 * 60 * 10,   // Keep in cache for 10 minutes
         refetchOnWindowFocus: false,
         refetchOnMount: false,
      }
   );

   // Log slots error
   useEffect(() => {
      if (slotsError) {
         console.error('Slots Error:', slotsError);
      }
   }, [slotsError]);

   // Use useMemo to prevent slots from flickering during re-renders
   // Pre-format time strings to avoid moment() calls during render
   const availableSlots = useMemo(() => {
      if (slotsData && slotsData.slots) {
         return slotsData.slots.map(slot => ({
            ...slot,
            // Always use 'en' locale for English numerals
            formattedTime: slot.startTime ? moment(slot.startTime).locale('en').format('h:mm A') : 'N/A',
            formattedTimeAr: slot.startTime ? moment(slot.startTime).locale('ar').format('h:mm A') : 'N/A',
         }));
      } else {
         return [];
      }
   }, [slotsData]);

   // --- Calculate first available date based on provider's availability ---
   useEffect(() => {
      if (availabilityData && availabilityData.availability && availabilityData.availability.length > 0) {
         // Get available days from provider's schedule
         const availableDays = availabilityData.availability.map(slot => slot.day.toLowerCase());

         // Find the first available date starting from today
         const today = new Date();
         let firstDate = null;

         for (let i = 0; i < 14; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(today.getDate() + i);
            const dayName = checkDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

            // Check if this day is in the provider's availability schedule
            if (availableDays.includes(dayName)) {
               firstDate = checkDate;
               break;
            }
         }

         if (firstDate) {
            setFirstAvailableDate(firstDate);
            if (!selectedDate) {
               setSelectedDate(firstDate);
            }
         } else {
            // If no available day found in next 2 weeks, default to today
            setFirstAvailableDate(today);
            if (!selectedDate) {
               setSelectedDate(today);
            }
         }
      } else if (!selectedDate) {
         // If no availability data, default to today
         const today = new Date();
         setFirstAvailableDate(today);
         setSelectedDate(today);
      }
   }, [availabilityData]);

   // --- Dynamic Date Generation (Localized) - Memoized ---
   const availableDates = useMemo(() => {
      const days = [];
      const startDate = firstAvailableDate || new Date();
      const locale = isRTL ? 'ar-SA' : 'en-US';
      const timezone = availabilityData?.timezone;

      for (let i = 0; i < 14; i++) {
         const d = new Date(startDate);
         d.setDate(startDate.getDate() + i);

         // If we have provider timezone, use it to determine the actual date in their timezone
         let providerDate;
         try {
            providerDate = timezone ? moment(d).tz(timezone) : moment(d);

            // Ensure providerDate is valid
            if (!providerDate || !providerDate.isValid || !providerDate.isValid()) {
               providerDate = moment(d);
            }
         } catch (error) {
            console.warn('Error creating moment with timezone:', error);
            providerDate = moment(d);
         }

         // Double-check before formatting
         let dayValue = String(i + 1);
         let weekdayValue = d.toLocaleDateString(locale, { weekday: 'short' });

         try {
            if (providerDate && providerDate.format) {
               // Always use 'en' locale for day number to get Western numerals
               dayValue = providerDate.locale('en').format('D');
            }
            if (providerDate && providerDate.locale) {
               // Use appropriate locale for weekday name only
               const localizedDate = providerDate.locale(isRTL ? 'ar' : 'en');
               if (localizedDate && localizedDate.format) {
                  weekdayValue = localizedDate.format('ddd');
               }
            }
         } catch (err) {
            console.warn('Error formatting date:', err);
         }

         days.push({
            day: dayValue,
            weekday: weekdayValue,
            fullDate: d // Keep original date object for selection
         });
      }
      return days;
   }, [firstAvailableDate, isRTL, availabilityData?.timezone]);

   const hasSlots = availableSlots.length > 0;

   // --- Styles Helpers - Memoized ---
   const alignText = useMemo(() => ({ textAlign: isRTL ? 'right' : 'left' }), [isRTL]);
   const rowStyle = useMemo(() => ({ flexDirection: isRTL ? 'row-reverse' : 'row' }), [isRTL]);

   // --- Prepare display data ---
   // Helper function to safely get string value
   const getStringValue = (value, fallback = '') => {
      if (typeof value === 'string') return value;
      if (typeof value === 'number') return String(value);
      return fallback;
   };

   // Helper function to convert language codes to full names
   const getLanguageFullName = (langCode) => {
      const languageMap = {
         'ar': isRTL ? 'العربية' : 'Arabic',
         'en': isRTL ? 'الإنجليزية' : 'English',
         'arabic': isRTL ? 'العربية' : 'Arabic',
         'english': isRTL ? 'الإنجليزية' : 'English',
      };
      return languageMap[langCode.toLowerCase()] || langCode;
   };

   // Helper function to translate gender
   const translateGender = (gender) => {
      if (!gender) return 'N/A';
      const genderMap = {
         'male': isRTL ? 'ذكر' : 'Male',
         'female': isRTL ? 'أنثى' : 'Female',
         'm': isRTL ? 'ذكر' : 'Male',
         'f': isRTL ? 'أنثى' : 'Female',
      };
      return genderMap[gender.toLowerCase()] || gender;
   };

   const displayData = useMemo(() => ({
      name: getStringValue(
         isRTL
            ? (doctor?.fullNameArabic || userProfile?.fullNameArabic || doctor?.fullName)
            : (doctor?.fullNameEnglish || userProfile?.fullNameEnglish || doctor?.fullName),
         isRTL ? 'طبيب غير معروف' : 'Unknown Doctor'
      ),
      specialty: isRTL
         ? getStringValue(userProfile?.specialty?.nameArabic || doctor?.specialty?.nameArabic, 'غير محدد')
         : getStringValue(userProfile?.specialty?.nameEnglish || doctor?.specialty?.nameEnglish, 'Not specified'),
      img: doctor?.profileImage,
      experience: getStringValue(userProfile?.experience, '0'),
      gender: translateGender(userProfile?.gender),
      // Use bilingual fields for about section
      about: getStringValue(
         isRTL
            ? (userProfile?.professionalSummaryArabic || userProfile?.professionalSummary || doctor?.professionalSummaryArabic || doctor?.professionalSummary)
            : (userProfile?.professionalSummaryEnglish || userProfile?.professionalSummary || doctor?.professionalSummaryEnglish || doctor?.professionalSummary),
         isRTL ? 'لا توجد معلومات متاحة' : 'No information available'
      ),
      // Languages as array for pill display - fallback to doctor data if userProfile not available
      languagesArray: (() => {
         const languages = userProfile?.spokenLanguages || doctor?.spokenLanguages;
         if (!languages) return [];
         if (Array.isArray(languages)) {
            return languages.map(lang => getLanguageFullName(lang));
         }
         return [getLanguageFullName(languages)];
      })(),
      // Use bilingual fields for education section - fallback to doctor data
      education: getStringValue(
         isRTL
            ? (userProfile?.educationAndCertificationsArabic || userProfile?.educationAndCertifications || doctor?.educationAndCertificationsArabic || doctor?.educationAndCertifications)
            : (userProfile?.educationAndCertificationsEnglish || userProfile?.educationAndCertifications || doctor?.educationAndCertificationsEnglish || doctor?.educationAndCertifications),
         isRTL ? 'غير محدد' : 'Not specified'
      ),
   }), [doctor, userProfile, isRTL]);

   const handleBook = async () => {
      // Validate that both date and time slot are selected
      if (!selectedDate) {
         Alert.alert(isRTL ? 'خطأ' : 'Error', isRTL ? 'الرجاء اختيار التاريخ' : 'Please select a date');
         return;
      }

      if (!selectedTime) {
         Alert.alert(isRTL ? 'خطأ' : 'Error', isRTL ? 'الرجاء اختيار وقت' : 'Please select a time slot');
         return;
      }

      // Validate that doctor has providerService before proceeding
      if (!doctor.providerService) {
         console.error('❌ Doctor missing providerService:', doctor);
         Alert.alert(
            isRTL ? 'خطأ' : 'Error',
            isRTL ? 'معلومات الطبيب غير مكتملة. الرجاء المحاولة مرة أخرى' : 'Doctor information incomplete. Please try again.'
         );
         return;
      }

      // Check authentication first
      if (!isAuthenticated) {
         // User NOT logged in -> Go to Login with return params
         const formattedDate = moment(selectedDate).locale('en').format('YYYY-MM-DD');
         const formattedTime = selectedTime.startTime ? moment(selectedTime.startTime).locale('en').format('h:mm A') : 'N/A';

         console.log('🔐 User not authenticated - navigating to login with booking data:', {
            doctorId: doctor.id,
            providerService: doctor.providerService,
            date: formattedDate,
            time: formattedTime
         });

         navigation.navigate('LoginScreen', {
            targetScreen: 'DoctorProfile',
            targetParams: {
               doctor: doctor,
               // Save selected date/time/reason to restore after login
               preSelectedDate: formattedDate,
               preSelectedTime: selectedTime,
               preSelectedReason: reason,
            }
         });
         return;
      }

      // Validate reason for visit
      if (!reason || reason.trim() === '') {
         Alert.alert(
            isRTL ? 'خطأ' : 'Error',
            isRTL ? 'الرجاء إدخال سبب الزيارة' : 'Please enter the reason for your visit'
         );
         return;
      }

      // User is logged in -> Create appointment first
      try {
         // Validate all required fields before creating payload
         const userId = user?._id || user?.id;
         if (!userId || !user?.fullName) {
            console.error('❌ User validation failed - userId:', userId, 'fullName:', user?.fullName);
            throw new Error('User information incomplete. Please log in again.');
         }

         const doctorId = doctor?._id || doctor?.id;
         if (!doctorId || !doctor?.fullName || !doctor?.providerService) {
            throw new Error('Doctor information incomplete. Please try again.');
         }

         if (!selectedTime?.startTime || !selectedTime?.endTime) {
            throw new Error('Time slot information incomplete. Please select again.');
         }

         const bookingPayload = {
            patientName: user.fullName,
            providerName: doctor.fullName,
            date: selectedTime.date || moment(selectedDate).locale('en').format('YYYY-MM-DD'),
            startTime: selectedTime.startTime,
            endTime: selectedTime.endTime,
            provider: doctorId,
            patient: userId,
            reason: reason.trim(),
            providerService: doctor.providerService,
            currentTime: moment().locale('en').format('YYYY-MM-DD HH:mm:ss'),
            clientTz: moment.tz.guess(),
         };

         const newAppointment = await createAppointment(bookingPayload);

         if (newAppointment && (newAppointment.id || newAppointment._id)) {
            // Navigate to Checkout with appointment ID
            navigation.navigate('Checkout', {
               id: newAppointment.id || newAppointment._id,
            });
         } else {
            throw new Error('Failed to create appointment');
         }
      } catch (error) {
         console.error('❌ Error creating appointment:', error);
         console.error('Error details:', error?.response?.data);
         Alert.alert(
            isRTL ? 'خطأ' : 'Error',
            error?.response?.data?.message || error?.message || (isRTL ? 'فشل في حجز الموعد' : 'Failed to book appointment')
         );
      }
   };

   // Show loading state or error state if doctor data is missing
   if (!doctor || !doctor.id) {
      return (
         <View style={styles.container}>
            <Header showBack onBack={() => navigation.goBack()} title={getStringValue(t?.doctorProfile?.title, isRTL ? 'الأطباء' : 'Doctors')} />
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
               <ActivityIndicator size="large" color={COLORS.primary} />
               <Text style={{ marginTop: 10, color: COLORS.gray600 }}>
                  {isRTL ? 'جاري التحميل...' : 'Loading...'}
               </Text>
            </View>
         </View>
      );
   }

   if (isLoadingProfile || isLoadingAvailability) {
      return (
         <View style={styles.container}>
            <Header showBack onBack={() => navigation.goBack()} title={getStringValue(t?.doctorProfile?.title, isRTL ? 'الأطباء' : 'Doctors')} />
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
               <ActivityIndicator size="large" color={COLORS.primary} />
               <Text style={{ marginTop: 10, color: COLORS.gray600 }}>
                  {isRTL ? 'جاري التحميل...' : 'Loading...'}
               </Text>
            </View>
         </View>
      );
   }

   return (
      <View style={styles.container}>
         <Header showBack onBack={() => navigation.goBack()} title={getStringValue(t?.doctorProfile?.title, isRTL ? 'الأطباء' : 'Doctors')} />

         <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
         >
            <ScrollView
               ref={scrollViewRef}
               contentContainerStyle={{ paddingBottom: 200 }}
               keyboardShouldPersistTaps="handled"
               keyboardDismissMode="on-drag"
               showsVerticalScrollIndicator={false}
               nestedScrollEnabled={true}
            >

            {/* 1. Doctor Card */}
            <View style={styles.profileCard}>
               <View style={[rowStyle, { alignItems: 'center' }]}>
                  <Image source={displayData.img ? { uri: displayData.img } : ICONS.defaultAvatar} style={styles.avatar} />
                  <View style={{ marginHorizontal: 15, flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                     <Text style={[styles.docName, alignText]}>{displayData.name}</Text>
                     <Text style={[styles.docSpec, alignText]}>{displayData.specialty || (isRTL ? 'غير محدد' : 'Not specified')}</Text>
                  </View>
               </View>

               <View style={[styles.statsRow, isRTL && { flexDirection: 'row-reverse' }]}>
                  <View style={styles.statItem}>
                     <Text style={styles.statVal}>{displayData.experience}+</Text>
                     <Text style={styles.statLabel}>{getStringValue(t?.doctorProfile?.years, isRTL ? 'سنوات' : 'Years')}</Text>
                  </View>
                  <View style={styles.dividerV} />
                  <View style={styles.statItem}>
                     <Text style={styles.statVal}>{patientsCount > 0 ? `${patientsCount}+` : '0'}</Text>
                     <Text style={styles.statLabel}>{getStringValue(t?.doctorProfile?.patients, isRTL ? 'مرضى' : 'Patients')}</Text>
                  </View>
                  <View style={styles.dividerV} />
                  <View style={styles.statItem}>
                     <Text style={styles.statVal}>{displayData.gender}</Text>
                     <Text style={styles.statLabel}>{getStringValue(t?.doctorProfile?.gender, isRTL ? 'الجنس' : 'Gender')}</Text>
                  </View>
               </View>
            </View>

            {/* 2. Middle Sections (Details) */}
            <View style={styles.detailsContainer}>
               {/* About */}
               <View style={styles.detailBlock}>
                  <SectionHeader icon={ICONS.info} title={isRTL ? 'نبذة عن الطبيب' : 'About Doctor'} rowStyle={rowStyle} alignText={alignText} />
                  <View style={{ width: '100%' }}>
                     <Text style={[styles.bodyText, alignText, { writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{isRTL ? `\u200F${displayData.about}` : displayData.about}</Text>
                  </View>
               </View>
               <View style={styles.dividerH} />

               {/* Specializations */}
               <View style={styles.detailBlock}>
                  <SectionHeader icon={ICONS.star} title={isRTL ? 'التخصصات' : 'Specializations'} rowStyle={rowStyle} alignText={alignText} />
                  <View style={[styles.chipContainer, isRTL && { flexDirection: 'row-reverse' }]}>
                     <View style={styles.chip}>
                        <Text style={styles.chipText}>{displayData.specialty || (isRTL ? 'غير محدد' : 'Not specified')}</Text>
                     </View>
                  </View>
               </View>
               <View style={styles.dividerH} />

               {/* Languages */}
               <View style={styles.detailBlock}>
                  <SectionHeader icon={ICONS.globe} title={isRTL ? 'اللغات' : 'Languages'} rowStyle={rowStyle} alignText={alignText} />
                  <View style={[styles.languagesContainer, isRTL && { flexDirection: 'row-reverse' }]}>
                     {displayData.languagesArray.length > 0 ? (
                        displayData.languagesArray.map((lang, index) => (
                           <View key={index} style={styles.languagePill}>
                              <Text style={styles.languagePillText}>{lang}</Text>
                           </View>
                        ))
                     ) : (
                        <Text style={[styles.bodyText, alignText]}>
                           {isRTL ? 'غير محدد' : 'Not specified'}
                        </Text>
                     )}
                  </View>
               </View>
               <View style={styles.dividerH} />

               {/* Education */}
               <View style={styles.detailBlock}>
                  <SectionHeader icon={ICONS.report} title={isRTL ? 'المؤهلات العلمية' : 'Education & Certifications'} rowStyle={rowStyle} alignText={alignText} />
                  <View style={{ width: '100%' }}>
                     <Text style={[styles.bodyText, alignText, { writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{isRTL ? `\u200F${displayData.education}` : displayData.education}</Text>
                  </View>
               </View>
            </View>

            {/* 3. Date Selector */}
            <View style={styles.section}>
               <Text style={[styles.sectionTitleMain, alignText]}>{getStringValue(t?.doctorProfile?.selectDateTime, isRTL ? 'اختر التاريخ' : 'Select Date')}</Text>
               <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingVertical: 10 }}
                  style={isRTL ? { transform: [{ scaleX: -1 }] } : {}}
                  nestedScrollEnabled={true}
                  keyboardShouldPersistTaps="handled"
                  scrollEnabled={true}
                  bounces={false}
               >
                  {availableDates.map((item, index) => {
                     const isSelected = selectedDate && item.fullDate &&
                        selectedDate.getDate() === item.fullDate.getDate() &&
                        selectedDate.getMonth() === item.fullDate.getMonth() &&
                        selectedDate.getFullYear() === item.fullDate.getFullYear();
                     return (
                        <DateItem
                           key={`${item.day}-${index}`}
                           item={item}
                           isSelected={isSelected}
                           isRTL={isRTL}
                           onPress={() => handleDateSelect(item.fullDate)}
                        />
                     );
                  })}
               </ScrollView>
            </View>

            {/* 4. Slot Selector */}
            <View style={styles.section}>
               <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={[styles.sectionTitleMain, alignText, { marginBottom: 0 }]}>
                     {getStringValue(t?.doctorProfile?.availableSlots, isRTL ? 'الأوقات المتاحة' : 'Available Slots')} ({availableSlots.length})
                  </Text>
                  {availabilityData?.timezone && (
                     <Text style={styles.timezoneHint}>
                        🌍 {availabilityData.timezone.replace(/_/g, ' ')}
                     </Text>
                  )}
               </View>

               {isLoadingSlots ? (
                  <View style={styles.emptyState}>
                     <ActivityIndicator size="small" color={COLORS.primary} />
                     <Text style={[styles.emptyStateText, { marginTop: 10 }]}>
                        {isRTL ? 'جاري تحميل الأوقات...' : 'Loading slots...'}
                     </Text>
                  </View>
               ) : !hasSlots ? (
                  <View style={styles.emptyState}>
                     <Image source={ICONS.emptyBox} style={{ width: 50, height: 50, opacity: 0.5, marginBottom: 10 }} />
                     <Text style={styles.emptyStateText}>
                        {getStringValue(t?.doctorProfile?.noAboutAvailable, isRTL ? 'لا توجد أوقات متاحة' : 'No slots available')}
                     </Text>
                  </View>
               ) : (
                  <View style={[styles.slotGrid, isRTL && { direction: 'rtl' }]}>
                     {availableSlots.map((slot, index) => (
                        <SlotItem
                           key={slot.startTime || `slot-${index}`}
                           slot={slot}
                           isSelected={selectedTime?.startTime === slot.startTime}
                           isRTL={isRTL}
                           onPress={() => handleTimeSelect(slot)}
                        />
                     ))}
                  </View>
               )}
            </View>

            {/* 5. Reason for Visit - Always visible */}
            <View style={styles.section}>
               <Text style={[styles.sectionTitleMain, alignText]}>
                  {isRTL ? 'سبب الزيارة' : 'Reason for Visit'} *
               </Text>
               <TextInput
                  style={[
                     styles.reasonInput,
                     { textAlign: isRTL ? 'right' : 'left' },
                     !selectedTime && styles.reasonInputDisabled
                  ]}
                  placeholder={isRTL ? 'اكتب سبب الزيارة أو الأعراض...' : 'Describe your reason for visit or symptoms...'}
                  placeholderTextColor={COLORS.gray500}
                  value={reason}
                  onChangeText={handleReasonChange}
                  multiline
                  numberOfLines={4}
                  maxLength={500}
                  editable={selectedTime !== null}
                  textAlignVertical="top"
                  blurOnSubmit={false}
                  returnKeyType="default"
                  underlineColorAndroid="transparent"
                  scrollEnabled={false}
               />
               {!selectedTime && (
                  <Text style={[styles.helperText, alignText]}>
                     {isRTL ? 'اختر التاريخ والوقت أولاً' : 'Select date and time first'}
                  </Text>
               )}
               <Text style={[styles.characterCount, alignText]}>
                  {reason.length}/500
               </Text>
            </View>
            </ScrollView>
         </KeyboardAvoidingView>

         {/* Footer - always visible */}
         <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
         {/* Completion indicator */}
         {(!selectedDate || !selectedTime || !reason.trim()) && !isCreatingAppointment && (
            <View style={[styles.completionIndicator, isRTL && { flexDirection: 'row-reverse' }]}>
               <Text style={styles.completionText}>
                  {!selectedDate && !selectedTime
                     ? (isRTL ? 'اختر التاريخ والوقت للمتابعة' : 'Select date & time to continue')
                     : !selectedTime
                     ? (isRTL ? 'اختر الوقت للمتابعة' : 'Select time to continue')
                     : !reason.trim()
                     ? (isRTL ? 'أضف سبب الزيارة للمتابعة' : 'Add reason for visit to continue')
                     : ''}
               </Text>
               <Text style={styles.completionCount}>
                  {(selectedDate ? 1 : 0) + (selectedTime ? 1 : 0) + (reason.trim() ? 1 : 0)}/3
               </Text>
            </View>
         )}

         <TouchableOpacity
            style={[styles.bookBtn, (!selectedDate || !selectedTime || !reason.trim() || isCreatingAppointment) && { backgroundColor: COLORS.disabled }]}
            onPress={() => {
               Keyboard.dismiss();
               handleBook();
            }}
            disabled={!selectedDate || !selectedTime || !reason.trim() || isCreatingAppointment}
         >
            {isCreatingAppointment ? (
               <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
               <View style={[styles.buttonContent, isRTL && { flexDirection: 'row-reverse' }]}>
                  <Text style={styles.bookBtnText}>
                     {getStringValue(t?.doctorProfile?.bookAppointment, isRTL ? 'احجز الآن' : 'Book Appointment')}
                  </Text>
                  {selectedDate && selectedTime && reason.trim() && (
                     <Text style={styles.completeBadge}> ✓</Text>
                  )}
               </View>
            )}
         </TouchableOpacity>
         </View>
      </View>
   );
};

const styles = StyleSheet.create({
   container: { flex: 1, backgroundColor: COLORS.background },
   
   profileCard: { backgroundColor: COLORS.white, margin: 20, marginBottom: 15, padding: 20, borderRadius: 16, elevation: 2, shadowColor: COLORS.shadow, shadowOpacity: 0.05 },
   avatar: { width: 70, height: 70, borderRadius: 35, backgroundColor: COLORS.gray200 },
   docName: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary },
   docSpec: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
   price: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary, marginTop: 5 },
   
   statsRow: { flexDirection: 'row', marginTop: 25, backgroundColor: COLORS.promo1, borderRadius: 12, padding: 15, justifyContent: 'space-around', alignItems: 'center' },
   statItem: { alignItems: 'center', flex: 1 },
   statVal: { fontWeight: 'bold', fontSize: 16, color: COLORS.darkSlateBlue },
   statLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
   dividerV: { width: 1, height: 30, backgroundColor: COLORS.gray300 },

   detailsContainer: {
      backgroundColor: COLORS.white,
      marginHorizontal: 20,
      borderRadius: 16,
      padding: 10,
      elevation: 2,
      shadowColor: COLORS.shadow,
      shadowOpacity: 0.05,
      marginBottom: 10,
   },
   detailBlock: { paddingVertical: 15, paddingHorizontal: 12, overflow: 'visible' },
   dividerH: { height: 1, backgroundColor: COLORS.gray100, marginHorizontal: 15 },
   
   iconCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.promo1, alignItems: 'center', justifyContent: 'center', marginHorizontal: 8 },
   headerIcon: { width: 14, height: 14, tintColor: COLORS.primary },
   sectionTitle: { fontSize: 15, fontWeight: 'bold', color: COLORS.textPrimary },
   
   bodyText: { fontSize: 14, color: COLORS.gray700, lineHeight: 22, flexShrink: 1, flexWrap: 'wrap' },

   chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
   chip: { backgroundColor: COLORS.lavender, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
   chipText: { color: COLORS.darkSlateBlue, fontSize: 13, fontWeight: '600' },

   // Language pills styles
   languagesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
   languagePill: {
      backgroundColor: COLORS.promo1 || '#E8F4FD',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: COLORS.primary + '30',
   },
   languagePillText: {
      fontSize: 13,
      fontWeight: '600',
      color: COLORS.primary,
   },

   section: { paddingHorizontal: 20, marginTop: 20 },
   sectionTitleMain: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: COLORS.textPrimary },
   timezoneHint: { fontSize: 10, color: COLORS.gray500, fontStyle: 'italic', backgroundColor: COLORS.gray100, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },

   reasonInput: {
      backgroundColor: COLORS.white,
      borderRadius: 12,
      padding: 15,
      minHeight: 120,
      maxHeight: 200,
      borderWidth: 1,
      borderColor: COLORS.gray200,
      color: COLORS.textPrimary,
      fontSize: 14,
      textAlignVertical: 'top',
      marginBottom: 10
   },
   reasonInputDisabled: {
      opacity: 0.5,
   },
   characterCount: {
      fontSize: 12,
      color: COLORS.gray500,
      marginTop: 5,
   },

   emptyState: { padding: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.offWhite, borderRadius: 12 },
   emptyStateText: { color: COLORS.textSecondary, fontSize: 14 },

   dateBox: { width: 65, height: 75, borderRadius: 14, borderWidth: 1, borderColor: COLORS.gray200, alignItems: 'center', justifyContent: 'center', marginHorizontal: 5, backgroundColor: COLORS.white },
   activeDate: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
   dayText: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 5 },
   dateText: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary },
   activeText: { color: COLORS.white },

   slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
   slotBtn: { width: '30%', paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.gray200, alignItems: 'center', backgroundColor: COLORS.white, marginBottom: 10 },
   activeSlot: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
   slotText: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary },
   activeText: { color: COLORS.white },

   footer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      paddingTop: 20,
      paddingHorizontal: 20,
      backgroundColor: COLORS.white,
      elevation: 20,
      width: '100%',
      borderTopWidth: 1,
      borderColor: COLORS.gray100,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
   },
   bookBtn: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
   bookBtnText: { color: COLORS.white, fontWeight: 'bold', fontSize: 16 },
   buttonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
   completeBadge: { color: COLORS.white, fontSize: 16, fontWeight: 'bold', marginLeft: 5 },

   // Summary Card Styles
   summaryCard: {
      backgroundColor: COLORS.white,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.gray200,
      elevation: 3,
      shadowColor: COLORS.shadow,
      shadowOpacity: 0.1,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 4,
   },
   summaryContent: {
      flex: 1,
   },
   summaryTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: COLORS.primary,
      marginBottom: 8,
   },
   summaryRow: {
      flexDirection: 'row',
      gap: 15,
   },
   summaryItem: {
      flex: 1,
   },
   summaryItemHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
   },
   summaryLabel: {
      fontSize: 11,
      color: COLORS.gray600,
      fontWeight: '500',
   },
   summaryValue: {
      fontSize: 14,
      fontWeight: 'bold',
      color: COLORS.textPrimary,
   },
   changeBtn: {
      fontSize: 11,
      color: COLORS.primary,
      fontWeight: '600',
      textDecorationLine: 'underline',
   },

   // Completion Indicator Styles
   completionIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
      padding: 10,
      backgroundColor: COLORS.promo1,
      borderRadius: 8,
   },
   completionText: {
      fontSize: 12,
      color: COLORS.textSecondary,
      flex: 1,
   },
   completionCount: {
      fontSize: 12,
      fontWeight: 'bold',
      color: COLORS.primary,
      marginLeft: 10,
   },

   // Helper text for disabled fields
   helperText: {
      fontSize: 12,
      color: COLORS.gray500,
      marginTop: 8,
      fontStyle: 'italic',
   },
});

export default DoctorProfileScreen;