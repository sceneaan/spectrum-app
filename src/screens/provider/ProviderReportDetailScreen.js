import React from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRoute } from '@react-navigation/native';
import moment from 'moment';
import Header from '../../components/Header';
import ProviderStatusBadge from '../../components/provider/ProviderStatusBadge';
import { AppText, AppCard, EmptyState } from '../../components/ui';
import { useLanguage } from '../../store/LanguageContext';
import { useGetProviderReportById } from '../../api/services/MedicalReports.Service';
import { getPatientDisplayName } from '../../utils/providerAppointments';
import COLORS from '../../constants/colors';
import { SPACING } from '../../theme';

const DetailRow = ({ label, value }) => {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <AppText variant="caption" color={COLORS.textSecondary}>{label}</AppText>
      <AppText variant="bodyMedium">{value}</AppText>
    </View>
  );
};

const ProviderReportDetailScreen = () => {
  const route = useRoute();
  const { t, isRTL } = useLanguage();
  const pd = t.providerDashboard || {};
  const reportId = route.params?.reportId;
  const initialReport = route.params?.report;

  const { data: report, isLoading, isError, refetch } = useGetProviderReportById(reportId, initialReport);

  if (isLoading && !report) {
    return (
      <View style={styles.container}>
        <Header showBack title={pd.report || 'Report'} />
        <ActivityIndicator color={COLORS.primary} style={styles.loader} />
      </View>
    );
  }

  if (isError && !report) {
    return (
      <View style={styles.container}>
        <Header showBack title={pd.report || 'Report'} />
        <EmptyState
          title={pd.loadError || 'Could not load report'}
          actionLabel={t.messaging?.retry || t.common?.retry || 'Retry'}
          onAction={refetch}
        />
      </View>
    );
  }

  if (!report) {
    return (
      <View style={styles.container}>
        <Header showBack title={pd.report || 'Report'} />
        <EmptyState title={pd.reportNotFound || 'Report not found'} />
      </View>
    );
  }

  const patientName = getPatientDisplayName(report.patient, isRTL) || pd.patient;

  return (
    <View style={styles.container}>
      <Header showBack title={report.type || pd.report || 'Report'} />
      <ScrollView contentContainerStyle={styles.content}>
        <AppCard padding={SPACING.lg}>
          <View style={styles.headerRow}>
            <AppText variant="h3" style={styles.flex}>{report.type || pd.report}</AppText>
            <ProviderStatusBadge status={report.status} />
          </View>
          <DetailRow label={pd.patient || 'Patient'} value={patientName} />
          <DetailRow
            label={pd.date || 'Date'}
            value={report.createdAt ? moment(report.createdAt).format('MMM D, YYYY h:mm A') : null}
          />
          <DetailRow label={pd.status || 'Status'} value={report.status} />
          {report.report ? (
            <View style={styles.row}>
              <AppText variant="caption" color={COLORS.textSecondary}>{pd.notes || 'Notes'}</AppText>
              <AppText variant="bodySmall">{report.report}</AppText>
            </View>
          ) : null}
        </AppCard>
        <AppCard muted padding={SPACING.md}>
          <AppText variant="caption" color={COLORS.textSecondary}>
            {pd.reportWebHint || 'Full report editing is available on the clinic website.'}
          </AppText>
        </AppCard>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingBottom: 40 },
  loader: { marginTop: SPACING.xxl },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.sm, marginBottom: SPACING.md },
  flex: { flex: 1 },
  row: { marginBottom: SPACING.md },
});

export default ProviderReportDetailScreen;
