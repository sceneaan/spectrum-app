import React, { useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import moment from 'moment';
import Header from '../../components/Header';
import { AppText, AppCard, EmptyState, SectionHeader } from '../../components/ui';
import { useLanguage } from '../../store/LanguageContext';
import { useGetPatientMedicalRecord } from '../../api/services/User.Service';
import { formatPersonName } from '../../utils/displayName';
import { isRTL } from '../../utils/rtlUtils';
import COLORS from '../../constants/colors';
import { SPACING, RADIUS } from '../../theme';

const InfoRow = ({ label, value, rtl }) => (
  <View style={[styles.infoRow, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
    <AppText variant="caption" color={COLORS.textSecondary} style={styles.infoLabel}>{label}</AppText>
    <AppText variant="bodySmall" style={styles.infoValue} numberOfLines={3}>{value || '—'}</AppText>
  </View>
);

const ProviderPatientDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useLanguage();
  const pd = t.providerDashboard || {};
  const rtl = isRTL();
  const patientId = route.params?.patientId;
  const patientName = route.params?.patientName;

  const { data, isLoading, isError, refetch, isRefetching } = useGetPatientMedicalRecord(patientId);

  const patient = data?.patientDetails;
  const displayName = useMemo(() => {
    if (patientName) return patientName;
    return formatPersonName(patient?.fullName) || pd.patient || 'Patient';
  }, [patient, patientName, pd.patient]);

  const issueLabels = useMemo(() => {
    const issues = patient?.issueCategories || [];
    return issues
      .map((item) => (rtl ? item.nameArabic : item.nameEnglish) || item.nameEnglish)
      .filter(Boolean)
      .join(', ');
  }, [patient?.issueCategories, rtl]);

  const formatBool = (value) => {
    if (value === true) return pd.yes || 'Yes';
    if (value === false) return pd.no || 'No';
    return '—';
  };

  return (
    <View style={styles.container}>
      <Header showBack title={displayName} onBack={() => navigation.goBack()} />
      {isLoading ? (
        <ActivityIndicator color={COLORS.primary} style={styles.loader} />
      ) : isError ? (
        <EmptyState
          title={pd.patientDetailError || 'Could not load patient details'}
          actionLabel={t.common?.retry || 'Retry'}
          onAction={() => refetch()}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
        >
          <AppCard padding={SPACING.lg}>
            <SectionHeader title={pd.patientOverview || 'Overview'} />
            <InfoRow label={pd.patientId || 'Patient ID'} value={patient?.userId} rtl={rtl} />
            <InfoRow label={pd.gender || 'Gender'} value={patient?.gender} rtl={rtl} />
            <InfoRow label={pd.dob || 'Date of birth'} value={patient?.dob} rtl={rtl} />
            <InfoRow label={pd.nationality || 'Nationality'} value={patient?.nationality} rtl={rtl} />
            <InfoRow label={pd.phone || 'Phone'} value={patient?.phone} rtl={rtl} />
            <InfoRow label={pd.lastVisit || 'Last visit'} value={data?.lastVisit} rtl={rtl} />
            <InfoRow label={pd.totalConsultations || 'Total consultations'} value={String(data?.totalConsultations ?? '—')} rtl={rtl} />
            <InfoRow label={pd.cancelledAppointments || 'Cancelled'} value={String(data?.cancelledAppointments ?? '—')} rtl={rtl} />
            <InfoRow label={pd.noShowAppointments || 'No-shows'} value={String(data?.noShowAppointments ?? '—')} rtl={rtl} />
          </AppCard>

          <AppCard padding={SPACING.lg} style={styles.sectionCard}>
            <SectionHeader title={pd.clinicalSummary || 'Clinical summary'} />
            <InfoRow label={pd.medicalHistory || 'Medical history'} value={patient?.history} rtl={rtl} />
            <InfoRow label={pd.allergies || 'Allergies'} value={patient?.allergies} rtl={rtl} />
            <InfoRow label={pd.medications || 'Medications'} value={patient?.medications} rtl={rtl} />
            <InfoRow label={pd.healthConcerns || 'Health concerns'} value={issueLabels} rtl={rtl} />
          </AppCard>

          <AppCard padding={SPACING.lg} style={styles.sectionCard}>
            <SectionHeader title={pd.intakeAssessment || 'Intake assessment'} />
            <InfoRow
              label={pd.visitedPsychiatrist || 'Visited psychiatrist'}
              value={formatBool(patient?.visitedPsychiatrist)}
              rtl={rtl}
            />
            {patient?.visitedPsychiatristDetails ? (
              <InfoRow label={pd.details || 'Details'} value={patient.visitedPsychiatristDetails} rtl={rtl} />
            ) : null}
            <InfoRow label={pd.onMedication || 'On medication'} value={formatBool(patient?.onMedication)} rtl={rtl} />
            <InfoRow
              label={pd.psychiatricMeds || 'Psychiatric medications'}
              value={formatBool(patient?.tookPsychiatricMedications)}
              rtl={rtl}
            />
            {patient?.tookPsychiatricMedicationsDetails ? (
              <InfoRow label={pd.details || 'Details'} value={patient.tookPsychiatricMedicationsDetails} rtl={rtl} />
            ) : null}
          </AppCard>

          {data?.todaysAppointment?.startTime ? (
            <AppCard padding={SPACING.lg} style={styles.sectionCard}>
              <SectionHeader title={pd.todaysSession || "Today's session"} />
              <InfoRow
                label={pd.time || 'Time'}
                value={`${data.todaysAppointment.startTime} – ${data.todaysAppointment.endTime || ''}`}
                rtl={rtl}
              />
              {data.todaysAppointment.serviceName ? (
                <InfoRow label={pd.service || 'Service'} value={data.todaysAppointment.serviceName} rtl={rtl} />
              ) : null}
            </AppCard>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loader: { marginTop: SPACING.xxl },
  content: { padding: SPACING.lg, paddingBottom: 40 },
  sectionCard: { marginTop: SPACING.md },
  infoRow: { marginBottom: SPACING.sm, alignItems: 'flex-start' },
  infoLabel: { width: 130, flexShrink: 0 },
  infoValue: { flex: 1 },
});

export default ProviderPatientDetailScreen;
