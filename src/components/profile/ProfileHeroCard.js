import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import COLORS from '../../constants/colors';
import ICONS from '../../constants/icons';
import RiyalText from '../RiyalText';

const ProfileHeroCard = ({ profile, isRTL, t }) => {
    const rowStyle = { flexDirection: isRTL ? 'row-reverse' : 'row' };
    const alignText = { textAlign: isRTL ? 'right' : 'left' };

    const name = isRTL
        ? (profile?.fullNameArabic || profile?.fullName)
        : (profile?.fullNameEnglish || profile?.fullName);

    const specialty = isRTL
        ? (profile?.specialty?.nameArabic || profile?.specialty?.nameEnglish)
        : (profile?.specialty?.nameEnglish || profile?.specialty?.nameArabic);

    const headline = isRTL
        ? (profile?.headlineArabic || profile?.headline || profile?.professionalSummaryArabic)
        : (profile?.headlineEnglish || profile?.headline || profile?.professionalSummaryEnglish);

    const languages = profile?.spokenLanguages || [];
    const sessionTypes = profile?.sessionTypes || [];
    const ratingObj = profile?.rating;
    const rating = typeof ratingObj === 'object' ? ratingObj?.average : ratingObj;
    const experience = profile?.experience;
    const priceRange = profile?.priceRange || profile?.slotPrice;

    const getLanguageLabel = (lang) => {
        const map = { ar: isRTL ? 'العربية' : 'Arabic', en: isRTL ? 'الإنجليزية' : 'English', arabic: isRTL ? 'العربية' : 'Arabic', english: isRTL ? 'الإنجليزية' : 'English' };
        return map[(lang || '').toLowerCase()] || lang;
    };

    return (
        <View style={styles.card}>
            {/* Top section: image + basic info */}
            <View style={[rowStyle, { alignItems: 'center' }]}>
                <Image
                    source={profile?.profileImage ? { uri: profile.profileImage } : ICONS.defaultAvatar}
                    style={styles.avatar}
                />
                <View style={[styles.infoColumn, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                    <View style={[rowStyle, { alignItems: 'center', gap: 6 }]}>
                        <Text style={[styles.name, alignText]} numberOfLines={1}>
                            {name || (t?.common?.doctor || 'Doctor')}
                        </Text>
                        {profile?.isVerified && (
                            <Image source={ICONS.verified} style={styles.verifiedIcon} />
                        )}
                    </View>
                    {specialty ? (
                        <Text style={[styles.specialty, alignText]}>{specialty}</Text>
                    ) : null}
                    {headline ? (
                        <Text style={[styles.headline, alignText]} numberOfLines={2}>
                            {headline}
                        </Text>
                    ) : null}
                </View>
            </View>

            {/* Meta row: languages, session types */}
            <View style={[styles.metaRow, rowStyle]}>
                {languages.length > 0 && (
                    <View style={[rowStyle, { alignItems: 'center', gap: 4 }]}>
                        <Image source={ICONS.globe} style={styles.metaIcon} />
                        <Text style={styles.metaText}>
                            {languages.map(l => getLanguageLabel(l)).join(', ')}
                        </Text>
                    </View>
                )}
                {sessionTypes.length > 0 && (
                    <View style={[rowStyle, { alignItems: 'center', gap: 4 }]}>
                        {sessionTypes.map((st, i) => {
                            const typeName = typeof st === 'string' ? st : st.name;
                            const lower = (typeName || '').toLowerCase();
                            let icon = ICONS.video;
                            if (lower.includes('audio') || lower.includes('voice')) icon = ICONS.audio;
                            if (lower.includes('chat') || lower.includes('text')) icon = ICONS.chat;
                            return <Image key={i} source={icon} style={styles.metaIcon} />;
                        })}
                    </View>
                )}
            </View>

            {/* Stats row */}
            <View style={[styles.statsRow, isRTL && { flexDirection: 'row-reverse' }]}>
                <View style={styles.statItem}>
                    <View style={[rowStyle, { alignItems: 'center', gap: 4 }]}>
                        <Image source={ICONS.star} style={[styles.statIcon, { tintColor: COLORS.warning }]} />
                        <Text style={styles.statVal}>{rating || (t?.findTherapist?.new || 'New')}</Text>
                    </View>
                    <Text style={styles.statLabel}>{t?.therapistProfile?.rating || 'Rating'}</Text>
                </View>
                <View style={styles.dividerV} />
                <View style={styles.statItem}>
                    <Text style={styles.statVal}>{experience || '0'}+</Text>
                    <Text style={styles.statLabel}>{t?.doctorProfile?.years || 'Years'}</Text>
                </View>
                <View style={styles.dividerV} />
                <View style={styles.statItem}>
                    {priceRange ? (
                        <RiyalText text={typeof priceRange === 'object' ? `${priceRange.min}-${priceRange.max}` : priceRange} textStyle={styles.statVal} size={12} />
                    ) : (
                        <Text style={styles.statVal}>-</Text>
                    )}
                    <Text style={styles.statLabel}>{t?.therapistProfile?.price || 'Price'}</Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        elevation: 2,
        shadowColor: COLORS.shadow,
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6,
        padding: 20,
        margin: 20,
        marginBottom: 10,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 16,
        backgroundColor: COLORS.gray200,
    },
    infoColumn: {
        flex: 1,
        marginHorizontal: 14,
    },
    name: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
    },
    verifiedIcon: {
        width: 18,
        height: 18,
        tintColor: COLORS.primary,
    },
    specialty: {
        fontSize: 14,
        color: COLORS.primary,
        fontWeight: '600',
        marginTop: 2,
    },
    headline: {
        fontSize: 13,
        color: COLORS.textSecondary,
        fontStyle: 'italic',
        marginTop: 4,
        lineHeight: 18,
    },
    metaRow: {
        marginTop: 14,
        gap: 16,
        flexWrap: 'wrap',
    },
    metaIcon: {
        width: 16,
        height: 16,
        tintColor: COLORS.gray500,
    },
    metaText: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    statsRow: {
        flexDirection: 'row',
        marginTop: 16,
        backgroundColor: COLORS.promo1,
        borderRadius: 12,
        padding: 14,
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statVal: {
        fontWeight: 'bold',
        fontSize: 15,
        color: COLORS.darkSlateBlue,
    },
    statLabel: {
        fontSize: 11,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    statIcon: {
        width: 14,
        height: 14,
    },
    dividerV: {
        width: 1,
        height: 30,
        backgroundColor: COLORS.gray300,
    },
});

export default React.memo(ProfileHeroCard);
