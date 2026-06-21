import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import COLORS from '../constants/colors';
import ICONS from '../constants/icons';

const CancellationPolicy = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const alignText = { textAlign: isRTL ? 'right' : 'left' };

  return (
    <View style={styles.container}>
      {/* Header with icon */}
      <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Text style={[styles.headerIcon]}>ⓘ</Text>
        <Text style={[styles.title, alignText]}>
          {t('checkout.cancellationPolicy') || 'Cancellation Policy'}
        </Text>
      </View>

      {/* Cancellation Policy Section */}
      <Text style={[styles.sectionTitle, alignText]}>
        {t('checkout.cancelPolicy') || 'Cancellation Policy'}
      </Text>
      <Text style={[styles.policyText, alignText]}>
        • {t('checkout.cancellationPolicyDetails.cancellation') || 'Cancellation allowed up to 24 hours before the appointment.'}
        {'\n\n'}
        • {t('checkout.cancellationPolicyDetails.fullRefund') || 'Full refund (96% after 4% processing fee) if cancelled more than 24 hours in advance.'}
        {'\n\n'}
        • {t('checkout.cancellationPolicyDetails.partialRefund') || '50% refund (48% after 4% processing fee) if cancelled between 2-24 hours before appointment.'}
        {'\n\n'}
        • {t('checkout.cancellationPolicyDetails.noRefund') || 'No refund if cancelled less than 2 hours before the appointment.'}
        {'\n\n'}
        • {t('checkout.cancellationPolicyDetails.processingFee') || 'A 4% processing fee is deducted from all refunds.'}
      </Text>

      {/* Appointment Change Policy Section */}
      <Text style={[styles.sectionTitle, alignText, { marginTop: 15 }]}>
        {t('checkout.appointmentChangePolicy') || 'Appointment Change Policy'}
      </Text>
      <Text style={[styles.policyText, alignText]}>
        {t('checkout.appointmentChangeDetails') || 'Appointments can be rescheduled up to 3 times. Changes must be made at least 24 hours in advance.'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white || '#fff',
    borderRadius: 10,
    padding: 16,
    borderWidth: 0.5,
    borderColor: COLORS.border || '#ddd',
  },
  header: {
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  headerIcon: {
    fontSize: 20,
    color: COLORS.textPrimary || '#000',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary || '#000',
    flex: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary || '#000',
    marginTop: 5,
    marginBottom: 8,
  },
  policyText: {
    fontSize: 13,
    color: '#555',
    lineHeight: 20,
  },
});

export default CancellationPolicy;
