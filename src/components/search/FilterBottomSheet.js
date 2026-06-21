import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import Modal from 'react-native-modal';
import COLORS from '../../constants/colors';

const FilterBottomSheet = ({ visible, filterType, filterOptions, currentFilters, onApply, onClose, isRTL, t }) => {
    const [localFilters, setLocalFilters] = useState({});
    const [searchText, setSearchText] = useState('');

    const alignText = { textAlign: isRTL ? 'right' : 'left' };
    const rowStyle = { flexDirection: isRTL ? 'row-reverse' : 'row' };

    useEffect(() => {
        if (visible) {
            setLocalFilters({ ...currentFilters });
            setSearchText('');
        }
    }, [visible, currentFilters]);

    const toggleArrayItem = (key, value) => {
        setLocalFilters(prev => {
            const arr = prev[key] || [];
            const exists = arr.includes(value);
            return {
                ...prev,
                [key]: exists ? arr.filter(v => v !== value) : [...arr, value],
            };
        });
    };

    const setScalarValue = (key, value) => {
        setLocalFilters(prev => ({
            ...prev,
            [key]: prev[key] === value ? '' : value,
        }));
    };

    const handleApply = () => {
        onApply(localFilters);
        onClose();
    };

    const isChipActive = (key, value) => {
        const val = localFilters[key];
        if (Array.isArray(val)) return val.includes(value);
        return val === value;
    };

    const renderChip = (label, key, value) => {
        const active = isChipActive(key, value);
        return (
            <TouchableOpacity
                key={`${key}-${value}`}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => {
                    if (Array.isArray(localFilters[key]) || Array.isArray(currentFilters[key])) {
                        toggleArrayItem(key, value);
                    } else {
                        setScalarValue(key, value);
                    }
                }}
            >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
            </TouchableOpacity>
        );
    };

    const filterSearchItems = (items) => {
        if (!searchText) return items || [];
        return (items || []).filter(item => {
            const name = typeof item === 'string' ? item : (item.nameEnglish || item.nameArabic || item.name || '');
            return name.toLowerCase().includes(searchText.toLowerCase());
        });
    };

    const getItemName = (item) => {
        if (typeof item === 'string') return item;
        return isRTL ? (item.nameArabic || item.nameEnglish || item.name) : (item.nameEnglish || item.nameArabic || item.name);
    };

    const getItemValue = (item) => {
        if (typeof item === 'string') return item;
        return item._id || item.id || item.nameEnglish || item.name;
    };

    const renderContent = () => {
        switch (filterType) {
            case 'issues': {
                const items = filterSearchItems(filterOptions?.issues);
                return (
                    <>
                        <Text style={[styles.title, alignText]}>
                            {t?.findTherapist?.filters?.issues || 'Issues'}
                        </Text>
                        <TextInput
                            style={[styles.searchInput, alignText]}
                            placeholder={t?.findTherapist?.searchIssues || 'Search issues...'}
                            placeholderTextColor={COLORS.gray500}
                            value={searchText}
                            onChangeText={setSearchText}
                        />
                        <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
                            <View style={styles.chipGrid}>
                                {items.map(item => renderChip(getItemName(item), 'issues', getItemValue(item)))}
                            </View>
                        </ScrollView>
                    </>
                );
            }
            case 'approaches': {
                const items = filterSearchItems(filterOptions?.approaches);
                return (
                    <>
                        <Text style={[styles.title, alignText]}>
                            {t?.findTherapist?.filters?.approaches || 'Approaches'}
                        </Text>
                        <TextInput
                            style={[styles.searchInput, alignText]}
                            placeholder={t?.findTherapist?.searchApproaches || 'Search approaches...'}
                            placeholderTextColor={COLORS.gray500}
                            value={searchText}
                            onChangeText={setSearchText}
                        />
                        <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
                            <View style={styles.chipGrid}>
                                {items.map(item => renderChip(getItemName(item), 'approaches', getItemValue(item)))}
                            </View>
                        </ScrollView>
                    </>
                );
            }
            case 'sessionType':
                return (
                    <>
                        <Text style={[styles.title, alignText]}>
                            {t?.findTherapist?.filters?.sessionType || 'Session Type'}
                        </Text>
                        <View style={styles.chipGrid}>
                            {renderChip(t?.findTherapist?.video || 'Video', 'sessionTypes', 'video')}
                            {renderChip(t?.findTherapist?.audio || 'Audio', 'sessionTypes', 'audio')}
                            {renderChip(t?.findTherapist?.chat || 'Chat', 'sessionTypes', 'chat')}
                        </View>
                    </>
                );
            case 'language': {
                const items = filterOptions?.languages || [];
                return (
                    <>
                        <Text style={[styles.title, alignText]}>
                            {t?.findTherapist?.filters?.language || 'Language'}
                        </Text>
                        <View style={styles.chipGrid}>
                            {items.map(item => renderChip(getItemName(item), 'languages', getItemValue(item)))}
                        </View>
                    </>
                );
            }
            case 'gender':
                return (
                    <>
                        <Text style={[styles.title, alignText]}>
                            {t?.findTherapist?.filters?.gender || 'Gender'}
                        </Text>
                        <View style={styles.chipGrid}>
                            {renderChip(isRTL ? 'ذكر' : 'Male', 'gender', 'male')}
                            {renderChip(isRTL ? 'أنثى' : 'Female', 'gender', 'female')}
                        </View>
                    </>
                );
            case 'advanced': {
                const ageItems = filterOptions?.ageGroups || [];
                return (
                    <>
                        <Text style={[styles.title, alignText]}>
                            {t?.findTherapist?.filters?.advanced || 'Advanced Filters'}
                        </Text>

                        {/* Age Groups */}
                        <Text style={[styles.subTitle, alignText]}>
                            {t?.findTherapist?.filters?.ageGroups || 'Age Groups'}
                        </Text>
                        <View style={styles.chipGrid}>
                            {ageItems.map(item => renderChip(getItemName(item), 'ageGroups', getItemValue(item)))}
                        </View>

                        {/* Price Range */}
                        <Text style={[styles.subTitle, alignText, { marginTop: 16 }]}>
                            {t?.findTherapist?.filters?.priceRange || 'Price Range'}
                        </Text>
                        <View style={[rowStyle, { gap: 12 }]}>
                            <TextInput
                                style={[styles.priceInput, alignText]}
                                placeholder={t?.findTherapist?.filters?.minPrice || 'Min'}
                                placeholderTextColor={COLORS.gray500}
                                keyboardType="numeric"
                                value={localFilters.priceMin || ''}
                                onChangeText={val => setLocalFilters(prev => ({ ...prev, priceMin: val }))}
                            />
                            <TextInput
                                style={[styles.priceInput, alignText]}
                                placeholder={t?.findTherapist?.filters?.maxPrice || 'Max'}
                                placeholderTextColor={COLORS.gray500}
                                keyboardType="numeric"
                                value={localFilters.priceMax || ''}
                                onChangeText={val => setLocalFilters(prev => ({ ...prev, priceMax: val }))}
                            />
                        </View>
                    </>
                );
            }
            default:
                return null;
        }
    };

    return (
        <Modal
            isVisible={visible}
            onBackdropPress={onClose}
            onSwipeComplete={onClose}
            swipeDirection="down"
            style={styles.modal}
            propagateSwipe
        >
            <View style={styles.container}>
                <View style={styles.handle} />
                {renderContent()}
                <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
                    <Text style={styles.applyBtnText}>
                        {t?.findTherapist?.apply || 'Apply'}
                    </Text>
                </TouchableOpacity>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modal: {
        justifyContent: 'flex-end',
        margin: 0,
    },
    container: {
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        maxHeight: '70%',
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: COLORS.gray300,
        alignSelf: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        marginBottom: 16,
    },
    subTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 10,
    },
    searchInput: {
        backgroundColor: COLORS.gray100,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 14,
        color: COLORS.textPrimary,
        marginBottom: 12,
    },
    scrollArea: {
        maxHeight: 250,
    },
    chipGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        backgroundColor: COLORS.gray100,
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: COLORS.gray200,
    },
    chipActive: {
        backgroundColor: COLORS.promo1,
        borderColor: COLORS.primary,
    },
    chipText: {
        fontSize: 13,
        color: COLORS.textPrimary,
    },
    chipTextActive: {
        color: COLORS.primary,
        fontWeight: '600',
    },
    priceInput: {
        flex: 1,
        backgroundColor: COLORS.gray100,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 14,
        color: COLORS.textPrimary,
    },
    applyBtn: {
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 20,
    },
    applyBtnText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default FilterBottomSheet;
