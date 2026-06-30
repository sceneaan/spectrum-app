import React, { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Image,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import moment from 'moment';
import Header from '../../components/Header';
import { AppText, AppCard, EmptyState } from '../../components/ui';
import { useLanguage } from '../../store/LanguageContext';
import { useGetAssociatedPatients } from '../../api/services/Appointment.Service';
import { formatPersonName } from '../../utils/displayName';
import { isRTL } from '../../utils/rtlUtils';
import COLORS from '../../constants/colors';
import ICONS from '../../constants/icons';
import { SPACING, RADIUS } from '../../theme';

const ProviderPatientsScreen = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const pd = t.providerDashboard || {};
  const rtl = isRTL();
  const rowStyle = { flexDirection: rtl ? 'row-reverse' : 'row' };
  const [search, setSearch] = useState('');

  const { data, isLoading, isError, refetch, isRefetching } = useGetAssociatedPatients();

  const patients = useMemo(() => {
    const list = data || [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((p) => {
      const name = formatPersonName(p.name) || '';
      return name.toLowerCase().includes(q) || (p.email || '').toLowerCase().includes(q);
    });
  }, [data, search]);

  const renderItem = ({ item }) => {
    const name = formatPersonName(item.name) || item.email || pd.patient || 'Patient';
    const lastVisit = item.lastVisit ? moment(item.lastVisit).format('MMM D, YYYY') : '';

    return (
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() => navigation.navigate('ProviderPatientDetail', {
          patientId: item._id,
          patientName: name,
        })}
      >
        <AppCard style={styles.card} padding={SPACING.lg}>
          <View style={[rowStyle, styles.row]}>
            <Image source={ICONS.defaultAvatar} style={styles.avatar} />
            <View style={styles.body}>
              <AppText variant="bodyMedium" numberOfLines={1}>{name}</AppText>
              {item.email ? (
                <AppText variant="caption" color={COLORS.textSecondary} numberOfLines={1}>{item.email}</AppText>
              ) : null}
              {lastVisit ? (
                <AppText variant="caption" color={COLORS.textSecondary}>
                  {(pd.lastVisit || 'Last visit')}: {lastVisit}
                </AppText>
              ) : null}
            </View>
          </View>
        </AppCard>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Header showBack title={pd.patientsTitle || 'Patients'} />
      <View style={styles.searchWrap}>
        <TextInput
          style={[styles.search, { textAlign: rtl ? 'right' : 'left' }]}
          placeholder={pd.searchPatients || 'Search patients'}
          placeholderTextColor={COLORS.gray500}
          value={search}
          onChangeText={setSearch}
        />
      </View>
      {isLoading ? (
        <ActivityIndicator color={COLORS.primary} style={styles.loader} />
      ) : isError ? (
        <EmptyState
          title={pd.loadError || 'Could not load patients'}
          actionLabel={t.common?.retry || 'Retry'}
          onAction={() => refetch()}
        />
      ) : (
        <FlatList
          data={patients}
          keyExtractor={(item) => String(item._id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
          ListEmptyComponent={<EmptyState title={pd.noPatients || 'No patients yet'} />}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  searchWrap: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm },
  search: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.lg,
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    color: COLORS.textPrimary,
  },
  list: { padding: SPACING.lg, paddingBottom: 40 },
  card: { marginBottom: SPACING.md },
  row: { alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, marginEnd: SPACING.md, backgroundColor: COLORS.gray200 },
  body: { flex: 1, minWidth: 0 },
  loader: { marginTop: SPACING.xxl },
});

export default ProviderPatientsScreen;
