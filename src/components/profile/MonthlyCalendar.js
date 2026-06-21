import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import COLORS from '../../constants/colors';

const DAY_HEADERS_EN = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_HEADERS_AR = ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'];

const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

const DayCell = React.memo(({ day, isAvailable, isSelected, isToday, onPress }) => {
    if (!day) {
        return <View style={styles.cellEmpty} />;
    }

    return (
        <TouchableOpacity
            style={[
                styles.cell,
                isAvailable && styles.cellAvailable,
                isSelected && styles.cellSelected,
                isToday && !isSelected && styles.cellToday,
            ]}
            onPress={onPress}
            disabled={!isAvailable}
            activeOpacity={0.7}
        >
            <Text style={[
                styles.cellText,
                !isAvailable && styles.cellTextDisabled,
                isAvailable && styles.cellTextAvailable,
                isSelected && styles.cellTextSelected,
            ]}>
                {day}
            </Text>
        </TouchableOpacity>
    );
});

const MonthlyCalendar = ({ slots, selectedDate, onSelectDate, isRTL, t }) => {
    const today = new Date();
    const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    // Build set of available dates from slots
    const availableDatesSet = useMemo(() => {
        const set = new Set();
        (slots || []).forEach(slot => {
            if (slot.slotCount > 0 && slot.date) {
                // Use string split to avoid UTC-midnight timezone shift from new Date()
                set.add(slot.date.split('T')[0]);
            }
        });
        return set;
    }, [slots]);

    // Generate calendar grid
    const calendarGrid = useMemo(() => {
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const grid = [];
        let week = new Array(firstDay).fill(null);

        for (let d = 1; d <= daysInMonth; d++) {
            week.push(d);
            if (week.length === 7) {
                grid.push(week);
                week = [];
            }
        }
        if (week.length > 0) {
            while (week.length < 7) week.push(null);
            grid.push(week);
        }
        return grid;
    }, [year, month]);

    const isDateAvailable = useCallback((day) => {
        if (!day) return false;
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dateObj = new Date(year, month, day);
        // Must be today or future and have available slots
        return dateObj >= new Date(today.getFullYear(), today.getMonth(), today.getDate()) && availableDatesSet.has(dateKey);
    }, [year, month, availableDatesSet, today]);

    const isDateSelected = useCallback((day) => {
        if (!day || !selectedDate) return false;
        const sel = new Date(selectedDate);
        return sel.getFullYear() === year && sel.getMonth() === month && sel.getDate() === day;
    }, [selectedDate, year, month]);

    const isTodayDate = useCallback((day) => {
        if (!day) return false;
        return today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
    }, [year, month, today]);

    const handleDayPress = useCallback((day) => {
        const date = new Date(year, month, day);
        onSelectDate(date);
    }, [year, month, onSelectDate]);

    const goToPrevMonth = () => {
        setViewDate(new Date(year, month - 1, 1));
    };

    const goToNextMonth = () => {
        setViewDate(new Date(year, month + 1, 1));
    };

    const canGoPrev = year > today.getFullYear() || (year === today.getFullYear() && month > today.getMonth());

    const dayHeaders = isRTL ? DAY_HEADERS_AR : DAY_HEADERS_EN;
    const monthName = isRTL ? MONTHS_AR[month] : MONTHS_EN[month];

    return (
        <View style={styles.container}>
            {/* Month navigation */}
            <View style={[styles.headerRow, isRTL && { flexDirection: 'row-reverse' }]}>
                <TouchableOpacity
                    onPress={goToPrevMonth}
                    disabled={!canGoPrev}
                    style={[styles.navBtn, !canGoPrev && styles.navBtnDisabled]}
                >
                    <Text style={[styles.navBtnText, !canGoPrev && styles.navBtnTextDisabled]}>
                        {isRTL ? '›' : '‹'}
                    </Text>
                </TouchableOpacity>
                <Text style={styles.monthTitle}>{monthName} {year}</Text>
                <TouchableOpacity onPress={goToNextMonth} style={styles.navBtn}>
                    <Text style={styles.navBtnText}>
                        {isRTL ? '‹' : '›'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Day headers */}
            <View style={styles.dayHeaderRow}>
                {dayHeaders.map((d, i) => (
                    <View key={i} style={styles.dayHeaderCell}>
                        <Text style={styles.dayHeaderText}>{d}</Text>
                    </View>
                ))}
            </View>

            {/* Calendar grid */}
            {calendarGrid.map((week, wi) => (
                <View key={wi} style={styles.weekRow}>
                    {week.map((day, di) => (
                        <DayCell
                            key={`${wi}-${di}`}
                            day={day}
                            isAvailable={isDateAvailable(day)}
                            isSelected={isDateSelected(day)}
                            isToday={isTodayDate(day)}
                            onPress={() => handleDayPress(day)}
                        />
                    ))}
                </View>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 16,
        elevation: 2,
        shadowColor: COLORS.shadow,
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 1 },
        shadowRadius: 4,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    navBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.gray100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    navBtnDisabled: {
        opacity: 0.3,
    },
    navBtnText: {
        fontSize: 22,
        color: COLORS.textPrimary,
        fontWeight: '600',
    },
    navBtnTextDisabled: {
        color: COLORS.disabled,
    },
    monthTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
    },
    dayHeaderRow: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    dayHeaderCell: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 4,
    },
    dayHeaderText: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontWeight: '600',
    },
    weekRow: {
        flexDirection: 'row',
    },
    cell: {
        flex: 1,
        aspectRatio: 1,
        alignItems: 'center',
        justifyContent: 'center',
        margin: 2,
        borderRadius: 8,
    },
    cellEmpty: {
        flex: 1,
        aspectRatio: 1,
        margin: 2,
    },
    cellAvailable: {
        // Available dates are just touchable with primary text
    },
    cellSelected: {
        backgroundColor: COLORS.primary,
        borderRadius: 8,
    },
    cellToday: {
        borderWidth: 1,
        borderColor: COLORS.primary,
        borderRadius: 8,
    },
    cellText: {
        fontSize: 14,
        color: COLORS.disabled,
    },
    cellTextDisabled: {
        color: COLORS.disabled,
    },
    cellTextAvailable: {
        color: COLORS.primary,
        fontWeight: '600',
    },
    cellTextSelected: {
        color: COLORS.white,
        fontWeight: 'bold',
    },
});

export default React.memo(MonthlyCalendar);
