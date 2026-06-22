import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useLanguage } from '../../store/LanguageContext';
import { useAuthStore } from '../../store/authStore';
import { useGetUserData } from '../../api/services/User.Service';
import { getPrivateFileAsBase64 } from '../../api/services/Upload.Service';
import COLORS from '../../constants/colors';
import ICONS from '../../constants/icons';

const ProfileMenu = ({ onEditPress, onLogout }) => {
   const navigation = useNavigation();
   const { t, isRTL, toggleLang, lang } = useLanguage();
   const { user, isAuthenticated } = useAuthStore();
   const { data: userData } = useGetUserData();

   const [profileImageUrl, setProfileImageUrl] = useState(null);

   useEffect(() => {
      const loadImage = async () => {
         const data = userData || user;
         if (!isAuthenticated || !data) return;
         if (data.profileImageFileId) {
            try {
               const base64 = await getPrivateFileAsBase64(data.profileImageFileId);
               if (base64) { setProfileImageUrl(base64); return; }
            } catch (e) { /* fall through */ }
         }
         if (data.profileImage) setProfileImageUrl(data.profileImage);
      };
      loadImage();
   }, [isAuthenticated, userData?.profileImageFileId, userData?.profileImage]);

   const alignText = { textAlign: isRTL ? 'right' : 'left' };
   const rowStyle = { flexDirection: isRTL ? 'row-reverse' : 'row' };
   // Chevron: Point right (default) or left (RTL)
   const chevronStyle = isRTL ? { transform: [{ rotate: '90deg' }] } : { transform: [{ rotate: '-90deg' }] };

   const MenuItem = ({ label, icon, value, isDestructive, onPress }) => (
      <TouchableOpacity style={[styles.menuItem, rowStyle]} onPress={onPress}>
         <View style={[rowStyle, { alignItems: 'center' }]}>
            <View style={[styles.menuIconBox, isDestructive && { backgroundColor: COLORS.errorBg }]}>
               <Image source={icon} style={[styles.menuIcon, isDestructive && { tintColor: COLORS.danger }]} />
            </View>
            <Text style={[styles.menuLabel, alignText, isDestructive && { color: COLORS.danger }]}>{label}</Text>
         </View>
         <View style={[rowStyle, { alignItems: 'center' }]}>
            {value && <Text style={styles.menuValue}>{value}</Text>}
            <Image
               source={{ uri: isDestructive ? null : 'https://cdn-icons-png.flaticon.com/512/2985/2985150.png' }}
               style={[styles.chevron, chevronStyle]}
            />
         </View>
      </TouchableOpacity>
   );

   return (
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 50 }}>
         {/* Identity Card */}
         <View style={[styles.identityCard, rowStyle]}>
            <Image
               source={(isAuthenticated && profileImageUrl) ? { uri: profileImageUrl } : (isAuthenticated ? ICONS.defaultAvatar : ICONS.guestAvatar)}
               style={styles.avatarLarge}
            />
            <View style={{ flex: 1, marginHorizontal: 15, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
               <Text style={styles.userName}>
                  {isAuthenticated
                     ? (userData?.fullName || user?.fullName || user?.name)
                     : (isRTL ? 'مريض زائر' : 'Guest Patient')}
               </Text>
               {isAuthenticated && (userData?.userId || user?.mrn) && (
                  <Text style={styles.userId}>{t.moreOptions?.patientId || 'Patient ID'} {userData?.userId || user?.mrn}</Text>
               )}

               {/* Show Edit button if authenticated, Login button if not */}
               {isAuthenticated ? (
                  <TouchableOpacity style={styles.editBtnSmall} onPress={onEditPress}>
                     <Text style={styles.editBtnText}>{t.moreOptions?.editPersonalInfo || 'Edit Personal Info'}</Text>
                  </TouchableOpacity>
               ) : (
                  <TouchableOpacity style={styles.loginBtn} onPress={() => navigation.navigate('LoginScreen')}>
                     <Text style={styles.loginBtnText}>{t.login || 'Login'}</Text>
                  </TouchableOpacity>
               )}
            </View>
         </View>

         {/* Group A: Health - Only show if authenticated */}
         {isAuthenticated && (
            <>
               <Text style={[styles.sectionHeader, alignText]}>{t.moreOptions?.myHealth || 'My Health'}</Text>
               <View style={styles.menuGroup}>
                  <MenuItem label={t.moreOptions?.medicalRecords || "Medical Records"} icon={ICONS.folder} onPress={() => navigation.navigate('MedicalRecordScreen')} />
                  <View style={styles.divider} />
                  <MenuItem label={t.moreOptions?.medicalReports || "Medical Reports"} icon={ICONS.report} onPress={() => navigation.navigate('MedicalReportsScreen')} />
                  <View style={styles.divider} />
                  <MenuItem label={t.moreOptions?.refillRequest || "Refill Request"} icon={ICONS.pill} onPress={() => navigation.navigate('RefillRequestScreen')} />
               </View>
            </>
         )}

         {/* Group B: Finance - Only show if authenticated */}
         {isAuthenticated && (
            <>
               <Text style={[styles.sectionHeader, alignText]}>{t.moreOptions?.finance || 'Finance'}</Text>
               <View style={styles.menuGroup}>
                  <MenuItem label={t.moreOptions?.wallet || "Wallet"} icon={ICONS.wallet} onPress={() => navigation.navigate('WalletScreen')} />
                  <View style={styles.divider} />
                  <MenuItem label={t.moreOptions?.billing || "Billing"} icon={ICONS.creditCard} onPress={() => navigation.navigate('BillingScreen')} />
               </View>
            </>
         )}

         {/* Group C: Settings */}
         <Text style={[styles.sectionHeader, alignText]}>{t.moreOptions?.appSettings || 'App Settings'}</Text>
         <View style={styles.menuGroup}>
            <MenuItem label={isRTL ? 'اللغة' : 'Language'} icon={ICONS.globe} value={lang === 'en' ? 'English' : 'العربية'} onPress={toggleLang} />
            <View style={styles.divider} />
            <MenuItem label={t.moreOptions?.termsConditions || "Terms & Conditions"} icon={ICONS.info} onPress={() => navigation.navigate('TermsScreen')} />
            <View style={styles.divider} />
            <MenuItem label={t.moreOptions?.privacyPolicy || "Privacy Policy"} icon={ICONS.shield} onPress={() => navigation.navigate('PrivacyPolicyScreen')} />
            <View style={styles.divider} />
            <MenuItem label={t.moreOptions?.aboutUs || "About Us"} icon={ICONS.info} onPress={() => navigation.navigate('AboutUsScreen')} />
         </View>

         {/* Logout - Only show if authenticated */}
         {isAuthenticated && (
            <View style={[styles.menuGroup, { marginTop: 20, backgroundColor: COLORS.errorBg, borderColor: COLORS.errorBorder }]}>
               <MenuItem label={t.moreOptions?.logout || "Logout"} icon={ICONS.logout} isDestructive onPress={onLogout} />
            </View>
         )}
      </ScrollView>
   );
};

const styles = StyleSheet.create({
   identityCard: { backgroundColor: COLORS.white, padding: 20, borderRadius: 16, marginBottom: 20, elevation: 2, alignItems: 'center' },
   avatarLarge: { width: 70, height: 70, borderRadius: 35 },
   userName: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary },
   userId: { fontSize: 12, color: COLORS.textSecondary, marginVertical: 4 },
   editBtnSmall: { marginTop: 8, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: COLORS.promo1, borderRadius: 20 },
   editBtnText: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },
   loginBtn: { marginTop: 8, paddingVertical: 8, paddingHorizontal: 20, backgroundColor: COLORS.primary, borderRadius: 20 },
   loginBtnText: { color: COLORS.white, fontSize: 13, fontWeight: '600' },

   sectionHeader: { fontSize: 14, fontWeight: 'bold', color: COLORS.gray600, marginBottom: 10, marginTop: 10, textTransform: 'uppercase' },
   menuGroup: { backgroundColor: COLORS.white, borderRadius: 16, overflow: 'hidden', elevation: 1, borderWidth: 1, borderColor: COLORS.gray100 },
   menuItem: { padding: 16, justifyContent: 'space-between', alignItems: 'center' },
   menuIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.gray100, alignItems: 'center', justifyContent: 'center', marginHorizontal: 12 },
   menuIcon: { width: 20, height: 20, tintColor: COLORS.primary },
   menuLabel: { fontSize: 15, color: COLORS.textPrimary, fontWeight: '500' },
   menuValue: { fontSize: 13, color: COLORS.gray600, marginHorizontal: 8 },
   chevron: { width: 12, height: 12, tintColor: COLORS.disabled },
   divider: { height: 1, backgroundColor: COLORS.gray100, marginHorizontal: 20 },
});

export default ProfileMenu;
