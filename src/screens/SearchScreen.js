import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, Modal, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next'; // Use i18n
import { useGetAllCategories, useGetAllServices } from '../api/services/Public.Service'; // Import API hooks
import Header from '../components/Header';
import COLORS from '../constants/colors';
import ICONS from '../constants/icons'; // Assuming ICONS has a default 'more' icon

const SearchScreen = () => {
  const navigation = useNavigation();
  const { t, i18n } = useTranslation(); // Use i18n for language and RTL direction
  const isRTL = i18n.dir() === 'rtl';
  const currentLanguage = i18n.language; // Get current language (en or ar)

  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [selectedServiceId, setSelectedServiceId] = useState(null);
  const [appointmentType, setAppointmentType] = useState(null); // Start with null, user must select
  const [serviceModalVisible, setServiceModalVisible] = useState(false);
  const [filteredServices, setFilteredServices] = useState([]);

  // Helper function to get localized name
  const getLocalizedName = (item) => {
    if (currentLanguage === 'ar') {
      return item?.nameArabic || item?.nameEnglish || item?.name;
    }
    return item?.nameEnglish || item?.name || item?.nameArabic;
  };

  // Fetch categories and services from API
  const { data: categoriesData, isLoading: isLoadingCategories, error: categoriesError, refetch: refetchCategories } = useGetAllCategories();
  const { data: servicesData, isLoading: isLoadingServices, error: servicesError, refetch: refetchServices } = useGetAllServices();

  // Filter services when category or appointment type changes
  useEffect(() => {
    if (selectedCategoryId && appointmentType && servicesData) {
      const filtered = servicesData.filter((service) => {
        const serviceCategoryId = service.category?._id || service.category?.id || service.category;
        return serviceCategoryId === selectedCategoryId && service.serviceType === appointmentType;
      });

      setFilteredServices(filtered);
    } else {
      setFilteredServices([]);
    }
  }, [selectedCategoryId, appointmentType, servicesData]);

  // Reset dependent fields when category changes
  const handleCategoryChange = (categoryId) => {
    setSelectedCategoryId(categoryId);
    setAppointmentType(null); // Reset appointment type
    setSelectedServiceId(null); // Reset service
    setFilteredServices([]); // Clear filtered services
  };

  // Reset service when appointment type changes
  const handleAppointmentTypeChange = (type) => {
    setAppointmentType(type);
    setSelectedServiceId(null); // Reset service selection
  };

  const handleSearch = () => {
    if (!selectedCategoryId || !selectedServiceId || !appointmentType) {
      Alert.alert(t('search.selectCategoryAndService') || 'Please select category, appointment type, and service.');
      return;
    }
    navigation.navigate('SearchResults', {
      category: selectedCategoryId,
      service: selectedServiceId,
      appointmentType
    });
  };

  const getServiceNameById = (id) => {
    const service = filteredServices?.find(s => (s._id || s.id) === id);
    if (!service) return t('search.selectService') || 'Select Service';
    return getLocalizedName(service);
  };

  // Map category names to icons (fallback if no image uploaded from backend)
  const getCategoryIcon = (nameEnglish) => {
    const iconMap = {
      'psychiatry': ICONS.psychiatry,
      'psychology': ICONS.psychology,
      'speech therapy': ICONS.speech,
      'general': ICONS.general,
    };
    return iconMap[nameEnglish?.toLowerCase()] || ICONS.general;
  };

  // Get category icon/image - use backend image if available, otherwise fallback
  const getCategoryImageUrl = (category) => {
    return category.image || getCategoryIcon(category.nameEnglish);
  };

  const rowStyle = { flexDirection: isRTL ? 'row-reverse' : 'row' };
  const alignText = { textAlign: isRTL ? 'right' : 'left' };
  const scaleRTL = isRTL ? { transform: [{ scaleX: -1 }] } : {};

  if (isLoadingCategories || isLoadingServices) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>{t('common.loading') || "Loading..."}</Text>
      </View>
    );
  }

  if (categoriesError || servicesError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{t('common.errorLoadingData') || "Error loading data. Please try again."}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => { refetchCategories(); refetchServices(); }}>
          <Text style={styles.retryBtnText}>{t('common.retry') || 'Retry'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header showBack onBack={() => navigation.goBack()} title={t('search.findDoctor') || "Find a Doctor"} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 50 }}>
        {/* Category Grid */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, alignText]}>1. {t('search.specialty') || "Specialty"}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20 }}
            style={scaleRTL}
          >
            {categoriesData?.map((cat) => {
              const categoryId = cat._id || cat.id;
              const isSelected = selectedCategoryId === categoryId;
              return (
                <TouchableOpacity
                  key={categoryId}
                  style={[
                    styles.catCard,
                    isSelected && styles.activeCatCard,
                    scaleRTL, // Flip items back when ScrollView is flipped
                    isRTL && { marginLeft: 15, marginRight: 0 }
                  ]}
                  onPress={() => {
                    handleCategoryChange(categoryId);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconBox, isSelected && styles.activeIconBox]}>
                    <Image
                      source={(() => { const img = getCategoryImageUrl(cat); return typeof img === 'string' ? { uri: img } : img; })()}
                      style={[styles.catIcon, isSelected && { tintColor: COLORS.white }]}
                    />
                  </View>
                  <Text style={[styles.catText, isSelected && styles.activeCatText]}>
                    {getLocalizedName(cat)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Appointment Type */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, alignText]}>2. {t('search.appointmentType') || "Appointment Type"}</Text>
          <View style={[styles.segmentContainer, rowStyle]} pointerEvents={!selectedCategoryId ? 'none' : 'auto'}>
            <TouchableOpacity
              style={[
                styles.segmentBtn,
                appointmentType === 'FIRST_TIME' && styles.activeSegment,
                !selectedCategoryId && styles.disabledSegment
              ]}
              onPress={() => handleAppointmentTypeChange('FIRST_TIME')}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.segmentText,
                appointmentType === 'FIRST_TIME' && styles.activeSegmentText,
                !selectedCategoryId && styles.disabledText
              ]}>
                {t('search.firstTime') || 'First Time'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.segmentBtn,
                appointmentType === 'FOLLOW_UP' && styles.activeSegment,
                !selectedCategoryId && styles.disabledSegment
              ]}
              onPress={() => handleAppointmentTypeChange('FOLLOW_UP')}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.segmentText,
                appointmentType === 'FOLLOW_UP' && styles.activeSegmentText,
                !selectedCategoryId && styles.disabledText
              ]}>
                {t('search.followUp') || 'Follow Up'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Service */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, alignText]}>3. {t('search.service') || "Service"}</Text>
          <TouchableOpacity
            style={[
              styles.input,
              (!selectedCategoryId || !appointmentType || filteredServices.length === 0) && styles.disabledInput,
              rowStyle,
              { marginHorizontal: 20 }
            ]}
            onPress={() => setServiceModalVisible(true)}
            disabled={!selectedCategoryId || !appointmentType || filteredServices.length === 0}
          >
            <Text
              style={{ flex: 1, marginHorizontal: 5, textAlign: isRTL ? 'right' : 'left', color: selectedServiceId ? COLORS.textPrimary : COLORS.gray500 }}
              placeholderTextColor={COLORS.gray500}
            >
              {selectedServiceId
                ? getServiceNameById(selectedServiceId)
                : !selectedCategoryId
                ? (t('search.selectCategoryFirst') || 'Select category first')
                : !appointmentType
                ? (t('search.selectTypeFirst') || 'Select appointment type first')
                : filteredServices.length === 0
                ? (t('search.noServicesAvailable') || 'No services available')
                : (t('search.tapToSelectService') || 'Tap to select service')}
            </Text>
            <Text style={{ color: COLORS.textSecondary }}>⌄</Text>
          </TouchableOpacity>
        </View>

        {/* No Services Available Message */}
        {selectedCategoryId && appointmentType && filteredServices.length === 0 && (
          <View style={styles.noServicesContainer}>
            <Text style={styles.noServicesText}>
              {t('search.noServicesAvailable') || 'No services available for this selection'}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.findBtn, (!selectedCategoryId || !appointmentType || !selectedServiceId) && styles.disabledBtn]}
          onPress={handleSearch}
          disabled={!selectedCategoryId || !appointmentType || !selectedServiceId || isLoadingCategories || isLoadingServices}
        >
          <Text style={styles.findBtnText}>{t('search.findProviders') || "Find Providers"}</Text>
        </TouchableOpacity>

        {/* Service Modal */}
        <Modal visible={serviceModalVisible} transparent animationType="slide" onRequestClose={() => setServiceModalVisible(false)}>
          <View style={styles.modalBg}>
            <View style={styles.modalContent}>
              <View style={[rowStyle, { justifyContent: 'space-between', marginBottom: 20 }]}>
                <Text style={styles.modalTitle}>{t('search.selectService') || "Select Service"}</Text>
                <TouchableOpacity onPress={() => setServiceModalVisible(false)}><Text style={{ fontSize: 18, color: COLORS.textPrimary }}>✕</Text></TouchableOpacity>
              </View>
              <ScrollView>
                {filteredServices.length > 0 ? (
                  filteredServices.map(s => {
                    const serviceId = s._id || s.id;
                    const serviceName = getLocalizedName(s);
                    return (
                      <TouchableOpacity
                        key={serviceId}
                        style={styles.modalItem}
                        onPress={() => {
                          setSelectedServiceId(serviceId);
                          setServiceModalVisible(false);
                        }}
                      >
                        <Text style={[alignText, { fontSize: 16, color: COLORS.textPrimary }]}>
                          {serviceName}
                        </Text>
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <View style={{ padding: 20, alignItems: 'center' }}>
                    <Text style={{ color: COLORS.textSecondary }}>{t('search.noServicesAvailable') || 'No services available'}</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  loadingText: { marginTop: 10, fontSize: 16, color: COLORS.textPrimary },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background, padding: 20 },
  errorText: { fontSize: 16, color: COLORS.error, textAlign: 'center', marginBottom: 16 },
  retryBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  retryBtnText: { color: COLORS.white, fontWeight: '600', fontSize: 15 },

  section: { marginTop: 25 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, paddingHorizontal: 20, color: COLORS.textPrimary },

  catCard: { alignItems: 'center', marginRight: 15, width: 80, borderRadius: 12, padding: 6, borderWidth: 1.5, borderColor: 'transparent' },
  activeCatCard: { borderColor: COLORS.primary, backgroundColor: COLORS.promo1 || '#EBF3FF' },
  iconBox: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center', marginBottom: 8, elevation: 2, shadowColor: COLORS.shadow, shadowOpacity: 0.05 },
  activeIconBox: { backgroundColor: COLORS.primary },
  catIcon: { width: 28, height: 28, tintColor: COLORS.primary },
  catText: { fontSize: 12, color: COLORS.gray700, textAlign: 'center', fontWeight: '500' },
  activeCatText: { color: COLORS.primary, fontWeight: 'bold' },
  
  segmentContainer: { backgroundColor: COLORS.gray200, borderRadius: 12, padding: 4, marginHorizontal: 20 },
  segmentBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  activeSegment: { backgroundColor: COLORS.white, elevation: 2 },
  disabledSegment: { opacity: 0.5 },
  segmentText: { fontWeight: '600', color: COLORS.textSecondary },
  activeSegmentText: { color: COLORS.primary, fontWeight: 'bold' },
  disabledText: { color: COLORS.gray400 },

  input: { backgroundColor: COLORS.gray100, padding: 18, borderRadius: 14, justifyContent: 'space-between', borderWidth: 1, borderColor: COLORS.gray200, marginTop: 5 },
  disabledInput: { opacity: 0.6 },

  noServicesContainer: {
    marginHorizontal: 20,
    marginTop: 15,
    marginBottom: 10,
    padding: 16,
    backgroundColor: COLORS.warning || '#FFF3CD',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.warningBorder || '#FFC107',
    alignItems: 'center'
  },
  noServicesText: {
    fontSize: 14,
    color: COLORS.warningText || '#856404',
    fontWeight: '500',
    textAlign: 'center'
  },

  findBtn: { margin: 20, backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, alignItems: 'center', elevation: 3 },
  disabledBtn: { backgroundColor: COLORS.gray400, shadowOpacity: 0 },
  findBtnText: { color: COLORS.white, fontWeight: 'bold', fontSize: 16 },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 25, maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary },
  modalItem: { paddingVertical: 16, borderBottomWidth: 1, borderColor: COLORS.gray100 },
});

export default SearchScreen;
