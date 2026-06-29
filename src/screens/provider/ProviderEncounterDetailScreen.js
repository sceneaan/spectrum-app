import React from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRoute } from '@react-navigation/native';
import moment from 'moment';
import Header from '../../components/Header';
import ProviderStatusBadge from '../../components/provider/ProviderStatusBadge';
import { AppText, AppCard, EmptyState } from '../../components/ui';
import { useLanguage } from '../../store/LanguageContext';
import { useGetEncounterDetails } from '../../api/services/Encounter.Service';
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

const ProviderEncounterDetailScreen = () => {
  const route = useRoute();
  const { t, isRTL } = useLanguage();
  const pd = t.providerDashboard || {};
  const encounterId = route.params?.encounterId;
  const initialEncounter = route.params?.encounter;

  const { data: fetchedEncounter, isLoading, isError, refetch } = useGetEncounterDetails(encounterId);
  const encounter = fetchedEncounter || initialEncounter;

  if (isLoading && !encounter) {
    return (
      <View style={styles.container}>
        <Header showBack title={pd.encounter || 'Encounter'} />
        <ActivityIndicator color={COLORS.primary} style={styles.loader} />
      </View>
    );
  }

  if (isError && !encounter) {
    return (
      <View style={styles.container}>
        <Header showBack title={pd.encounter || 'Encounter'} />
        <EmptyState
          title={pd.loadError || 'Could not load encounter'}
          actionLabel={t.messaging?.retry || t.common?.retry || 'Retry'}
          onAction={refetch}
        />
      </View>
    );
  }

  if (!encounter) {
    return (
      <View style={styles.container}>
        <Header showBack title={pd.encounter || 'Encounter'} />
        <EmptyState title={pd.encounterNotFound || 'Encounter not found'} />
      </View>
    );
  }

  const patientName = getPatientDisplayName(encounter.patient, isRTL) || pd.patient;
  const when = encounter.date
    ? moment(encounter.date).format('MMM D, YYYY h:mm A')
    : encounter.time;

  return (
    <View style={styles.container}>
      <Header showBack title={pd.encounter || 'Encounter'} />
      <ScrollView contentContainerStyle={styles.content}>
        <AppCard padding={SPACING.lg}>
          <View style={styles.headerRow}>
            <AppText variant="h3" style={styles.flex}>{patientName}</AppText>
            <ProviderStatusBadge status={encounter.status || 'open'} />
          </View>
          <DetailRow label={pd.encounterType || 'Type'} value={encounter.type} />
          <DetailRow label={pd.date || 'Date'} value={when} />
          <DetailRow label={pd.status || 'Status'} value={encounter.status} />
          <DetailRow label={pd.chiefComplaint || 'Chief complaint'} value={encounter.chiefComplaint} />
          <DetailRow label={pd.notes || 'Notes'} value={encounter.notes || encounter.summary} />
        </AppCard>
        <AppCard muted padding={SPACING.md}>
          <AppText variant="caption" color={COLORS.textSecondary}>
            {pd.encounterWebHint || 'Full encounter editing is available on the clinic website.'}
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

export default ProviderEncounterDetailScreen;
