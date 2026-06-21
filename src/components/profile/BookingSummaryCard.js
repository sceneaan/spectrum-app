import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import COLORS from '../../constants/colors';
import RiyalText from '../RiyalText';
import moment from 'moment-timezone';

const BookingSummaryCard = ({ selectedDate, selectedTime, selectedService, isRTL, t }) => {
    if (!selectedDate || !selectedTime || !selectedService) return null;

    const rowStyle = { flexDirection: isRTL ? 'row-reverse' : 'row' };
    const alignText = { textAlign: isRTL ? 'right' : 'left' };

    const formattedDate = moment(selectedDate).locale(isRTL ? 'ar' : 'en').format('dddd, D MMMM YYYY');
    const formattedTime = selectedTime.startTime
        ? moment(selectedTime.startTime).locale(isRTL ? 'ar' : 'en').format('h:mm A')
        : '';

    const serviceName = isRTL
        ? (selectedService.nameArabic || selectedService.nameEnglish || selectedService.name)
        : (selectedService.nameEnglish || selectedService.nameArabic || selectedService.name);

    return (
        <View style={styles.card}>
            <Text style={[styles.title, alignText]}>
                {t?.therapistProfile?.bookingSummary || 'Booking Summary'}
            </Text>

            <View style={styles.row}>
                <Text style={styles.label}>{t?.therapistProfile?.date || 'Date'}</Text>
                <Text style={styles.value}>{formattedDate}</Text>
            </View>

            <View style={styles.row}>
                <Text style={styles.label}>{t?.therapistProfile?.time || 'Time'}</Text>
                <Text style={styles.value}>{formattedTime}</Text>
            </View>

            <View style={styles.row}>
                <Text style={styles.label}>{t?.therapistProfile?.service || 'Service'}</Text>
                <Text style={styles.value}>{serviceName}</Text>
            </View>

            <View style={styles.divider} />

            <View style={[styles.totalRow, rowStyle]}>
                <Text style={styles.totalLabel}>{t?.therapistProfile?.total || 'Total'}</Text>
                <RiyalText
                    text={selectedService.price || '0'}
                    textStyle={styles.totalValue}
                    size={14}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.gray100,
        borderRadius: 14,
        padding: 16,
        marginTop: 16,
    },
    title: {
        fontSize: 15,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        marginBottom: 12,
    },
    row: {
        marginBottom: 8,
    },
    label: {
        fontSize: 11,
        color: COLORS.textSecondary,
        marginBottom: 2,
    },
    value: {
        fontSize: 14,
        color: COLORS.textPrimary,
        fontWeight: '500',
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.gray300,
        marginVertical: 10,
    },
    totalRow: {
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    totalLabel: {
        fontSize: 15,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
    },
    totalValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
});

export default React.memo(BookingSummaryCard);
