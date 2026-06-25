import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import FastImage from 'react-native-fast-image';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../store/LanguageContext';
import { useAuthStore } from '../store/authStore';
import { useGetUserData } from '../api/services/User.Service';
import { useGetUnreadCount } from '../api/services/Notification.Service';
import ICONS from '../constants/icons';
import COLORS from '../constants/colors';

const HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };

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
  const alignText = { textAlign: isRTL ? 'right' : 'left' };

  const goToProfile = () => navigation.navigate('Profile');
  const goToNotifications = () => navigation.navigate('Notifications');

  const displayName = isAuthenticated
    ? (userData?.fullName || user?.fullName || user?.name || 'User')
    : (t.welcomeToSpectrum || 'Welcome to Spectrum');
  const displayAvatar = (isAuthenticated && profileImageUrl) ? { uri: profileImageUrl } : (isAuthenticated ? ICONS.defaultAvatar : ICONS.guestAvatar);

  const onlineDotPosition = isRTL ? { left: 0 } : { right: 0 };

  return (
    <View style={[
      styles.container,
      rowStyle,
      { paddingTop: insets.top + 10 },
    ]}>
      <View style={[styles.leftContainer, rowStyle]}>
        {showBack ? (
          <TouchableOpacity
            onPress={onBack}
            style={[styles.backBtn, isRTL && { transform: [{ rotate: '180deg' }] }]}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel={t.accessibility?.goBack || 'Go back'}
          >
            <Image source={ICONS.back} style={styles.icon} />
          </TouchableOpacity>
        ) : showProfile ? (
          <TouchableOpacity
            style={[rowStyle, { alignItems: 'center' }]}
            onPress={goToProfile}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t.accessibility?.viewProfile || 'View profile'}
          >
            {typeof displayAvatar === 'object' && displayAvatar.uri && !displayAvatar.uri.startsWith('data:') ? (
              <FastImage
                source={{ uri: displayAvatar.uri, priority: FastImage.priority.high, cache: FastImage.cacheControl.immutable }}
                style={styles.avatar}
                resizeMode={FastImage.resizeMode.cover}
              />
            ) : (
              <Image source={displayAvatar} style={styles.avatar} />
            )}
            {isAuthenticated && (
              <View style={[styles.onlineDot, onlineDotPosition]} />
            )}
            <View style={{ marginHorizontal: 12 }}>
              {isAuthenticated && <Text style={[styles.welcome, alignText]}>{t.welcome || 'Welcome'}</Text>}
              <Text style={[styles.name, alignText]}>{displayName}</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <Text style={[styles.title, alignText]}>{title}</Text>
        )}
      </View>

      <View style={[styles.rightContainer, isRTL ? { flexDirection: 'row-reverse' } : { flexDirection: 'row' }]}>
        <TouchableOpacity
          onPress={toggleLang}
          style={styles.langBtn}
          hitSlop={HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel={lang === 'en'
            ? (t.accessibility?.switchToArabic || 'Switch to Arabic')
            : (t.accessibility?.switchToEnglish || 'Switch to English')}
        >
          <Text style={{ fontSize: 22 }}>{lang === 'en' ? '🇸🇦' : '🇺🇸'}</Text>
        </TouchableOpacity>

        {isAuthenticated && !showBack && (
          <TouchableOpacity
            style={styles.bellBtn}
            onPress={goToNotifications}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel={t.accessibility?.notifications || 'Notifications'}
          >
            <Image source={ICONS.bell} style={styles.icon} />
            {unreadCount > 0 && (
              <View style={[styles.badge, isRTL ? { left: 8 } : { right: 8 }]} />
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 15,
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    zIndex: 100,
  },
  leftContainer: { flex: 1, alignItems: 'center', justifyContent: 'flex-start' },
  rightContainer: { alignItems: 'center' },
  avatar: { width: 45, height: 45, borderRadius: 22.5, borderWidth: 2, borderColor: COLORS.white, shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 5 },
  onlineDot: {
    position: 'absolute',
    top: 0,
    width: 12,
    height: 12,
    backgroundColor: COLORS.success,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  welcome: { color: COLORS.textSecondary, fontSize: 12 },
  name: { color: COLORS.textPrimary, fontSize: 16, fontWeight: 'bold' },
  title: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary, flex: 1 },
  icon: { width: 24, height: 24, tintColor: COLORS.textPrimary },
  backBtn: { padding: 8 },
  langBtn: { padding: 8, marginHorizontal: 5 },
  bellBtn: { padding: 8, backgroundColor: COLORS.gray100, borderRadius: 20, marginLeft: 5 },
  badge: { position: 'absolute', top: 8, width: 8, height: 8, backgroundColor: COLORS.danger, borderRadius: 4 },
});

export default Header;
