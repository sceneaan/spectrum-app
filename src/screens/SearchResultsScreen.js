import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, TextInput, StyleSheet, ActivityIndicator, Modal, ScrollView, Alert } from 'react-native';
import FastImage from 'react-native-fast-image';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useGetAvailableProviders2 } from '../api/services/Availablity.Service';
import Header from '../components/Header';
import RiyalText from '../components/RiyalText';
import ICONS from '../constants/icons';
import COLORS from '../constants/colors';

const SearchResultsScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { t, i18n } = useTranslation();
    const isRTL = i18n.dir() === 'rtl';

    // Filters from previous screen
    const { category, service, appointmentType } = route.params || {};

    const [searchQuery, setSearchQuery] = useState('');
    const [languageFilter, setLanguageFilter] = useState(null);
    const [timeFilter, setTimeFilter] = useState(null);
    const [showLanguageModal, setShowLanguageModal] = useState(false);
    const [showTimeModal, setShowTimeModal] = useState(false);

    // Construct query for API
    const apiQuery = {
        category,
        service,
        type: appointmentType,
        search: searchQuery,
        language: languageFilter,
        time: timeFilter,
    };

    const { data: doctorsData, isLoading, error, refetch } = useGetAvailableProviders2(apiQuery);

    const rowStyle = { flexDirection: isRTL ? 'row-reverse' : 'row' };
    const alignText = { textAlign: isRTL ? 'right' : 'left' };

    // Clear all filters
    const clearAllFilters = () => {
        setSearchQuery('');
        setLanguageFilter(null);
        setTimeFilter(null);
    };

    // Count active filters
    const activeFilterCount = [searchQuery, languageFilter, timeFilter].filter(Boolean).length;

    // Get display text for filters
    const getLanguageDisplayText = () => {
        if (!languageFilter) return t('searchResults.languageFilter') || "Language";
        return languageFilter === 'english' ? (t('search.english') || 'English') : (t('search.arabic') || 'Arabic');
    };

    const getTimeDisplayText = () => {
        if (!timeFilter) return t('searchResults.timeFilter') || "Time";
        if (timeFilter === 'morning') return t('search.morning') || 'Morning';
        if (timeFilter === 'afternoon') return t('search.afternoon') || 'Afternoon';
        if (timeFilter === 'evening') return t('search.evening') || 'Evening';
        return t('searchResults.timeFilter') || "Time";
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>{t('common.loading') || "Loading..."}</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{t('common.errorLoadingData') || "Error loading doctors. Please try again."}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
                    <Text style={styles.retryBtnText}>{t('common.retry') || 'Retry'}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: COLORS.background }}>
            <Header showBack onBack={() => navigation.goBack()} title={t('searchResults.title') || "Find a Doctor"} />

            <View style={{ flex: 1 }}>
                {/* Filter Bar */}
                <View style={[styles.filterBar, rowStyle]}>
                    <View style={[styles.searchSmall, rowStyle]}>
                        <Image source={ICONS.search} style={{ width: 16, height: 16, tintColor: COLORS.gray500 }} />
                        <TextInput
                            placeholder={t('searchResults.searchName') || "Search by Name"}
                            style={{ flex: 1, marginHorizontal: 5, textAlign: isRTL ? 'right' : 'left', color: COLORS.textPrimary }}
                            placeholderTextColor={COLORS.gray500}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>

                    {/* Language Filter */}
                    <TouchableOpacity
                        style={[styles.filterPill, languageFilter && styles.filterPillActive]}
                        onPress={() => setShowLanguageModal(true)}
                    >
                        <Text style={{ fontSize: 12, color: languageFilter ? COLORS.primary : COLORS.textPrimary, fontWeight: languageFilter ? 'bold' : 'normal' }}>
                            {getLanguageDisplayText()} ⌄
                        </Text>
                    </TouchableOpacity>

                    {/* Time Selector Filter */}
                    <TouchableOpacity
                        style={[styles.filterPill, timeFilter && styles.filterPillActive]}
                        onPress={() => setShowTimeModal(true)}
                    >
                        <Image source={ICONS.filter} style={{ width: 10, height: 10, tintColor: timeFilter ? COLORS.primary : COLORS.textPrimary, marginRight: 4 }} />
                        <Text style={{ fontSize: 12, color: timeFilter ? COLORS.primary : COLORS.textPrimary, fontWeight: timeFilter ? 'bold' : 'normal' }}>
                            {getTimeDisplayText()} ⌄
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Clear Filters Button */}
                {activeFilterCount > 0 && (
                    <View style={styles.clearFiltersContainer}>
                        <TouchableOpacity style={styles.clearFiltersButton} onPress={clearAllFilters}>
                            <Text style={styles.clearFiltersText}>
                                {t('filters.clearFilters') || 'Clear All Filters'} ({activeFilterCount})
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {doctorsData && doctorsData.length > 0 ? (
                    <FlatList
                        data={doctorsData}
                        contentContainerStyle={{ padding: 20 }}
                        keyExtractor={(item, index) => item.id?.toString() || item._id?.toString() || index.toString()}
                        removeClippedSubviews={true}
                        initialNumToRender={10}
                        maxToRenderPerBatch={10}
                        windowSize={10}
                        renderItem={({ item }) => {
                            // Get the first available slot date
                            const nextAvailableSlot = item.slots?.find(slot => slot.slotCount > 0)?.date || null;

                            // Get specialty name based on language
                            const specialtyName = isRTL
                                ? (item.specialty?.nameArabic || item.specialty?.nameEnglish || t('common.general'))
                                : (item.specialty?.nameEnglish || item.specialty?.nameArabic || t('common.general'));

                            return (
                                <TouchableOpacity style={styles.docResultCard} onPress={() => {
                                    // Validate doctor data before navigation
                                    if (!item.id) {
                                        Alert.alert(
                                            t('common.error') || 'Error',
                                            t('searchResults.doctorDataError') || 'Doctor information is incomplete. Please try again.'
                                        );
                                        return;
                                    }

                                    navigation.navigate('DoctorProfile', {
                                        doctor: {
                                            id: item.id,
                                            _id: item.id,
                                            fullName: item.fullName,
                                            fullNameArabic: item.fullNameArabic,
                                            fullNameEnglish: item.fullNameEnglish,
                                            profileImage: item.profileImage,
                                            specialty: item.specialty,
                                            providerService: item.providerService,
                                            service: item.service,
                                            slotDuration: item.slotDuration,
                                            slotPrice: item.slotPrice,
                                            professionalSummary: item.professionalSummary,
                                            professionalSummaryArabic: item.professionalSummaryArabic,
                                            professionalSummaryEnglish: item.professionalSummaryEnglish,
                                            spokenLanguages: item.spokenLanguages,
                                            educationAndCertifications: item.educationAndCertifications,
                                            educationAndCertificationsArabic: item.educationAndCertificationsArabic,
                                            educationAndCertificationsEnglish: item.educationAndCertificationsEnglish,
                                        }
                                    });
                                }}>
                                    <View style={[rowStyle]}>
                                        {item.profileImage ? (
                                          <FastImage
                                            source={{ uri: item.profileImage, priority: FastImage.priority.normal, cache: FastImage.cacheControl.immutable }}
                                            style={styles.docAvatar}
                                            resizeMode={FastImage.resizeMode.cover}
                                          />
                                        ) : (
                                          <Image source={ICONS.defaultAvatar} style={styles.docAvatar} />
                                        )}
                                        <View style={[styles.docInfo, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                                            <Text style={styles.docName}>{(isRTL ? (item.fullNameArabic || item.fullName) : (item.fullNameEnglish || item.fullName)) || 'Unknown Doctor'}</Text>
                                            <Text style={styles.docSpec}>{specialtyName}</Text>
                                            <View style={[rowStyle, { gap: 5 }]}>
                                                <Image source={ICONS.star} style={{ width: 12, height: 12, tintColor: COLORS.warning }} />
                                                <Text style={{ fontSize: 12, fontWeight: 'bold', color: COLORS.textPrimary }}>{typeof item.rating === 'object' ? (item.rating?.average || '5') : (item.rating || '5')}</Text>
                                            </View>
                                            <Text style={styles.nextSlot}>
                                                {t('searchResults.nextAvailable') || "Next available:"} {nextAvailableSlot || (t('searchResults.noSlots') || 'No slots')}
                                            </Text>
                                        </View>
                                        <RiyalText
                                            text={item.slotPrice || '0'}
                                            textStyle={styles.price}
                                            size={14}
                                        />
                                    </View>
                                    <View style={styles.divider} />
                                    <TouchableOpacity style={styles.bookLink} onPress={() => {
                                        // Validate doctor data before navigation
                                        if (!item.id) {
                                                Alert.alert(
                                                t('common.error') || 'Error',
                                                t('searchResults.doctorDataError') || 'Doctor information is incomplete. Please try again.'
                                            );
                                            return;
                                        }

                                        navigation.navigate('DoctorProfile', {
                                            doctor: {
                                                id: item.id,
                                                _id: item.id,
                                                fullName: item.fullName,
                                                fullNameArabic: item.fullNameArabic,
                                                fullNameEnglish: item.fullNameEnglish,
                                                profileImage: item.profileImage,
                                                specialty: item.specialty,
                                                providerService: item.providerService,
                                                service: item.service,
                                                slotDuration: item.slotDuration,
                                                slotPrice: item.slotPrice,
                                                professionalSummary: item.professionalSummary,
                                                professionalSummaryArabic: item.professionalSummaryArabic,
                                                professionalSummaryEnglish: item.professionalSummaryEnglish,
                                                spokenLanguages: item.spokenLanguages,
                                                educationAndCertifications: item.educationAndCertifications,
                                                educationAndCertificationsArabic: item.educationAndCertificationsArabic,
                                                educationAndCertificationsEnglish: item.educationAndCertificationsEnglish,
                                            }
                                        });
                                    }}>
                                        <Text style={{ color: COLORS.primary, fontWeight: 'bold' }}>{t('searchResults.bookNow') || "Book Now"}</Text>
                                    </TouchableOpacity>
                                </TouchableOpacity>
                            );
                        }}
                    />
                ) : (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>{t('searchResults.noDoctorsFound') || "No doctors found matching your criteria."}</Text>
                    </View>
                )}
            </View>

            {/* Language Filter Modal */}
            <Modal visible={showLanguageModal} transparent animationType="slide" onRequestClose={() => setShowLanguageModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={[styles.modalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                            <Text style={styles.modalTitle}>{t('searchResults.selectLanguage') || "Select Language"}</Text>
                            <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                                <Text style={styles.modalClose}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView>
                            <TouchableOpacity
                                style={[styles.modalItem, languageFilter === 'english' && styles.modalItemActive]}
                                onPress={() => { setLanguageFilter('english'); setShowLanguageModal(false); }}
                            >
                                <Text style={[styles.modalItemText, languageFilter === 'english' && styles.modalItemTextActive]}>
                                    {t('search.english') || 'English'}
                                </Text>
                                {languageFilter === 'english' && <Text style={styles.checkmark}>✓</Text>}
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalItem, languageFilter === 'arabic' && styles.modalItemActive]}
                                onPress={() => { setLanguageFilter('arabic'); setShowLanguageModal(false); }}
                            >
                                <Text style={[styles.modalItemText, languageFilter === 'arabic' && styles.modalItemTextActive]}>
                                    {t('search.arabic') || 'Arabic'}
                                </Text>
                                {languageFilter === 'arabic' && <Text style={styles.checkmark}>✓</Text>}
                            </TouchableOpacity>
                            {languageFilter && (
                                <TouchableOpacity
                                    style={styles.modalItemClear}
                                    onPress={() => { setLanguageFilter(null); setShowLanguageModal(false); }}
                                >
                                    <Text style={styles.modalItemClearText}>{t('common.clear') || 'Clear Filter'}</Text>
                                </TouchableOpacity>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Time Filter Modal */}
            <Modal visible={showTimeModal} transparent animationType="slide" onRequestClose={() => setShowTimeModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={[styles.modalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                            <Text style={styles.modalTitle}>{t('searchResults.selectTime') || "Select Time"}</Text>
                            <TouchableOpacity onPress={() => setShowTimeModal(false)}>
                                <Text style={styles.modalClose}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView>
                            <TouchableOpacity
                                style={[styles.modalItem, timeFilter === 'morning' && styles.modalItemActive]}
                                onPress={() => { setTimeFilter('morning'); setShowTimeModal(false); }}
                            >
                                <Text style={[styles.modalItemText, timeFilter === 'morning' && styles.modalItemTextActive]}>
                                    {t('search.morning') || 'Morning'}
                                </Text>
                                {timeFilter === 'morning' && <Text style={styles.checkmark}>✓</Text>}
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalItem, timeFilter === 'afternoon' && styles.modalItemActive]}
                                onPress={() => { setTimeFilter('afternoon'); setShowTimeModal(false); }}
                            >
                                <Text style={[styles.modalItemText, timeFilter === 'afternoon' && styles.modalItemTextActive]}>
                                    {t('search.afternoon') || 'Afternoon'}
                                </Text>
                                {timeFilter === 'afternoon' && <Text style={styles.checkmark}>✓</Text>}
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalItem, timeFilter === 'evening' && styles.modalItemActive]}
                                onPress={() => { setTimeFilter('evening'); setShowTimeModal(false); }}
                            >
                                <Text style={[styles.modalItemText, timeFilter === 'evening' && styles.modalItemTextActive]}>
                                    {t('search.evening') || 'Evening'}
                                </Text>
                                {timeFilter === 'evening' && <Text style={styles.checkmark}>✓</Text>}
                            </TouchableOpacity>
                            {timeFilter && (
                                <TouchableOpacity
                                    style={styles.modalItemClear}
                                    onPress={() => { setTimeFilter(null); setShowTimeModal(false); }}
                                >
                                    <Text style={styles.modalItemClearText}>{t('common.clear') || 'Clear Filter'}</Text>
                                </TouchableOpacity>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
    loadingText: { marginTop: 10, fontSize: 16, color: COLORS.textPrimary },
    errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background, padding: 20 },
    errorText: { fontSize: 16, color: COLORS.error, textAlign: 'center', marginBottom: 16 },
    retryBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
    retryBtnText: { color: COLORS.white, fontWeight: '600', fontSize: 15 },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    emptyText: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center' },

    filterBar: { paddingHorizontal: 20, marginBottom: 10, flexDirection: 'row', alignItems: 'center', marginTop: 10 },
    searchSmall: { backgroundColor: COLORS.gray100, borderRadius: 20, paddingHorizontal: 10, flex: 1, height: 40, alignItems: 'center' },
    filterPill: { backgroundColor: 'white', borderWidth: 1, borderColor: COLORS.gray300, borderRadius: 20, paddingHorizontal: 12, justifyContent: 'center', height: 40, marginLeft: 8, flexDirection: 'row', alignItems: 'center' },
    filterPillActive: { backgroundColor: COLORS.promo1 || COLORS.highlight, borderColor: COLORS.primary },

    clearFiltersContainer: { paddingHorizontal: 20, marginBottom: 10 },
    clearFiltersButton: { backgroundColor: COLORS.error || '#EF4444', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, alignSelf: 'center' },
    clearFiltersText: { color: 'white', fontSize: 12, fontWeight: 'bold' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '60%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary },
    modalClose: { fontSize: 24, color: COLORS.textSecondary },
    modalItem: { paddingVertical: 16, borderBottomWidth: 1, borderColor: COLORS.gray100, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    modalItemActive: { backgroundColor: COLORS.promo1 || COLORS.highlight },
    modalItemText: { fontSize: 16, color: COLORS.textPrimary },
    modalItemTextActive: { color: COLORS.primary, fontWeight: 'bold' },
    checkmark: { fontSize: 18, color: COLORS.primary, fontWeight: 'bold' },
    modalItemClear: { paddingVertical: 16, marginTop: 10, backgroundColor: COLORS.gray100, borderRadius: 12, alignItems: 'center' },
    modalItemClearText: { fontSize: 14, color: COLORS.error, fontWeight: 'bold' },

    docResultCard: { backgroundColor: COLORS.white, padding: 15, borderRadius: 12, marginBottom: 15, elevation: 2, shadowColor: COLORS.shadow, shadowOpacity: 0.05 },
    docAvatar: { width: 50, height: 50, borderRadius: 25, marginHorizontal: 10, backgroundColor: COLORS.gray200 },
    docInfo: { flex: 1 },
    docName: { fontWeight: 'bold', fontSize: 16, color: COLORS.textPrimary },
    docSpec: { color: COLORS.textSecondary, fontSize: 12, marginVertical: 2 },
    nextSlot: { color: COLORS.success, fontSize: 12, marginTop: 4, fontWeight: '500' },
    price: { fontWeight: 'bold', color: COLORS.primary, fontSize: 16 },
    divider: { height: 1, backgroundColor: COLORS.gray200, marginVertical: 10 },
    bookLink: { alignItems: 'center' },
});

export default SearchResultsScreen;