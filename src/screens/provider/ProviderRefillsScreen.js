import React, { useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import Header from '../../components/Header';
import { AppText, AppCard, EmptyState, AppButton } from '../../components/ui';
import { useLanguage } from '../../store/LanguageContext';
import {
  usePatientToProviderRequests,
  useProcessRefillRequest,
} from '../../api/services/Refill.Service';
import { getPatientDisplayName } from '../../utils/providerAppointments';
import COLORS from '../../constants/colors';
import { SPACING } from '../../theme';
import moment from 'moment';

const ProviderRefillsScreen = () => {
  const { t, isRTL } = useLanguage();
  const pd = t.providerDashboard || {};
  const queryClient = useQueryClient();

  const { data, isLoading, refetch, isRefetching } = usePatientToProviderRequests();
  const { mutate: processRefill, isPending } = useProcessRefillRequest();

  const requests = useMemo(() => {
    const docs = data?.docs || data || [];
    return docs.filter((r) => r.status === 'Pending');
  }, [data]);

  const handleProcess = (item, action) => {
    const id = item._id || item.id;
    if (!id) return;

    const selectedMedications = (item.medications || [])
      .map((med) => med._id || med.id)
      .filter(Boolean);

    processRefill(
      {
        id,
        payload: {
          action,
          ...(selectedMedications.length > 0 ? { selectedMedications } : {}),
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['patientRefillRequests'] });
          Alert.alert(
            t.common?.success || 'Success',
            action === 'approve'
              ? (pd.refillApproved || 'Refill approved')
              : (pd.refillRejected || 'Refill declined'),
          );
        },
        onError: () => {
          Alert.alert(t.common?.error || 'Error', pd.refillFailed || 'Could not update refill request');
        },
      },
    );
  };

  const confirmReject = (item) => {
    Alert.alert(
      pd.declineRefill || 'Decline refill',
      pd.declineRefillConfirm || 'Decline this refill request?',
      [
        { text: t.common?.cancel || 'Cancel', style: 'cancel' },
        {
          text: pd.decline || 'Decline',
          style: 'destructive',
          onPress: () => handleProcess(item, 'decline'),
        },
      ],
    );
  };

  const renderItem = ({ item }) => {
    const patient = item.patient || item.patientDetails;
    const patientName = getPatientDisplayName(patient, isRTL) || pd.patient || 'Patient';
    const medication = item.medications?.[0]?.drugName
      || item.medicationName
      || item.medication
      || item.drugName
      || pd.medication
      || 'Medication';
    const requestedAt = item.createdAt ? moment(item.createdAt).format('MMM D, YYYY') : '';

    return (
      <AppCard style={styles.card}>
        <AppText variant="h3">{patientName}</AppText>
        <AppText variant="body" style={styles.med}>{medication}</AppText>
        {requestedAt ? <AppText variant="caption" muted>{requestedAt}</AppText> : null}
        {item.notes ? <AppText variant="caption" muted numberOfLines={3}>{item.notes}</AppText> : null}
        <View style={styles.actions}>
          <AppButton
            title={pd.approveRefill || 'Approve'}
            onPress={() => handleProcess(item, 'approve')}
            disabled={isPending}
            style={styles.btn}
          />
          <AppButton
            title={pd.decline || 'Decline'}
            variant="outline"
            onPress={() => confirmReject(item)}
            disabled={isPending}
            style={styles.btn}
          />
        </View>
      </AppCard>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  list: { padding: SPACING.lg, paddingBottom: 40 },
  card: { marginBottom: SPACING.md },
  med: { marginVertical: SPACING.xs },
  actions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  btn: { flex: 1 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default ProviderRefillsScreen;
