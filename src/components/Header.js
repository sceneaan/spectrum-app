import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import FastImage from 'react-native-fast-image';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../store/LanguageContext';
import { useAuthStore } from '../store/authStore';
import { useGetUserData } from '../api/services/User.Service';
import ICONS from '../constants/icons';
import COLORS from '../constants/colors';

const Header = ({ showBack, onBack, title, showProfile }) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { t, isRTL, toggleLang, lang } = useLanguage();
  const { user, isAuthenticated } = useAuthStore();
  const { data: userData } = useGetUserData();

  // Profile image state
  const [profileImageUrl, setProfileImageUrl] = useState(null);

  // Load profile image using fileId (like web frontend) or direct URL
  useEffect(() => {
    const loadImage = async () => {
      const data = userData || user;
      if (!isAuthenticated || !data) return;

      // Try profileImageFileId first (always returns latest image)
      if (data.profileImageFileId) {
        try {
          const { getPrivateFileAsBase64 } = require('../api/services/Upload.Service');
          const base64 = await getPrivateFileAsBase64(data.profileImageFileId);
          if (base64) {
            setProfileImageUrl(base64);
            return;
          }
        } catch (e) {
          // Fall through to direct URL
        }
      }

      // Fall back to direct URL
      if (data.profileImage) {
        setProfileImageUrl(data.profileImage);
      }
    };

    loadImage();
  }, [isAuthenticated, userData?.profileImageFileId, userData?.profileImage, user?.profileImage]);

  const rowStyle = { flexDirection: isRTL ? 'row-reverse' : 'row' };
  const alignText = { textAlign: isRTL ? 'right' : 'left' };

  // Navigation Handlers
  const goToProfile = () => navigation.navigate('Profile');
  const goToNotifications = () => navigation.navigate('Notifications');

  // Display logic for logged-in vs guest users
  const displayName = isAuthenticated
    ? (userData?.fullName || user?.fullName || user?.name || 'User')
    : (t.welcomeToSpectrum || 'Welcome to Spectrum');
  const displayAvatar = (isAuthenticated && profileImageUrl) ? { uri: profileImageUrl } : (isAuthenticated ? ICONS.defaultAvatar : ICONS.guestAvatar);

  return (
    <View style={[
      styles.container,
      rowStyle,
      { paddingTop: insets.top + 10 } // Dynamic padding for Safe Area
    ]}>

      {/* --- LEFT SIDE (Back Button OR Profile Info) --- */}
      <View style={[styles.leftContainer, rowStyle]}>
        {showBack ? (
          <TouchableOpacity
            onPress={onBack}
            style={[styles.backBtn, isRTL && { transform: [{ rotate: '180deg' }] }]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Image source={ICONS.back} style={styles.icon} />
          </TouchableOpacity>
        ) : showProfile ? (
          <TouchableOpacity
            style={[rowStyle, { alignItems: 'center' }]}
            onPress={goToProfile}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="View profile"
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
            {isAuthenticated && ( // Only show online indicator if logged in
                <View style={{
                position: 'absolute',
                right: 0,
                top: 0,
                width: 12,
                height: 12,
                backgroundColor: COLORS.success, // Green for online/active
                borderRadius: 6,
                borderWidth: 2,
                borderColor: COLORS.white
                }} />
            )}
            <View style={{ marginHorizontal: 12 }}>
              {isAuthenticated && <Text style={[styles.welcome, alignText]}>{t.welcome || 'Welcome'}</Text>}
              <Text style={[styles.name, alignText]}>{displayName}</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <Text style={styles.title}>{title}</Text>
        )}
      </View>

      {/* --- RIGHT SIDE (Language & Notifications) --- */}
      <View style={[styles.rightContainer, isRTL ? { flexDirection: 'row-reverse' } : { flexDirection: 'row' }]}>

        {/* Language Toggle */}
        <TouchableOpacity
          onPress={toggleLang}
          style={styles.langBtn}
          accessibilityRole="button"
          accessibilityLabel={lang === 'en' ? 'Switch to Arabic' : 'Switch to English'}
        >
          <Text style={{ fontSize: 22 }}>{lang === 'en' ? '🇸🇦' : '🇺🇸'}</Text>
        </TouchableOpacity>

        {/* Notification Bell (Only for logged-in users, hidden on inner pages) */}
        {isAuthenticated && !showBack && (
          <TouchableOpacity
            style={styles.bellBtn}
            onPress={goToNotifications}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Image source={ICONS.bell} style={styles.icon} />
            <View style={[styles.badge, isRTL ? { left: 8 } : { right: 8 }]} />
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
    zIndex: 100, // Ensure header stays on top
  },

  leftContainer: { flex: 1, alignItems: 'center', justifyContent: 'flex-start' },
  rightContainer: { alignItems: 'center' },

  // Profile Elements
  avatar: { width: 45, height: 45, borderRadius: 22.5, borderWidth: 2, borderColor: COLORS.white, shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 5 },
  welcome: { color: COLORS.textSecondary, fontSize: 12 },
  name: { color: COLORS.textPrimary, fontSize: 16, fontWeight: 'bold' },

  // Page Title (When not showing profile)
  title: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary },

  // Buttons
  icon: { width: 24, height: 24, tintColor: COLORS.textPrimary },
  backBtn: { padding: 5 },
  langBtn: { padding: 5, marginHorizontal: 5 },
  bellBtn: { padding: 8, backgroundColor: COLORS.gray100, borderRadius: 20, marginLeft: 5 },

  // Notification Badge
  badge: { position: 'absolute', top: 8, width: 8, height: 8, backgroundColor: COLORS.danger, borderRadius: 4 },
});

export default Header;
