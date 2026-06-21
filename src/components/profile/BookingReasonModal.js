import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Modal from 'react-native-modal';
import COLORS from '../../constants/colors';

const BookingReasonModal = ({ visible, onClose, onSubmit, isLoading, isRTL, t }) => {
    const [reason, setReason] = useState('');
    const alignText = { textAlign: isRTL ? 'right' : 'left' };

    const handleSubmit = () => {
        if (reason.trim()) {
            onSubmit(reason.trim());
        }
    };

    const handleClose = () => {
        setReason('');
        onClose();
    };

    return (
        <Modal
            isVisible={visible}
            onBackdropPress={handleClose}
            style={styles.modal}
            avoidKeyboard
        >
            <View style={styles.container}>
                <View style={styles.handle} />
                <Text style={[styles.title, alignText]}>
                    {t?.therapistProfile?.reasonForVisit || 'Reason for Visit'}
                </Text>
                <Text style={[styles.subtitle, alignText]}>
                    {t?.therapistProfile?.reasonDescription || 'Please describe why you are seeking this appointment.'}
                </Text>

                <TextInput
                    style={[styles.input, alignText]}
                    placeholder={t?.therapistProfile?.reasonPlaceholder || 'Describe your reason for visit or symptoms...'}
                    placeholderTextColor={COLORS.gray500}
                    value={reason}
                    onChangeText={setReason}
                    multiline
                    numberOfLines={5}
                    maxLength={500}
                    textAlignVertical="top"
                />

                <Text style={[styles.charCount, alignText]}>
                    {reason.length}/500
                </Text>

                <TouchableOpacity
                    style={[styles.submitBtn, (!reason.trim() || isLoading) && styles.submitBtnDisabled]}
                    onPress={handleSubmit}
                    disabled={!reason.trim() || isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                        <Text style={styles.submitBtnText}>
                            {t?.therapistProfile?.confirmBooking || 'Confirm Booking'}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modal: {
        justifyContent: 'flex-end',
        margin: 0,
    },
    container: {
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: COLORS.gray300,
        alignSelf: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginBottom: 16,
        lineHeight: 18,
    },
    input: {
        backgroundColor: COLORS.gray100,
        borderRadius: 12,
        padding: 14,
        minHeight: 120,
        fontSize: 14,
        color: COLORS.textPrimary,
        borderWidth: 1,
        borderColor: COLORS.gray200,
    },
    charCount: {
        fontSize: 12,
        color: COLORS.gray500,
        marginTop: 6,
        marginBottom: 16,
    },
    submitBtn: {
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
    },
    submitBtnDisabled: {
        backgroundColor: COLORS.disabled,
    },
    submitBtnText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default BookingReasonModal;
