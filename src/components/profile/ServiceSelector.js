import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import Modal from 'react-native-modal';
import COLORS from '../../constants/colors';
import ICONS from '../../constants/icons';
import RiyalText from '../RiyalText';
import { Image } from 'react-native';

const ServiceSelector = ({ services, selectedService, onSelect, isRTL, t }) => {
    const [visible, setVisible] = useState(false);
    const rowStyle = { flexDirection: isRTL ? 'row-reverse' : 'row' };
    const alignText = { textAlign: isRTL ? 'right' : 'left' };

    const getServiceName = (service) => {
        if (!service) return t?.therapistProfile?.selectService || 'Select Service';
        const svc = service.service || service;
        return isRTL
            ? (svc.nameArabic || svc.nameEnglish || svc.name || service.nameArabic || service.nameEnglish)
            : (svc.nameEnglish || svc.nameArabic || svc.name || service.nameEnglish || service.nameArabic);
    };

    const getServicePrice = (service) => service?.slotPrice || service?.price;
    const getServiceDuration = (service) => service?.slotDuration || service?.duration;

    return (
        <>
            <TouchableOpacity
                style={[styles.selector, rowStyle]}
                onPress={() => setVisible(true)}
                activeOpacity={0.7}
            >
                <View style={{ flex: 1 }}>
                    <Text style={[styles.selectorLabel, alignText]}>
                        {t?.therapistProfile?.service || 'Service'}
                    </Text>
                    <Text style={[styles.selectorValue, alignText]} numberOfLines={1}>
                        {getServiceName(selectedService)}
                    </Text>
                    {getServicePrice(selectedService) && (
                        <RiyalText text={getServicePrice(selectedService)} textStyle={styles.selectorPrice} size={12} />
                    )}
                </View>
                <Image
                    source={ICONS.chevronDown}
                    style={[styles.chevron, isRTL && { transform: [{ scaleX: -1 }] }]}
                />
            </TouchableOpacity>

            <Modal
                isVisible={visible}
                onBackdropPress={() => setVisible(false)}
                onSwipeComplete={() => setVisible(false)}
                swipeDirection="down"
                style={styles.modal}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.handle} />
                    <Text style={[styles.modalTitle, alignText]}>
                        {t?.therapistProfile?.selectService || 'Select Service'}
                    </Text>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {(services || []).map((service, index) => {
                            const isSelected = selectedService?.id === service.id || selectedService?._id === service._id;
                            return (
                                <TouchableOpacity
                                    key={service.id || service._id || index}
                                    style={[styles.serviceItem, isSelected && styles.serviceItemActive, rowStyle]}
                                    onPress={() => {
                                        onSelect(service);
                                        setVisible(false);
                                    }}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.serviceName, alignText, isSelected && styles.serviceNameActive]}>
                                            {getServiceName(service)}
                                        </Text>
                                        {getServiceDuration(service) && (
                                            <Text style={[styles.serviceDuration, alignText, isSelected && styles.serviceDurationActive]}>
                                                {getServiceDuration(service)} {t?.therapistProfile?.minutes || 'min'}
                                            </Text>
                                        )}
                                    </View>
                                    <View style={[rowStyle, { alignItems: 'center', gap: 8 }]}>
                                        {getServicePrice(service) && (
                                            <RiyalText text={getServicePrice(service)} textStyle={[styles.servicePrice, isSelected && styles.servicePriceActive]} size={12} />
                                        )}
                                        <View style={[styles.radioOuter, isSelected && styles.radioOuterActive]}>
                                            {isSelected && <View style={styles.radioInner} />}
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    selector: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: COLORS.gray200,
        alignItems: 'center',
    },
    selectorLabel: {
        fontSize: 11,
        color: COLORS.textSecondary,
        marginBottom: 2,
    },
    selectorValue: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    selectorPrice: {
        fontSize: 13,
        color: COLORS.primary,
        fontWeight: '600',
        marginTop: 2,
    },
    chevron: {
        width: 16,
        height: 16,
        tintColor: COLORS.gray500,
    },
    modal: {
        justifyContent: 'flex-end',
        margin: 0,
    },
    modalContainer: {
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        maxHeight: '60%',
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: COLORS.gray300,
        alignSelf: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        marginBottom: 16,
    },
    serviceItem: {
        paddingVertical: 14,
        paddingHorizontal: 14,
        alignItems: 'center',
        borderRadius: 10,
        marginBottom: 6,
        backgroundColor: COLORS.white,
        borderWidth: 1.5,
        borderColor: COLORS.gray200,
    },
    serviceItemActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    serviceName: {
        fontSize: 15,
        color: COLORS.textPrimary,
        fontWeight: '500',
    },
    serviceNameActive: {
        color: COLORS.white,
        fontWeight: '700',
    },
    serviceDuration: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    serviceDurationActive: {
        color: COLORS.white + 'CC',
    },
    servicePrice: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    servicePriceActive: {
        color: COLORS.white,
    },
    radioOuter: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: COLORS.gray300,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioOuterActive: {
        borderColor: COLORS.white,
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: COLORS.white,
    },
});

export default ServiceSelector;
