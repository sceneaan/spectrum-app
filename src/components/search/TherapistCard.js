import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import COLORS from '../../constants/colors';
import ICONS from '../../constants/icons';
import RiyalText from '../RiyalText';
import { RADIUS, SHADOWS, cardBorder } from '../../theme';
import { formatNextAvailabilityLabel } from '../../utils/formatAvailability';

const TherapistCard = ({ provider, isRTL, t, onPress, style }) => {
    const rowStyle = { flexDirection: isRTL ? 'row-reverse' : 'row' };
    const alignText = { textAlign: isRTL ? 'right' : 'left' };

    const name = isRTL
        ? (provider.fullNameArabic || provider.fullName)
        : (provider.fullNameEnglish || provider.fullName);

    const specialty = isRTL
        ? (provider.specialty?.nameArabic || provider.specialty?.nameEnglish)
        : (provider.specialty?.nameEnglish || provider.specialty?.nameArabic);

    const headline = isRTL
        ? (provider.headlineArabic || provider.headline || provider.professionalSummaryArabic || provider.professionalSummary)
        : (provider.headlineEnglish || provider.headline || provider.professionalSummaryEnglish || provider.professionalSummary);

    const issues = provider.issueCategories || provider.issues || [];
    const approaches = provider.therapeuticApproaches || provider.approaches || [];
    const ageGroups = provider.clientAgeGroups || provider.ageGroups || [];
    const sessionTypes = provider.sessionTypes || [];
    const nextAvailable = provider.nextAvailableSlot || provider.slots?.find(s => s.slotCount > 0)?.date;
    const nextAvailableLabel = formatNextAvailabilityLabel(nextAvailable, {
        todayLabel: t?.findTherapist?.availableToday || t?.home?.today || t?.providerDashboard?.today || 'Today',
        tomorrowLabel: t?.findTherapist?.tomorrow || 'Tomorrow',
        nextPrefix: t?.findTherapist?.nextAvailable || 'Next:',
        locale: isRTL ? 'ar' : 'en',
    });
    const ratingObj = provider.rating;
    const rating = typeof ratingObj === 'object' ? ratingObj?.average : ratingObj;
    const reviewCount = typeof ratingObj === 'object' ? ratingObj?.reviewCount : 0;
    const experience = provider.experience;
    const priceRange = provider.priceRange;
    const price = priceRange?.min || provider.slotPrice || provider.price;

    const displayIssues = issues.slice(0, 2);
    const extraIssueCount = issues.length - 2;

    const getSessionIcon = (type) => {
        const lower = (type || '').toLowerCase();
        if (lower.includes('video')) return ICONS.video;
        if (lower.includes('audio') || lower.includes('voice')) return ICONS.audio;
        if (lower.includes('chat') || lower.includes('text')) return ICONS.chat;
        return null;
    };

    return (
        <TouchableOpacity style={[styles.card, style]} onPress={onPress} activeOpacity={0.7}>
            {/* Top accent bar */}
            <View style={styles.accentBar} />

            <View style={styles.cardContent}>
                {/* Main row: image + content */}
                <View style={[rowStyle, { alignItems: 'flex-start' }]}>
                    {/* Profile image */}
                    <View style={styles.imageContainer}>
                        <Image
                            source={provider.profileImage ? { uri: provider.profileImage } : ICONS.defaultAvatar}
                            style={styles.profileImage}
                        />
                        {provider.hasIntroVideo && (
                            <View style={styles.playOverlay}>
                                <Image source={ICONS.play} style={styles.playIcon} />
                            </View>
                        )}
                    </View>

                    {/* Content column */}
                    <View style={[styles.contentColumn, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                        {/* Name + experience badge */}
                        <View style={[rowStyle, { alignItems: 'center', flexWrap: 'wrap', gap: 6 }]}>
                            <Text style={[styles.name, alignText]} numberOfLines={1}>
                                {name || (t?.common?.doctor || 'Doctor')}
                            </Text>
                            {experience ? (
                                <View style={styles.experienceBadge}>
                                    <Text style={styles.experienceText}>
                                        {experience} {t?.doctorCard?.experience || 'yrs exp'}
                                    </Text>
                                </View>
                            ) : null}
                        </View>

                        {/* Specialty */}
                        {specialty ? (
                            <Text style={[styles.specialty, alignText]} numberOfLines={1}>
                                {specialty}
                            </Text>
                        ) : null}

                        {/* Headline */}
                        {headline ? (
                            <Text style={[styles.headline, alignText]} numberOfLines={2}>
                                {headline}
                            </Text>
                        ) : null}

                        {/* Rating */}
                        <View style={[rowStyle, { alignItems: 'center', marginTop: 4, gap: 4 }]}>
                            <Image source={ICONS.star} style={styles.starIcon} />
                            <Text style={styles.ratingText}>
                                {rating ? `${rating}` : (t?.findTherapist?.new || 'New')}
                                {reviewCount > 0 ? ` (${reviewCount})` : ''}
                            </Text>
                        </View>

                        {/* Issue chips */}
                        {displayIssues.length > 0 && (
                            <View style={[rowStyle, { flexWrap: 'wrap', gap: 4, marginTop: 6 }]}>
                                {displayIssues.map((issue, i) => (
                                    <View key={i} style={styles.issueChip}>
                                        <Text style={styles.issueChipText} numberOfLines={1}>
                                            {isRTL ? (issue.nameArabic || issue.nameEnglish || issue) : (issue.nameEnglish || issue.nameArabic || issue)}
                                        </Text>
                                    </View>
                                ))}
                                {extraIssueCount > 0 && (
                                    <View style={styles.issueChip}>
                                        <Text style={styles.issueChipText}>+{extraIssueCount}</Text>
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Approaches with icon */}
                        {approaches.length > 0 && (
                            <View style={[rowStyle, { alignItems: 'center', gap: 4, marginTop: 4 }]}>
                                <Image source={ICONS.therapy} style={styles.metaIcon} />
                                <Text style={styles.metaText} numberOfLines={1}>
                                    {approaches.slice(0, 2).map(a => isRTL ? (a.nameArabic || a.nameEnglish || a) : (a.nameEnglish || a.nameArabic || a)).join(', ')}
                                </Text>
                            </View>
                        )}

                        {/* Age groups with icon */}
                        {ageGroups.length > 0 && (
                            <View style={[rowStyle, { alignItems: 'center', gap: 4, marginTop: 3 }]}>
                                <Image source={ICONS.people} style={styles.metaIcon} />
                                <Text style={styles.metaText} numberOfLines={1}>
                                    {ageGroups.slice(0, 2).map(a => isRTL ? (a.nameArabic || a.nameEnglish || a) : (a.nameEnglish || a.nameArabic || a)).join(', ')}
                                </Text>
                            </View>
                        )}

                        {/* Session types with icon + label */}
                        {sessionTypes.length > 0 && (
                            <View style={[rowStyle, { gap: 10, marginTop: 6 }]}>
                                {sessionTypes.map((type, i) => {
                                    const typeName = typeof type === 'string' ? type : type.name;
                                    const icon = getSessionIcon(typeName);
                                    const label = (typeName || '').charAt(0).toUpperCase() + (typeName || '').slice(1);
                                    return icon ? (
                                        <View key={i} style={[rowStyle, { alignItems: 'center', gap: 3 }]}>
                                            <Image source={icon} style={styles.sessionIcon} />
                                            <Text style={styles.sessionLabel}>{label}</Text>
                                        </View>
                                    ) : null;
                                })}
                            </View>
                        )}
                    </View>
                </View>

                {/* Footer: next available + view profile */}
                <View style={[styles.footer, rowStyle]}>
                    {nextAvailableLabel ? (
                        <View style={styles.nextAvailBadge}>
                            <Image source={ICONS.calendar} style={styles.nextAvailIcon} />
                            <Text style={styles.nextAvailText}>
                                {nextAvailableLabel}
                            </Text>
                        </View>
                    ) : (
                        <View />
                    )}
                    <TouchableOpacity style={[rowStyle, { alignItems: 'center', gap: 4 }]} onPress={onPress} activeOpacity={0.7}>
                        <Text style={styles.viewProfileText}>
                            {t?.findTherapist?.viewProfile || 'View Profile'}
                        </Text>
                        <Image source={ICONS.chevronRight} style={styles.viewProfileIcon} />
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg,
        marginBottom: 14,
        overflow: 'hidden',
        ...SHADOWS.sm,
        ...cardBorder,
    },
    accentBar: {
        height: 4,
        backgroundColor: COLORS.primary,
    },
    cardContent: {
        padding: 14,
    },
    imageContainer: {
        position: 'relative',
    },
    profileImage: {
        width: 80,
        height: 100,
        borderRadius: 12,
        backgroundColor: COLORS.gray200,
    },
    playOverlay: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    playIcon: {
        width: 12,
        height: 12,
        tintColor: COLORS.white,
    },
    contentColumn: {
        flex: 1,
        marginHorizontal: 12,
    },
    name: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
    },
    experienceBadge: {
        backgroundColor: COLORS.promo1,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    experienceText: {
        fontSize: 10,
        color: COLORS.primary,
        fontWeight: '600',
    },
    specialty: {
        fontSize: 13,
        color: COLORS.primary,
        fontWeight: '600',
        marginTop: 2,
    },
    headline: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginTop: 2,
        lineHeight: 18,
    },
    starIcon: {
        width: 12,
        height: 12,
        tintColor: COLORS.warning,
    },
    ratingText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
    },
    issueChip: {
        backgroundColor: COLORS.lavender,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
    },
    issueChipText: {
        fontSize: 10,
        color: COLORS.darkSlateBlue,
        fontWeight: '500',
    },
    metaIcon: {
        width: 14,
        height: 14,
        tintColor: COLORS.gray500,
    },
    metaText: {
        fontSize: 11,
        color: COLORS.textSecondary,
        flex: 1,
    },
    sessionIcon: {
        width: 14,
        height: 14,
        tintColor: COLORS.gray500,
    },
    sessionLabel: {
        fontSize: 11,
        color: COLORS.textSecondary,
    },
    footer: {
        marginTop: 12,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: COLORS.gray100,
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    nextAvailBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: COLORS.secureBg,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.success + '30',
    },
    nextAvailIcon: {
        width: 12,
        height: 12,
        tintColor: COLORS.success,
    },
    nextAvailText: {
        fontSize: 11,
        color: COLORS.success,
        fontWeight: '600',
    },
    priceText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    viewProfileText: {
        fontSize: 13,
        color: COLORS.primary,
        fontWeight: '600',
    },
    viewProfileIcon: {
        width: 10,
        height: 10,
        tintColor: COLORS.primary,
    },
});

export default React.memo(TherapistCard);
