import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Image, ScrollView, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useLanguage } from '../store/LanguageContext';
import useScreenHeaderMode from '../navigation/useScreenHeaderMode';
import Header from '../components/Header';
import TherapistCard from '../components/search/TherapistCard';
import TherapistCardSkeleton from '../components/search/TherapistCardSkeleton';
import FilterBottomSheet from '../components/search/FilterBottomSheet';
import { useProviderSearch } from '../hooks/useProviderSearch';
import COLORS from '../constants/colors';
import ICONS from '../constants/icons';
import { SPACING, RADIUS, cardBorder } from '../theme';

const FILTER_TYPES = [
    { key: 'issues', label: 'Issues', labelAr: 'المشاكل', icon: 'brain', color: '#8B5CF6' },
    { key: 'approaches', label: 'Approaches', labelAr: 'الأساليب', icon: 'therapy', color: '#EC4899' },
    { key: 'sessionType', label: 'Session Type', labelAr: 'نوع الجلسة', icon: 'session', color: '#3B82F6' },
    { key: 'language', label: 'Language', labelAr: 'اللغة', icon: 'language', color: '#10B981' },
    { key: 'gender', label: 'Gender', labelAr: 'الجنس', icon: 'gender', color: '#F59E0B' },
    { key: 'advanced', label: 'More', labelAr: 'المزيد', icon: 'sliders', color: '#6366F1' },
];

const SORT_OPTIONS = [
    { value: '', label: 'Relevance', labelAr: 'الأكثر صلة' },
    { value: 'price_asc', label: 'Price: Low to High', labelAr: 'السعر: من الأقل للأعلى' },
    { value: 'price_desc', label: 'Price: High to Low', labelAr: 'السعر: من الأعلى للأقل' },
    { value: 'rating', label: 'Highest Rated', labelAr: 'الأعلى تقييماً' },
    { value: 'experience', label: 'Most Experienced', labelAr: 'الأكثر خبرة' },
];

const FindTherapistScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { t, isRTL } = useLanguage();
    const headerMode = useScreenHeaderMode();

    const preSelectedIssue = route.params?.preSelectedIssue;

    const {
        providers,
        filterOptions,
        filters,
        loading,
        filtersLoading,
        pagination,
        updateFilters,
        clearFilters,
        removeFilter,
        hasActiveFilters,
        activeFilterCount,
    } = useProviderSearch(preSelectedIssue ? { issues: [preSelectedIssue] } : {});

    const [activeFilterSheet, setActiveFilterSheet] = useState(null);
    const [showSortMenu, setShowSortMenu] = useState(false);

    const rowStyle = { flexDirection: isRTL ? 'row-reverse' : 'row' };
    const alignText = { textAlign: isRTL ? 'right' : 'left' };

    const getFilterCount = (key) => {
        switch (key) {
            case 'issues': return filters.issues.length;
            case 'approaches': return filters.approaches.length;
            case 'sessionType': return filters.sessionTypes.length;
            case 'language': return filters.languages.length;
            case 'gender': return filters.gender ? 1 : 0;
            case 'advanced': return filters.ageGroups.length + (filters.priceMin || filters.priceMax ? 1 : 0);
            default: return 0;
        }
    };

    const handleFilterApply = useCallback((newFilters) => {
        updateFilters(newFilters);
    }, [updateFilters]);

    const handleCardPress = useCallback((provider) => {
        navigation.navigate('TherapistProfile', { providerId: provider.id || provider._id });
    }, [navigation]);

    // Build active filter tags for display
    const getActiveFilterTags = () => {
        const tags = [];
        if (filters.gender) {
            tags.push({ key: 'gender', value: filters.gender, label: isRTL ? (filters.gender === 'male' ? 'ذكر' : 'أنثى') : (filters.gender === 'male' ? 'Male' : 'Female') });
        }
        filters.issues.forEach(v => {
            const item = (filterOptions?.issues || []).find(i => (i._id || i.id || i.nameEnglish || i) === v);
            tags.push({ key: 'issues', value: v, label: item ? (isRTL ? (item.nameArabic || item.nameEnglish) : (item.nameEnglish || item.nameArabic)) : v });
        });
        filters.approaches.forEach(v => {
            const item = (filterOptions?.approaches || []).find(i => (i._id || i.id || i.nameEnglish || i) === v);
            tags.push({ key: 'approaches', value: v, label: item ? (isRTL ? (item.nameArabic || item.nameEnglish) : (item.nameEnglish || item.nameArabic)) : v });
        });
        filters.sessionTypes.forEach(v => tags.push({ key: 'sessionTypes', value: v, label: v }));
        filters.languages.forEach(v => {
            const item = (filterOptions?.languages || []).find(i => (i._id || i.id || i.nameEnglish || i) === v);
            tags.push({ key: 'languages', value: v, label: item ? (isRTL ? (item.nameArabic || item.nameEnglish) : (item.nameEnglish || item.nameArabic)) : v });
        });
        filters.ageGroups.forEach(v => {
            const item = (filterOptions?.ageGroups || []).find(i => (i._id || i.id || i.nameEnglish || i) === v);
            tags.push({ key: 'ageGroups', value: v, label: item ? (isRTL ? (item.nameArabic || item.nameEnglish) : (item.nameEnglish || item.nameArabic)) : v });
        });
        if (filters.priceMin || filters.priceMax) {
            tags.push({ key: 'priceMin', value: '', label: `${filters.priceMin || '0'} - ${filters.priceMax || '∞'} ${t?.common?.currency || 'SAR'}` });
        }
        return tags;
    };

    const renderItem = useCallback(({ item }) => (
        <TherapistCard
            provider={item}
            isRTL={isRTL}
            t={t}
            onPress={() => handleCardPress(item)}
        />
    ), [isRTL, t, handleCardPress]);

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <Image source={ICONS.emptyBox} style={styles.emptyIcon} />
            <Text style={[styles.emptyText, alignText]}>
                {t?.findTherapist?.noResults || 'No therapists found matching your criteria.'}
            </Text>
            {hasActiveFilters && (
                <TouchableOpacity style={styles.clearBtn} onPress={clearFilters}>
                    <Text style={styles.clearBtnText}>
                        {t?.findTherapist?.clearAllFilters || 'Clear All Filters'}
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );

    const renderFooter = () => {
        if (!pagination || pagination.totalPages <= 1) return null;
        return (
            <View style={[styles.paginationRow, rowStyle]}>
                <TouchableOpacity
                    style={[styles.pageBtn, filters.page <= 1 && styles.pageBtnDisabled]}
                    disabled={filters.page <= 1}
                    onPress={() => updateFilters({ page: filters.page - 1 })}
                >
                    <Text style={styles.pageBtnText}>{t?.common?.previous || 'Previous'}</Text>
                </TouchableOpacity>
                <Text style={styles.pageInfo}>
                    {t?.common?.page || 'Page'} {pagination.page} {t?.common?.of || 'of'} {pagination.totalPages}
                </Text>
                <TouchableOpacity
                    style={[styles.pageBtn, filters.page >= pagination.totalPages && styles.pageBtnDisabled]}
                    disabled={filters.page >= pagination.totalPages}
                    onPress={() => updateFilters({ page: filters.page + 1 })}
                >
                    <Text style={styles.pageBtnText}>{t?.common?.next || 'Next'}</Text>
                </TouchableOpacity>
            </View>
        );
    };

    const activeTags = getActiveFilterTags();

    return (
        <View style={styles.container}>
            <Header
                showBack={headerMode.showBack}
                onBack={headerMode.onBack}
                showProfile={headerMode.showProfile}
                title={t?.findTherapist?.title || t?.tabs?.doctors || 'Find a Therapist'}
            />

            {/* Search bar */}
            <View style={[styles.searchBar, rowStyle]}>
                <Image source={ICONS.search} style={styles.searchIcon} />
                <TextInput
                    style={[styles.searchInput, alignText]}
                    placeholder={t?.findTherapist?.searchPlaceholder || 'Search by name or specialty...'}
                    placeholderTextColor={COLORS.gray500}
                    value={filters.search}
                    onChangeText={text => updateFilters({ search: text })}
                />
            </View>

            {/* Filter pills row */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[
                  styles.filterPillsContainer,
                  isRTL && { flexDirection: 'row-reverse' },
                ]}
                style={{ maxHeight: 52 }}
            >
                {FILTER_TYPES.map(ft => {
                    const count = getFilterCount(ft.key);
                    const isActive = count > 0;
                    return (
                        <TouchableOpacity
                            key={ft.key}
                            style={[
                                styles.filterPill,
                                { borderColor: ft.color + '40' },
                                isActive && { backgroundColor: ft.color + '15', borderColor: ft.color },
                            ]}
                            onPress={() => setActiveFilterSheet(ft.key)}
                            activeOpacity={0.7}
                        >
                            <Image
                                source={ICONS[ft.icon]}
                                style={[styles.filterPillIcon, { tintColor: ft.color }]}
                            />
                            <Text style={[styles.filterPillText, { color: isActive ? ft.color : COLORS.textPrimary }]}>
                                {isRTL ? ft.labelAr : ft.label}
                            </Text>
                            {isActive && (
                                <View style={[styles.filterBadge, { backgroundColor: ft.color }]}>
                                    <Text style={styles.filterBadgeText}>{count}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {/* Active filter tags */}
            {activeTags.length > 0 && (
                <View style={styles.activeTagsContainer}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={[rowStyle, { gap: 6 }]}
                    >
                        {activeTags.map((tag, i) => (
                            <TouchableOpacity
                                key={`${tag.key}-${tag.value}-${i}`}
                                style={styles.activeTag}
                                onPress={() => {
                                    if (tag.key === 'priceMin') {
                                        updateFilters({ priceMin: '', priceMax: '' });
                                    } else {
                                        removeFilter(tag.key, tag.value);
                                    }
                                }}
                            >
                                <Text style={styles.activeTagText}>{tag.label}</Text>
                                <Text style={styles.activeTagClose}> x</Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity style={styles.clearAllBtn} onPress={clearFilters}>
                            <Text style={styles.clearAllText}>
                                {t?.filters?.clearFilters || 'Clear All'}
                            </Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            )}

            {/* Results count */}
            <View style={styles.sortRow}>
                <Text style={[styles.resultsCount, alignText]}>
                    {loading ? (t?.common?.loading || 'Loading...') : `${pagination?.total || providers.length} ${t?.findTherapist?.results || 'results'}`}
                </Text>
            </View>

            {/* Results */}
            {loading ? (
                <ScrollView contentContainerStyle={{ padding: 20 }}>
                    {[1, 2, 3, 4].map(i => <TherapistCardSkeleton key={i} />)}
                </ScrollView>
            ) : (
                <FlatList
                    data={providers}
                    keyExtractor={(item, index) => (item.id || item._id || index).toString()}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: 20 }}
                    ListEmptyComponent={renderEmpty}
                    ListFooterComponent={renderFooter}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* Filter bottom sheet */}
            <FilterBottomSheet
                visible={activeFilterSheet !== null}
                filterType={activeFilterSheet}
                filterOptions={filterOptions}
                currentFilters={filters}
                onApply={handleFilterApply}
                onClose={() => setActiveFilterSheet(null)}
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
    searchBar: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.pill,
        marginHorizontal: SPACING.xl,
        marginTop: SPACING.sm,
        paddingHorizontal: SPACING.lg,
        alignItems: 'center',
        height: 48,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
    },
    searchIcon: {
        width: 18,
        height: 18,
        tintColor: COLORS.gray500,
        marginHorizontal: 4,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: COLORS.textPrimary,
        paddingVertical: 0,
    },
    filterPillsContainer: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        gap: 8,
        alignItems: 'center',
    },
    filterPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.gray300,
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 7,
        gap: 5,
        height: 36,
    },
    filterPillActive: {
        backgroundColor: COLORS.promo1,
        borderColor: COLORS.primary,
    },
    filterPillIcon: {
        width: 14,
        height: 14,
        tintColor: COLORS.gray500,
    },
    filterPillIconActive: {
        tintColor: COLORS.primary,
    },
    filterPillText: {
        fontSize: 12,
        color: COLORS.textPrimary,
    },
    filterPillTextActive: {
        color: COLORS.primary,
        fontWeight: '600',
    },
    filterBadge: {
        backgroundColor: COLORS.primary,
        borderRadius: 8,
        minWidth: 16,
        height: 16,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    filterBadgeText: {
        color: COLORS.white,
        fontSize: 9,
        fontWeight: 'bold',
    },
    activeTagsContainer: {
        paddingHorizontal: 16,
        marginBottom: 2,
    },
    activeTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.promo1,
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: COLORS.primary + '40',
    },
    activeTagText: {
        fontSize: 12,
        color: COLORS.primary,
    },
    activeTagClose: {
        fontSize: 12,
        color: COLORS.primary,
        fontWeight: 'bold',
    },
    clearAllBtn: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        justifyContent: 'center',
    },
    clearAllText: {
        fontSize: 12,
        color: COLORS.danger,
        fontWeight: '600',
    },
    sortRow: {
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 2,
        marginTop: 2,
    },
    resultsCount: {
        fontSize: 13,
        color: COLORS.textSecondary,
    },
    sortPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: COLORS.gray100,
    },
    sortIcon: {
        width: 12,
        height: 12,
        tintColor: COLORS.textSecondary,
    },
    sortPillText: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    sortDropdown: {
        backgroundColor: COLORS.white,
        marginHorizontal: 20,
        borderRadius: 12,
        elevation: 4,
        shadowColor: COLORS.shadow,
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 8,
        padding: 8,
        marginBottom: 8,
    },
    sortOption: {
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 8,
    },
    sortOptionActive: {
        backgroundColor: COLORS.promo1,
    },
    sortOptionText: {
        fontSize: 14,
        color: COLORS.textPrimary,
    },
    sortOptionTextActive: {
        color: COLORS.primary,
        fontWeight: '600',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyIcon: {
        width: 60,
        height: 60,
        opacity: 0.4,
        marginBottom: 16,
    },
    emptyText: {
        fontSize: 15,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: 12,
    },
    clearBtn: {
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    clearBtnText: {
        color: COLORS.white,
        fontWeight: '600',
        fontSize: 14,
    },
    paginationRow: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        paddingVertical: 20,
    },
    pageBtn: {
        backgroundColor: COLORS.primary,
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    pageBtnDisabled: {
        backgroundColor: COLORS.disabled,
    },
    pageBtnText: {
        color: COLORS.white,
        fontSize: 13,
        fontWeight: '600',
    },
    pageInfo: {
        fontSize: 13,
        color: COLORS.textSecondary,
    },
});

export default FindTherapistScreen;
