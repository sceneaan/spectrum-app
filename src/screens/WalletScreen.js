import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  StatusBar,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Header from '../components/Header';
import RiyalText from '../components/RiyalText';
import RedeemSupportCardModal from '../components/RedeemSupportCardModal';
import COLORS from '../constants/colors';
import { useLanguage } from '../store/LanguageContext';
import { useGetMyWallet } from '../api/services/Wallet.Service';
import { useGetWalletTransactions } from '../api/services/Transaction.Service';
import { useQueryClient } from '@tanstack/react-query';
import moment from 'moment';
import 'moment/locale/ar';
import Skeleton from '../components/Skeleton';
import { SPACING, RADIUS, SHADOWS } from '../theme';
import { formatSarAmount } from '../utils/formatMoney';

const formatWalletAmount = (amount) =>
  formatSarAmount(amount, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatTransactionTitle = (description, item, t, isRTL) => {
  if (!description || typeof description !== 'string') return description;

  let text = description.replace(/\bconsultation\s+consultation\b/gi, 'consultation').trim();
  const labels = t.wallet || {};

  const walletPay = text.match(/^Payment through wallet for (.+)$/i);
  if (walletPay) {
    return `${labels.txWalletPayment || 'Wallet payment'} · ${walletPay[1]}`;
  }

  const cardPay = text.match(/^Payment for (.+)$/i);
  if (cardPay) {
    return `${labels.txPayment || 'Payment'} · ${cardPay[1]}`;
  }

  if (/^Appointment Cancelled$/i.test(text)) {
    return labels.txAppointmentCancelled || 'Appointment cancelled';
  }

  const walletPayAr = text.match(/^دفع من خلال المحفظة مقابل (.+)$/);
  if (walletPayAr) {
    return `${labels.txWalletPayment || 'دفع من المحفظة'} · ${walletPayAr[1]}`;
  }

  const cardPayAr = text.match(/^دفع مقابل (.+)$/);
  if (cardPayAr) {
    return `${labels.txPayment || 'دفع'} · ${cardPayAr[1]}`;
  }

  if (text === 'تم إلغاء الموعد') {
    return labels.txAppointmentCancelled || 'تم إلغاء الموعد';
  }

  if (text.length > 52 && item?.serviceName) {
    const verb = item?.type === 'refund'
      ? (labels.txRefund || 'Refund')
      : (labels.txWalletPayment || 'Wallet payment');
    return `${verb} · ${item.serviceName}`;
  }

  return text;
};

const getTransactionFilterKey = (item) => {
  if (item?.type === 'refund') return 'refunded';
  const status = String(item?.status || 'completed').toLowerCase();
  if (status === 'cancelled') return 'cancelled';
  if (status === 'pending') return 'pending';
  if (status === 'failed') return 'failed';
  return 'completed';
};

const getTransactionStatusMeta = (item, t) => {
  const status = String(item?.status || 'completed').toLowerCase();
  if (item?.type === 'refund') {
    return {
      label: t.wallet?.statusRefunded || 'Refunded',
      color: COLORS.success,
      bg: '#E8F5E9',
    };
  }
  if (status === 'pending') {
    return { label: t.wallet?.statusPending || 'Pending', color: '#B45309', bg: '#FEF3C7' };
  }
  if (status === 'failed') {
    return { label: t.wallet?.statusFailed || 'Failed', color: COLORS.danger, bg: COLORS.errorBg };
  }
  if (status === 'cancelled') {
    return { label: t.wallet?.statusCancelled || 'Cancelled', color: COLORS.danger, bg: COLORS.errorBg };
  }
  return {
    label: t.wallet?.statusCompleted || 'Completed',
    color: COLORS.success,
    bg: '#E8F5E9',
  };
};

const TX_FILTER_KEYS = ['all', 'completed', 'refunded', 'cancelled'];

const getTransactionVisual = (item, isCredit, isDebit) => {
  if (item?.type === 'refund') {
    return { glyph: '↩', bubble: '#E8F5E9', color: COLORS.success };
  }
  if (item?.type === 'redeem') {
    return { glyph: '🎁', bubble: COLORS.promo1, color: COLORS.primaryDark };
  }
  if (isCredit) {
    return { glyph: '+', bubble: '#E8F5E9', color: COLORS.success };
  }
  if (isDebit) {
    return { glyph: '−', bubble: COLORS.errorBg, color: COLORS.danger };
  }
  return { glyph: '₿', bubble: COLORS.primaryLight, color: COLORS.primaryDark };
};

const WalletScreen = () => {
  const navigation = useNavigation();
  const { t, isRTL } = useLanguage();
  const queryClient = useQueryClient();
  const [transactions, setTransactions] = useState([]);
  const [page, setPage] = useState(1);
  const [isEndReached, setIsEndReached] = useState(false);
  const [redeemModalVisible, setRedeemModalVisible] = useState(false);
  const [txFilter, setTxFilter] = useState('all');

  const txFilterOptions = useMemo(() => {
    const w = t.wallet || {};
    const labelMap = {
      all: w.filterAll || 'All',
      completed: w.filterCompleted || 'Completed',
      refunded: w.filterRefunded || 'Refunded',
      cancelled: w.filterCancelled || 'Cancelled',
    };
    return TX_FILTER_KEYS.map((key) => ({ key, label: labelMap[key] }));
  }, [t.wallet]);

  const filteredTransactions = useMemo(() => {
    if (txFilter === 'all') return transactions;
    return transactions.filter((item) => getTransactionFilterKey(item) === txFilter);
  }, [transactions, txFilter]);

  // Fetch wallet balance
  const {
    data: myWallet,
    error: myWalletError,
    isLoading: walletLoading,
  } = useGetMyWallet();

  // Fetch wallet transactions
  const {
    data: walletTransactions,
    error: walletTransactionsError,
    isLoading: walletTransactionsLoader,
  } = useGetWalletTransactions({ page, limit: 10 });

  // Handle wallet transactions
  useEffect(() => {
    if (walletTransactions) {
      const newItems = walletTransactions.transactions || [];
      if (page === 1) {
        setTransactions(newItems);
      } else {
        setTransactions(prev => {
          const existingIds = new Set(prev.map(it => it._id));
          const merged = [...prev];
          newItems.forEach(it => {
            if (!existingIds.has(it._id)) {
              merged.push(it);
            }
          });
          return merged;
        });
      }
      const { pagination } = walletTransactions;
      if (pagination && !pagination.hasNextPage) {
        setIsEndReached(true);
      }
    }
    if (walletTransactionsError) {
      Alert.alert(
        t.error || 'Error',
        walletTransactionsError.message || 'Failed to load transactions'
      );
    }
  }, [walletTransactions, walletTransactionsError, t, page]);

  // Handle wallet errors
  useEffect(() => {
    if (myWalletError) {
      Alert.alert(
        t.error || 'Error',
        myWalletError.message || 'Failed to load wallet'
      );
    }
  }, [myWalletError, t]);

  // Set moment locale based on language
  useEffect(() => {
    moment.locale(isRTL ? 'ar' : 'en');
  }, [isRTL]);

  const renderItem = ({ item }) => {
    // Determine if transaction is a credit (deposit/refund) or debit (withdrawal/payment)
    // Match frontend logic exactly:
    // Check if admin added funds (notes contains "Deposited")
    const isAdminAdd = item?.notes && item.notes.includes("Deposited");

    // Credit transactions (green): refund, redeem, or admin add funds
    const isCredit = item?.type === 'refund' || item?.type === 'redeem' || isAdminAdd;

    // Debit transactions (red): payment or wallet deduction (but not admin add)
    const isDebit = item?.type === 'payment' || (item?.type === 'wallet' && !isAdminAdd);

    const amountValue = formatWalletAmount(item.netAmount ?? 0);
    const rawDescription = item?.description?.[isRTL ? 'ar' : 'en'] ||
                       item?.description?.en ||
                       item?.description?.ar ||
                       t.transaction || 'Transaction';
    const description = formatTransactionTitle(rawDescription, item, t, isRTL);

    const statusMeta = getTransactionStatusMeta(item, t);

    const visual = getTransactionVisual(item, isCredit, isDebit);
    const amountColor = isCredit ? COLORS.success : (isDebit ? COLORS.danger : COLORS.textPrimary);
    const amountPrefix = isCredit ? '+' : (isDebit ? '−' : '');

    return (
      <View style={styles.card}>
        <View style={[styles.txRow, isRTL && styles.rowRTL]}>
          <View style={[styles.txIconBubble, { backgroundColor: visual.bubble }]}>
            <Text style={[styles.txIconGlyph, { color: visual.color }]}>{visual.glyph}</Text>
          </View>

          <View style={styles.txBody}>
            <Text style={[styles.txTitle, isRTL && styles.textRTL]} numberOfLines={2}>
              {description}
            </Text>
            <Text style={[styles.txDate, isRTL && styles.textRTL]}>
              {moment(item.createdAt).locale(isRTL ? 'ar' : 'en').format('LL')}
            </Text>
            <View style={[styles.statusChip, { backgroundColor: statusMeta.bg }, isRTL && styles.statusChipRtl]}>
              <Text style={[styles.statusChipText, { color: statusMeta.color }]}>
                {statusMeta.label}
              </Text>
            </View>
          </View>

          <View style={[styles.amountContainer, isRTL && styles.amountContainerRTL]}>
            <Text style={[styles.amountPrefix, { color: amountColor }]}>{amountPrefix}</Text>
            <RiyalText
              text={amountValue}
              textStyle={[styles.txAmount, { color: amountColor }]}
              size={14}
            />
          </View>
        </View>
      </View>
    );
  };

  const renderFooter = () => {
    if (!walletTransactionsLoader || page === 1) return null;
    return (
      <ActivityIndicator
        color={COLORS.primary}
        size="small"
        style={{ marginVertical: 20 }}
      />
    );
  };

  const renderEmpty = () => {
    if (walletTransactionsLoader && page === 1) {
      return (
        <View style={{ padding: 16 }}>
          {[0, 1, 2].map(i => (
            <View key={i} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 15, marginBottom: 12 }}>
              <Skeleton width="60%" height={14} style={{ marginBottom: 8 }} />
              <Skeleton width="40%" height={12} />
            </View>
          ))}
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, isRTL && styles.textRTL]}>
          {txFilter === 'all'
            ? (t.wallet?.noTransactionsFound || 'No transactions found')
            : (t.wallet?.noTransactionsForFilter || 'No transactions in this category')}
        </Text>
      </View>
    );
  };

  const handleLoadMore = () => {
    if (!walletTransactionsLoader && !isEndReached) {
      setPage(prev => prev + 1);
    }
  };

  const handleRedeemSuccess = (result) => {
    // Refresh wallet balance (correct query key)
    queryClient.invalidateQueries({ queryKey: ['myWallet'] });

    // Add new transaction to top of list if available
    if (result?.transaction) {
      setTransactions(prev => [result.transaction, ...prev]);
    }

    // Reset pagination to show updated data
    setPage(1);
    queryClient.invalidateQueries({ queryKey: ['walletTransactions'] });

    // Show success message
    const amount = result?.transaction?.netAmount || 0;
    Alert.alert(
      t.wallet?.redeemSuccess || 'Success',
      t.wallet?.redeemSuccessMessage?.replace('{{amount}}', Number(amount).toFixed(2)) ||
        `${Number(amount).toFixed(2)} SAR has been added to your wallet`
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={COLORS.white} barStyle="dark-content" />
      <Header title={t.wallet?.title || 'Wallet'} showBack onBack={() => navigation.goBack()} />

      <View style={styles.content}>
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <View style={[styles.cardDecorationCircle, isRTL && styles.cardDecorationCircleRtl]} />
          <Text style={[styles.balanceLabel, isRTL && styles.textRTL]}>
            {t.wallet?.availableBalance || 'Available Balance'}
          </Text>
          {walletLoading ? (
            <ActivityIndicator color={COLORS.white} size="small" style={styles.balanceLoader} />
          ) : (
            <View style={[styles.balanceAmountRow, isRTL && { flexDirection: 'row-reverse' }]}>
              <RiyalText
                text={formatWalletAmount(myWallet?.availableBalance ?? 0)}
                textStyle={styles.balanceValue}
                size={26}
                logoColor
              />
            </View>
          )}
          <View style={[styles.actionRow, isRTL && styles.rowRTL]}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => navigation.navigate('SupportCard')}
              activeOpacity={0.85}
            >
              <Text style={styles.actionEmoji}>🎁</Text>
              <Text style={styles.actionBtnText} numberOfLines={1}>
                {t.wallet?.buySupportCard || 'Buy Card'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => setRedeemModalVisible(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.actionEmoji}>🏷️</Text>
              <Text style={styles.actionBtnText} numberOfLines={1}>
                {t.wallet?.redeemCode || 'Redeem'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
            {t.wallet?.allTransactions || 'All Transactions'}
          </Text>
          <Text style={[styles.sectionSubtitle, isRTL && styles.textRTL]}>
            {t.wallet?.transactionsSubtitle || 'Payments, refunds, and support card activity'}
          </Text>
        </View>

        <View style={styles.filterTrack}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[
              styles.filterRow,
              isRTL && { flexDirection: 'row-reverse' },
            ]}
          >
            {txFilterOptions.map((option) => {
              const isActive = txFilter === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => setTxFilter(option.key)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <FlatList
          data={filteredTransactions}
          keyExtractor={(item, index) => item._id || `transaction-${index}`}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          removeClippedSubviews={true}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
        />
      </View>

      {/* Redeem Support Card Modal */}
      <RedeemSupportCardModal
        visible={redeemModalVisible}
        onClose={() => setRedeemModalVisible(false)}
        onSuccess={handleRedeemSuccess}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  content: {
    flex: 1,
    padding: 20
  },

  // Balance Card
  balanceCard: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    marginBottom: SPACING.xl,
    shadowColor: COLORS.primaryDark,
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    overflow: 'hidden',
    position: 'relative',
  },
  cardDecorationCircle: {
    position: 'absolute',
    right: -28,
    top: -28,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  cardDecorationCircleRtl: {
    right: undefined,
    left: -28,
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: SPACING.xs,
  },
  balanceLoader: {
    marginVertical: SPACING.md,
    alignSelf: 'flex-start',
  },
  balanceAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  balanceValue: {
    color: COLORS.white,
    fontSize: 34,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.white,
    paddingVertical: 12,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.lg,
    minHeight: 44,
  },
  actionEmoji: {
    fontSize: 16,
  },
  actionBtnText: {
    color: COLORS.primaryDark,
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
  },

  sectionHeader: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  filterTrack: {
    backgroundColor: COLORS.gray200,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  filterRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  filterChip: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    backgroundColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    ...SHADOWS.sm,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  filterChipTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },

  // Transaction Card
  card: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  txIconBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txIconGlyph: {
    fontSize: 20,
    fontWeight: '700',
  },
  txBody: {
    flex: 1,
    minWidth: 0,
  },
  txTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    lineHeight: 20,
    marginBottom: 4,
  },
  txDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  statusChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
  },
  statusChipRtl: {
    alignSelf: 'flex-end',
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  amountContainer: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    paddingTop: 2,
    gap: 2,
    minWidth: 88,
    justifyContent: 'flex-end',
  },
  amountContainerRTL: {
    flexDirection: 'row-reverse',
  },
  amountPrefix: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  txAmount: {
    fontSize: 16,
    fontWeight: '700',
  },

  // RTL Support
  textRTL: {
    textAlign: 'right',
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.gray600,
    textAlign: 'center',
  },
});

export default WalletScreen;
