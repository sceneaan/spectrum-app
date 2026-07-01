import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Image, StyleSheet } from 'react-native';
import FastImage from 'react-native-fast-image';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../store/LanguageContext';
import { useAuthStore } from '../store/authStore';
import { useGetUserData } from '../api/services/User.Service';
import { useGetUnreadCount } from '../api/services/Notification.Service';
import { LangPill, AppText } from './ui';
import ICONS from '../constants/icons';
import COLORS from '../constants/colors';
import { isProviderRole, isAdminRole, isPatientRole } from '../utils/videoAccess';
import { SPACING, RADIUS, SHADOWS } from '../theme';

const HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };
const SPECTRUM_ICON = require('../assets/images/spectrum_icon.png');

const Header = ({ showBack, onBack, title, showProfile }) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { t, isRTL, toggleLang, lang } = useLanguage();
  const { user, isAuthenticated } = useAuthStore();
  const { data: userData } = useGetUserData();
  const { data: unreadCount = 0 } = useGetUnreadCount();

  const [profileImageUrl, setProfileImageUrl] = useState(null);

  useEffect(() => {
    const loadImage = async () => {
      const data = userData || user;
      if (!isAuthenticated || !data) return;

      if (data.profileImageFileId) {
        try {
          const { getPrivateFileAsBase64 } = require('../api/services/Upload.Service');
          const base64 = await getPrivateFileAsBase64(data.profileImageFileId);
          if (base64) {
            setProfileImageUrl(base64);
            return;
          }
        } catch (e) {
          // fall through
        }
      }

      if (data.profileImage) {
        setProfileImageUrl(data.profileImage);
      }
    };

    loadImage();
  }, [isAuthenticated, userData?.profileImageFileId, userData?.profileImage, user?.profileImage]);

  const rowStyle = { flexDirection: isRTL ? 'row-reverse' : 'row' };
  const alignText = isRTL ? 'right' : 'left';

  const goToProfile = () => {
    if (isAdminRole(user)) {
      navigation.navigate('AdminProfile');
    } else if (isProviderRole(user)) {
      navigation.navigate('ProviderProfile');
    } else {
      navigation.navigate('Profile');
    }
  };
  const goToNotifications = () => navigation.navigate('Notifications');

  const profile = userData || user;
  const getFirstName = () => {
    const name = isRTL
      ? (profile?.fullNameArabic || profile?.fullName || profile?.name || '')
      : (profile?.fullNameEnglish || profile?.fullName || profile?.name || '');
    return name.split(' ')[0] || profile?.fullName || profile?.name || 'User';
  };

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    const h = t.home || {};
    if (hour < 12) return h.greetingMorning || h.welcome || 'Good morning';
    if (hour < 17) return h.greetingAfternoon || h.welcome || 'Good afternoon';
    return h.greetingEvening || h.welcome || 'Good evening';
  };

  const getWelcomeCaption = () => {
    if (isAdminRole(user)) {
      return t.adminDashboard?.greeting || 'Operations dashboard';
    }
    if (isProviderRole(user)) {
      return t.providerDashboard?.greeting || t.home?.welcome || 'Welcome back';
    }
    return getTimeGreeting();
  };

  const displayName = isAuthenticated
    ? (isPatientRole(user) ? getFirstName() : (profile?.fullName || profile?.name || 'User'))
    : (t.home?.guestTagline || 'Care that fits your life');
  const guestCaption = t.home?.guestWelcomeLabel || 'Spectrum Clinics';

  const displayAvatar = (isAuthenticated && profileImageUrl)
    ? { uri: profileImageUrl }
    : (isAuthenticated ? ICONS.defaultAvatar : null);

  const handleProfilePress = () => {
    goToProfile();
  };
  const handleBackPress = () => {
    if (onBack) {
      onBack();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };
  const onlineDotPosition = isRTL ? { left: 2 } : { right: 2 };

  const profileBlock = isAuthenticated ? (
    <TouchableOpacity
      style={[rowStyle, { alignItems: 'center', flex: 1 }]}
      onPress={handleProfilePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={t.accessibility?.viewProfile || 'View profile'}
    >
      <View style={styles.avatarRing}>
        {typeof displayAvatar === 'object' && displayAvatar?.uri && !displayAvatar.uri.startsWith('data:') ? (
          <FastImage
            source={{ uri: displayAvatar.uri, priority: FastImage.priority.high, cache: FastImage.cacheControl.immutable }}
            style={styles.avatar}
            resizeMode={FastImage.resizeMode.cover}
          />
        ) : (
          <Image source={displayAvatar || ICONS.defaultAvatar} style={styles.avatar} />
        )}
        <View style={[styles.onlineDot, onlineDotPosition]} />
      </View>
      <View style={{ marginHorizontal: SPACING.md, flex: 1 }}>
        <AppText variant="caption" align={alignText} color={COLORS.textSecondary}>
          {getWelcomeCaption()}
        </AppText>
        <AppText variant="bodyMedium" align={alignText} numberOfLines={2}>
          {displayName}
        </AppText>
      </View>
    </TouchableOpacity>
  ) : (
    <View style={[rowStyle, { alignItems: 'center', flex: 1 }]} accessibilityRole="header">
      <View style={styles.avatarRing}>
        <View style={styles.logoWrap}>
          <Image source={SPECTRUM_ICON} style={styles.headerLogo} resizeMode="contain" />
        </View>
      </View>
      <View style={{ marginHorizontal: SPACING.md, flex: 1 }}>
        <AppText variant="caption" align={alignText} color={COLORS.primaryDark}>
          {guestCaption}
        </AppText>
        <AppText variant="bodyMedium" align={alignText} numberOfLines={2}>
          {displayName}
        </AppText>
      </View>
    </View>
  );

  return (
    <View style={[
      styles.container,
      rowStyle,
      { paddingTop: insets.top + SPACING.md },
    ]}>
      <View style={[styles.leftContainer, rowStyle]}>
        {showBack ? (
          <TouchableOpacity
            onPress={handleBackPress}
            style={[styles.iconBtn, isRTL && { transform: [{ rotate: '180deg' }] }]}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel={t.accessibility?.goBack || 'Go back'}
          >
            <Image source={ICONS.back} style={styles.icon} />
          </TouchableOpacity>
        ) : showProfile ? (
          profileBlock
        ) : (
          <AppText variant="h3" align={alignText} style={{ flex: 1 }}>
            {title}
          </AppText>
        )}
      </View>

      <View style={[styles.rightContainer, rowStyle]}>
        <LangPill
          lang={lang}
          onPress={toggleLang}
          accessibilityLabel={lang === 'en'
            ? (t.accessibility?.switchToArabic || 'Switch to Arabic')
            : (t.accessibility?.switchToEnglish || 'Switch to English')}
        />

        {isAuthenticated && !showBack && (
          <TouchableOpacity
            style={styles.bellBtn}
            onPress={goToNotifications}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel={t.accessibility?.notifications || 'Notifications'}
          >
            <Image source={ICONS.bell} style={styles.bellIcon} />
            {unreadCount > 0 && (
              <View style={[styles.badge, isRTL ? { left: 6 } : { right: 6 }]}>
                <AppText variant="caption" style={styles.badgeText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </AppText>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    ...SHADOWS.sm,
    zIndex: 100,
  },
  leftContainer: { flex: 1, alignItems: 'center', justifyContent: 'flex-start' },
  rightContainer: { alignItems: 'center', gap: SPACING.sm },
  avatarRing: {
    padding: 2,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primaryLight,
  },
  logoWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  headerLogo: {
    width: 36,
    height: 36,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    width: 12,
    height: 12,
    backgroundColor: COLORS.success,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  icon: { width: 24, height: 24, tintColor: COLORS.textPrimary },
  iconBtn: {
    padding: SPACING.sm,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.md,
  },
  bellBtn: {
    padding: SPACING.sm,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.pill,
    marginStart: SPACING.xs,
  },
  bellIcon: { width: 24, height: 24, tintColor: COLORS.textPrimary },
  badge: {
    position: 'absolute',
    top: 2,
    minWidth: 18,
    height: 18,
    backgroundColor: COLORS.danger,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
});

export default Header;
