import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Image, StyleSheet, FlatList,
  Modal, TextInput, ScrollView, ActivityIndicator, Alert
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Header from '../components/Header';
import DocumentViewer from '../components/DocumentViewer';
import { useLanguage } from '../store/LanguageContext';
import { useGetCurrentUser } from '../api/services/User.Service';
import COLORS from '../constants/colors';
import ICONS from '../constants/icons';
import { GetAllDocuments, AddDocumentByPatient } from '../api/services/Document.Service';
import {
  ListPrescriptionByPatient,
  ListProcedureRequestByPatient,
  ListSickLeaves,
  ListRefillRequest,
} from '../api/services/Encounter.Service';
import {
  uploadMedicalDocument,
  validateFile,
  getPrivateFileAsBase64,
} from '../api/services/Upload.Service';
import { generatePrescriptionHTML } from '../utils/htmlTemplates/prescriptionHtml';
import { generateProcedureHTML } from '../utils/htmlTemplates/procedureHtml';
import { generateSickLeaveHTML } from '../utils/htmlTemplates/sickLeaveHtml';
import DocumentPicker from 'react-native-document-picker';
import DropDownPicker from 'react-native-dropdown-picker';
import moment from 'moment';

const MedicalRecordScreen = () => {
  const navigation = useNavigation();
  const { t, isRTL } = useLanguage();
  const { data: currentUser } = useGetCurrentUser();

  // Dynamic styles
  const rowStyle = { flexDirection: isRTL ? 'row-reverse' : 'row' };
  const alignText = { textAlign: isRTL ? 'right' : 'left' };
  const marginEnd = isRTL ? { marginLeft: 10 } : { marginRight: 10 };

  // State
  const [activeTab, setActiveTab] = useState('All');
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');

  // Data states
  const [prescriptionsList, setPrescriptionsList] = useState([]);
  const [refillRequestList, setRefillRequestList] = useState([]);
  const [procedureList, setProcedureList] = useState([]);
  const [sickLeavesList, setSickLeavesList] = useState([]);
  const [documentsList, setDocumentsList] = useState([]);
  const [loading, setLoading] = useState(false);

  // Upload states
  const [testNameOpen, setTestNameOpen] = useState(false);
  const [testNameValue, setTestNameValue] = useState(null);
  const [testNameItems, setTestNameItems] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [availableTestNames, setAvailableTestNames] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [addDocumentLoader, setAddDocumentLoader] = useState(false);

  // Document viewer states
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerContent, setViewerContent] = useState('');
  const [viewerTitle, setViewerTitle] = useState('');
  const [viewerPrivateFileIds, setViewerPrivateFileIds] = useState({});
  const [loadingDocument, setLoadingDocument] = useState(false);

  // Fetch all data
  const fetchAllData = useCallback(async () => {
    if (!currentUser?._id) {
      console.log('❌ [MedicalRecord] No currentUser._id found');
      return;
    }

    console.log('🔄 [MedicalRecord] Fetching data for user:', currentUser._id);
    setLoading(true);
    try {
      const [prescriptions, sickLeaves, procedures, refillRequests, documents] = await Promise.all([
        ListPrescriptionByPatient(),
        ListSickLeaves(),
        ListProcedureRequestByPatient(),
        ListRefillRequest(),
        GetAllDocuments(currentUser._id),
      ]);

      console.log('📋 [MedicalRecord] Prescriptions:', prescriptions);
      console.log('🏥 [MedicalRecord] Sick Leaves:', sickLeaves);
      console.log('🔬 [MedicalRecord] Procedures:', procedures);
      console.log('💊 [MedicalRecord] Refill Requests:', refillRequests);
      console.log('📄 [MedicalRecord] Documents:', documents);

      if (prescriptions?.prescriptions) {
        console.log('✅ Setting prescriptions:', prescriptions.prescriptions.length);
        setPrescriptionsList(prescriptions.prescriptions);
      }
      if (sickLeaves) {
        console.log('✅ Setting sick leaves:', sickLeaves.length);
        setSickLeavesList(sickLeaves);
      }
      if (procedures) {
        console.log('✅ Setting procedures:', procedures.length);
        setProcedureList(procedures);
      }
      if (refillRequests?.docs) {
        console.log('✅ Setting refill requests:', refillRequests.docs.length);
        setRefillRequestList(refillRequests.docs);
      }
      if (documents) {
        console.log('✅ Setting documents:', documents.length);
        setDocumentsList(documents);
      }
    } catch (error) {
      console.error('❌ [MedicalRecord] Error fetching data:', error);
      Alert.alert(t.common?.error || 'Error', error.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [currentUser?._id, t]);

  // Update available test names (procedures without results)
  const updateAvailableTestNames = useCallback(async () => {
    try {
      if (!currentUser?._id) return;

      const documents = await GetAllDocuments(currentUser._id);
      const availableProcedures = procedureList.filter((procedure) =>
        !documents.some((doc) => doc.formId === procedure.formId)
      );

      setAvailableTestNames(availableProcedures);
    } catch (error) {
      console.error('Error updating available test names:', error);
    }
  }, [currentUser?._id, procedureList]);

  // Fetch data on focus
  useFocusEffect(
    React.useCallback(() => {
      if (currentUser?._id) {
        fetchAllData();
      }
    }, [fetchAllData, currentUser?._id])
  );

  // Update test names when procedures change
  useEffect(() => {
    if (procedureList.length > 0) {
      updateAvailableTestNames();
    }
  }, [procedureList, updateAvailableTestNames]);

  // Update dropdown items
  useEffect(() => {
    if (availableTestNames && availableTestNames.length > 0) {
      const testItems = availableTestNames.map((test) => {
        const date = moment(test.createdAt).format('DD MMM YYYY');
        const doctorName = isRTL
          ? (test.provider?.fullNameArabic || test.provider?.fullName || t.medicalRecord?.unknown || 'Unknown')
          : (test.provider?.fullName || t.medicalRecord?.unknown || 'Unknown');
        const byLabel = isRTL ? 'د.' : 'Dr.';
        const label = `${test.procedureType} ${test.name} - ${date} ${byLabel} ${doctorName}`;

        return {
          label: label,
          value: test.diagnosisId || test.formId,
          procedureData: test,
        };
      });
      setTestNameItems(testItems);
    } else {
      setTestNameItems([
        {
          label: t.medicalRecord?.noTestsAvailable || 'No tests available',
          value: 'no-tests',
          disabled: true,
        },
      ]);
    }
  }, [availableTestNames, t, isRTL]);

  // File picker with secure upload
  const openMediaPicker = async () => {
    try {
      const results = await DocumentPicker.pick({
        type: [DocumentPicker.types.pdf, DocumentPicker.types.images],
        allowMultiSelection: false,
      });

      const file = results[0];

      // Validate file before upload
      const validation = validateFile(file, 'medicalDocument');
      if (!validation.isValid) {
        Alert.alert(t.common?.error || 'Error', validation.error);
        return;
      }

      setUploadingFile(true);

      try {
        // Use the secure upload function
        const uploadResponse = await uploadMedicalDocument(file, {
          relatedPatient: currentUser?._id,
        });

        console.log('📄 [MedicalRecord] Upload response:', uploadResponse);

        // Store both fileId (new) and url (legacy) for backward compatibility
        setSelectedFile({
          ...file,
          fileId: uploadResponse?.fileId,
          url: uploadResponse?.url || '',
        });

        Alert.alert(t.common?.success || 'Success', t.medicalRecord?.fileSelectedSuccess || 'File selected successfully');
      } catch (error) {
        console.error('Upload error:', error);
        Alert.alert(t.common?.error || 'Error', error.message || t.medicalRecord?.failedToPickDocument || 'Failed to upload file');
      } finally {
        setUploadingFile(false);
      }
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        Alert.alert(t.common?.error || 'Error', t.medicalRecord?.failedToPickDocument || 'Failed to pick document');
      }
    }
  };

  // Upload test result
  const uploadTest = async () => {
    if (!testNameValue || testNameValue === 'no-tests') {
      Alert.alert(t.common?.error || 'Error', t.medicalRecord?.testNameError || 'Please select a test');
      return;
    }
    if (!selectedFile) {
      Alert.alert(t.common?.error || 'Error', t.medicalRecord?.uploadError || 'Please select a file to upload');
      return;
    }

    const selectedTest = availableTestNames.find(
      (test) => (test.diagnosisId || test.formId) === testNameValue
    );

    if (!selectedTest) {
      Alert.alert(t.common?.error || 'Error', 'Selected test is not valid');
      return;
    }

    // Include both documentFileId (new secure) and document URL (legacy) for backward compatibility
    const payload = {
      title: `${selectedTest.procedureType} ${selectedTest.name}`,
      providerId: selectedTest.provider?.id,
      patientId: currentUser?._id,
      formId: selectedTest.formId || null,
      document: selectedFile.url, // Legacy URL field
      documentFileId: selectedFile.fileId, // New secure fileId field
    };

    setAddDocumentLoader(true);
    try {
      await AddDocumentByPatient(payload);
      Alert.alert(t.common?.success || 'Success', t.medicalRecord?.testUploadedSuccess || 'Test uploaded successfully');
      setSelectedFile(null);
      setTestNameValue(null);
      setUploadModalVisible(false);

      // Refresh data
      if (currentUser?._id) {
        await fetchAllData();
        await updateAvailableTestNames();
      }
    } catch (error) {
      console.error('Error uploading test:', error);
      Alert.alert(t.common?.error || 'Error', error.message || 'Failed to upload test');
    } finally {
      setAddDocumentLoader(false);
    }
  };

  // Filter data based on active tab
  const getFilteredData = () => {
    let allData = [];

    console.log('📊 [MedicalRecord] Data counts:', {
      prescriptions: prescriptionsList.length,
      procedures: procedureList.length,
      documents: documentsList.length,
      sickLeaves: sickLeavesList.length,
      refillRequests: refillRequestList.length,
    });

    if (activeTab === 'All' || activeTab === 'Meds') {
      allData = [...allData, ...prescriptionsList.map(item => ({ ...item, type: 'Meds' }))];
    }
    if (activeTab === 'All' || activeTab === 'Labs') {
      allData = [...allData, ...procedureList.map(item => ({ ...item, type: 'Labs' }))];
    }
    if (activeTab === 'All' || activeTab === 'Docs') {
      // Docs tab shows only sick leaves (not lab results/documents)
      allData = [...allData, ...sickLeavesList.map(item => ({ ...item, type: 'Docs', subType: 'sickLeave' }))];
    }
    if (activeTab === 'All' || activeTab === 'Refills') {
      allData = [...allData, ...refillRequestList.map(item => ({ ...item, type: 'Refills' }))];
    }
    // Results tab for uploaded lab results/documents
    if (activeTab === 'All' || activeTab === 'Results') {
      allData = [...allData, ...documentsList.map(item => ({ ...item, type: 'Results', subType: 'labResult' }))];
    }

    if (searchText) {
      return allData.filter(item => {
        const title = item.drugName || item.name || item.title || item.details || item.medications?.[0]?.drugName || '';
        return title.toLowerCase().includes(searchText.toLowerCase());
      });
    }

    console.log('🔍 [MedicalRecord] Filtered data count:', allData.length);
    return allData;
  };

  const filteredData = getFilteredData();

  // Get icon based on type
  const getIcon = (item) => {
    if (item.type === 'Meds') return ICONS.pill;
    if (item.type === 'Labs') return ICONS.flask;
    if (item.type === 'Refills') return ICONS.refill;
    if (item.type === 'Results') return ICONS.document;
    if (item.type === 'Docs') {
      // Check subType for docs
      if (item.subType === 'sickLeave') return ICONS.sickLeave;
      if (item.subType === 'document') return ICONS.document;
      // Fallback: check if it has 'details' field (sick leave) or 'document' field (uploaded doc)
      if (item.details) return ICONS.sickLeave;
      if (item.document) return ICONS.document;
    }
    return ICONS.prescription;
  };

  // Handle view document - supports both private (fileId) and legacy (url) documents
  const handleViewDocument = async (item) => {
    try {
      let htmlContent = '';
      let title = '';
      let privateFileIds = {};

      // Determine record type and generate appropriate HTML
      if (item.type === 'Meds') {
        // Prescription - now returns { html, privateFileIds }
        const result = generatePrescriptionHTML(item, isRTL);
        htmlContent = result.html || result.toString();
        privateFileIds = result.privateFileIds || {};
        title = isRTL ? 'الوصفة الطبية' : 'Prescription';
      } else if (item.type === 'Labs') {
        // Procedure/Lab order - now returns { html, privateFileIds }
        const result = generateProcedureHTML(item, isRTL);
        htmlContent = result.html || result.toString();
        privateFileIds = result.privateFileIds || {};
        title = isRTL ? 'طلب إجراء' : 'Procedure Request';
      } else if (item.type === 'Results' || (item.type === 'Docs' && item.subType === 'document')) {
        // Uploaded lab result document - fetch and display
        setLoadingDocument(true);

        let documentUrl = item.document; // Legacy URL

        if (item.documentFileId) {
          // New secure private file - fetch via authenticated endpoint
          try {
            console.log('📄 [MedicalRecord] Fetching private document:', item.documentFileId);
            documentUrl = await getPrivateFileAsBase64(item.documentFileId);
            console.log('📄 [MedicalRecord] Got document URL, length:', documentUrl?.length);
          } catch (fetchError) {
            console.error('Error fetching private document:', fetchError);
            setLoadingDocument(false);
            // Fall back to legacy URL if available
            if (!item.document) {
              Alert.alert(t.common?.error || 'Error', 'Failed to load document');
              return;
            }
          }
        }

        setLoadingDocument(false);

        if (documentUrl) {
          // Determine if it's an image or PDF based on the data URL or extension
          const isImage = documentUrl.startsWith('data:image/') ||
                         /\.(jpg|jpeg|png|gif|webp)$/i.test(item.document || '');
          const isPdf = documentUrl.startsWith('data:application/pdf') ||
                       /\.pdf$/i.test(item.document || '');

          // Create HTML to display the document
          const documentHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=3.0">
              <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                html, body {
                  width: 100%;
                  height: 100%;
                  background: #f5f5f5;
                }
                body {
                  display: flex;
                  justify-content: center;
                  align-items: ${isImage ? 'center' : 'stretch'};
                  min-height: 100vh;
                  padding: ${isImage ? '10px' : '0'};
                }
                img {
                  max-width: 100%;
                  height: auto;
                  border-radius: 8px;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }
                .pdf-container {
                  width: 100%;
                  height: 100vh;
                }
                iframe {
                  width: 100%;
                  height: 100%;
                  border: none;
                }
                .pdf-message {
                  text-align: center;
                  padding: 40px 20px;
                  color: #666;
                }
                .pdf-message h3 {
                  margin-bottom: 10px;
                  color: #333;
                }
              </style>
            </head>
            <body>
              ${isImage ?
                `<img src="${documentUrl}" alt="Lab Result" />` :
                isPdf ?
                `<div class="pdf-container">
                  <iframe src="${documentUrl}" title="Lab Result PDF"></iframe>
                </div>` :
                `<img src="${documentUrl}" alt="Lab Result" onerror="this.style.display='none'; document.getElementById('fallback').style.display='block';" />
                 <div id="fallback" style="display:none;" class="pdf-message">
                   <h3>Document Preview</h3>
                   <p>Unable to preview this document type</p>
                 </div>`
              }
            </body>
            </html>
          `;

          htmlContent = documentHtml;
          title = item.title || (isRTL ? 'نتيجة الفحص' : 'Lab Result');
        }
      } else if (item.type === 'Docs' && item.subType === 'sickLeave') {
        // Sick leave - now returns { html, privateFileIds }
        const result = generateSickLeaveHTML(item, isRTL);
        htmlContent = result.html || result.toString();
        privateFileIds = result.privateFileIds || {};
        title = isRTL ? 'إجازة مرضية' : 'Sick Leave';
      } else if (item.type === 'Docs') {
        // Generic doc - check what type it is
        if (item.details) {
          // Sick leave
          const result = generateSickLeaveHTML(item, isRTL);
          htmlContent = result.html || result.toString();
          privateFileIds = result.privateFileIds || {};
          title = isRTL ? 'إجازة مرضية' : 'Sick Leave';
        } else if (item.documentFileId || item.document) {
          // Uploaded document - same as Results
          setLoadingDocument(true);

          let documentUrl = item.document;

          if (item.documentFileId) {
            try {
              console.log('📄 [MedicalRecord] Fetching private document:', item.documentFileId);
              documentUrl = await getPrivateFileAsBase64(item.documentFileId);
            } catch (fetchError) {
              console.error('Error fetching private document:', fetchError);
              setLoadingDocument(false);
              if (!item.document) {
                Alert.alert(t.common?.error || 'Error', 'Failed to load document');
                return;
              }
            }
          }

          setLoadingDocument(false);

          if (documentUrl) {
            const isImage = documentUrl.startsWith('data:image/') ||
                           /\.(jpg|jpeg|png|gif|webp)$/i.test(item.document || '');

            htmlContent = `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=3.0">
                <style>
                  * { margin: 0; padding: 0; box-sizing: border-box; }
                  body {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    background: #f5f5f5;
                    padding: 10px;
                  }
                  img {
                    max-width: 100%;
                    height: auto;
                    border-radius: 8px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                  }
                  iframe {
                    width: 100%;
                    height: 100vh;
                    border: none;
                  }
                </style>
              </head>
              <body>
                ${isImage ? `<img src="${documentUrl}" alt="Document" />` :
                  `<iframe src="${documentUrl}" title="Document"></iframe>`
                }
              </body>
              </html>
            `;
            title = item.title || (isRTL ? 'مستند' : 'Document');
          }
        }
      } else if (item.type === 'Refills') {
        // Refill request - show alert with details
        const medications = item.medications?.map(med => med.drugName || med.name).join(', ') || 'N/A';
        const providerDisplayName = isRTL
          ? (item.provider?.fullNameArabic || item.provider?.fullName)
          : item.provider?.fullName;
        const getStatusTranslation = (status) => {
          if (status === 'Approved') return t.medicalRecord?.statusApproved || 'Approved';
          if (status === 'Pending') return t.medicalRecord?.statusPending || 'Pending';
          if (status === 'Rejected') return t.medicalRecord?.statusRejected || 'Rejected';
          return status || 'N/A';
        };
        const details = `
${t.medicalRecord?.medications || 'Medications'}: ${medications}
${t.medicalRecord?.status || 'Status'}: ${getStatusTranslation(item.status)}
${t.medicalRecord?.requestDate || 'Request Date'}: ${new Date(item.createdAt).toLocaleDateString()}
${providerDisplayName ? `${t.medicalRecord?.provider || 'Provider'}: ${providerDisplayName}` : ''}
        `.trim();

        Alert.alert(
          t.medicalRecord?.refillRequest || 'Refill Request',
          details,
          [{ text: t.common?.ok || 'OK' }]
        );
        return;
      }

      if (htmlContent) {
        setViewerContent(htmlContent);
        setViewerTitle(title);
        setViewerPrivateFileIds(privateFileIds);
        setViewerVisible(true);
      } else {
        Alert.alert(t.common?.info || 'Info', t.medicalRecord?.noDocumentAvailable || 'No document available');
      }
    } catch (error) {
      console.error('Error opening document:', error);
      setLoadingDocument(false);
      Alert.alert(t.common?.error || 'Error', 'Failed to open document');
    }
  };

  // Get provider name based on language
  const getProviderName = (item) => {
    if (isRTL) {
      return item.provider?.fullNameArabic || item.provider?.fullName || item.providerName || item.addedBy || t.medicalRecord?.unknown || 'Unknown';
    }
    return item.providerName || item.provider?.fullName || item.addedBy || t.medicalRecord?.unknown || 'Unknown';
  };

  // Render record item
  const renderRecordItem = ({ item }) => {
    // Get title based on type
    const getTitle = () => {
      if (item.type === 'Refills') {
        return item.medications?.[0]?.drugName || t.medicalRecord?.refillRequest || 'Refill Request';
      }
      if (item.type === 'Results') {
        return item.title || t.medicalRecord?.labResult || 'Lab Result';
      }
      return item.drugName || item.name || item.title || item.details || t.medicalRecord?.unknown || 'Unknown';
    };

    return (
      <View style={[styles.card, rowStyle]}>
        <View style={[styles.iconBox, isRTL ? { marginLeft: 15 } : { marginRight: 15 }]}>
          <Image source={getIcon(item)} style={styles.typeIcon} />
        </View>
        <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
          <Text style={[styles.cardTitle, alignText]}>
            {getTitle()}
          </Text>
          <Text style={[styles.cardSub, alignText]}>
            {getProviderName(item)}
          </Text>
          <Text style={[styles.cardDate, alignText]}>
            {moment(item.updatedAt || item.createdAt).format('DD MMM YYYY')}
          </Text>
          {item.type === 'Refills' && item.status && (
            <View style={[
              styles.statusBadge,
              {
                backgroundColor: item.status === 'Approved' ? COLORS.successBg || '#E8F5E9' :
                                 item.status === 'Pending' ? COLORS.warningBg || '#FFF3E0' :
                                 COLORS.errorBg || '#FFEBEE',
                marginTop: 4
              }
            ]}>
              <Text style={{
                color: item.status === 'Approved' ? COLORS.success || '#4CAF50' :
                       item.status === 'Pending' ? COLORS.warning || '#FF9800' :
                       COLORS.error || '#F44336',
                fontSize: 10,
                fontWeight: 'bold'
              }}>
                {item.status === 'Approved' ? (t.medicalRecord?.statusApproved || 'Approved') :
                 item.status === 'Pending' ? (t.medicalRecord?.statusPending || 'Pending') :
                 item.status === 'Rejected' ? (t.medicalRecord?.statusRejected || 'Rejected') :
                 item.status}
              </Text>
            </View>
          )}
        </View>
        <TouchableOpacity style={styles.viewAction} onPress={() => handleViewDocument(item)}>
          <Image source={ICONS.eye} style={styles.actionIcon} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Header title={t.medicalRecord?.title || 'Medical Record'} showBack onBack={() => navigation.goBack()} />

      {/* Search & Filters */}
      <View style={styles.filterSection}>
        <View style={[styles.searchBar, rowStyle]}>
          <Image source={ICONS.search} style={[styles.searchIcon, marginEnd]} />
          <TextInput
            placeholder={t.medicalRecord?.searchRecords || 'Search records...'}
            style={[styles.searchInput, alignText]}
            placeholderTextColor={COLORS.gray500}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContainer}
          style={isRTL ? { transform: [{ scaleX: -1 }] } : {}}
        >
          {['All', 'Labs', 'Meds', 'Docs', 'Results', 'Refills'].map(tab => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tab,
                activeTab === tab && styles.activeTab,
                isRTL && { transform: [{ scaleX: -1 }] }
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {t.medicalRecord?.[tab.toLowerCase()] || tab}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        {/* Yellow Alert Banner - Only show when there are tests available to upload */}
        {availableTestNames.length > 0 && (
          <View style={styles.uploadAlertContainer}>
            <TouchableOpacity
              style={styles.uploadAlert}
              onPress={() => setUploadModalVisible(true)}
              activeOpacity={0.8}
            >
              <View style={[styles.uploadAlertContent, rowStyle]}>
                <View style={styles.uploadIconContainer}>
                  <Image source={ICONS.cloudUpload} style={styles.uploadAlertIcon} />
                </View>
                <View style={styles.uploadTextContainer}>
                  <Text style={styles.uploadAlertTitle}>
                    {t.medicalRecord?.uploadResultsTitle || 'Upload Lab Results'}
                  </Text>
                  <Text style={styles.uploadAlertMessage}>
                    {t.medicalRecord?.uploadResultsMessage || 'You have pending lab results to upload'}
                  </Text>
                </View>
                <View style={styles.uploadChevronContainer}>
                  <Image
                    source={ICONS.chevronRight}
                    style={[
                      styles.uploadAlertChevron,
                      isRTL && { transform: [{ rotate: '180deg' }] }
                    ]}
                  />
                </View>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>{t.common?.loading || 'Loading...'}</Text>
          </View>
        ) : filteredData.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t.medicalRecord?.noRecordsFound || 'No records found'}</Text>
          </View>
        ) : (
          filteredData.map((item, index) => <View key={`${item.type}-${item._id || item.id || index}`}>{renderRecordItem({ item })}</View>)
        )}
      </ScrollView>

      {/* Loading Document Overlay */}
      {loadingDocument && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingOverlayText}>{t.common?.loadingDocument || 'Loading document...'}</Text>
        </View>
      )}

      {/* Upload Modal */}
      <Modal visible={uploadModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, rowStyle]}>
              <Text style={styles.modalTitle}>{t.medicalRecord?.uploadResult || 'Upload Result'}</Text>
              <TouchableOpacity onPress={() => setUploadModalVisible(false)}>
                <Image source={ICONS.close} style={{ width: 16, height: 16, tintColor: COLORS.gray500 }} />
              </TouchableOpacity>
            </View>

            {/* Test Name Dropdown */}
            <Text style={[styles.inputLabel, alignText]}>{t.medicalRecord?.selectTest || 'Select Test'}</Text>
            <DropDownPicker
              open={testNameOpen}
              value={testNameValue}
              items={testNameItems}
              setOpen={setTestNameOpen}
              setValue={setTestNameValue}
              setItems={setTestNameItems}
              placeholder={t.medicalRecord?.testNamePlaceholder || 'Select a test...'}
              style={styles.dropdown}
              dropDownContainerStyle={styles.dropdownContainer}
              placeholderStyle={{ color: COLORS.gray500 }}
              zIndex={3000}
            />

            {/* File Upload */}
            <Text style={[styles.inputLabel, alignText, { marginTop: 15 }]}>{t.medicalRecord?.uploadFile || 'Upload File'}</Text>
            <TouchableOpacity style={styles.uploadBox} onPress={openMediaPicker} disabled={uploadingFile}>
              {uploadingFile ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <>
                  <Image source={ICONS.cloudUpload} style={{ width: 40, height: 40, tintColor: COLORS.primary }} />
                  <Text style={{ color: COLORS.primary, marginTop: 10 }}>
                    {selectedFile ? (selectedFile.name || selectedFile.url?.split('/').pop() || 'File selected') : (t.medicalRecord?.tapToSelect || 'Tap to select')}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, (!testNameValue || !selectedFile || addDocumentLoader) && { opacity: 0.6 }]}
              onPress={uploadTest}
              disabled={!testNameValue || !selectedFile || addDocumentLoader}
            >
              {addDocumentLoader ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <Text style={styles.saveBtnText}>{t.medicalRecord?.upload || 'Upload'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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

  filterSection: { backgroundColor: 'white', paddingVertical: 10, paddingHorizontal: 15 },
  searchBar: { backgroundColor: COLORS.gray100, borderRadius: 10, paddingHorizontal: 10, height: 40, marginBottom: 15, alignItems: 'center' },
  searchIcon: { width: 16, height: 16, tintColor: COLORS.gray500 },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textPrimary },

  tabsContainer: { gap: 10 },
  tab: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 20, backgroundColor: COLORS.gray100 },
  activeTab: { backgroundColor: COLORS.promo1, borderColor: COLORS.primary, borderWidth: 1 },
  tabText: { color: COLORS.gray700, fontSize: 13 },
  activeTabText: { color: COLORS.primary, fontWeight: 'bold' },

  card: { backgroundColor: COLORS.white, padding: 15, borderRadius: 16, marginBottom: 10, alignItems: 'center', shadowColor: COLORS.shadow, shadowOpacity: 0.03, elevation: 1 },
  iconBox: { width: 45, height: 45, borderRadius: 12, backgroundColor: COLORS.gray100, alignItems: 'center', justifyContent: 'center' },
  typeIcon: { width: 22, height: 22, tintColor: COLORS.secondary },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: COLORS.textPrimary },
  cardSub: { fontSize: 12, color: COLORS.gray700, marginTop: 2 },
  cardDate: { fontSize: 11, color: COLORS.gray500, marginTop: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' },
  actionIcon: { width: 20, height: 20, tintColor: COLORS.primary },
  viewAction: { padding: 5 },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 50 },
  loadingText: { marginTop: 10, color: COLORS.gray600, fontSize: 14 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 50 },
  emptyText: { fontSize: 15, color: COLORS.gray600, textAlign: 'center' },

  // Loading Overlay
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingOverlayText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.gray600,
  },

  // Yellow Alert Banner Styles
  uploadAlertContainer: {
    marginBottom: 16,
  },
  uploadAlert: {
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FFD54F',
    shadowColor: '#FFA000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  uploadAlertContent: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  uploadIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFE082',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  uploadAlertIcon: {
    width: 28,
    height: 28,
    tintColor: '#F57C00',
  },
  uploadTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  uploadAlertTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E65100',
    marginBottom: 4,
  },
  uploadAlertMessage: {
    fontSize: 14,
    color: '#F57C00',
    lineHeight: 20,
  },
  uploadChevronContainer: {
    marginLeft: 8,
    padding: 4,
  },
  uploadAlertChevron: {
    width: 20,
    height: 20,
    tintColor: '#F57C00',
  },

  modalOverlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', borderRadius: 20, padding: 20 },
  modalHeader: { alignItems: 'center', marginBottom: 20, justifyContent: 'space-between' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary },
  inputLabel: { fontSize: 12, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 8 },
  dropdown: { borderWidth: 1, borderColor: COLORS.gray300, borderRadius: 10, minHeight: 50 },
  dropdownContainer: { borderColor: COLORS.gray300, borderRadius: 10 },
  uploadBox: { height: 100, borderRadius: 16, borderWidth: 1, borderColor: COLORS.primary, borderStyle: 'dashed', backgroundColor: COLORS.highlight, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  saveBtn: { backgroundColor: COLORS.primary, padding: 15, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: 'white', fontWeight: 'bold' }
});

export default MedicalRecordScreen;
