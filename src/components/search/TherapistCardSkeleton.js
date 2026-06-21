import React from 'react';
import { View, StyleSheet } from 'react-native';
import COLORS from '../../constants/colors';
import Skeleton from '../Skeleton';

const TherapistCardSkeleton = () => {
    return (
        <View style={styles.card}>
            <View style={styles.accentBar} />
            <View style={styles.cardContent}>
                <View style={styles.row}>
                    {/* Profile image skeleton */}
                    <Skeleton width={80} height={100} style={{ borderRadius: 12 }} />

                    {/* Content column */}
                    <View style={styles.contentColumn}>
                        <Skeleton width={140} height={16} style={{ marginBottom: 6 }} />
                        <Skeleton width={100} height={12} style={{ marginBottom: 6 }} />
                        <Skeleton width={'100%'} height={12} style={{ marginBottom: 4 }} />
                        <Skeleton width={'80%'} height={12} style={{ marginBottom: 6 }} />
                        <View style={styles.chipRow}>
                            <Skeleton width={60} height={20} style={{ borderRadius: 10 }} />
                            <Skeleton width={70} height={20} style={{ borderRadius: 10 }} />
                        </View>
                    </View>
                </View>

                {/* Footer skeleton */}
                <View style={styles.footer}>
                    <Skeleton width={100} height={20} style={{ borderRadius: 8 }} />
                    <Skeleton width={60} height={18} />
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        elevation: 3,
        shadowColor: COLORS.shadow,
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 8,
        marginBottom: 14,
        overflow: 'hidden',
    },
    accentBar: {
        height: 4,
        backgroundColor: COLORS.gray200,
    },
    cardContent: {
        padding: 14,
    },
    row: {
        flexDirection: 'row',
    },
    contentColumn: {
        flex: 1,
        marginLeft: 12,
    },
    chipRow: {
        flexDirection: 'row',
        gap: 6,
        marginTop: 4,
    },
    footer: {
        marginTop: 12,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: COLORS.gray100,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
});

export default TherapistCardSkeleton;
