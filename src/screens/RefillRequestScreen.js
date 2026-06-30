import React, { useState, useMemo, useEffect } from 'react';
import {
   View, Text, TouchableOpacity, Image, StyleSheet, TextInput,
   ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, FlatList
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useLanguage } from '../store/LanguageContext';
import Header from '../components/Header';
import COLORS from '../constants/colors';
import ICONS from '../constants/icons';
import {
  useListPrescriptionByPatient,
} from '@api/services/Encounter.Service';
import { useCreateRefillRequestFromPatient, usePendingMedications } from '@api/services/Refill.Service';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateRefillCaches } from '../utils/queryInvalidation';
import Icon from 'react-native-vector-icons/Feather';

const MedicationCheckBox = ({
  id,
  name,
  prescribedBy,
  prescribedDate,
  checked,
  onToggle,
  disabled,
  status,
  isRTL,
}) => {
  const rowStyle = { flexDirection: isRTL ? 'row-reverse' : 'row' };
  const alignText = { textAlign: isRTL ? 'right' : 'left' };
  const marginEnd = isRTL ? { marginLeft: 12 } : { marginRight: 12 };

  return (
    <TouchableOpacity
      style={[
        styles.medCard,
        rowStyle,
        disabled && styles.medCardDisabled,
        checked && !disabled && styles.medCardActive
      ]}
      onPress={() => !disabled && onToggle(id)}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.checkbox,
          marginEnd,
          checked && !disabled && styles.checkboxActive,
        ]}
      >
        {checked && !disabled && (
          <Icon name="check" color="white" size={16} />
        )}
      </View>
      <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
        <View style={[rowStyle, { alignItems: 'center', gap: 8, flexWrap: 'wrap' }]}>
          <Text style={[styles.medName, alignText]}>{name}</Text>
          {status && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingText}>{status}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.medDetail, alignText]}>
          {prescribedBy} • {prescribedDate}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const RefillRequestScreen = () => {
   const navigation = useNavigation();
   const { t, isRTL } = useLanguage();
   const queryClient = useQueryClient();

   const [selectedMedications, setSelectedMedications] = useState([]);
   const [message, setMessage] = useState('');
   const [isSubmitted, setIsSubmitted] = useState(false);

   const rowStyle = { flexDirection: isRTL ? 'row-reverse' : 'row' };
   const alignText = { textAlign: isRTL ? 'right' : 'left' };

   // API Hooks
   const { data: prescriptions, isLoading: isFetchingPrescriptions } = useListPrescriptionByPatient();
   const { data: pendingData } = usePendingMedications();
   const { mutate: createRefillRequest } = useCreateRefillRequestFromPatient();

   // Refetch data when screen comes into focus
   useFocusEffect(
     React.useCallback(() => {
       invalidateRefillCaches(queryClient);
     }, [queryClient])
   );

   // Process and deduplicate prescriptions
   const prescriptionItems = useMemo(() => {
     const list = prescriptions?.prescriptions || [];
     const pendingList = pendingData?.pendingMedications || [];

     // Build robust matching keys
     const toKey = (formId, rxIndex, drugName) =>
       `${String(formId || '')}_${String(rxIndex ?? 0)}_${String((drugName || '').toString().toLowerCase().trim())}`;

     const pendingKeySet = new Set(
       pendingList.map((m) => toKey(m.encounterFormId, m.prescriptionIndex ?? 0, m.drugName))
     );

     // Map prescriptions with computed IDs and pending status
     const mappedList = list.map((p) => {
       const formId = p.formId || p.encounterFormId || p.form_id || p.formID;
       const rxIndex = p.prescriptionIndex ?? p.index ?? 0;
       const key = toKey(formId, rxIndex, p.drugName);
       return {
         ...p,
         computedId: key,
         isPending: pendingKeySet.has(key),
       };
     });

     // Deduplicate by drug name - keep only the most recent prescription
     const drugMap = new Map();
     mappedList.forEach((prescription) => {
       const drugKey = `${prescription.drugName?.toLowerCase().trim()}_${prescription.dose}${prescription.unit}`;
       const existing = drugMap.get(drugKey);

       if (!existing || new Date(prescription.updatedAt) > new Date(existing.updatedAt)) {
         drugMap.set(drugKey, prescription);
       }
     });

     return Array.from(drugMap.values());
   }, [prescriptions, pendingData]);

   const handleCheckboxChange = (medicationId) => {
     setSelectedMedications(prev => {
       if (prev.includes(medicationId)) {
         return prev.filter(id => id !== medicationId);
       } else {
         return [...prev, medicationId];
       }
     });
   };

   const requestRefill = async () => {
     try {
       if (selectedMedications.length === 0) {
         Alert.alert(
           t.common?.error || 'Error',
           t.refillRequest?.selectMedication || 'Please select at least one medication'
         );
         return;
       }

       if (!message.trim()) {
         Alert.alert(
           t.common?.error || 'Error',
           t.refillRequest?.enterMessage || 'Please enter a message to the physician'
         );
         return;
       }

       setIsSubmitted(true);

       const selectedPrescriptions = prescriptionItems.filter((p) =>
         selectedMedications.includes(p.computedId)
       ) || [];

       if (selectedPrescriptions.length === 0) {
         Alert.alert(
           t.common?.error || 'Error',
           t.refillRequest?.medicationNotFound || 'Selected medications not found'
         );
         setIsSubmitted(false);
         return;
       }

       const medications = selectedPrescriptions.map((prescription) => ({
         encounterFormId: prescription.formId || prescription.encounterFormId || prescription.form_id || prescription.formID,
         prescriptionIndex: prescription.prescriptionIndex ?? prescription.index ?? 0,
         drugName: prescription.drugName,
         dose: prescription.dose,
         unit: prescription.unit,
         frequency: prescription.frequency,
         route: prescription.route,
         duration: prescription.duration,
         quantity: prescription.quantity,
         notes: prescription.notes,
         status: 'Pending',
       }));

       const refillRequestData = {
         providerId: selectedPrescriptions[0].provider.id,
         medications: medications,
         message: message.trim(),
       };

       createRefillRequest(refillRequestData, {
         onSuccess: () => {
           Alert.alert(
             t.common?.success || 'Success',
             t.refillRequest?.requestSubmitted || 'Your refill request has been submitted successfully',
             [
               {
                 text: t.common?.ok || 'OK',
                 onPress: () => {
                   setMessage('');
                   setSelectedMedications([]);
                   invalidateRefillCaches(queryClient);
                   navigation.goBack();
                 }
               }
             ]
           );
         },
         onError: (error) => {
           Alert.alert(
             t.common?.error || 'Error',
             error.message || t.refillRequest?.submitFailed || 'Failed to submit refill request'
           );
         },
         onSettled: () => {
           setIsSubmitted(false);
         },
       });

     } catch (error) {
       Alert.alert(
         t.common?.error || 'Error',
         error.message || t.refillRequest?.generalError || 'An error occurred'
       );
       setIsSubmitted(false);
     }
   };

   return (
      <View style={styles.container}>
         <Header
           title={t.refillRequest?.title || "Request a Refill"}
           showBack
           onBack={() => navigation.goBack()}
         />

         <KeyboardAvoidingView
           behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
           style={{ flex: 1 }}
           keyboardVerticalOffset={0}
         >
           <ScrollView
             contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
             keyboardShouldPersistTaps="handled"
             showsVerticalScrollIndicator={false}
           >
             <Text style={[styles.sectionTitle, alignText]}>
               {t.refillRequest?.selectMedicationTitle || 'Select Medication'}
             </Text>
             <Text style={[styles.subTitle, alignText]}>
               {t.refillRequest?.chooseMedication || 'Choose the medication you need refilled'}
             </Text>

             {isFetchingPrescriptions ? (
               <View style={styles.loadingContainer}>
                 <ActivityIndicator color={COLORS.primary} size="large" />
                 <Text style={styles.loadingText}>
                   {t.refillRequest?.loadingMessage || 'Loading your prescriptions...'}
                 </Text>
               </View>
             ) : prescriptionItems.length === 0 ? (
               <View style={styles.emptyContainer}>
                 <Text style={styles.emptyText}>
                   {t.refillRequest?.noRefillRequestAvailable || 'No prescriptions available for refill'}
                 </Text>
               </View>
             ) : (
               <FlatList
                 data={prescriptionItems}
                 keyExtractor={(item) => item.computedId}
                 renderItem={({ item }) => (
                   <MedicationCheckBox
                     id={item.computedId}
                     name={`${item.drugName} ${item.dose}${item.unit}`}
                     prescribedBy={`${t.refillRequest?.doctorPrefix || 'Dr.'} ${isRTL ? (item.providerNameArabic || item.providerName) : (item.providerNameEnglish || item.providerName)}`}
                     prescribedDate={new Date(item.updatedAt).toISOString().split('T')[0]}
                     checked={selectedMedications.includes(item.computedId)}
                     onToggle={handleCheckboxChange}
                     disabled={item.isPending}
                     status={item.isPending ? t.refillRequest?.pendingRequest || 'Pending' : undefined}
                     isRTL={isRTL}
                   />
                 )}
                 scrollEnabled={false}
                 nestedScrollEnabled={true}
               />
             )}

             {prescriptionItems.length > 0 && (
               <>
                 <Text style={[styles.sectionTitle, alignText, { marginTop: 20 }]}>
                   {t.refillRequest?.messageToPhysician || 'Message to Physician'}
                 </Text>
                 <TextInput
                   style={[styles.textArea, alignText]}
                   placeholder={t.refillRequest?.messagePlaceholder || 'Add notes for the physician...'}
                   multiline
                   numberOfLines={5}
                   value={message}
                   onChangeText={setMessage}
                   placeholderTextColor={COLORS.gray500}
                   textAlignVertical="top"
                 />

                 {selectedMedications.length === 0 && (
                   <Text style={styles.helperText}>
                     {t.refillRequest?.selectAtLeastOne || 'Please select at least one medication'}
                   </Text>
                 )}
               </>
             )}
           </ScrollView>

           <View style={styles.footer}>
             <TouchableOpacity
               style={[
                 styles.submitBtn,
                 (selectedMedications.length === 0 || isSubmitted) && styles.submitBtnDisabled
               ]}
               disabled={selectedMedications.length === 0 || isSubmitted}
               onPress={requestRefill}
             >
               {isSubmitted ? (
                 <ActivityIndicator color="white" size="small" />
               ) : (
                 <Text style={styles.submitText}>
                   {t.refillRequest?.submitRequest || 'Submit Request'}
                 </Text>
               )}
             </TouchableOpacity>
           </View>
         </KeyboardAvoidingView>
      </View>
   );
};

const styles = StyleSheet.create({
   container: { flex: 1, backgroundColor: COLORS.background },

   sectionTitle: {
     fontSize: 16,
     fontWeight: 'bold',
     color: COLORS.textPrimary,
     marginTop: 10,
     marginBottom: 5,
   },
   subTitle: {
     fontSize: 13,
     color: COLORS.gray600,
     marginBottom: 15,
   },

   medCard: {
     alignItems: 'center',
     backgroundColor: COLORS.white,
     padding: 15,
     borderRadius: 16,
     borderWidth: 1,
     borderColor: COLORS.gray200,
     marginBottom: 12,
     shadowColor: COLORS.shadow,
     shadowOpacity: 0.03,
     shadowRadius: 3,
     elevation: 1,
   },
   medCardActive: {
     borderColor: COLORS.primary,
     backgroundColor: COLORS.highlight || '#F0F8FF',
     borderWidth: 2,
   },
   medCardDisabled: {
     opacity: 0.6,
   },

   checkbox: {
     width: 24,
     height: 24,
     borderRadius: 6,
     borderWidth: 2,
     borderColor: COLORS.gray400,
     alignItems: 'center',
     justifyContent: 'center',
   },
   checkboxActive: {
     backgroundColor: COLORS.primary,
     borderColor: COLORS.primary,
   },

   medName: {
     fontSize: 15,
     fontWeight: 'bold',
     color: COLORS.textPrimary,
   },
   medDetail: {
     fontSize: 12,
     color: COLORS.gray600,
     marginTop: 4,
   },

   pendingBadge: {
     backgroundColor: '#FFF3E0',
     paddingHorizontal: 8,
     paddingVertical: 3,
     borderRadius: 8,
   },
   pendingText: {
     color: '#FF9800',
     fontSize: 11,
     fontWeight: '600',
   },

   textArea: {
     backgroundColor: COLORS.white,
     borderRadius: 16,
     padding: 15,
     minHeight: 120,
     borderWidth: 1,
     borderColor: COLORS.gray200,
     marginTop: 10,
     fontSize: 14,
     color: COLORS.textPrimary,
   },

   helperText: {
     marginTop: 10,
     color: COLORS.gray500,
     fontSize: 13,
     textAlign: 'center',
     fontStyle: 'italic',
   },

   loadingContainer: {
     flex: 1,
     justifyContent: 'center',
     alignItems: 'center',
     paddingVertical: 50,
   },
   loadingText: {
     marginTop: 10,
     color: COLORS.gray600,
     fontSize: 14,
   },

   emptyContainer: {
     flex: 1,
     justifyContent: 'center',
     alignItems: 'center',
     paddingVertical: 50,
   },
   emptyText: {
     color: COLORS.gray600,
     fontSize: 15,
     textAlign: 'center',
   },

   footer: {
     padding: 20,
     backgroundColor: COLORS.white,
     borderTopWidth: 1,
     borderTopColor: COLORS.gray200,
     position: 'absolute',
     bottom: 0,
     left: 0,
     right: 0,
   },
   submitBtn: {
     backgroundColor: COLORS.primary,
     padding: 16,
     borderRadius: 12,
     alignItems: 'center',
   },
   submitBtnDisabled: {
     backgroundColor: COLORS.gray300,
     opacity: 0.6,
   },
   submitText: {
     color: COLORS.white,
     fontWeight: 'bold',
     fontSize: 16,
   },
});

export default RefillRequestScreen;
