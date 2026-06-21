import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Linking } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../store/LanguageContext';
import { useAuthStore } from '../store/authStore';
import { useGetTherapistProfile } from '../api/services/Search.Service';
import { useGetSlots } from '../api/services/Availablity.Service';
import { useCreateAppointment } from '../api/services/Appointment.Service';
import Header from '../components/Header';
import ProfileHeroCard from '../components/profile/ProfileHeroCard';
import MonthlyCalendar from '../components/profile/MonthlyCalendar';
import ServiceSelector from '../components/profile/ServiceSelector';
import BookingSummaryCard from '../components/profile/BookingSummaryCard';
import BookingReasonModal from '../components/profile/BookingReasonModal';
import COLORS from '../constants/colors';
import ICONS from '../constants/icons';
import RiyalText from '../components/RiyalText';
import moment from 'moment-timezone';

const SlotItem = React.memo(({ slot, isSelected, isRTL, onPress }) => (
    <TouchableOpacity
        style={[styles.slotBtn, isSelected && styles.slotBtnActive]}
        onPress={onPress}
    >
        <Text style={[styles.slotText, isSelected && styles.slotTextActive]}>
            {isRTL ? slot.formattedTimeAr : slot.formattedTime}
        </Text>
    </TouchableOpacity>
));

const TherapistProfileScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { t, isRTL } = useLanguage();
    const { user, isAuthenticated } = useAuthStore();
    const insets = useSafeAreaInsets();

    const { providerId } = route.params || {};

    const [selectedService, setSelectedService] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedTime, setSelectedTime] = useState(null);
    const [showReasonModal, setShowReasonModal] = useState(false);

    const rowStyle = { flexDirection: isRTL ? 'row-reverse' : 'row' };
    const alignText = { textAlign: isRTL ? 'right' : 'left' };

    // Fetch profile
    const serviceId = selectedService?.id || selectedService?._id;
    const { data: profile, isLoading: isLoadingProfile } = useGetTherapistProfile(providerId, serviceId);

    // Fetch slots for selected date
    const slotsQuery = useMemo(() => ({
        date: selectedDate ? moment(selectedDate).locale('en').format('YYYY-MM-DD') : null,
        slotDuration: selectedService?.duration || profile?.slotDuration,
        currentTime: moment().locale('en').format('YYYY-MM-DD HH:mm:ss'),
    }), [selectedDate, selectedService?.duration, profile?.slotDuration]);

    const { data: slotsData, isLoading: isLoadingSlots } = useGetSlots(
        providerId,
        slotsQuery,
        {
            enabled: !!(selectedDate && providerId),
            placeholderData: (prev) => prev,
            staleTime: 1000 * 60 * 5,
        }
    );

    const { mutateAsync: createAppointment, isPending: isCreating } = useCreateAppointment();

    // Auto-select first service
    React.useEffect(() => {
        if (profile?.services?.length && !selectedService) {
            setSelectedService(profile.services[0]);
        }
    }, [profile?.services, selectedService]);

    // Format available slots
    const availableSlots = useMemo(() => {
        if (!slotsData?.slots) return [];
        return slotsData.slots.map(slot => ({
            ...slot,
            formattedTime: slot.startTime ? moment(slot.startTime).locale('en').format('h:mm A') : 'N/A',
            formattedTimeAr: slot.startTime ? moment(slot.startTime).locale('ar').format('h:mm A') : 'N/A',
        }));
    }, [slotsData]);

    const handleDateSelect = useCallback((date) => {
        setSelectedDate(date);
        setSelectedTime(null);
    }, []);

    const handleTimeSelect = useCallback((slot) => {
        setSelectedTime(slot);
    }, []);

    const handleServiceSelect = useCallback((service) => {
        setSelectedService(service);
        setSelectedDate(null);
        setSelectedTime(null);
    }, []);

    const handleBookPress = () => {
        if (!selectedDate || !selectedTime || !selectedService) {
            Alert.alert(
                isRTL ? 'خطأ' : 'Error',
                isRTL ? 'الرجاء اختيار الخدمة والتاريخ والوقت' : 'Please select service, date, and time'
            );
            return;
        }

        if (!isAuthenticated) {
            navigation.navigate('LoginScreen', {
                targetScreen: 'TherapistProfile',
                targetParams: { providerId },
            });
            return;
        }

        setShowReasonModal(true);
    };

    const handleReasonSubmit = async (reason) => {
        try {
            const userId = user?._id || user?.id;
            const providerService = selectedService?.id || selectedService?._id || profile?.providerService;

            const payload = {
                patientName: user.fullName,
                providerName: profile?.fullName,
                date: selectedTime.date || moment(selectedDate).locale('en').format('YYYY-MM-DD'),
                startTime: selectedTime.startTime,
                endTime: selectedTime.endTime,
                provider: providerId,
                patient: userId,
                reason: reason,
                providerService: providerService,
                currentTime: moment().locale('en').format('YYYY-MM-DD HH:mm:ss'),
                clientTz: moment.tz.guess(),
            };

            const newAppointment = await createAppointment(payload);

            setShowReasonModal(false);

            if (newAppointment && (newAppointment.id || newAppointment._id)) {
                navigation.navigate('Checkout', {
                    id: newAppointment.id || newAppointment._id,
                });
            }
        } catch (error) {
            Alert.alert(
                isRTL ? 'خطأ' : 'Error',
                error?.response?.data?.message || error?.message || (isRTL ? 'فشل في حجز الموعد' : 'Failed to book appointment')
            );
        }
    };

    // Section data
    const aboutText = isRTL
        ? (profile?.professionalSummaryArabic || profile?.professionalSummary)
        : (profile?.professionalSummaryEnglish || profile?.professionalSummary);

    const issues = profile?.issueCategories || profile?.issues || [];
    const ageGroups = profile?.clientAgeGroups || profile?.ageGroups || [];
    const approaches = profile?.therapeuticApproaches || profile?.approaches || [];
    const approachDesc = isRTL
        ? (profile?.approachDescriptionArabic || profile?.approachDescription)
        : (profile?.approachDescriptionEnglish || profile?.approachDescription);

    const education = isRTL
        ? (profile?.educationAndCertificationsArabic || profile?.educationAndCertifications)
        : (profile?.educationAndCertificationsEnglish || profile?.educationAndCertifications);

    const services = profile?.services || [];

    if (isLoadingProfile) {
        return (
            <View style={styles.container}>
                <Header showBack onBack={() => navigation.goBack()} title={t?.therapistProfile?.title || 'Therapist Profile'} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>{t?.common?.loading || 'Loading...'}</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Header showBack onBack={() => navigation.goBack()} title={t?.therapistProfile?.title || 'Therapist Profile'} />

            <ScrollView
                contentContainerStyle={{ paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
            >
                {/* 1. Hero Card */}
                <ProfileHeroCard profile={profile} isRTL={isRTL} t={t} />

                {/* 2. Intro Video */}
                {profile?.introVideoUrl && (
                    <TouchableOpacity
                        style={styles.videoSection}
                        onPress={() => Linking.openURL(profile.introVideoUrl)}
                    >
                        <View style={[rowStyle, { alignItems: 'center', gap: 10 }]}>
                            <View style={styles.playCircle}>
                                <Image source={ICONS.play} style={styles.playIconSmall} />
                            </View>
                            <Text style={styles.videoText}>
                                {t?.therapistProfile?.watchIntro || 'Watch Intro Video'}
                            </Text>
                        </View>
                    </TouchableOpacity>
                )}

                {/* 3. About Me */}
                {aboutText ? (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, alignText]}>
                            {t?.therapistProfile?.aboutMe || 'About Me'}
                        </Text>
                        <View style={styles.sectionCard}>
                            <Text style={[styles.bodyText, alignText]}>{aboutText}</Text>
                        </View>
                    </View>
                ) : null}

                {/* 4. Issues I Help With */}
                {issues.length > 0 && (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, alignText]}>
                            {t?.therapistProfile?.issuesIHelp || 'Issues I Help With'}
                        </Text>
                        <View style={styles.sectionCard}>
                            <View style={[styles.chipGrid, isRTL && { flexDirection: 'row-reverse' }]}>
                                {issues.map((issue, i) => (
                                    <View key={i} style={styles.chip}>
                                        <Text style={styles.chipText}>
                                            {isRTL ? (issue.nameArabic || issue.nameEnglish || issue) : (issue.nameEnglish || issue.nameArabic || issue)}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </View>
                )}

                {/* 5. Who I Work With */}
                {ageGroups.length > 0 && (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, alignText]}>
                            {t?.therapistProfile?.whoIWorkWith || 'Who I Work With'}
                        </Text>
                        <View style={styles.sectionCard}>
                            {ageGroups.map((ag, i) => (
                                <View key={i} style={[rowStyle, { alignItems: 'center', marginBottom: 6, gap: 8 }]}>
                                    <View style={styles.dot} />
                                    <Text style={[styles.bodyText, alignText]}>
                                        {isRTL ? (ag.nameArabic || ag.nameEnglish || ag) : (ag.nameEnglish || ag.nameArabic || ag)}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* 6. My Approach */}
                {(approaches.length > 0 || approachDesc) && (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, alignText]}>
                            {t?.therapistProfile?.myApproach || 'My Approach'}
                        </Text>
                        <View style={styles.sectionCard}>
                            {approachDesc ? (
                                <Text style={[styles.bodyText, alignText, { marginBottom: 10 }]}>{approachDesc}</Text>
                            ) : null}
                            <View style={[styles.chipGrid, isRTL && { flexDirection: 'row-reverse' }]}>
                                {approaches.map((ap, i) => (
                                    <View key={i} style={styles.chip}>
                                        <Text style={styles.chipText}>
                                            {isRTL ? (ap.nameArabic || ap.nameEnglish || ap) : (ap.nameEnglish || ap.nameArabic || ap)}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </View>
                )}

                {/* 7. Education */}
                {education ? (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, alignText]}>
                            {t?.therapistProfile?.education || 'Education & Certifications'}
                        </Text>
                        <View style={styles.sectionCard}>
                            {education.split('\n').filter(Boolean).map((line, i) => (
                                <View key={i} style={[rowStyle, { alignItems: 'flex-start', marginBottom: 6, gap: 8 }]}>
                                    <View style={[styles.dot, { marginTop: 6 }]} />
                                    <Text style={[styles.bodyText, alignText, { flex: 1 }]}>{line.trim()}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                ) : null}

                {/* 8. Services & Fees */}
                {services.length > 0 && (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, alignText]}>
                            {t?.therapistProfile?.servicesFees || 'Services & Fees'}
                        </Text>
                        {services.map((service, i) => {
                            const svc = service.service || service;
                            const sName = isRTL
                                ? (svc.nameArabic || svc.nameEnglish || svc.name || service.nameArabic || service.nameEnglish)
                                : (svc.nameEnglish || svc.nameArabic || svc.name || service.nameEnglish || service.nameArabic);
                            const sDuration = service.slotDuration || service.duration;
                            const sPrice = service.slotPrice || service.price || '0';
                            return (
                                <View key={service.id || service._id || i} style={styles.serviceCard}>
                                    <View style={[rowStyle, { justifyContent: 'space-between', alignItems: 'center' }]}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.serviceName, alignText]}>{sName}</Text>
                                            {sDuration && (
                                                <Text style={[styles.serviceDuration, alignText]}>
                                                    {sDuration} {t?.therapistProfile?.minutes || 'min'}
                                                </Text>
                                            )}
                                        </View>
                                        <RiyalText text={sPrice} textStyle={styles.servicePrice} size={12} />
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* 9. Booking Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, alignText]}>
                        {t?.therapistProfile?.bookSession || 'Book a Session'}
                    </Text>

                    {/* Service selector */}
                    {services.length > 0 && (
                        <ServiceSelector
                            services={services}
                            selectedService={selectedService}
                            onSelect={handleServiceSelect}
                            isRTL={isRTL}
                            t={t}
                        />
                    )}

                    {/* Monthly calendar */}
                    <View style={{ marginTop: 16 }}>
                        <MonthlyCalendar
                            slots={profile?.slots || []}
                            selectedDate={selectedDate}
                            onSelectDate={handleDateSelect}
                            isRTL={isRTL}
                            t={t}
                        />
                    </View>

                    {/* Time slots */}
                    {selectedDate && (
                        <View style={{ marginTop: 16 }}>
                            <Text style={[styles.subSectionTitle, alignText]}>
                                {t?.therapistProfile?.availableSlots || 'Available Slots'} ({availableSlots.length})
                            </Text>
                            {isLoadingSlots ? (
                                <View style={styles.slotLoading}>
                                    <ActivityIndicator size="small" color={COLORS.primary} />
                                </View>
                            ) : availableSlots.length === 0 ? (
                                <View style={styles.noSlots}>
                                    <Text style={styles.noSlotsText}>
                                        {t?.therapistProfile?.noSlots || 'No slots available for this date'}
                                    </Text>
                                </View>
                            ) : (
                                <View style={[styles.slotGrid, isRTL && { direction: 'rtl' }]}>
                                    {availableSlots.map((slot, i) => (
                                        <SlotItem
                                            key={slot.startTime || `slot-${i}`}
                                            slot={slot}
                                            isSelected={selectedTime?.startTime === slot.startTime}
                                            isRTL={isRTL}
                                            onPress={() => handleTimeSelect(slot)}
                                        />
                                    ))}
                                </View>
                            )}
                        </View>
                    )}

                    {/* Booking summary */}
                    <BookingSummaryCard
                        selectedDate={selectedDate}
                        selectedTime={selectedTime}
                        selectedService={selectedService}
                        isRTL={isRTL}
                        t={t}
                    />
                </View>
            </ScrollView>

            {/* Fixed footer */}
            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                <TouchableOpacity
                    style={[styles.bookBtn, (!selectedDate || !selectedTime || !selectedService || isCreating) && styles.bookBtnDisabled]}
                    onPress={handleBookPress}
                    disabled={!selectedDate || !selectedTime || !selectedService || isCreating}
                >
                    {isCreating ? (
                        <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                        <Text style={styles.bookBtnText}>
                            {t?.therapistProfile?.bookAppointment || 'Book Appointment'}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>

            {/* Reason modal */}
            <BookingReasonModal
                visible={showReasonModal}
                onClose={() => setShowReasonModal(false)}
                onSubmit={handleReasonSubmit}
                isLoading={isCreating}
                isRTL={isRTL}
                t={t}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    section: {
        paddingHorizontal: 20,
        marginTop: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        marginBottom: 12,
    },
    subSectionTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 10,
    },
    sectionCard: {
        backgroundColor: COLORS.white,
        borderRadius: 14,
        padding: 16,
        elevation: 1,
        shadowColor: COLORS.shadow,
        shadowOpacity: 0.03,
        shadowOffset: { width: 0, height: 1 },
        shadowRadius: 4,
    },
    bodyText: {
        fontSize: 14,
        color: COLORS.gray700,
        lineHeight: 22,
    },
    chipGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        backgroundColor: COLORS.lavender,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    chipText: {
        color: COLORS.darkSlateBlue,
        fontSize: 13,
        fontWeight: '600',
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.primary,
    },
    videoSection: {
        marginHorizontal: 20,
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 14,
        elevation: 1,
        shadowColor: COLORS.shadow,
        shadowOpacity: 0.03,
    },
    playCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    playIconSmall: {
        width: 16,
        height: 16,
        tintColor: COLORS.white,
    },
    videoText: {
        fontSize: 14,
        color: COLORS.primary,
        fontWeight: '600',
    },
    serviceCard: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 14,
        marginBottom: 8,
        borderLeftWidth: 3,
        borderLeftColor: COLORS.primary,
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowOffset: { width: 0, height: 1 },
        shadowRadius: 4,
    },
    serviceName: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    serviceDuration: {
        fontSize: 11,
        color: COLORS.textSecondary,
        marginTop: 3,
        backgroundColor: COLORS.gray100,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    servicePrice: {
        fontSize: 15,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    bookServiceBtn: {
        marginTop: 10,
        backgroundColor: COLORS.promo1,
        borderRadius: 8,
        paddingVertical: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.primary + '30',
    },
    bookServiceBtnText: {
        color: COLORS.primary,
        fontSize: 13,
        fontWeight: '600',
    },
    slotGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    slotBtn: {
        width: '30%',
        paddingVertical: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: COLORS.gray200,
        alignItems: 'center',
        backgroundColor: COLORS.white,
    },
    slotBtnActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    slotText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    slotTextActive: {
        color: COLORS.white,
    },
    slotLoading: {
        padding: 20,
        alignItems: 'center',
    },
    noSlots: {
        padding: 20,
        alignItems: 'center',
        backgroundColor: COLORS.offWhite,
        borderRadius: 12,
    },
    noSlotsText: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingTop: 20,
        paddingHorizontal: 20,
        backgroundColor: COLORS.white,
        elevation: 20,
        borderTopWidth: 1,
        borderColor: COLORS.gray100,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    bookBtn: {
        backgroundColor: COLORS.primary,
        padding: 16,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    bookBtnDisabled: {
        backgroundColor: COLORS.disabled,
    },
    bookBtnText: {
        color: COLORS.white,
        fontWeight: 'bold',
        fontSize: 16,
    },
});

export default TherapistProfileScreen;
