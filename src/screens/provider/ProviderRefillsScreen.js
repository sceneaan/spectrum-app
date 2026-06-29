import React, { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Header from '../../components/Header';
import ProviderRefillModal from '../../components/provider/ProviderRefillModal';
import ProviderStatusBadge from '../../components/provider/ProviderStatusBadge';
import { AppText, AppCard, EmptyState } from '../../components/ui';
import { useLanguage } from '../../store/LanguageContext';
import { usePatientToProviderRequests } from '../../api/services/Refill.Service';
import { getPatientDisplayName } from '../../utils/providerAppointments';
import COLORS from '../../constants/colors';
import { SPACING } from '../../theme';
import moment from 'moment';

const ProviderRefillsScreen = () => {
  const { t, isRTL } = useLanguage();
  const pd = t.providerDashboard || {};
  const [selectedRefill, setSelectedRefill] = useState(null);

  const { data, isLoading, refetch, isRefetching } = usePatientToProviderRequests();

  const requests = useMemo(() => {
    const docs = data?.docs || data || [];
    return docs.filter((r) => r.status === 'Pending');
  }, [data]);

  const renderItem = ({ item }) => {
    const patient = item.patient || item.patientDetails;
    const patientName = getPatientDisplayName(patient, isRTL) || pd.patient || 'Patient';
    const medCount = item.medications?.length || 0;
    const firstMed = item.medications?.[0]?.drugName;
    const requestedAt = item.createdAt ? moment(item.createdAt).format('MMM D, YYYY') : '';

    return (
      <TouchableOpacity activeOpacity={0.85} onPress={() => setSelectedRefill(item)}>
        <AppCard style={styles.card}>
          <View style={styles.topRow}>
            <AppText variant="h3">{patientName}</AppText>
            <ProviderStatusBadge status={item.status || 'Pending'} />
          </View>
          <AppText variant="bodySmall">
            {firstMed || pd.medication}
            {medCount > 1 ? ` +${medCount - 1}` : ''}
          </AppText>
          {requestedAt ? <AppText variant="caption" color={COLORS.textSecondary}>{requestedAt}</AppText> : null}
          <AppText variant="caption" color={COLORS.primary} style={styles.tapHint}>
            {pd.tapToReview || 'Tap to review medications'}
          </AppText>
        </AppCard>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Header showBack title={pd.refillsTitle || 'Refill requests'} />
      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => String(item._id || item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={(
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />
          )}
          ListEmptyComponent={(
            <EmptyState
              title={pd.noRefills || 'No pending refill requests'}
              subtitle={pd.noRefillsHint || 'New patient refill requests will show here'}
            />
          )}
        />
      )}

      <ProviderRefillModal
        visible={Boolean(selectedRefill)}
        refill={selectedRefill}
        onClose={() => setSelectedRefill(null)}
        onUpdated={refetch}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  list: { padding: SPACING.lg, paddingBottom: 40 },
  card: { marginBottom: SPACING.md },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  tapHint: { marginTop: SPACING.sm, fontWeight: '600' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default ProviderRefillsScreen;
