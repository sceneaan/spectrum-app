import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
   View, Text, TouchableOpacity, Image, StyleSheet, FlatList,
   ActivityIndicator, Alert, Animated
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useLanguage } from '../store/LanguageContext';
import Header from '../components/Header';
import DocumentViewer from '../components/DocumentViewer';
import COLORS from '../constants/colors';
import ICONS from '../constants/icons';
import {
  useGetPatientMedicalReportsPaginated,
  useCreateMedicalReports,
  useGetMyProviders,
} from '@api/services/MedicalReports.Service';
import { useGetCompletedAppointments } from '@api/services/Appointment.Service';
import { generateMedicalReportHTML } from '../utils/htmlTemplates/medicalReportHtml';
import { generateInsuranceReportHTML } from '../utils/htmlTemplates/insuranceReportHtml';
import { generateVisitConfirmationHTML } from '../utils/htmlTemplates/visitConfirmationHtml';
import { getPrivateFileAsBase64 } from '@api/services/Upload.Service';
import moment from 'moment';
import DropDownPicker from 'react-native-dropdown-picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useQueryClient } from '@tanstack/react-query';

const MedicalReportsScreen = () => {
   const navigation = useNavigation();
   const { t, isRTL } = useLanguage();
   const queryClient = useQueryClient();

   // --- STATE ---
   const [isRequestExpanded, setIsRequestExpanded] = useState(false);
   const [reports, setReports] = useState([]);

   // Pagination state
   const [currentPage, setCurrentPage] = useState(1);
   const [totalPages, setTotalPages] = useState(1);
   const [totalItems, setTotalItems] = useState(0);
   const [hasNextPage, setHasNextPage] = useState(false);
   const [hasPreviousPage, setHasPreviousPage] = useState(false);
   const [isLoadingMore, setIsLoadingMore] = useState(false);

   // Dropdown states
   const [reportOpen, setReportOpen] = useState(false);
   const [reportValue, setReportValue] = useState('');
   const [reportItems, setReportItems] = useState([]);

   const [providerOpen, setProviderOpen] = useState(false);
   const [providerValue, setProviderValue] = useState('');
   const [providerItems, setProviderItems] = useState([]);

   // Appointment dropdown states (for Insurance/Visit Confirmation)
   const [appointmentOpen, setAppointmentOpen] = useState(false);
   const [appointmentValues, setAppointmentValues] = useState([]);
   const [appointmentItems, setAppointmentItems] = useState([]);

   // Document viewer states
   const [viewerVisible, setViewerVisible] = useState(false);
   const [viewerContent, setViewerContent] = useState('');
   const [viewerTitle, setViewerTitle] = useState('');
   const [viewerPrivateFileIds, setViewerPrivateFileIds] = useState({});

   const animatedHeight = useRef(new Animated.Value(0)).current;

   // API Hooks
   const {
     mutate: createMedicalReport,
     isPending,
     isError,
     error,
     isSuccess,
   } = useCreateMedicalReports();

   const {
     data: userProviders,
     error: userProvidersError,
   } = useGetMyProviders();

   const {
     data: completedAppointments,
     error: completedAppointmentsError,
   } = useGetCompletedAppointments();

   // Check if current report type requires appointments
   const requiresAppointments = reportValue === 'Insurance' || reportValue === 'Visit Confirmation';

   // Get unique providers from completed appointments (for Insurance/Visit Confirmation)
   const providersWithAppointments = React.useMemo(() => {
     if (!completedAppointments) return [];
     const providerMap = new Map();
     completedAppointments.forEach((apt) => {
       const provider = apt.provider;
       const providerId = provider?._id || provider?.id;
       if (provider && providerId) {
         if (!providerMap.has(providerId)) {
           providerMap.set(providerId, {
             id: providerId,
             fullName: provider.fullName,
             fullNameArabic: provider.fullNameArabic,
             appointments: []
           });
         }
         providerMap.get(providerId).appointments.push(apt);
       }
     });
     return Array.from(providerMap.values());
   }, [completedAppointments]);

   // Filter appointments by selected provider
   const filteredAppointments = React.useMemo(() => {
     if (!providerValue || !completedAppointments) return [];
     return completedAppointments.filter(apt =>
       apt.provider?._id === providerValue || apt.provider?.id === providerValue
     );
   }, [completedAppointments, providerValue]);

   const queryParams = React.useMemo(() => ({
     page: currentPage,
     limit: 10,
   }), [currentPage]);

   const {
     data: patientReports,
     error: patientReportsError,
     isLoading: patientReportsLoader,
   } = useGetPatientMedicalReportsPaginated(queryParams);

   // --- DYNAMIC STYLES ---
   const rowStyle = { flexDirection: isRTL ? 'row-reverse' : 'row' };
   const alignText = { textAlign: isRTL ? 'right' : 'left' };
   const marginEnd = isRTL ? { marginLeft: 8 } : { marginRight: 8 };

   // Animation effect for collapsible section
   useEffect(() => {
     Animated.timing(animatedHeight, {
       toValue: isRequestExpanded ? 1 : 0,
       duration: 300,
       useNativeDriver: false,
     }).start();
   }, [isRequestExpanded, animatedHeight]);

   const toggleRequestSection = useCallback(() => {
     setIsRequestExpanded(!isRequestExpanded);
   }, [isRequestExpanded]);

   // Initialize report items
   useEffect(() => {
     setReportItems([
       { label: t.medicalReports?.insuranceReport || 'Insurance', value: 'Insurance' },
       { label: t.medicalReports?.visitConfirmation || 'Visit Confirmation', value: 'Visit Confirmation' },
       { label: t.medicalReports?.detailedReport || 'Detailed Report', value: 'Detailed Report' },
     ]);
   }, [t]);

   // Get provider display name based on language
   const getProviderDisplayName = useCallback((provider) => {
     if (!provider) return t.common?.unknown || 'Unknown';
     if (isRTL && provider.fullNameArabic) {
       return provider.fullNameArabic;
     }
     return provider.fullName || t.common?.unknown || 'Unknown';
   }, [isRTL, t]);

   // Handle providers data based on report type
   useEffect(() => {
     if (requiresAppointments) {
       // For Insurance/Visit Confirmation: show only providers with completed appointments
       const appointmentsLabel = t.medicalReports?.appointmentsCount || 'appointments';
       const drLabel = isRTL ? 'د.' : 'Dr.';
       setProviderItems(
         providersWithAppointments.map(provider => ({
           label: `${drLabel} ${isRTL && provider.fullNameArabic ? provider.fullNameArabic : provider.fullName} (${provider.appointments.length} ${appointmentsLabel})`,
           value: provider.id,
         })),
       );
     } else if (userProviders) {
       // For Detailed Report: show all providers
       let providers = [];
       userProviders.forEach(item => {
         providers.push(item.provider);
       });
       const drLabel = isRTL ? 'د.' : 'Dr.';
       setProviderItems(
         providers.map(item => ({
           label: `${drLabel} ${isRTL && item.fullNameArabic ? item.fullNameArabic : item.fullName}`,
           value: item.id || item._id,
         })),
       );
     }
   }, [userProviders, userProvidersError, requiresAppointments, providersWithAppointments, t, isRTL]);

   // Update appointment items when provider changes
   useEffect(() => {
     if (requiresAppointments && providerValue && filteredAppointments.length > 0) {
       setAppointmentItems(
         filteredAppointments.map(apt => {
           const date = new Date(apt.startTime || apt.date).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
             year: 'numeric',
             month: 'short',
             day: 'numeric'
           });
           const service = apt.appointmentType?.name || apt.service || (isRTL ? 'استشارة' : 'Consultation');
           return {
             label: `${date} - ${service}`,
             value: apt._id || apt.id,
           };
         }),
       );
     } else {
       setAppointmentItems([]);
     }
   }, [filteredAppointments, providerValue, requiresAppointments, isRTL]);

   // Handle reports data and pagination
   useEffect(() => {
     if (patientReports) {
       const { reports, pagination } = patientReports;

       // Update pagination state
       setTotalPages(pagination.totalPages || 1);
       setTotalItems(pagination.totalItems || 0);
       setHasNextPage(pagination.hasNextPage || false);
       setHasPreviousPage(pagination.hasPreviousPage || false);

       // For first page, replace data; for subsequent pages, append
       if (currentPage === 1) {
         setReports(reports || []);
       } else {
         setReports(prev => {
           const existingIds = new Set(prev.map(item => item.id || item._id));
           const newReports = (reports || []).filter(item => !existingIds.has(item.id || item._id));
           return [...prev, ...newReports];
         });
       }

       setIsLoadingMore(false);
     }

     if (patientReportsError) {
       console.error('Reports fetch error:', patientReportsError);
       setIsLoadingMore(false);
     }
   }, [patientReports, patientReportsError, currentPage]);

   // Handle mutation success/error states
   useEffect(() => {
     if (isSuccess) {
       Alert.alert(
         t.common?.success || 'Success',
         t.medicalReports?.reportRequested || 'Medical report requested successfully'
       );
       setReportValue('');
       setProviderValue('');
       setAppointmentValues([]);
       setAppointmentItems([]);
       setCurrentPage(1);
       setReports([]);
       setIsRequestExpanded(false); // Collapse the request panel
       queryClient.invalidateQueries({ queryKey: ['patientMedicalReportsPaginated'] });
     }
   }, [isSuccess, t, queryClient]);

   useEffect(() => {
     if (isError && error) {
       Alert.alert(
         t.common?.error || 'Error',
         error.message || t.medicalReports?.requestFailed || 'Failed to request report'
       );
     }
   }, [isError, error, t]);

   const goToNextPage = useCallback(() => {
     if (hasNextPage && !isLoadingMore && !patientReportsLoader) {
       setIsLoadingMore(true);
       setCurrentPage(prev => prev + 1);
     }
   }, [hasNextPage, isLoadingMore, patientReportsLoader]);

   const goToPreviousPage = useCallback(() => {
     if (hasPreviousPage && !isLoadingMore && !patientReportsLoader) {
       setIsLoadingMore(true);
       setCurrentPage(prev => prev - 1);
     }
   }, [hasPreviousPage, isLoadingMore, patientReportsLoader]);

   const requestReport = useCallback(async () => {
     if (!reportValue || !providerValue) {
       Alert.alert(
         t.common?.error || 'Error',
         t.medicalReports?.fillAllFields || 'Please fill all fields'
       );
       return;
     }

     // For Insurance and Visit Confirmation, appointments are required
     if (requiresAppointments) {
       if (!appointmentValues || appointmentValues.length === 0) {
         Alert.alert(
           t.common?.error || 'Error',
           t.medicalReports?.selectAppointment || 'Please select at least one appointment'
         );
         return;
       }
       createMedicalReport({
         type: reportValue,
         provider: providerValue,
         appointments: appointmentValues,
       });
     } else {
       // For Detailed Report, just type and provider
       createMedicalReport({
         type: reportValue,
         provider: providerValue,
       });
     }
   }, [reportValue, providerValue, appointmentValues, requiresAppointments, createMedicalReport, t]);

   const handleViewReport = async (item) => {
     if (item.status !== 'Approved') {
       Alert.alert(
         t.common?.info || 'Info',
         t.medicalReports?.reportNotApproved || 'This report is pending approval'
       );
       return;
     }

     // Prepare private file IDs for signatures
     const privateFileIds = {};

     // Check for provider's signature fileId (new secure system)
     const providerSignatureFileId = item?.providerSignatureFileId || item?.provider?.signatureFileId;
     if (providerSignatureFileId) {
       // We'll use a placeholder in the HTML that DocumentViewer will replace
       privateFileIds['PROVIDER_SIGNATURE_PLACEHOLDER'] = providerSignatureFileId;
     }

     // Prepare the report data with signature handling
     const reportData = { ...item };

     // If we have a signatureFileId, set up the placeholder for the HTML generator
     if (providerSignatureFileId) {
       // Override the signature URL with a placeholder that DocumentViewer will replace
       reportData.providerSignatureUrl = 'PROVIDER_SIGNATURE_PLACEHOLDER';
       if (reportData.provider) {
         reportData.provider = {
           ...reportData.provider,
           signatureUrl: 'PROVIDER_SIGNATURE_PLACEHOLDER',
           signature: 'PROVIDER_SIGNATURE_PLACEHOLDER',
         };
       }
     }

     // Generate HTML content based on report type
     let result;
     let title;

     if (item.type === 'Insurance') {
       // Use insurance report template for insurance reports
       result = generateInsuranceReportHTML(reportData, isRTL);
       title = isRTL ? 'تقرير التأمين' : 'Insurance Report';
     } else if (item.type === 'Visit Confirmation') {
       // Use visit confirmation template for visit confirmation reports
       result = generateVisitConfirmationHTML(reportData, isRTL);
       title = isRTL ? 'تأكيد الزيارة' : 'Visit Confirmation';
     } else {
       // Use standard medical report template for Detailed Report and other types
       result = generateMedicalReportHTML(reportData, isRTL);
       title = isRTL ? 'التقرير الطبي' : 'Medical Report';
     }

     const htmlContent = result.html || result.toString();

     // Merge privateFileIds from report data and HTML generator
     const mergedPrivateFileIds = { ...privateFileIds, ...(result.privateFileIds || {}) };

     setViewerContent(htmlContent);
     setViewerTitle(title);
     setViewerPrivateFileIds(mergedPrivateFileIds);
     setViewerVisible(true);
   };

   // Get translated report type name
   const getReportTypeName = (type) => {
      if (type === 'Insurance') return t.medicalReports?.insuranceReport || 'Insurance';
      if (type === 'Visit Confirmation') return t.medicalReports?.visitConfirmation || 'Visit Confirmation';
      if (type === 'Detailed Report') return t.medicalReports?.detailedReport || 'Detailed Report';
      return type;
   };

   // Get translated status
   const getStatusTranslation = (status) => {
      if (status === 'Approved') return t.medicalReports?.statusApproved || 'Approved';
      if (status === 'Pending') return t.medicalReports?.statusPending || 'Pending';
      if (status === 'Rejected') return t.medicalReports?.statusRejected || 'Rejected';
      return status;
   };

   const ReportItem = ({ item }) => (
      <View style={[styles.card, rowStyle]}>
         <View style={[styles.iconBox, isRTL ? { marginLeft: 15 } : { marginRight: 15 }]}>
            <Image source={ICONS.document} style={styles.typeIcon} />
         </View>
         <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
            <Text style={[styles.cardTitle, alignText]}>
               {getReportTypeName(item.type)}
            </Text>
            <Text style={[styles.cardSub, alignText]}>
               {getProviderDisplayName(item.provider)}
            </Text>
            <Text style={[styles.cardDate, alignText]}>
               {moment(item.createdAt).format('DD MMM YYYY')}
            </Text>
            <View style={[
               styles.statusBadge,
               { backgroundColor: item.status === 'Approved' ? COLORS.successBg || '#E8F5E9' : COLORS.warningBg || '#FFF3E0', marginTop: 5 }
            ]}>
               <Text style={{
                  color: item.status === 'Approved' ? COLORS.success || '#4CAF50' : COLORS.warning || '#FF9800',
                  fontSize: 10, fontWeight: 'bold'
               }}>
                  {getStatusTranslation(item.status)}
               </Text>
            </View>
         </View>
         {item.status === 'Approved' && (
            <TouchableOpacity style={styles.viewAction} onPress={() => handleViewReport(item)}>
               <Image source={ICONS.eye} style={styles.actionIcon} />
            </TouchableOpacity>
         )}
      </View>
   );

   return (
      <View style={styles.container}>
         <Header
           title={t.medicalReports?.title || 'Medical Reports'}
           showBack
           onBack={() => navigation.goBack()}
         />

         <View style={{ flex: 1 }}>
            {/* Request Form Accordion */}
            <View style={styles.requestSection}>
               <TouchableOpacity
                  style={[styles.accordionHeader, rowStyle]}
                  onPress={toggleRequestSection}
               >
                  <Text style={styles.sectionTitle}>
                    {t.medicalReports?.requestNewReport || 'Request New Report'}
                  </Text>
                  <Icon
                    name={isRequestExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                    size={24}
                    color={COLORS.primary}
                  />
               </TouchableOpacity>

               <Animated.View
                 style={[
                   styles.collapsibleContent,
                   {
                     opacity: animatedHeight,
                     height: animatedHeight.interpolate({
                       inputRange: [0, 1],
                       outputRange: [0, requiresAppointments ? 420 : 300],
                     }),
                   },
                 ]}
               >
                 {isRequestExpanded && (
                   <View style={styles.formBody}>
                     <Text style={[styles.label, alignText]}>
                       {t.medicalReports?.reportType || 'Report Type'}
                     </Text>
                     <DropDownPicker
                       open={reportOpen}
                       value={reportValue}
                       items={reportItems}
                       setOpen={setReportOpen}
                       setValue={(callback) => {
                         setReportValue(callback);
                         // Reset provider and appointments when report type changes
                         setProviderValue('');
                         setAppointmentValues([]);
                         setAppointmentItems([]);
                       }}
                       setItems={setReportItems}
                       placeholder={t.medicalReports?.selectReportType || 'Select Report Type'}
                       style={styles.dropdown}
                       dropDownContainerStyle={styles.dropdownContainer}
                       placeholderStyle={{ color: COLORS.gray500 }}
                       zIndex={4000}
                       zIndexInverse={1000}
                       onOpen={() => {
                         setProviderOpen(false);
                         setAppointmentOpen(false);
                       }}
                     />

                     <Text style={[styles.label, alignText, { marginTop: 15 }]}>
                       {requiresAppointments
                         ? (t.medicalReports?.selectDoctor || 'Select Doctor')
                         : (t.medicalReports?.provider || 'Provider')}
                     </Text>
                     <DropDownPicker
                       open={providerOpen}
                       value={providerValue}
                       items={providerItems}
                       setOpen={setProviderOpen}
                       setValue={(callback) => {
                         setProviderValue(callback);
                         // Reset appointments when provider changes
                         setAppointmentValues([]);
                       }}
                       setItems={setProviderItems}
                       placeholder={requiresAppointments
                         ? (t.medicalReports?.selectDoctorFirst || 'Select a doctor first')
                         : (t.medicalReports?.selectProvider || 'Select Provider')}
                       style={styles.dropdown}
                       dropDownContainerStyle={styles.dropdownContainer}
                       placeholderStyle={{ color: COLORS.gray500 }}
                       zIndex={3000}
                       zIndexInverse={2000}
                       onOpen={() => {
                         setReportOpen(false);
                         setAppointmentOpen(false);
                       }}
                       disabled={!reportValue}
                     />

                     {/* Appointment Selection - Only for Insurance/Visit Confirmation */}
                     {requiresAppointments && providerValue && (
                       <>
                         <Text style={[styles.label, alignText, { marginTop: 15 }]}>
                           {t.medicalReports?.selectAppointments || 'Select Appointments'}
                         </Text>
                         <DropDownPicker
                           open={appointmentOpen}
                           value={appointmentValues}
                           items={appointmentItems}
                           setOpen={setAppointmentOpen}
                           setValue={setAppointmentValues}
                           setItems={setAppointmentItems}
                           placeholder={t.medicalReports?.selectAppointmentsPlaceholder || 'Select appointments'}
                           style={styles.dropdown}
                           dropDownContainerStyle={[styles.dropdownContainer, { maxHeight: 150 }]}
                           placeholderStyle={{ color: COLORS.gray500 }}
                           multiple={true}
                           mode="BADGE"
                           badgeDotColors={[COLORS.primary]}
                           badgeColors={[COLORS.gray100]}
                           badgeTextStyle={{ color: COLORS.textPrimary }}
                           zIndex={2000}
                           zIndexInverse={3000}
                           onOpen={() => {
                             setReportOpen(false);
                             setProviderOpen(false);
                           }}
                           listMode="MODAL"
                           modalProps={{
                             animationType: 'slide',
                           }}
                           modalTitle={t.medicalReports?.selectAppointments || 'Select Appointments'}
                         />
                       </>
                     )}

                     <TouchableOpacity
                       style={[styles.submitBtn, isPending && { opacity: 0.6 }]}
                       onPress={requestReport}
                       disabled={isPending}
                     >
                       {isPending ? (
                         <ActivityIndicator color="white" size="small" />
                       ) : (
                         <Text style={styles.submitText}>
                           {t.medicalReports?.submitRequest || 'Submit Request'}
                         </Text>
                       )}
                     </TouchableOpacity>
                   </View>
                 )}
               </Animated.View>
            </View>

            {/* List */}
            <View style={styles.listContainer}>
               <Text style={[styles.listHeader, alignText]}>
                 {t.medicalReports?.reportsList || 'Reports List'}
               </Text>

               {patientReportsLoader && currentPage === 1 ? (
                 <View style={styles.loaderContainer}>
                   <ActivityIndicator size="large" color={COLORS.primary} />
                   <Text style={styles.loaderText}>{t.common?.loading || 'Loading...'}</Text>
                 </View>
               ) : reports.length === 0 ? (
                 <View style={styles.emptyContainer}>
                   <Text style={styles.emptyText}>
                     {t.medicalReports?.noReports || 'No medical reports found'}
                   </Text>
                 </View>
               ) : (
                 <FlatList
                   data={reports}
                   keyExtractor={(item, index) => item.id || item._id || `report-${index}`}
                   renderItem={({ item }) => <ReportItem item={item} />}
                   contentContainerStyle={{ paddingBottom: 20 }}
                   showsVerticalScrollIndicator={false}
                   ListFooterComponent={() => (
                     <View>
                       {isLoadingMore && (
                         <View style={styles.loadingMoreContainer}>
                           <ActivityIndicator size="small" color={COLORS.primary} />
                           <Text style={styles.loadingMoreText}>
                             {t.common?.loadingMore || 'Loading more...'}
                           </Text>
                         </View>
                       )}
                     </View>
                   )}
                 />
               )}
            </View>
         </View>

         {/* Document Viewer Modal */}
         <DocumentViewer
           visible={viewerVisible}
           onClose={() => {
             setViewerVisible(false);
             setViewerPrivateFileIds({});
           }}
           htmlContent={viewerContent}
           title={viewerTitle}
           privateFileIds={viewerPrivateFileIds}
         />
      </View>
   );
};

const styles = StyleSheet.create({
   container: { flex: 1, backgroundColor: COLORS.background },

   requestSection: { backgroundColor: 'white', marginTop: 10, marginHorizontal: 15, borderRadius: 12, elevation: 2, shadowColor: COLORS.shadow, shadowOpacity: 0.1, shadowRadius: 4 },
   accordionHeader: { justifyContent: 'space-between', padding: 15, alignItems: 'center' },
   sectionTitle: { fontWeight: 'bold', fontSize: 15, color: COLORS.textPrimary },
   collapsibleContent: { overflow: 'hidden' },
   formBody: { padding: 15, paddingTop: 5, borderTopWidth: 1, borderTopColor: COLORS.gray200 },

   label: { fontSize: 13, color: COLORS.gray600, marginBottom: 8, fontWeight: '600' },
   dropdown: {
     borderWidth: 1,
     borderColor: COLORS.gray300,
     borderRadius: 10,
     minHeight: 50,
   },
   dropdownContainer: {
     borderColor: COLORS.gray300,
     borderRadius: 10,
   },
   submitBtn: { backgroundColor: COLORS.primary, padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 20 },
   submitText: { color: 'white', fontWeight: 'bold', fontSize: 15 },

   listContainer: { flex: 1, padding: 15 },
   listHeader: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: COLORS.textPrimary },

   card: { backgroundColor: COLORS.white, padding: 15, borderRadius: 16, marginBottom: 10, alignItems: 'center', shadowColor: COLORS.shadow, shadowOpacity: 0.03, elevation: 1 },
   iconBox: { width: 45, height: 45, borderRadius: 12, backgroundColor: COLORS.gray100, alignItems: 'center', justifyContent: 'center' },
   typeIcon: { width: 22, height: 22, tintColor: COLORS.secondary },
   cardTitle: { fontSize: 15, fontWeight: 'bold', color: COLORS.textPrimary },
   cardSub: { fontSize: 12, color: COLORS.gray700, marginTop: 2 },
   cardDate: { fontSize: 11, color: COLORS.gray500, marginTop: 4 },
   statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
   actionIcon: { width: 20, height: 20, tintColor: COLORS.primary },
   viewAction: { padding: 5 },

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
   emptyContainer: {
     alignItems: 'center',
     justifyContent: 'center',
     paddingVertical: 50,
   },
   emptyText: {
     fontSize: 15,
     color: COLORS.gray600,
     textAlign: 'center',
   },
});

export default MedicalReportsScreen;
