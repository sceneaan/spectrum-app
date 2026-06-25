import React, { useEffect, useMemo, useState } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import moment from 'moment-timezone';
import { useLanguage } from '../store/LanguageContext';
import { AppText, AppButton } from './ui';
import COLORS from '../constants/colors';
import ICONS from '../constants/icons';
import { SPACING, RADIUS, SHADOWS } from '../theme';
import { formatCountdownParts, getAppointmentTiming, padCountdownUnit } from '../utils/sessionTiming';

const CountdownBlock = ({ value, label }) => (
  <View style={styles.countdownBlock}>
    <AppText variant="h2" style={styles.countdownValue}>{value}</AppText>
    <AppText variant="caption" color={COLORS.textSecondary}>{label}</AppText>
  </View>
);

const SessionCountdownHero = ({
  appointment,
  onJoin,
  onViewAppointments,
  onPay,
}) => {
  const { t, isRTL } = useLanguage();
  const rowStyle = { flexDirection: isRTL ? 'row-reverse' : 'row' };
  const align = isRTL ? 'right' : 'left';
  const [tick, setTick] = useState(Date.now());

  const timing = useMemo(
    () => getAppointmentTiming(appointment, tick),
    [appointment, tick],
  );

  useEffect(() => {
    if (!timing.heroState) return undefined;
    const interval = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [timing.heroState]);

  if (!appointment || !timing.heroState) return null;

  const providerName = isRTL
    ? (appointment.provider?.fullNameArabic || appointment.provider?.fullName || appointment.providerName)
    : (appointment.provider?.fullNameEnglish || appointment.provider?.fullName || appointment.providerName);

  const { hours, minutes, seconds } = formatCountdownParts(timing.secondsUntilStart);
  const statusLabel = timing.heroState === 'live'
    ? (t.home?.sessionLive || 'Session in progress')
    : timing.heroState === 'join_ready'
      ? (t.home?.sessionJoinReady || 'Ready to join')
      : (t.home?.sessionStartingSoon || 'Starting soon');

  const joinLabel = timing.isOngoing
    ? (t.home?.joinVideoCall || 'Join Video Call')
    : (t.appointments?.joinWaitingRoom || 'Join Waiting Room');

  return (
    <View style={styles.hero}>
      <View style={[styles.heroTop, rowStyle]}>
        <View style={styles.avatarWrap}>
          <Image
            source={appointment.provider?.profileImage ? { uri: appointment.provider.profileImage } : ICONS.defaultAvatar}
            style={styles.avatar}
          />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="caption" color={COLORS.primaryDark} align={align}>
            {t.home?.upcomingAppointment || 'Your Upcoming Appointment'}
          </AppText>
          <AppText variant="h3" align={align} numberOfLines={1}>{providerName}</AppText>
          <AppText variant="bodySmall" color={COLORS.textSecondary} align={align}>
            {moment(appointment.startTime).format('ddd, MMM D · hh:mm A')}
          </AppText>
        </View>
        <View style={styles.statusPill}>
          <AppText variant="caption" style={styles.statusPillText}>{statusLabel}</AppText>
        </View>
      </View>

      {timing.heroState === 'upcoming' && (
        <View style={[styles.countdownRow, rowStyle]}>
          <CountdownBlock value={padCountdownUnit(hours)} label={t.home?.countdownHours || 'Hrs'} />
          <AppText variant="h2" style={styles.countdownSep}>:</AppText>
          <CountdownBlock value={padCountdownUnit(minutes)} label={t.home?.countdownMinutes || 'Min'} />
          <AppText variant="h2" style={styles.countdownSep}>:</AppText>
          <CountdownBlock value={padCountdownUnit(seconds)} label={t.home?.countdownSeconds || 'Sec'} />
        </View>
      )}

      {timing.isRescheduledUnpaid ? (
        <AppButton
          title={t.home?.completePayment || 'Complete payment'}
          onPress={onPay}
          size="md"
          style={styles.heroBtn}
        />
      ) : timing.showVideoButton ? (
        <AppButton
          title={joinLabel}
          onPress={onJoin}
          size="md"
          style={styles.heroBtn}
        />
      ) : (
        <AppButton
          title={t.home?.viewDetails || 'View Details'}
          onPress={onViewAppointments}
          variant="outline"
          size="md"
          style={styles.heroBtn}
        />
      )}

      {timing.heroState === 'join_ready' && !timing.isOngoing && (
        <AppText variant="caption" color={COLORS.textSecondary} align="center" style={styles.hint}>
          {t.appointments?.earlyJoinNote || "You're in the waiting room — the provider will join at appointment time"}
        </AppText>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  hero: {
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.lg,
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primary,
    ...SHADOWS.sm,
  },
  heroTop: {
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  avatarWrap: {
    padding: 2,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.white,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  statusPill: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.pill,
  },
  statusPillText: {
    color: COLORS.primaryDark,
    fontWeight: '700',
  },
  countdownRow: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  countdownBlock: {
    minWidth: 64,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.white,
  },
  countdownValue: {
    color: COLORS.primaryDark,
    fontVariant: ['tabular-nums'],
  },
  countdownSep: {
    color: COLORS.primaryDark,
    marginBottom: SPACING.lg,
  },
  heroBtn: {
    marginTop: SPACING.xs,
  },
  hint: {
    marginTop: SPACING.sm,
  },
});

export default SessionCountdownHero;
