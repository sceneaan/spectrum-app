import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, TextInput, ActivityIndicator, Alert, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Header from '../components/Header';
import DocumentViewer from '../components/DocumentViewer';
import RiyalText from '../components/RiyalText';
import COLORS from '../constants/colors';
import ICONS from '../constants/icons';
import { useLanguage } from '../store/LanguageContext';
import { useGetUserData } from '@api/services/User.Service';
import { getUserId } from '../utils/userId';
import { useGetAllTransactions } from '@api/services/Transaction.Service';
import { GetInvoice, GenerateInvoice } from '@api/services/Invoice.Service';
import { generateInvoiceHTML } from '../utils/htmlTemplates/invoiceHtml';
import { generateQRCodeBase64 } from '../utils/qrCodeGenerator';
import moment from 'moment';
import DatePicker from 'react-native-date-picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AntDesign from 'react-native-vector-icons/AntDesign';

function calculateTotal(slotPrice, discount, taxAmount) {
  const discountedPrice = slotPrice - discount;
  const totalAmount = discountedPrice + taxAmount;
  return totalAmount.toFixed(2);
}

// Transaction type configurations with bilingual labels and colors
const TRANSACTION_TYPES = {
  payment: {
    label: { ar: 'فاتورة ضريبية', en: 'Tax Invoice' },
    color: '#28A745',
    bgColor: '#D4EDDA',
    icon: 'receipt',
  },
  refund: {
    label: { ar: 'إشعار دائن', en: 'Credit Note' },
    color: '#DC3545',
    bgColor: '#F8D7DA',
    icon: 'cash-refund',
  },
  deposit: {
    label: { ar: 'إيصال إيداع', en: 'Deposit' },
    color: '#0D6EFD',
    bgColor: '#CFE2FF',
    icon: 'wallet-plus',
  },
  withdraw: {
    label: { ar: 'إيصال سحب', en: 'Withdrawal' },
    color: '#6F42C1',
    bgColor: '#E2D9F3',
    icon: 'wallet-minus',
  },
  redeem: {
    label: { ar: 'استبدال بطاقة', en: 'Card Redemption' },
    color: '#FD7E14',
    bgColor: '#FFE5D0',
    icon: 'gift',
  },
  default: {
    label: { ar: 'إيصال', en: 'Receipt' },
    color: '#6C757D',
    bgColor: '#E9ECEF',
    icon: 'file-document',
  },
};

// Get transaction type config
const getTransactionTypeConfig = (type) => {
  return TRANSACTION_TYPES[type] || TRANSACTION_TYPES.default;
};

const BillingScreen = () => {
  const navigation = useNavigation();
  const { t, isRTL } = useLanguage();

  const [searchQuery, setSearchQuery] = useState('');
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [openStartDatePicker, setOpenStartDatePicker] = useState(false);
  const [openEndDatePicker, setOpenEndDatePicker] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [allDataLoaded, setAllDataLoaded] = useState(false);

  const isInitialLoadRef = useRef(true);
  const searchTimeoutRef = useRef(null);

  // Document viewer states
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerContent, setViewerContent] = useState('');
  const [viewerTitle, setViewerTitle] = useState('');

  // Get current user
  const { data: currentUser } = useGetUserData();
  const patientId = getUserId(currentUser);

  // Prepare query parameters
  const queryParams = React.useMemo(() => ({
    search: searchQuery || undefined,
    startDate: startDate ? moment(startDate).format('YYYY-MM-DD') : undefined,
    endDate: endDate ? moment(endDate).format('YYYY-MM-DD') : undefined,
    page: currentPage,
    limit: 10,
  }), [searchQuery, startDate, endDate, currentPage]);

  const {
    data: allTransactions,
    error: allTransactionsError,
    isLoading: allTransactionsLoader,
    refetch: refetchTransactions,
  } = useGetAllTransactions(
    patientId,
    queryParams
  );

  // Effect for when user data loads - only on initial load
  useEffect(() => {
    if (patientId && isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      refetchTransactions();
    }
  }, [patientId, refetchTransactions]);

  // Effect for handling transaction data
  useEffect(() => {
    if (allTransactions) {
      const { transactions, pagination } = allTransactions;

      // Update pagination state
      setTotalPages(pagination.totalPages || 1);
      setTotalItems(pagination.totalDocs || 0);
      setHasNextPage(pagination.currentPage < pagination.totalPages);
      setHasPreviousPage(pagination.currentPage > 1);
      setAllDataLoaded(pagination.currentPage >= pagination.totalPages);

      // For first page or when filters change, replace data
      if (currentPage === 1) {
        setInvoices(transactions);
        setFilteredInvoices(transactions);
      } else {
        // For subsequent pages, append data only if not already present
        setInvoices(prev => {
          const existingIds = new Set(prev.map(item => item.id || item._id));
          const newTransactions = transactions.filter(item =>
            !existingIds.has(item.id || item._id)
          );
          return [...prev, ...newTransactions];
        });
        setFilteredInvoices(prev => {
          const existingIds = new Set(prev.map(item => item.id || item._id));
          const newTransactions = transactions.filter(item =>
            !existingIds.has(item.id || item._id)
          );
          return [...prev, ...newTransactions];
        });
      }

      // Reset loading state
      setIsLoadingMore(false);
    }

    if (allTransactionsError) {
      Alert.alert(
        t.common?.error || 'Error',
        allTransactionsError.message || 'Unknown error occurred'
      );
      setIsLoadingMore(false);
    }
  }, [allTransactions, allTransactionsError, t, currentPage]);

  // Reset pagination when search or filters change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
      setInvoices([]);
      setFilteredInvoices([]);
      setAllDataLoaded(false);
      setIsLoadingMore(false);
    }
  }, [searchQuery, startDate, endDate]);

  // Debounced search effect
  useEffect(() => {
    if (invoices.length > 0) {
      setIsSearching(true);

      // Clear previous timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      // Set new timeout
      searchTimeoutRef.current = setTimeout(() => {
        let filtered = [...invoices];
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          filtered = filtered.filter(
            item =>
              item.provider?.fullName?.toLowerCase().includes(query) ||
              item.serviceName?.toLowerCase().includes(query) ||
              `INV-${item.slug}`.toLowerCase().includes(query),
          );
        }

        if (startDate || endDate) {
          filtered = filtered.filter(item => {
            const invoiceDate = new Date(item.createdAt);
            const start = startDate
              ? new Date(startDate.setHours(0, 0, 0, 0))
              : null;
            const end = endDate
              ? new Date(endDate.setHours(23, 59, 59, 999))
              : null;
            if (start && end) {
              return invoiceDate >= start && invoiceDate <= end;
            } else if (start) {
              return invoiceDate >= start;
            } else if (end) {
              return invoiceDate <= end;
            }
            return true;
          });
        }

        setFilteredInvoices(filtered);
        setIsSearching(false);
      }, 500);

      return () => {
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
        }
      };
    }
  }, [searchQuery, startDate, endDate, invoices]);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setStartDate(null);
    setEndDate(null);
    setIsSearching(false);
    setCurrentPage(1);
    setInvoices([]);
    setFilteredInvoices([]);
  }, []);

  const goToNextPage = useCallback(() => {
    if (hasNextPage && !isLoadingMore && !allTransactionsLoader) {
      setCurrentPage(prev => prev + 1);
    }
  }, [hasNextPage, isLoadingMore, allTransactionsLoader]);

  const goToPreviousPage = useCallback(() => {
    if (hasPreviousPage && !isLoadingMore && !allTransactionsLoader) {
      setCurrentPage(prev => prev - 1);
    }
  }, [hasPreviousPage, isLoadingMore, allTransactionsLoader]);

  // Handle view invoice details
  const handleDownload = async (item) => {
    if (!item) {
      Alert.alert(t.common?.error || 'Error', 'Invoice data not available');
      return;
    }

    try {
      let invoiceData = null;
      let qrCodeBase64 = null;

      try {
        invoiceData = await GetInvoice(item.slug);
      } catch (error) {
        if (error.message === 'invoice not found' && item._id) {
          try {
            const generateResult = await GenerateInvoice(item._id);
            if (generateResult?.invoice) {
              invoiceData = generateResult.invoice;
            }
          } catch {
            // Continue without QR code
          }
        }
      }

      if (invoiceData?.qrCodeData) {
        try {
          qrCodeBase64 = await generateQRCodeBase64(invoiceData.qrCodeData);
        } catch {
          // Continue without QR code
        }
      }

      // Generate HTML content for the invoice (with or without QR code)
      // Pass invoiceData to get VAT number from backend
      const htmlContent = generateInvoiceHTML(item, isRTL, qrCodeBase64, invoiceData);

      // Set the title based on language
      const title = isRTL ? 'الفاتورة' : 'Invoice';

      // Show the document viewer
      setViewerContent(htmlContent);
      setViewerTitle(title);
      setViewerVisible(true);
    } catch (error) {
      Alert.alert(t.common?.error || 'Error', 'Failed to generate invoice');
    }
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const rowStyle = { flexDirection: isRTL ? 'row-reverse' : 'row' };
  const alignText = { textAlign: isRTL ? 'right' : 'left' };

  const renderInvoice = ({ item }) => {
    const typeConfig = getTransactionTypeConfig(item?.type);
    const typeLabel = isRTL ? typeConfig.label.ar : typeConfig.label.en;

    return (
      <View style={styles.card}>
        {/* Type Badge */}
        <View style={[styles.typeBadgeContainer, rowStyle]}>
          <View style={[styles.typeBadge, { backgroundColor: typeConfig.bgColor }]}>
            <Icon name={typeConfig.icon} size={14} color={typeConfig.color} />
            <Text style={[styles.typeBadgeText, { color: typeConfig.color }]}>
              {typeLabel}
            </Text>
          </View>
        </View>

        {/* Header Row */}
        <View style={[styles.cardHeader, rowStyle]}>
          <Text style={[styles.invoiceId, alignText]}>
            INV-{item?.slug || 'N/A'}
          </Text>
          <RiyalText
            text={calculateTotal(
              item?.fee || item?.grossAmount || 0,
              item?.discount || 0,
              item?.tax || 0
            )}
            textStyle={[
              styles.amount,
              item?.type === 'refund' && { color: '#DC3545' }
            ]}
            size={14}
          />
        </View>

        {/* Details */}
        <Text style={[styles.serviceTitle, alignText]}>
          {isRTL ? item?.serviceNameArabic : item?.serviceName}
        </Text>
        <Text style={[styles.doctorName, alignText]}>
          {isRTL
            ? (item?.provider?.fullNameArabic || item?.provider?.fullName || item?.providerNameArabic || item?.providerName || 'مزود غير معروف')
            : (item?.provider?.fullNameEnglish || item?.provider?.fullName || item?.providerNameEnglish || item?.providerName || 'Unknown Provider')
          }
        </Text>

        {/* Date and Status Row */}
        <View style={[styles.dateStatusRow, rowStyle]}>
          <Text style={[styles.date, alignText]}>
            {moment(item?.createdAt).format('DD MMM YYYY')}
          </Text>
          {item?.status && (
            <View style={[
              styles.statusBadge,
              item?.status?.toLowerCase() === 'completed'
                ? styles.statusCompleted
                : styles.statusPending
            ]}>
              <Text style={[
                styles.statusText,
                item?.status?.toLowerCase() === 'completed'
                  ? styles.statusTextCompleted
                  : styles.statusTextPending
              ]}>
                {item?.status}
              </Text>
            </View>
          )}
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[styles.downloadBtn, { borderColor: typeConfig.color }]}
          onPress={() => handleDownload(item)}
        >
          <Icon name={typeConfig.icon} size={18} color={typeConfig.color} />
          <Text style={[styles.btnText, { color: typeConfig.color }]}>
            {t.billing?.viewDocument || 'View Document'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Header title={t.billing?.title || 'Billing'} showBack onBack={() => navigation.goBack()} />

      <View style={styles.content}>
        {/* Search Bar */}
        <View style={[styles.searchContainer, rowStyle]}>
          <Image source={ICONS.search} style={styles.searchIcon} />
          <TextInput
            placeholder={t.billing?.searchPlaceholder || 'Search invoices...'}
            style={[styles.searchInput, alignText]}
            placeholderTextColor={COLORS.gray500}
            value={searchQuery}
            onChangeText={text => {
              setSearchQuery(text);
              if (text.length > 0) {
                setIsSearching(true);
              }
            }}
          />
        </View>

        {/* Date Filters */}
        <View style={[styles.filterRow, rowStyle]}>
          <TouchableOpacity
            style={styles.dateFilter}
            onPress={() => setOpenStartDatePicker(true)}
          >
            <Text style={[styles.dateText, alignText]}>
              {startDate ? startDate.toLocaleDateString() : (t.billing?.startDatePlaceholder || 'Start Date')}
            </Text>
            <Image source={ICONS.calendar} style={styles.filterIcon} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dateFilter}
            onPress={() => setOpenEndDatePicker(true)}
          >
            <Text style={[styles.dateText, alignText]}>
              {endDate ? endDate.toLocaleDateString() : (t.billing?.endDatePlaceholder || 'End Date')}
            </Text>
            <Image source={ICONS.calendar} style={styles.filterIcon} />
          </TouchableOpacity>
        </View>

        {/* Clear Filters Button */}
        {(searchQuery || startDate || endDate) && (
          <TouchableOpacity onPress={clearFilters} style={styles.clearFiltersButton}>
            <Icon name="filter-remove-outline" size={20} color={COLORS.error} />
            <Text style={styles.clearFiltersText}>{t.common?.clear || 'Clear Filter'}</Text>
          </TouchableOpacity>
        )}

        {/* Start Date Picker */}
        <DatePicker
          modal
          open={openStartDatePicker}
          date={startDate || new Date()}
          onConfirm={date => {
            setStartDate(date);
            setOpenStartDatePicker(false);
            setIsSearching(true);
          }}
          onCancel={() => setOpenStartDatePicker(false)}
          mode="date"
        />

        {/* End Date Picker */}
        <DatePicker
          modal
          open={openEndDatePicker}
          date={endDate || new Date()}
          onConfirm={date => {
            setEndDate(date);
            setOpenEndDatePicker(false);
            setIsSearching(true);
          }}
          onCancel={() => setOpenEndDatePicker(false)}
          mode="date"
        />

        {/* Content */}
        {allTransactionsLoader && currentPage === 1 ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loaderText}>{t.common?.loading || 'Loading...'}</Text>
          </View>
        ) : isSearching ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="small" color={COLORS.primary} />
          </View>
        ) : filteredInvoices.length <= 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t.noDataFound?.title || 'No invoices found'}</Text>
          </View>
        ) : (
          <FlatList
            data={filteredInvoices}
            keyExtractor={(item, index) => item.id || item._id || `transaction-${index}`}
            renderItem={renderInvoice}
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={() => (
              <View>
                {isLoadingMore && (
                  <View style={styles.loadingMoreContainer}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                    <Text style={styles.loadingMoreText}>{t.common?.loadingMore || 'Loading more...'}</Text>
                  </View>
                )}

                {/* Pagination Controls */}
                {filteredInvoices.length > 0 && !isSearching && (
                  <View style={styles.paginationContainer}>
                    <View style={styles.paginationInfo}>
                      <Text style={styles.paginationText}>
                        {t.common?.page || 'Page'} {currentPage} {t.common?.of || 'of'} {totalPages}
                      </Text>
                      <Text style={styles.paginationText}>
                        {t.common?.totalItems || 'Total Items'}: {totalItems}
                      </Text>
                    </View>

                    <View style={[styles.paginationButtons, rowStyle]}>
                      <TouchableOpacity
                        style={[
                          styles.paginationButton,
                          !hasPreviousPage && styles.paginationButtonDisabled,
                        ]}
                        onPress={goToPreviousPage}
                        disabled={!hasPreviousPage || isLoadingMore}
                      >
                        <Icon
                          name="chevron-left"
                          size={20}
                          color={hasPreviousPage ? COLORS.primary : COLORS.gray400}
                        />
                        <Text
                          style={[
                            styles.paginationButtonText,
                            !hasPreviousPage && styles.paginationButtonTextDisabled,
                          ]}
                        >
                          {t.common?.previous || 'Previous'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.paginationButton,
                          !hasNextPage && styles.paginationButtonDisabled,
                        ]}
                        onPress={goToNextPage}
                        disabled={!hasNextPage || isLoadingMore}
                      >
                        <Text
                          style={[
                            styles.paginationButtonText,
                            !hasNextPage && styles.paginationButtonTextDisabled,
                          ]}
                        >
                          {t.common?.next || 'Next'}
                        </Text>
                        <Icon
                          name="chevron-right"
                          size={20}
                          color={hasNextPage ? COLORS.primary : COLORS.gray400}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )}
          />
        )}
      </View>

      {/* Document Viewer Modal */}
      <DocumentViewer
        visible={viewerVisible}
        onClose={() => setViewerVisible(false)}
        htmlContent={viewerContent}
        title={viewerTitle}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { flex: 1, padding: 20 },

  // Search
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'white',
    borderRadius: 12, paddingHorizontal: 15, height: 50, marginBottom: 15,
    borderWidth: 1, borderColor: COLORS.gray200
  },
  searchIcon: { width: 20, height: 20, tintColor: COLORS.gray500, marginRight: 10 },
  searchInput: { flex: 1, color: COLORS.textPrimary },

  // Filters
  filterRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  dateFilter: {
    flex: 1, backgroundColor: 'white', borderRadius: 10,
    padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.gray200
  },
  dateText: { color: COLORS.gray600, fontSize: 13 },
  filterIcon: { width: 16, height: 16, tintColor: COLORS.primary },

  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: COLORS.errorContainer || '#FFEBEE',
    borderRadius: 10,
    marginBottom: 15,
  },
  clearFiltersText: {
    color: COLORS.error,
    marginLeft: 8,
    fontWeight: '600',
    fontSize: 13,
  },

  // Invoice Card
  card: {
    backgroundColor: 'white', borderRadius: 16, padding: 15, marginBottom: 15,
    shadowColor: COLORS.shadow, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2
  },

  // Type Badge
  typeBadgeContainer: {
    marginBottom: 10,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  invoiceId: { fontSize: 13, color: COLORS.gray600, fontWeight: '600' },
  amount: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary },

  serviceTitle: { fontSize: 15, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 4 },
  doctorName: { fontSize: 13, color: COLORS.gray700, marginBottom: 2 },

  // Date and Status Row
  dateStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  date: { fontSize: 12, color: COLORS.gray500 },

  // Status Badge
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusCompleted: {
    backgroundColor: '#FFFFFF',
    borderColor: '#28A745',
  },
  statusPending: {
    backgroundColor: '#FFF3CD',
    borderColor: '#FFC107',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusTextCompleted: {
    color: '#28A745',
  },
  statusTextPending: {
    color: '#856404',
  },

  // Download Button
  downloadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 12, borderRadius: 10, gap: 8,
    borderWidth: 1, borderColor: COLORS.gray300, backgroundColor: COLORS.offWhite
  },
  btnIcon: { width: 16, height: 16, tintColor: COLORS.gray700 },
  btnText: { color: COLORS.gray700, fontWeight: '600', fontSize: 13 },

  // Loading states
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  loaderText: {
    marginTop: 10,
    color: COLORS.gray600,
    fontSize: 14,
  },
  loadingMoreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingMoreText: {
    marginLeft: 10,
    color: COLORS.primary,
    fontSize: 13,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.gray600,
    textAlign: 'center',
  },

  // Pagination
  paginationContainer: {
    backgroundColor: 'white',
    marginTop: 10,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  paginationInfo: {
    alignItems: 'center',
    marginBottom: 10,
  },
  paginationText: {
    color: COLORS.gray700,
    fontSize: 12,
    marginVertical: 2,
  },
  paginationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paginationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    backgroundColor: COLORS.promo1 || COLORS.primaryContainer,
    minWidth: 100,
    justifyContent: 'center',
  },
  paginationButtonDisabled: {
    backgroundColor: COLORS.gray100,
    opacity: 0.6,
  },
  paginationButtonText: {
    color: COLORS.primary,
    marginHorizontal: 5,
    fontWeight: '600',
    fontSize: 13,
  },
  paginationButtonTextDisabled: {
    color: COLORS.gray400,
  },
});

export default BillingScreen;
