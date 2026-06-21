import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, TextInput, ScrollView } from 'react-native';
import COLORS from '../constants/colors';

const CancelAppointmentModal = ({ visible, onCancel, onConfirm, isLoading }) => {
  const [reason, setReason] = useState('');
  const [selectedReason, setSelectedReason] = useState(null);

  const predefinedReasons = [
    { id: 1, label: 'Schedule conflict' },
    { id: 2, label: 'Feeling better' },
    { id: 3, label: 'Found alternative provider' },
    { id: 4, label: 'Other' },
  ];

  const handleConfirm = () => {
    const finalReason = selectedReason === 4 ? reason : predefinedReasons.find(r => r.id === selectedReason)?.label;
    onConfirm(finalReason || 'Patient requested cancellation');
    // Reset state after confirm
    setReason('');
    setSelectedReason(null);
  };

  const handleCancel = () => {
    // Reset state when canceling
    setReason('');
    setSelectedReason(null);
    onCancel();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>Cancel Appointment</Text>
            <Text style={styles.subtitle}>Please select a reason (optional):</Text>

            {predefinedReasons.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.reasonBtn, selectedReason === item.id && styles.reasonBtnActive]}
                onPress={() => setSelectedReason(item.id)}
                disabled={isLoading}
              >
                <Text style={[styles.reasonText, selectedReason === item.id && styles.reasonTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}

            {selectedReason === 4 && (
              <TextInput
                style={styles.input}
                placeholder="Please specify..."
                placeholderTextColor={COLORS.gray500}
                value={reason}
                onChangeText={setReason}
                multiline
                numberOfLines={3}
                editable={!isLoading}
              />
            )}

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.cancelBtn, isLoading && { opacity: 0.5 }]}
                onPress={handleCancel}
                disabled={isLoading}
              >
                <Text style={styles.cancelBtnText}>Keep Appointment</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, isLoading && { opacity: 0.5 }]}
                onPress={handleConfirm}
                disabled={isLoading}
              >
                <Text style={styles.confirmBtnText}>
                  {isLoading ? 'Cancelling...' : 'Confirm Cancel'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.gray600,
    marginBottom: 15,
  },
  reasonBtn: {
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderRadius: 8,
    marginBottom: 10,
  },
  reasonBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.promo1,
  },
  reasonText: {
    color: COLORS.gray700,
    fontSize: 14,
  },
  reasonTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
    marginBottom: 10,
    minHeight: 60,
    textAlignVertical: 'top',
    color: COLORS.textPrimary,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  cancelBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray400,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: COLORS.gray700,
    fontWeight: '600',
    fontSize: 14,
  },
  confirmBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: COLORS.error,
    alignItems: 'center',
  },
  confirmBtnText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default CancelAppointmentModal;
