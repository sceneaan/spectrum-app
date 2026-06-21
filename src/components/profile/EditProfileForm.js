import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image, StyleSheet,
  TextInput, KeyboardAvoidingView, Platform, Modal, FlatList, ActivityIndicator, Alert
} from 'react-native';
import { useLanguage } from '../../store/LanguageContext';
import { useGetUserData, useUpdateProfile } from '../../api/services/User.Service';
import {
  uploadAvatar,
  validateFile,
  useProfileImageUrl,
  getPrivateFileAsBase64,
} from '../../api/services/Upload.Service';
import { useQueryClient } from '@tanstack/react-query';
import COLORS from '../../constants/colors';
import ICONS from '../../constants/icons';
import { launchImageLibrary } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/Feather';
import PhoneInputComponent, { validatePhone as validatePhoneUtil, COUNTRY_CODES as COUNTRY_CODES_LIST } from '../common/PhoneInput';

// --- EXTRACTED COMPONENTS ---

const CustomInput = ({ label, value, onChangeText, isGray, icon, onPress, inputRef, onSubmitEditing, returnKeyType, alignText, rowStyle, keyboardType = 'default' }) => (
  <View style={styles.inputGroup}>
    <Text style={[styles.label, alignText]}>{label}</Text>
    <TouchableOpacity activeOpacity={onPress ? 0.7 : 1} onPress={onPress} style={[styles.inputContainer, isGray ? styles.bgGray : styles.bgLight, rowStyle]}>
      <TextInput
        ref={inputRef}
        style={[styles.inputField, alignText, isGray && styles.textDisabled]}
        value={value}
        onChangeText={onChangeText}
        editable={!isGray && !onPress}
        placeholderTextColor={COLORS.gray500}
        pointerEvents={onPress ? "none" : "auto"}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        blurOnSubmit={false}
        keyboardType={keyboardType}
      />
      {icon && <Image source={icon} style={[styles.inputIcon, { tintColor: COLORS.gray500, marginHorizontal: 5 }]} />}
    </TouchableOpacity>
  </View>
);

const CustomDropdown = ({ label, value, onPress, alignText, rowStyle }) => (
  <View style={styles.inputGroup}>
    <Text style={[styles.label, alignText]}>{label}</Text>
    <TouchableOpacity style={[styles.inputContainer, styles.bgLight, rowStyle, { justifyContent: 'space-between' }]} onPress={onPress}>
      <Text style={styles.inputText}>{value || 'Select...'}</Text>
      <Image source={ICONS.chevronDown} style={{ width: 12, height: 12, tintColor: COLORS.gray700 }} />
    </TouchableOpacity>
  </View>
);

// Using PhoneInput from common components (imported as PhoneInputComponent)

const CustomTextArea = ({ label, placeholder, value, onChange, alignText }) => (
  <View style={styles.inputGroup}>
    <Text style={[styles.label, alignText]}>{label}</Text>
    <View style={[styles.inputContainer, styles.bgLight, { height: 100, paddingVertical: 10 }]}>
      <TextInput
        style={[styles.inputField, alignText, { height: '100%', textAlignVertical: 'top' }]}
        placeholder={placeholder}
        multiline
        placeholderTextColor={COLORS.gray500}
        value={value}
        onChangeText={onChange}
      />
    </View>
  </View>
);

const EditProfileForm = ({ onSave }) => {
  const { t, isRTL } = useLanguage();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('patient');

  // Fetch user data from API
  const { data: userData, isLoading: userDataLoading, error: userDataError } = useGetUserData();
  const { mutate: updateUserProfile, isPending: updateProfileLoader } = useUpdateProfile();
  const [uploadFileLoader, setUploadFileLoader] = useState(false);

  // Profile image state - supports both private (fileId) and legacy (url) images
  const [profileImage, setProfileImage] = useState(null);
  const [profileImageLoading, setProfileImageLoading] = useState(false);

  // --- STATE ---
  const [formData, setFormData] = useState({
    fullName: '',
    nationalId: '',
    dateOfBirth: null,
    gender: '',
    nationality: 'Saudi Arabia',
    relationship: '',
    emergencyContactName: '',
    emergencyContact: '',
    contact: '',
    email: '',
    history: '',
    allergies: '',
    preferredLanguage: '',
    medications: '',
    preference: '',
    userId: '',
  });

  const [countryCode, setCountryCode] = useState('+966');
  const [emergencyCountryCode, setEmergencyCountryCode] = useState('+966');

  // Errors
  const [emergencyContactError, setEmergencyContactError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [contactError, setContactError] = useState('');

  // --- REFS ---
  const mobileRef = useRef(null);
  const emailRef = useRef(null);
  const emergencyNameRef = useRef(null);
  const emergencyPhoneRef = useRef(null);

  // Country codes list (using imported constant)
  const COUNTRY_CODES = COUNTRY_CODES_LIST;

  // --- MODAL STATE ---
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('');
  const [listData, setListData] = useState([]);
  const [listTarget, setListTarget] = useState('');
  const [modalTitle, setModalTitle] = useState('');

  // --- DATE PICKER DATA ---
  const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const YEARS = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i);
  const [tempDate, setTempDate] = useState(new Date());

  // --- RTL HELPERS ---
  const alignText = { textAlign: isRTL ? 'right' : 'left' };
  const rowStyle = { flexDirection: isRTL ? 'row-reverse' : 'row' };

  // Helper function to extract country code and phone number
  const extractPhoneData = (fullPhone) => {
    if (!fullPhone) return { code: '+966', number: '' };

    // Try to match known country codes
    const codes = ['+966', '+971', '+965', '+974', '+973', '+968', '+20', '+962', '+961', '+1', '+44'];
    for (const code of codes) {
      if (fullPhone.startsWith(code)) {
        return { code, number: fullPhone.substring(code.length) };
      }
    }

    // Default to Saudi Arabia if no match
    return { code: '+966', number: fullPhone.replace(/^\+/, '') };
  };

  // Load user data from API
  const loadUserData = useCallback(() => {
    if (userData) {
      // Extract phone data
      const phoneData = extractPhoneData(userData.phone);
      const emergencyPhoneData = extractPhoneData(userData.emergencyContact?.phone);

      // Set country codes
      setCountryCode(phoneData.code);
      setEmergencyCountryCode(emergencyPhoneData.code);

      setFormData({
        fullName: userData.fullName || '',
        nationalId: userData.nationalId || '',
        dateOfBirth: userData.dob ? new Date(userData.dob) : null,
        gender: userData.gender || '',
        nationality: userData.nationality || 'Saudi Arabia',
        relationship: userData.emergencyContact?.relation || '',
        emergencyContactName: userData.emergencyContact?.name || '',
        emergencyContact: emergencyPhoneData.number,
        contact: phoneData.number,
        email: userData.email || '',
        history: userData.history || '',
        allergies: userData.allergies || '',
        preferredLanguage: userData.preferredLanguage || '',
        medications: userData.medications || '',
        preference: userData.preference || '',
        userId: userData.userId || '',
      });
    }
  }, [userData]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // Update profile image when userData changes - supports both private (fileId) and legacy (url)
  useEffect(() => {
    const loadProfileImage = async () => {
      // Check for new secure profileImageFileId first
      if (userData?.profileImageFileId) {
        setProfileImageLoading(true);
        try {
          console.log('🖼️ [EditProfile] Loading private profile image:', userData.profileImageFileId);
          const base64Url = await getPrivateFileAsBase64(userData.profileImageFileId);
          if (base64Url) {
            setProfileImage(base64Url);
          }
        } catch (error) {
          console.error('Error loading private profile image:', error);
          // Fall back to legacy URL if available
          if (userData?.profileImage) {
            setProfileImage(userData.profileImage);
          }
        } finally {
          setProfileImageLoading(false);
        }
      } else if (userData?.profileImage) {
        // Legacy URL - use directly
        setProfileImage(userData.profileImage);
      }
    };

    loadProfileImage();
  }, [userData?.profileImageFileId, userData?.profileImage]);

  // Handle image picker - uses secure upload for patient profile images (PRIVATE)
  const handleImagePicker = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1024,
        maxHeight: 1024,
        selectionLimit: 1,
        includeBase64: false,
        presentationStyle: 'pageSheet', // Better for simulator
      });

      if (result.didCancel) {
        console.log('User cancelled image picker');
        return;
      }

      if (result.errorCode) {
        console.error('ImagePicker Error:', result.errorCode, result.errorMessage);
        Alert.alert('Error', result.errorMessage || 'Failed to pick image');
        return;
      }

      if (result.assets && result.assets.length > 0) {
        const imageAsset = result.assets[0];

        // Validate file before upload
        const validation = validateFile(imageAsset, 'avatar');
        if (!validation.isValid) {
          Alert.alert(t.common?.error || 'Error', validation.error);
          return;
        }

        setUploadFileLoader(true);

        // Show selected image immediately for better UX
        setProfileImage(imageAsset.uri);

        try {
          // Use avatar upload (PUBLIC - returns URL)
          const uploadResponse = await uploadAvatar(imageAsset);

          // Handle different response formats:
          // - Could be { url: '...' } or { fileId: '...' } or just a string URL
          let imageUrl = '';
          let imageFileId = null;

          if (typeof uploadResponse === 'string') {
            imageUrl = uploadResponse;
          } else if (uploadResponse) {
            imageUrl = uploadResponse.url || uploadResponse.profileImage || '';
            imageFileId = uploadResponse.fileId || null;
          }

          // Update local display with the uploaded URL
          if (imageUrl) {
            setProfileImage(imageUrl);
          }

          // Update profile with the image URL
          // Backend expects 'profileUrl' NOT 'profileImage'
          const updatePayload = {
            profileUrl: imageUrl,
          };

          // Only add fileId if we got one
          if (imageFileId) {
            updatePayload.profileImageFileId = imageFileId;
          }

          updateUserProfile(updatePayload, {
            onSuccess: () => {
              Alert.alert(t.common?.success || 'Success', 'Profile picture updated successfully');
              // Invalidate and refetch both user queries to refresh all components
              queryClient.invalidateQueries({ queryKey: ['userData'] });
              queryClient.invalidateQueries({ queryKey: ['currentUser'] });
              // Force refetch to get fresh data
              queryClient.refetchQueries({ queryKey: ['userData'] });
              queryClient.refetchQueries({ queryKey: ['currentUser'] });
            },
            onError: (error) => {
              console.error('Profile Picture Update Error:', error);
              Alert.alert(t.common?.error || 'Error', 'Failed to update profile picture');
            },
          });
        } catch (uploadErr) {
          console.error('Image Upload Error:', uploadErr);
          Alert.alert(t.common?.error || 'Error', uploadErr.message || 'Failed to upload image');
          // Revert to previous image on error
          if (userData?.profileImage) {
            setProfileImage(userData.profileImage);
          } else {
            setProfileImage(null);
          }
        } finally {
          setUploadFileLoader(false);
        }
      }
    } catch (error) {
      console.error('Image Picker Error:', error);
      Alert.alert(t.common?.error || 'Error', error.message || 'Failed to pick image');
    }
  };

  useEffect(() => {
    if (userDataError) {
      Alert.alert('Error', userDataError.message || 'Failed to load user data');
    }
  }, [userDataError]);

  const handleInputChange = (field, value) => {
    setFormData(prevState => ({
      ...prevState,
      [field]: value,
    }));

    // Inline validation for phone numbers
    if (field === 'contact' && value) {
      const validation = validatePhone(value, countryCode);
      setContactError(validation.isValid ? '' : validation.message);
    } else if (field === 'contact') {
      setContactError('');
    }

    if (field === 'emergencyContact' && value) {
      const validation = validatePhone(value, emergencyCountryCode);
      setEmergencyContactError(validation.isValid ? '' : validation.message);
    } else if (field === 'emergencyContact') {
      setEmergencyContactError('');
    }

    // Clear email error when user types
    if (field === 'email') setEmailError('');
  };

  // --- HANDLERS ---
  const openDropdown = (target, title, data) => {
    setModalType('list');
    setListTarget(target);
    setModalTitle(title);
    setListData(data);
    setModalVisible(true);
  };

  const openCountryCodeSelector = (isEmergency = false) => {
    setModalType('countryCode');
    setListTarget(isEmergency ? 'emergencyCountryCode' : 'countryCode');
    setModalTitle(t.patientInformation?.selectCountryCode || 'Select Country Code');
    setListData(COUNTRY_CODES);
    setModalVisible(true);
  };

  const handleListSelection = (item) => {
    if (listTarget === 'gender') handleInputChange('gender', item);
    if (listTarget === 'nationality') handleInputChange('nationality', item);
    if (listTarget === 'relationship') handleInputChange('relationship', item);
    if (listTarget === 'langPref') {
      // Map display name to language code
      const langCode = item === 'English' ? 'en' : item === 'Arabic' ? 'ar' : item;
      handleInputChange('preferredLanguage', langCode);
    }
    if (listTarget === 'commPref') handleInputChange('preference', item);

    if (listTarget === 'countryCode') {
      setCountryCode(item.code);
      // Re-validate phone number with new country code
      if (formData.contact) {
        const validation = validatePhone(formData.contact, item.code);
        setContactError(validation.isValid ? '' : validation.message);
      }
    }

    if (listTarget === 'emergencyCountryCode') {
      setEmergencyCountryCode(item.code);
      // Re-validate emergency phone with new country code
      if (formData.emergencyContact) {
        const validation = validatePhone(formData.emergencyContact, item.code);
        setEmergencyContactError(validation.isValid ? '' : validation.message);
      }
    }

    setModalVisible(false);
  };

  // Date Logic
  const openDatePicker = () => {
    setTempDate(formData.dateOfBirth || new Date(1995, 0, 1));
    setModalType('date');
    setModalTitle(t.profile?.selectDob || 'Select Date of Birth');
    setModalVisible(true);
  };

  const updateDate = (type, value) => {
    const newDate = new Date(tempDate);
    if (type === 'day') newDate.setDate(value);
    if (type === 'month') newDate.setMonth(value);
    if (type === 'year') newDate.setFullYear(value);
    setTempDate(newDate);
  };

  const confirmDate = () => {
    handleInputChange('dateOfBirth', new Date(tempDate));
    setModalVisible(false);
  };

  const formatDate = (dateObj) => {
    if (!dateObj) return '';
    return `${dateObj.getDate()}/${dateObj.getMonth() + 1}/${dateObj.getFullYear()}`;
  };

  // Helper function to display language name from code
  const getLanguageDisplayName = (code) => {
    if (code === 'en') return 'English';
    if (code === 'ar') return 'Arabic';
    return code;
  };

  // Helper function to display preference name
  const getPreferenceDisplayName = (pref) => {
    if (!pref) return '';
    // Capitalize first letter for display
    return pref.charAt(0).toUpperCase() + pref.slice(1);
  };

  // Using validatePhone from common components
  const validatePhone = validatePhoneUtil;

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateNationalId = (id) => {
    const nationalIdRegex = /^\d{10}$/;
    return nationalIdRegex.test(id);
  };

  // Save Changes
  const handleSaveChanges = async () => {
    // Validate main contact phone number
    if (formData.contact) {
      const contactValidation = validatePhone(formData.contact, countryCode);
      if (!contactValidation.isValid) {
        setContactError(contactValidation.message);
        Alert.alert(t.common?.error || 'Error', contactValidation.message);
        return;
      }
    }

    // Validate emergency contact phone number
    if (formData.emergencyContact) {
      const emergencyValidation = validatePhone(formData.emergencyContact, emergencyCountryCode);
      if (!emergencyValidation.isValid) {
        setEmergencyContactError(emergencyValidation.message);
        Alert.alert(t.common?.error || 'Error', emergencyValidation.message);
        return;
      }
    }

    // Validate Email
    if (formData.email && !validateEmail(formData.email)) {
      setEmailError(t.patientInformation?.invalidEmail || 'Invalid email address');
      Alert.alert(t.common?.error || 'Error', t.patientInformation?.invalidEmail || 'Invalid email address');
      return;
    }

    const payload = {
      fullName: formData.fullName?.trim(),
      nationalId: formData.nationalId?.trim(),
      nationality: formData.nationality?.trim(),
      dob: formData.dateOfBirth,
      gender: formData.gender?.toLowerCase(),
      emergencyContact: {
        name: formData.emergencyContactName?.trim(),
        relation: formData.relationship?.trim(),
        phone: formData.emergencyContact ? `${emergencyCountryCode}${formData.emergencyContact}` : '',
      },
      phone: formData.contact ? `${countryCode}${formData.contact}` : '',
      history: formData.history?.trim(),
      allergies: formData.allergies?.trim(),
      preferredLanguage: formData.preferredLanguage,
      medications: formData.medications?.trim(),
      preference: formData.preference?.trim()?.toLowerCase(),
    };

    updateUserProfile(payload, {
      onSuccess: response => {
        if (response) {
          Alert.alert(t.common?.success || 'Success', t.profile?.profileUpdated || 'Profile updated successfully');
          queryClient.invalidateQueries(['userData']);
          loadUserData();
          if (onSave) onSave();
        }
      },
      onError: error => {
        console.error('Profile Update Error:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        const errorMessage = typeof error.message === 'string' ? error.message : 'Failed to update profile';
        Alert.alert(t.common?.error || 'Error', errorMessage || t.profile?.updateFailed || 'Failed to update profile');
      },
    });
  };

  if (userDataLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>{t.common?.loading || 'Loading...'}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 80 }} showsVerticalScrollIndicator={false}>

        {/* Profile Image Section */}
        <View style={[styles.profileImageContainer, rowStyle]}>
          <View style={styles.avatarWrapper}>
            {(uploadFileLoader || profileImageLoading) ? (
              <ActivityIndicator size="large" color={COLORS.primary} style={styles.avatar} />
            ) : (
              <Image
                source={profileImage ? { uri: profileImage } : ICONS.defaultAvatar}
                style={styles.avatar}
              />
            )}
            <TouchableOpacity
              style={[styles.editIconContainer, isRTL ? { left: -5 } : { right: -5 }]}
              onPress={handleImagePicker}
              disabled={uploadFileLoader || profileImageLoading}
            >
              <Icon name="edit-2" size={14} color={COLORS.white} />
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1, marginHorizontal: 15, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
            <Text style={[styles.userName, alignText]}>{formData.fullName || 'User'}</Text>
            {formData.userId && <Text style={[styles.userId, alignText]}>Patient ID: {formData.userId}</Text>}
          </View>
        </View>

        {/* Tabs */}
        <View style={[styles.tabContainer, rowStyle]}>
          <TouchableOpacity style={[styles.tabBtn, activeTab === 'patient' && styles.activeTabBtn]} onPress={() => setActiveTab('patient')}>
            <Text style={[styles.tabText, activeTab === 'patient' && styles.activeTabText]}>{t.profile?.patientTab || 'Patient Information'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, activeTab === 'medical' && styles.activeTabBtn]} onPress={() => setActiveTab('medical')}>
            <Text style={[styles.tabText, activeTab === 'medical' && styles.activeTabText]}>{t.profile?.medicalTab || 'Medical Information'}</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'patient' ? (
          <View>
            <Text style={[styles.sectionTitle, alignText]}>{t.profile?.personalInfo || 'Personal Information'}</Text>
            <CustomInput
              label={t.patientInformation?.fullName || 'Full Name'}
              value={formData.fullName}
              isGray={true}
              alignText={alignText}
              rowStyle={rowStyle}
            />
            <CustomInput
              label={t.patientInformation?.dob || 'Date of Birth'}
              value={formatDate(formData.dateOfBirth)}
              icon={ICONS.calendar}
              isGray={true}
              alignText={alignText}
              rowStyle={rowStyle}
            />
            <CustomInput
              label={t.patientInformation?.nationalId || 'National ID'}
              value={formData.nationalId}
              isGray={true}
              alignText={alignText}
              rowStyle={rowStyle}
              keyboardType="numeric"
            />

            <View style={{ flexDirection: rowStyle.flexDirection, gap: 10 }}>
              <View style={{ flex: 1 }}>
                {userData?.elmVerified ? (
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, alignText]}>{t.patientInformation?.gender || 'Gender'}</Text>
                    <View style={[styles.inputContainer, styles.bgGray, rowStyle]}>
                      <Text style={[styles.inputText, styles.textDisabled]}>{formData.gender || 'N/A'}</Text>
                    </View>
                  </View>
                ) : (
                  <CustomDropdown
                    label={t.patientInformation?.gender || 'Gender'}
                    value={formData.gender}
                    onPress={() => openDropdown('gender', t.patientInformation?.gender || 'Gender', ['Male', 'Female'])}
                    alignText={alignText}
                    rowStyle={rowStyle}
                  />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, alignText]}>{t.patientInformation?.nationality || 'Nationality'}</Text>
                  <View style={[styles.inputContainer, styles.bgGray, rowStyle]}>
                    <Text style={[styles.inputText, styles.textDisabled]}>{formData.nationality || 'N/A'}</Text>
                  </View>
                </View>
              </View>
            </View>

            <PhoneInputComponent
              label={t.patientInformation?.mobileNumber || 'Mobile Number'}
              value={formData.contact}
              onChangeText={(val) => handleInputChange('contact', val)}
              inputRef={mobileRef}
              onSubmitEditing={() => emailRef.current?.focus()}
              returnKeyType="next"
              alignText={alignText}
              rowStyle={rowStyle}
              isRTL={isRTL}
              error={contactError}
              countryCode={countryCode}
              onCountryCodePress={() => openCountryCodeSelector(false)}
            />
            <CustomInput
              label={t.patientInformation?.email || 'Email'}
              value={formData.email}
              onChangeText={(val) => handleInputChange('email', val)}
              inputRef={emailRef}
              returnKeyType="done"
              alignText={alignText}
              rowStyle={rowStyle}
              keyboardType="email-address"
            />
            {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

            <View style={styles.divider} />
            <Text style={[styles.sectionTitle, alignText]}>{t.patientInformation?.emergencyContact || 'Emergency Contact'}</Text>
            <CustomInput
              label={t.patientInformation?.emergencyContactName || 'Contact Name'}
              value={formData.emergencyContactName}
              onChangeText={(val) => handleInputChange('emergencyContactName', val)}
              inputRef={emergencyNameRef}
              onSubmitEditing={() => emergencyPhoneRef.current?.focus()}
              returnKeyType="next"
              alignText={alignText}
              rowStyle={rowStyle}
            />
            <CustomInput
              label={t.patientInformation?.emergencyRelationship || 'Relationship'}
              value={formData.relationship}
              onChangeText={(val) => handleInputChange('relationship', val)}
              returnKeyType="next"
              alignText={alignText}
              rowStyle={rowStyle}
            />
            <PhoneInputComponent
              label={t.patientInformation?.emergencyContactPhone || 'Emergency Phone'}
              value={formData.emergencyContact}
              onChangeText={(val) => handleInputChange('emergencyContact', val)}
              inputRef={emergencyPhoneRef}
              returnKeyType="done"
              alignText={alignText}
              rowStyle={rowStyle}
              isRTL={isRTL}
              error={emergencyContactError}
              countryCode={emergencyCountryCode}
              onCountryCodePress={() => openCountryCodeSelector(true)}
            />

            <TouchableOpacity style={styles.mainBtn} onPress={() => setActiveTab('medical')}>
              <Text style={styles.btnText}>{t.profile?.next || 'Next'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <Text style={[styles.sectionTitle, alignText]}>{t.medicalInformation?.medicalHistory || 'Medical History'}</Text>
            <CustomTextArea
              label={t.medicalInformation?.medicalHistory || 'Medical History'}
              placeholder={t.medicalInformation?.medicalHistoryPlaceholder || 'Enter medical history...'}
              value={formData.history}
              onChange={(val) => handleInputChange('history', val)}
              alignText={alignText}
            />
            <CustomTextArea
              label={t.medicalInformation?.medications || 'Current Medications'}
              placeholder={t.medicalInformation?.medicationsPlaceholder || 'Enter current medications...'}
              value={formData.medications}
              onChange={(val) => handleInputChange('medications', val)}
              alignText={alignText}
            />
            <CustomTextArea
              label={t.medicalInformation?.allergies || 'Allergies'}
              placeholder={t.medicalInformation?.allergiesPlaceholder || 'Enter allergies...'}
              value={formData.allergies}
              onChange={(val) => handleInputChange('allergies', val)}
              alignText={alignText}
            />

            <View style={styles.divider} />
            <Text style={[styles.sectionTitle, alignText]}>{t.profile?.preferencesTitle || 'Preferences'}</Text>
            <CustomDropdown
              label={t.profile?.languagePreference || 'Language Preference'}
              value={getLanguageDisplayName(formData.preferredLanguage)}
              onPress={() => openDropdown('langPref', t.profile?.languagePreference || 'Language', ['English', 'Arabic'])}
              alignText={alignText}
              rowStyle={rowStyle}
            />
            <CustomDropdown
              label={t.profile?.communicationPreference || 'Communication Preference'}
              value={getPreferenceDisplayName(formData.preference)}
              onPress={() => openDropdown('commPref', t.profile?.communicationPreference || 'Communication', ['Email', 'Phone', 'WhatsApp'])}
              alignText={alignText}
              rowStyle={rowStyle}
            />

            <TouchableOpacity style={styles.mainBtn} onPress={handleSaveChanges} disabled={updateProfileLoader}>
              {updateProfileLoader ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <Text style={styles.btnText}>{t.profile?.saveChanges || 'Save Changes'}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{modalTitle}</Text>

            {modalType === 'date' ? (
              <View style={{ height: 250 }}>
                <View style={[styles.datePickerRow, rowStyle]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pickerHeader}>{t.day || 'Day'}</Text>
                    <FlatList data={DAYS} keyExtractor={i => `d${i}`} showsVerticalScrollIndicator={false} renderItem={({ item }) => (
                      <TouchableOpacity onPress={() => updateDate('day', item)} style={[styles.pickerItem, tempDate.getDate() === item && styles.pickerSelected]}>
                        <Text style={[styles.pickerText, tempDate.getDate() === item && styles.pickerTextSelected]}>{item}</Text>
                      </TouchableOpacity>
                    )} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pickerHeader}>{t.month || 'Month'}</Text>
                    <FlatList data={MONTHS} keyExtractor={i => i} showsVerticalScrollIndicator={false} renderItem={({ item, index }) => (
                      <TouchableOpacity onPress={() => updateDate('month', index)} style={[styles.pickerItem, tempDate.getMonth() === index && styles.pickerSelected]}>
                        <Text style={[styles.pickerText, tempDate.getMonth() === index && styles.pickerTextSelected]}>{item}</Text>
                      </TouchableOpacity>
                    )} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pickerHeader}>{t.year || 'Year'}</Text>
                    <FlatList data={YEARS} keyExtractor={i => `y${i}`} showsVerticalScrollIndicator={false} renderItem={({ item }) => (
                      <TouchableOpacity onPress={() => updateDate('year', item)} style={[styles.pickerItem, tempDate.getFullYear() === item && styles.pickerSelected]}>
                        <Text style={[styles.pickerText, tempDate.getFullYear() === item && styles.pickerTextSelected]}>{item}</Text>
                      </TouchableOpacity>
                    )} />
                  </View>
                </View>
                <TouchableOpacity style={styles.modalConfirmBtn} onPress={confirmDate}>
                  <Text style={styles.modalConfirmText}>{t.confirm || 'Confirm Date'}</Text>
                </TouchableOpacity>
              </View>
            ) : modalType === 'countryCode' ? (
              <View style={{ height: 400 }}>
                <FlatList
                  data={listData}
                  keyExtractor={(item) => item.code}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.modalItem, rowStyle, { justifyContent: 'space-between' }]}
                      onPress={() => handleListSelection(item)}
                    >
                      <View style={[rowStyle, { alignItems: 'center' }]}>
                        <Text style={{ fontSize: 24, marginRight: 10, marginLeft: isRTL ? 10 : 0 }}>{item.flag}</Text>
                        <Text style={styles.modalItemText}>{item.country}</Text>
                      </View>
                      <Text style={[styles.modalItemText, { color: COLORS.primary }]}>{item.code}</Text>
                    </TouchableOpacity>
                  )}
                />
                <TouchableOpacity style={[styles.modalConfirmBtn, { backgroundColor: COLORS.gray200 }]} onPress={() => setModalVisible(false)}>
                  <Text style={{ color: COLORS.textPrimary }}>{t.cancel || 'Cancel'}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ height: 300 }}>
                <FlatList data={listData} keyExtractor={(i, x) => x.toString()} renderItem={({ item }) => (
                  <TouchableOpacity style={styles.modalItem} onPress={() => handleListSelection(item)}>
                    <Text style={styles.modalItemText}>{item}</Text>
                  </TouchableOpacity>
                )} />
                <TouchableOpacity style={[styles.modalConfirmBtn, { backgroundColor: COLORS.gray200 }]} onPress={() => setModalVisible(false)}>
                  <Text style={{ color: COLORS.textPrimary }}>{t.cancel || 'Cancel'}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  loadingText: { marginTop: 10, fontSize: 14, color: COLORS.gray600 },

  profileImageContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    alignItems: 'center',
  },
  avatarWrapper: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatar: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
  },
  editIconContainer: {
    position: 'absolute',
    bottom: -5,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  userName: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary },
  userId: { fontSize: 12, color: COLORS.gray600, marginTop: 4 },

  tabContainer: { flexDirection: 'row', marginBottom: 20 },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: COLORS.gray100, borderRadius: 8, marginHorizontal: 2 },
  activeTabBtn: { backgroundColor: COLORS.primary },
  tabText: { color: COLORS.gray700, fontWeight: '600' },
  activeTabText: { color: COLORS.white },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: COLORS.textPrimary },
  divider: { height: 1, backgroundColor: COLORS.gray200, marginVertical: 20 },

  inputGroup: { marginBottom: 15 },
  label: { fontSize: 14, marginBottom: 8, color: COLORS.textPrimary, fontWeight: '500' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 15, height: 50, borderWidth: 1, borderColor: COLORS.gray300 },
  bgGray: { backgroundColor: COLORS.gray200, borderColor: COLORS.gray200 },
  bgWhite: { backgroundColor: COLORS.white },
  bgLight: { backgroundColor: COLORS.offWhite, borderColor: COLORS.gray300 },
  inputField: { flex: 1, color: COLORS.textPrimary, fontSize: 14 },
  textDisabled: { color: COLORS.gray600 },
  inputText: { color: COLORS.textPrimary, fontSize: 14 },
  inputIcon: { width: 20, height: 20 },
  errorText: { color: COLORS.danger, fontSize: 12, marginTop: 5 },

  mainBtn: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  btnText: { color: COLORS.white, fontWeight: 'bold', fontSize: 16 },

  modalOverlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary, textAlign: 'center', marginBottom: 15 },
  modalItem: { paddingVertical: 15, borderBottomWidth: 1, borderColor: COLORS.gray100 },
  modalItemText: { fontSize: 16, color: COLORS.textPrimary, textAlign: 'center' },
  modalConfirmBtn: { marginTop: 10, backgroundColor: COLORS.primary, padding: 15, borderRadius: 12, width: '100%', alignItems: 'center' },
  modalConfirmText: { color: COLORS.white, fontWeight: 'bold' },

  datePickerRow: { flexDirection: 'row', height: 180, justifyContent: 'center', gap: 10 },
  pickerHeader: { textAlign: 'center', fontSize: 14, color: COLORS.gray500, marginBottom: 5 },
  pickerItem: { paddingVertical: 10, alignItems: 'center' },
  pickerSelected: { backgroundColor: COLORS.promo1, borderRadius: 8 },
  pickerText: { fontSize: 16, color: COLORS.textPrimary },
  pickerTextSelected: { color: COLORS.primary, fontWeight: 'bold' }
});

export default EditProfileForm;
