import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    FlatList,
    StyleSheet,
    ScrollView,
} from 'react-native';
import momentHijri from 'moment-hijri';
import COLORS from '../constants/colors';

// Hijri months with Arabic and English names
const HIJRI_MONTHS = [
    { number: 1, nameEn: 'Muharram', nameAr: 'محرم', days: 30 },
    { number: 2, nameEn: 'Safar', nameAr: 'صفر', days: 29 },
    { number: 3, nameEn: "Rabi' al-Awwal", nameAr: 'ربيع الأول', days: 30 },
    { number: 4, nameEn: "Rabi' al-Thani", nameAr: 'ربيع الثاني', days: 29 },
    { number: 5, nameEn: 'Jumada al-Awwal', nameAr: 'جمادى الأولى', days: 30 },
    { number: 6, nameEn: 'Jumada al-Thani', nameAr: 'جمادى الآخرة', days: 29 },
    { number: 7, nameEn: 'Rajab', nameAr: 'رجب', days: 30 },
    { number: 8, nameEn: "Sha'ban", nameAr: 'شعبان', days: 29 },
    { number: 9, nameEn: 'Ramadan', nameAr: 'رمضان', days: 30 },
    { number: 10, nameEn: 'Shawwal', nameAr: 'شوال', days: 29 },
    { number: 11, nameEn: "Dhu al-Qi'dah", nameAr: 'ذو القعدة', days: 30 },
    { number: 12, nameEn: 'Dhu al-Hijjah', nameAr: 'ذو الحجة', days: 29 },
];

const HijriDatePicker = ({
    value,
    onChange,
    placeholder,
    isRTL = false,
    maxDate,
    style = {},
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('year'); // 'year', 'month', 'day'
    const [selectedYear, setSelectedYear] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(null);
    const [selectedDay, setSelectedDay] = useState(null);

    // Generate Hijri years from 1350 to current year
    const currentHijriYear = momentHijri().iYear();
    const years = useMemo(() => {
        const yearList = [];
        for (let year = currentHijriYear; year >= 1350; year--) {
            yearList.push(year);
        }
        return yearList;
    }, [currentHijriYear]);

    // Generate days based on selected month
    const days = useMemo(() => {
        if (!selectedMonth) return [];
        const month = HIJRI_MONTHS.find(m => m.number === selectedMonth);
        const dayCount = month ? month.days : 30;
        return Array.from({ length: dayCount }, (_, i) => i + 1);
    }, [selectedMonth]);

    // Initialize from existing value (Hijri string YYYY-MM-DD)
    useEffect(() => {
        if (value && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
            const [year, month, day] = value.split('-').map(Number);
            setSelectedYear(year);
            setSelectedMonth(month);
            setSelectedDay(day);
        }
    }, [value]);

    const handleConfirm = () => {
        if (selectedYear && selectedMonth && selectedDay) {
            // Format Hijri date as YYYY-MM-DD (for ELM API)
            const hijriDateStr = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${selectedDay.toString().padStart(2, '0')}`;

            // Pass Hijri date directly - no conversion needed (ELM API accepts Hijri)
            onChange(hijriDateStr, hijriDateStr);
            setIsOpen(false);
        }
    };

    const handleClear = () => {
        setSelectedYear(null);
        setSelectedMonth(null);
        setSelectedDay(null);
        setActiveTab('year');
        onChange(null, '');
        setIsOpen(false);
    };

    const getDisplayValue = () => {
        if (selectedYear && selectedMonth && selectedDay) {
            const month = HIJRI_MONTHS.find(m => m.number === selectedMonth);
            const monthName = isRTL ? month?.nameAr : month?.nameEn;
            return `${selectedDay} ${monthName} ${selectedYear}`;
        }
        return placeholder || (isRTL ? 'اختر التاريخ الهجري' : 'Select Hijri Date');
    };

    const renderYearPicker = () => (
        <FlatList
            data={years}
            keyExtractor={(item) => item.toString()}
            renderItem={({ item }) => (
                <TouchableOpacity
                    style={[
                        styles.listItem,
                        selectedYear === item && styles.listItemSelected
                    ]}
                    onPress={() => {
                        setSelectedYear(item);
                        setActiveTab('month');
                    }}
                >
                    <Text style={[
                        styles.listItemText,
                        selectedYear === item && styles.listItemTextSelected
                    ]}>
                        {item}
                    </Text>
                </TouchableOpacity>
            )}
            initialScrollIndex={years.findIndex(y => y === selectedYear) > -1 ? years.findIndex(y => y === selectedYear) : 0}
            getItemLayout={(data, index) => ({
                length: 48,
                offset: 48 * index,
                index,
            })}
        />
    );

    const renderMonthPicker = () => (
        <FlatList
            data={HIJRI_MONTHS}
            keyExtractor={(item) => item.number.toString()}
            renderItem={({ item }) => (
                <TouchableOpacity
                    style={[
                        styles.listItem,
                        selectedMonth === item.number && styles.listItemSelected
                    ]}
                    onPress={() => {
                        setSelectedMonth(item.number);
                        setActiveTab('day');
                    }}
                >
                    <Text style={[
                        styles.listItemText,
                        selectedMonth === item.number && styles.listItemTextSelected
                    ]}>
                        {isRTL ? item.nameAr : item.nameEn} ({item.number})
                    </Text>
                </TouchableOpacity>
            )}
        />
    );

    const renderDayPicker = () => (
        <View style={styles.daysGrid}>
            {days.map((day) => (
                <TouchableOpacity
                    key={day}
                    style={[
                        styles.dayItem,
                        selectedDay === day && styles.dayItemSelected
                    ]}
                    onPress={() => setSelectedDay(day)}
                >
                    <Text style={[
                        styles.dayItemText,
                        selectedDay === day && styles.dayItemTextSelected
                    ]}>
                        {day}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );

    return (
        <>
            <TouchableOpacity
                style={[styles.inputContainer, style]}
                onPress={() => setIsOpen(true)}
            >
                <Text style={[
                    styles.inputText,
                    (!selectedYear || !selectedMonth || !selectedDay) && styles.placeholderText
                ]}>
                    {getDisplayValue()}
                </Text>
            </TouchableOpacity>

            <Modal
                visible={isOpen}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsOpen(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        {/* Header */}
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {isRTL ? 'التقويم الهجري' : 'Hijri Calendar'}
                            </Text>
                            <TouchableOpacity onPress={() => setIsOpen(false)}>
                                <Text style={styles.closeButton}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Tabs */}
                        <View style={styles.tabContainer}>
                            <TouchableOpacity
                                style={[styles.tab, activeTab === 'year' && styles.tabActive]}
                                onPress={() => setActiveTab('year')}
                            >
                                <Text style={[styles.tabText, activeTab === 'year' && styles.tabTextActive]}>
                                    {isRTL ? 'السنة' : 'Year'}
                                </Text>
                                {selectedYear && (
                                    <Text style={styles.tabValue}>{selectedYear}</Text>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.tab, activeTab === 'month' && styles.tabActive]}
                                onPress={() => selectedYear && setActiveTab('month')}
                            >
                                <Text style={[
                                    styles.tabText,
                                    activeTab === 'month' && styles.tabTextActive,
                                    !selectedYear && styles.tabTextDisabled
                                ]}>
                                    {isRTL ? 'الشهر' : 'Month'}
                                </Text>
                                {selectedMonth && (
                                    <Text style={styles.tabValue}>
                                        {HIJRI_MONTHS.find(m => m.number === selectedMonth)?.[isRTL ? 'nameAr' : 'nameEn']}
                                    </Text>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.tab, activeTab === 'day' && styles.tabActive]}
                                onPress={() => selectedMonth && setActiveTab('day')}
                            >
                                <Text style={[
                                    styles.tabText,
                                    activeTab === 'day' && styles.tabTextActive,
                                    !selectedMonth && styles.tabTextDisabled
                                ]}>
                                    {isRTL ? 'اليوم' : 'Day'}
                                </Text>
                                {selectedDay && (
                                    <Text style={styles.tabValue}>{selectedDay}</Text>
                                )}
                            </TouchableOpacity>
                        </View>

                        {/* Picker Content */}
                        <View style={styles.pickerContent}>
                            {activeTab === 'year' && renderYearPicker()}
                            {activeTab === 'month' && renderMonthPicker()}
                            {activeTab === 'day' && (
                                <ScrollView>
                                    {renderDayPicker()}
                                </ScrollView>
                            )}
                        </View>

                        {/* Action Buttons */}
                        <View style={styles.actionButtons}>
                            <TouchableOpacity
                                style={styles.clearButton}
                                onPress={handleClear}
                            >
                                <Text style={styles.clearButtonText}>
                                    {isRTL ? 'مسح' : 'Clear'}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.confirmButton,
                                    (!selectedYear || !selectedMonth || !selectedDay) && styles.confirmButtonDisabled
                                ]}
                                onPress={handleConfirm}
                                disabled={!selectedYear || !selectedMonth || !selectedDay}
                            >
                                <Text style={styles.confirmButtonText}>
                                    {isRTL ? 'تأكيد' : 'Confirm'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    inputContainer: {
        borderWidth: 1,
        borderColor: COLORS.gray300,
        borderRadius: 8,
        padding: 15,
        backgroundColor: COLORS.white,
    },
    inputText: {
        fontSize: 14,
        color: COLORS.textPrimary,
    },
    placeholderText: {
        color: COLORS.gray400,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '80%',
        paddingBottom: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.gray200,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
    },
    closeButton: {
        fontSize: 20,
        color: COLORS.gray600,
        padding: 5,
    },
    tabContainer: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: COLORS.gray200,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
    },
    tabActive: {
        borderBottomWidth: 2,
        borderBottomColor: COLORS.primary,
    },
    tabText: {
        fontSize: 13,
        color: COLORS.gray500,
        fontWeight: '500',
    },
    tabTextActive: {
        color: COLORS.primary,
        fontWeight: '600',
    },
    tabTextDisabled: {
        color: COLORS.gray300,
    },
    tabValue: {
        fontSize: 11,
        color: COLORS.primary,
        marginTop: 2,
    },
    pickerContent: {
        height: 300,
    },
    listItem: {
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.gray100,
    },
    listItemSelected: {
        backgroundColor: '#E6F7F5',
    },
    listItemText: {
        fontSize: 15,
        color: COLORS.textPrimary,
    },
    listItemTextSelected: {
        color: COLORS.primary,
        fontWeight: '600',
    },
    daysGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 10,
        justifyContent: 'flex-start',
    },
    dayItem: {
        width: '14.28%',
        aspectRatio: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 4,
    },
    dayItemSelected: {
        backgroundColor: COLORS.primary,
        borderRadius: 20,
    },
    dayItemText: {
        fontSize: 14,
        color: COLORS.textPrimary,
    },
    dayItemTextSelected: {
        color: COLORS.white,
        fontWeight: '600',
    },
    actionButtons: {
        flexDirection: 'row',
        padding: 20,
        gap: 10,
    },
    clearButton: {
        flex: 1,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: COLORS.gray300,
        borderRadius: 8,
        alignItems: 'center',
    },
    clearButtonText: {
        fontSize: 15,
        color: COLORS.gray600,
        fontWeight: '500',
    },
    confirmButton: {
        flex: 2,
        paddingVertical: 14,
        backgroundColor: COLORS.primary,
        borderRadius: 8,
        alignItems: 'center',
    },
    confirmButtonDisabled: {
        backgroundColor: COLORS.gray400,
    },
    confirmButtonText: {
        fontSize: 15,
        color: COLORS.white,
        fontWeight: '600',
    },
});

export default HijriDatePicker;
