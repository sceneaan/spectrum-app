import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  StatusBar,
  TouchableOpacity,
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

const WalletScreen = () => {
  const navigation = useNavigation();
  const { t, isRTL } = useLanguage();
  const queryClient = useQueryClient();
  const [transactions, setTransactions] = useState([]);
  const [page, setPage] = useState(1);
  const [isEndReached, setIsEndReached] = useState(false);
  const [redeemModalVisible, setRedeemModalVisible] = useState(false);

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

    const amount = Number(item.netAmount ?? 0).toFixed(2);
    const description = item?.description?.[isRTL ? 'ar' : 'en'] ||
                       item?.description?.en ||
                       item?.description?.ar ||
                       t.transaction || 'Transaction';

    return (
      <View style={styles.card}>
        <View style={[styles.row, isRTL && styles.rowRTL]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.txTitle, isRTL && styles.textRTL]}>
              {description}
            </Text>
            <Text style={[styles.txDate, isRTL && styles.textRTL]}>
              {moment(item.createdAt).locale('en').format('LL')}
            </Text>
          </View>
          <View style={[styles.amountContainer, isRTL && styles.amountContainerRTL]}>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
              <RiyalText
                text={Math.abs(amount)}
                textStyle={[
                  styles.txAmount,
                  { color: isCredit ? COLORS.success : (isDebit ? (COLORS.danger || '#ef4444') : COLORS.textPrimary) }
                ]}
                size={16}
              />
            </View>
            <Text
              style={[
                styles.txStatus,
                {
                  color:
                    item?.status === 'pending' ? '#f59e0b' :
                    item?.status === 'failed' ? '#ef4444' :
                    COLORS.success
                }
              ]}
            >
              {item?.status || 'completed'}
            </Text>
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
          {t.wallet?.noTransactionsFound || 'No transactions found'}
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
        <View style={[styles.balanceCard, isRTL && { alignItems: 'flex-end' }]}>
          <View style={[styles.balanceHeader, isRTL && { flexDirection: 'row-reverse' }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.balanceLabel, isRTL && styles.textRTL]}>
                {t.wallet?.availableBalance || 'Available Balance'}
              </Text>
              {walletLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
                  <RiyalText
                    text={myWallet?.availableBalance?.toFixed(2) || '0.00'}
                    textStyle={{ color: 'white', fontSize: 32, fontWeight: 'bold' }}
                    size={24}
                    logoColor={true}
                  />
                </View>
              )}
            </View>
            <View style={{ gap: 8 }}>
              <TouchableOpacity
                style={styles.redeemButton}
                onPress={() => navigation.navigate('SupportCard')}
                activeOpacity={0.8}
              >
                <Text style={styles.redeemButtonIcon}>🎁</Text>
                <Text style={styles.redeemButtonText}>
                  {t.wallet?.buySupportCard || 'Buy Card'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.redeemButton, { backgroundColor: 'rgba(255,255,255,0.15)' }]}
                onPress={() => setRedeemModalVisible(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.redeemButtonIcon}>🏷️</Text>
                <Text style={styles.redeemButtonText}>
                  {t.wallet?.redeemCode || 'Redeem'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={[styles.cardDecorationCircle, isRTL && { left: -20, right: 'auto' }]} />
        </View>

        <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
          {t.wallet?.allTransactions || 'All Transactions'}
        </Text>

        <FlatList
          data={transactions}
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
    borderRadius: 20,
    padding: 25,
    marginBottom: 25,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 160,
    justifyContent: 'center',
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    marginBottom: 8
  },
  balanceValue: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold'
  },
  redeemButton: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  redeemButtonIcon: {
    fontSize: 18,
  },
  redeemButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  cardDecorationCircle: {
    position: 'absolute',
    right: -20,
    bottom: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.1)'
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 15
  },

  // Transaction Card
  card: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.gray100 || '#f3f4f6',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  txTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 4
  },
  txDate: {
    fontSize: 12,
    color: COLORS.gray600
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amountContainerRTL: {
    alignItems: 'flex-start',
  },
  txAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4
  },
  txStatus: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
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
