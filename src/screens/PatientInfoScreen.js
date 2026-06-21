import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, ScrollView, Alert, Platform, Modal, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import COLORS from '../constants/colors';
import ICONS from '../constants/icons';
import { usePatientConsent } from '../api/services/Auth.Service';
import { uploadGuestSignature, validateFile } from '../api/services/Upload.Service';
import { useCreateAppointment } from '../api/services/Appointment.Service';
import { checkNationalIdAvailability } from '../api/services/User.Service';
import { verifyElmIdentity } from '../api/services/Elm.Service';
import { useAuthStore } from '../store/authStore';
import SignatureScreen from 'react-native-signature-canvas';
import DatePicker from 'react-native-date-picker';
import ReactNativeBlobUtil from 'react-native-blob-util';
import HijriDatePicker from '../components/HijriDatePicker';
import moment from 'moment-timezone';
import environment from '../config/environment';

// Check if ELM verification is disabled
const ELM_DISABLED = environment.elm_disabled;

const PatientInfoScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { t, i18n } = useTranslation();
    const { setAuth, user } = useAuthStore();
    const { targetScreen, targetParams, emailOrPhone } = route.params || {};

    // RTL support
    const isRTL = i18n.dir() === 'rtl';
    const rowStyle = { flexDirection: isRTL ? 'row-reverse' : 'row' };
    const alignText = { textAlign: isRTL ? 'right' : 'left' };

    // Form states
    const [fullName, setFullName] = useState('');
    const [nationalId, setNationalId] = useState('');
    const [nationality, setNationality] = useState('Saudi Arabia'); // Default from old app
    const [dob, setDob] = useState(new Date()); // Date object
    const [displayDob, setDisplayDob] = useState(''); // Formatted date string for display

    // UI states
    const [nationalIdError, setNationalIdError] = useState('');
    const [generalError, setGeneralError] = useState('');
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [isNationalityModalOpen, setIsNationalityModalOpen] = useState(false);
    const [nationalitySearchQuery, setNationalitySearchQuery] = useState('');
    const [signatureData, setSignatureData] = useState(null); // Base64 signature
    const [isSigningActive, setIsSigningActive] = useState(false); // Track when user is signing to disable scroll
    const signatureRef = useRef(null);

    // ELM verification states - auto-verified if ELM is disabled
    const [dateFormat, setDateFormat] = useState('gregorian'); // 'gregorian' or 'hijri'
    const [hijriDateText, setHijriDateText] = useState(''); // For manual Hijri date input
    const [elmVerifying, setElmVerifying] = useState(false);
    const [elmVerified, setElmVerified] = useState(ELM_DISABLED); // Auto-verified when disabled
    const [elmData, setElmData] = useState(null);

    // API Hooks
    const { mutate: submitConsent, isPending: isSubmittingConsent } = usePatientConsent();
    const { mutateAsync: createAppointment, isPending: isCreatingAppointment } = useCreateAppointment();

    // Upload state
    const [isUploadingSignature, setIsUploadingSignature] = useState(false);

    // Nationality list (complete list from old app's Signature.jsx)
    const nationalityItems = [
        'Saudi Arabia',
        // Arab countries
        'Egypt',
        'United Arab Emirates',
        'Jordan',
        'Lebanon',
        'Palestine',
        'Syria',
        'Iraq',
        'Kuwait',
        'Oman',
        'Bahrain',
        'Qatar',
        'Mauritania',
        'Somalia',
        'Algeria',
        'Tunisia',
        'Morocco',
        'Sudan',
        'Yemen',
        'Comoros',
        'Djibouti',
        'Mauritius',
        // Rest of the world
        'Afghanistan',
        'Albania',
        'Andorra',
        'Angola',
        'Argentina',
        'Armenia',
        'Australia',
        'Austria',
        'Azerbaijan',
        'Bahamas',
        'Bangladesh',
        'Barbados',
        'Belarus',
        'Belgium',
        'Belize',
        'Benin',
        'Bhutan',
        'Bolivia',
        'Bosnia and Herzegovina',
        'Botswana',
        'Brazil',
        'Brunei',
        'Bulgaria',
        'Burkina Faso',
        'Burundi',
        'Cabo Verde',
        'Cambodia',
        'Cameroon',
        'Canada',
        'Central African Republic',
        'Chad',
        'Chile',
        'China',
        'Colombia',
        'Congo (Congo-Brazzaville)',
        'Congo (Democratic Republic of the Congo)',
        'Costa Rica',
        'Croatia',
        'Cuba',
        'Cyprus',
        'Czechia (Czech Republic)',
        'Denmark',
        'Dominica',
        'Dominican Republic',
        'Ecuador',
        'El Salvador',
        'Equatorial Guinea',
        'Eritrea',
        'Estonia',
        'Ethiopia',
        'Fiji',
        'Finland',
        'France',
        'Gabon',
        'Gambia',
        'Georgia',
        'Germany',
        'Ghana',
        'Greece',
        'Grenada',
        'Guatemala',
        'Guinea',
        'Guinea-Bissau',
        'Guyana',
        'Haiti',
        'Honduras',
        'Hungary',
        'Iceland',
        'India',
        'Indonesia',
        'Iran',
        'Ireland',
        'Italy',
        'Jamaica',
        'Japan',
        'Kazakhstan',
        'Kenya',
        'Kiribati',
        'Korea, North',
        'Korea, South',
        'Kyrgyzstan',
        'Laos',
        'Latvia',
        'Lesotho',
        'Liberia',
        'Libya',
        'Liechtenstein',
        'Lithuania',
        'Luxembourg',
        'Madagascar',
        'Malawi',
        'Malaysia',
        'Maldives',
        'Mali',
        'Malta',
        'Marshall Islands',
        'Mexico',
        'Micronesia',
        'Moldova',
        'Monaco',
        'Mongolia',
        'Montenegro',
        'Mozambique',
        'Myanmar',
        'Namibia',
        'Nauru',
        'Nepal',
        'Netherlands',
        'New Zealand',
        'Nicaragua',
        'Niger',
        'Nigeria',
        'North Macedonia',
        'Norway',
        'Pakistan',
        'Palau',
        'Panama',
        'Papua New Guinea',
        'Paraguay',
        'Peru',
        'Philippines',
        'Poland',
        'Portugal',
        'Romania',
        'Russia',
        'Rwanda',
        'Saint Kitts and Nevis',
        'Saint Lucia',
        'Saint Vincent and the Grenadines',
        'Samoa',
        'San Marino',
        'Sao Tome and Principe',
        'Senegal',
        'Serbia',
        'Seychelles',
        'Sierra Leone',
        'Singapore',
        'Slovakia',
        'Slovenia',
        'Solomon Islands',
        'South Africa',
        'South Sudan',
        'Spain',
        'Sri Lanka',
        'Suriname',
        'Sweden',
        'Switzerland',
        'Taiwan',
        'Tajikistan',
        'Tanzania',
        'Thailand',
        'Timor-Leste',
        'Togo',
        'Tonga',
        'Trinidad and Tobago',
        'Tunisia',
        'Turkey',
        'Turkmenistan',
        'Tuvalu',
        'Uganda',
        'Ukraine',
        'United Kingdom',
        'United States of America',
        'Uruguay',
        'Uzbekistan',
        'Vanuatu',
        'Vatican City',
        'Venezuela',
        'Vietnam',
        'Zambia',
        'Zimbabwe',
    ];

    const isSaudiNationality = () => nationality === 'Saudi Arabia';

    // Filter nationalities based on search query
    const filteredNationalities = nationalityItems.filter(country =>
        country.toLowerCase().includes(nationalitySearchQuery.toLowerCase())
    );

    // Initial DOB formatting on mount
    useEffect(() => {
        setDisplayDob(formatDate(dob));
    }, [dob]);

    const formatDate = (date) => {
        if (!date) return t('date.format') || 'DD/MM/YYYY'; // Use i18n
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    // Format date for ELM API (YYYY-MM-DD format - backend converts to YYYY-MM)
    const formatDateForElm = (date) => {
        if (!date) return null;
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${year}-${month}-${day}`;
    };

    // Handle ELM identity verification
    // ID type is auto-detected from first digit (1=Saudi NIN, 2=Iqama)
    const handleElmVerify = async () => {
        // Validate required fields
        if (!nationalId || !dob) {
            Alert.alert(
                t('common.error') || 'Error',
                isRTL
                    ? 'يرجى إدخال رقم الهوية وتاريخ الميلاد أولاً'
                    : 'Please enter National ID and Date of Birth first'
            );
            return;
        }

        // Validate national ID format (auto-detect type from first digit)
        if (!nationalId.startsWith('1') && !nationalId.startsWith('2')) {
            Alert.alert(
                t('common.error') || 'Error',
                isRTL
                    ? 'رقم الهوية يجب أن يبدأ بـ 1 (سعودي) أو 2 (إقامة)'
                    : 'ID must start with 1 (Saudi) or 2 (Iqama)'
            );
            return;
        }

        try {
            setElmVerifying(true);
            const formattedDob = formatDateForElm(dob);

            const result = await verifyElmIdentity(nationalId, formattedDob);

            if (result.verified !== false) {
                setElmVerified(true);
                setElmData(result);

                Alert.alert(
                    t('common.success') || 'Success',
                    isRTL ? 'تم التحقق من الهوية بنجاح' : 'Identity verified successfully'
                );
            } else {
                Alert.alert(
                    t('common.error') || 'Error',
                    result.error || (isRTL ? 'فشل التحقق' : 'Verification failed')
                );
            }
        } catch (error) {
            Alert.alert(
                t('common.error') || 'Error',
                error.message || (isRTL ? 'حدث خطأ أثناء التحقق' : 'Error during verification')
            );
        } finally {
            setElmVerifying(false);
        }
    };

    // Reset ELM verification when key fields change
    const resetElmVerification = () => {
        if (elmVerified) {
            setElmVerified(false);
            setElmData(null);
        }
    };

    const validateForm = async () => {
        setGeneralError('');
        setNationalIdError('');
        let isValid = true;

        // ELM verification is required (name, gender, nationality come from ELM)
        if (!ELM_DISABLED && !elmVerified) {
            setGeneralError(
                isRTL
                    ? 'يرجى التحقق من الهوية أولاً'
                    : 'Please verify your identity first'
            );
            isValid = false;
        }

        if (!nationalId.trim()) {
            setGeneralError(t('patientInfo.nationalIdRequired') || 'National ID is required.');
            isValid = false;
        } else {
            const nationalIdRegex = /^\d{10}$/; // 10 digits
            if (!nationalIdRegex.test(nationalId.trim())) {
                setNationalIdError(t('patientInfo.nationalIdInvalid') || 'National ID must be 10 digits.');
                isValid = false;
            } else {
                // Validate national ID prefix (auto-detect: 1=Saudi, 2=Iqama)
                if (!nationalId.startsWith('1') && !nationalId.startsWith('2')) {
                    setNationalIdError(
                        isRTL
                            ? 'رقم الهوية يجب أن يبدأ بـ 1 (سعودي) أو 2 (إقامة)'
                            : 'ID must start with 1 (Saudi) or 2 (Iqama)'
                    );
                    isValid = false;
                } else {
                    // Check if nationalId is already registered
                    try {
                        const result = await checkNationalIdAvailability(nationalId.trim());
                        if (!result.available) {
                            setNationalIdError(isRTL ? result.messageAr : result.message);
                            isValid = false;
                        }
                    } catch (error) {
                        console.error('Error checking national ID:', error);
                        // Continue with submission, backend will validate
                    }
                }
            }
        }
        // Validate DOB based on date format
        if (dateFormat === 'hijri') {
            if (!hijriDateText || !hijriDateText.trim()) {
                setGeneralError(t('patientInfo.dobRequired') || 'Date of Birth is required.');
                isValid = false;
            } else if (!/^\d{1,2}-\d{1,2}-\d{4}$/.test(hijriDateText.trim())) {
                setGeneralError(isRTL ? 'صيغة التاريخ الهجري غير صحيحة (يوم-شهر-سنة)' : 'Invalid Hijri date format (DD-MM-YYYY)');
                isValid = false;
            }
        } else if (!dob) {
            setGeneralError(t('patientInfo.dobRequired') || 'Date of Birth is required.');
            isValid = false;
        }
        if (!signatureData) {
            setGeneralError(t('patientInfo.signatureRequired') || 'Signature is required.');
            isValid = false;
        }
        // ELM verification is mandatory (unless disabled)
        if (!ELM_DISABLED && !elmVerified) {
            setGeneralError(
                isRTL
                    ? 'يجب التحقق من الهوية قبل التسجيل'
                    : 'Identity verification is required before registration'
            );
            isValid = false;
        }
        return isValid;
    };

    const handleSignatureOK = (signature) => {
        setSignatureData(signature);
    };

    const handleClearSignature = () => {
        setSignatureData(null);
        signatureRef.current?.clearSignature();
        setGeneralError('');
    };

    const handleComplete = async () => {
        const isValid = await validateForm();
        if (!isValid) {
            return;
        }
        setGeneralError('');
        setIsUploadingSignature(true);

        let signatureUrl = '';
        let signatureFileId = null;
        try {
            // 1. Upload Signature using secure endpoint
            console.log('📝 Starting secure signature upload...');

            // Strip the data URI prefix for both platforms
            const base64Data = signatureData.replace(/^data:image\/\w+;base64,/, '');

            const timestamp = new Date().getTime();
            const dirs = ReactNativeBlobUtil.fs.dirs;

            // Use DocumentDir for iOS which has better write permissions
            const baseDir = Platform.OS === 'ios' ? dirs.DocumentDir : dirs.CacheDir;
            const filePath = `${baseDir}/signature_${timestamp}.png`;

            console.log('💾 Writing signature to file:', filePath);
            console.log('📁 Base directory:', baseDir);

            // Ensure the directory exists (especially important for iOS)
            try {
                const dirExists = await ReactNativeBlobUtil.fs.isDir(baseDir);
                console.log('📂 Directory exists:', dirExists);
            } catch (dirErr) {
                console.log('⚠️ Directory check failed:', dirErr.message);
            }

            // Write the file with error handling
            try {
                await ReactNativeBlobUtil.fs.writeFile(filePath, base64Data, 'base64');
                console.log('✅ File written successfully');
            } catch (writeError) {
                console.error('❌ Write error details:', writeError);
                throw new Error(`Failed to write signature file: ${writeError.message || 'Unknown error'}`);
            }

            // Check if file was created successfully
            const fileExists = await ReactNativeBlobUtil.fs.exists(filePath);
            console.log('✅ File exists:', fileExists);

            if (!fileExists) {
                throw new Error('Failed to create signature file - file does not exist after write');
            }

            // Get file stats for debugging
            let fileSize = null;
            try {
                const stats = await ReactNativeBlobUtil.fs.stat(filePath);
                console.log('📊 File stats:', JSON.stringify(stats, null, 2));
                fileSize = stats.size;
            } catch (statErr) {
                console.log('⚠️ Could not get file stats:', statErr.message);
            }

            const file = {
                uri: Platform.OS === 'ios' ? filePath : `file://${filePath}`,
                type: 'image/png',
                name: `signature_${timestamp}.png`,
                size: fileSize,
            };

            // Validate file before upload
            const validation = validateFile(file, 'signature');
            if (!validation.isValid) {
                throw new Error(validation.error);
            }

            console.log('📤 Uploading file via secure endpoint:', JSON.stringify(file, null, 2));

            // Use the guest upload endpoint (no auth required for new users)
            const uploadResponse = await uploadGuestSignature(file);

            console.log('✅ Upload response:', uploadResponse);

            // New secure system returns fileId, legacy returns url
            signatureFileId = uploadResponse?.fileId;
            signatureUrl = uploadResponse?.url || '';

            console.log('🎯 Signature FileId:', signatureFileId);
            console.log('🎯 Signature URL (legacy):', signatureUrl);

            if (!signatureFileId && !signatureUrl) {
                throw new Error('No signature reference returned from upload');
            }

            // Clean up the temporary file after successful upload
            try {
                await ReactNativeBlobUtil.fs.unlink(filePath);
                console.log('🗑️ Temporary file deleted:', filePath);
            } catch (cleanupErr) {
                console.log('⚠️ Could not delete temporary file:', cleanupErr.message);
                // Non-critical error, continue with the flow
            }

        } catch (uploadErr) {
            console.error("❌ Signature Upload Error:", uploadErr);
            console.error("Error details:", {
                message: uploadErr.message,
                response: uploadErr.response?.data,
                status: uploadErr.response?.status,
            });
            const errorMessage = uploadErr.response?.data?.message || uploadErr.message || t('patientInfo.uploadFailed') || 'Failed to upload signature.';
            setGeneralError(errorMessage);
            Alert.alert(t('common.error') || 'Error', errorMessage);
            setIsUploadingSignature(false);
            return;
        }

        setIsUploadingSignature(false);

        // 2. Submit Patient Consent - Include both signatureFileId (new) and signatureUrl (legacy) for backward compatibility
        const payload = {
            emailOrPhone: emailOrPhone, // Passed from OTP screen
            signatureUrl: signatureUrl, // Legacy field for backward compatibility
            signatureFileId: signatureFileId, // New secure field
            nationalId: nationalId.trim(),
            dob: dob.toISOString(), // Ensure DOB is ISO string for backend (Gregorian)
            hijriDob: dateFormat === 'hijri' && hijriDateText ? hijriDateText : undefined, // Hijri date if selected
            // Include phone if user registered with email (and vice versa)
            phone: user?.email ? user?.phone : undefined,
            email: user?.phone ? user?.email : undefined,
            // ELM verification data (name, gender, nationality come from ELM)
            elmVerified: elmVerified,
            elmData: elmData, // Full ELM data: fullName, fullNameAr, fullNameEn, gender, nationality
        };

        submitConsent(payload, {
            onSuccess: async (response) => {
                // Fix: The API returns user data directly, but setAuth expects { user, token } structure
                setAuth({ user: response, token: response.token });

                // Check if we're coming from a booking flow (DoctorProfile with booking data)
                // Validate that ALL required booking data is present
                const doctor = targetParams?.doctor;
                const preSelectedTime = targetParams?.preSelectedTime;
                const hasCompleteBookingData =
                    targetScreen === 'DoctorProfile' &&
                    doctor &&
                    doctor.id &&
                    doctor.fullName &&
                    doctor.providerService &&
                    preSelectedTime &&
                    preSelectedTime.startTime &&
                    preSelectedTime.endTime &&
                    (preSelectedTime.date || targetParams.preSelectedDate);

                console.log('🔍 Booking flow validation:', {
                    targetScreen,
                    hasDoctor: !!doctor,
                    doctorId: doctor?.id,
                    providerService: doctor?.providerService,
                    hasPreSelectedTime: !!preSelectedTime,
                    startTime: preSelectedTime?.startTime,
                    endTime: preSelectedTime?.endTime,
                    date: preSelectedTime?.date || targetParams?.preSelectedDate,
                    hasCompleteBookingData
                });

                if (hasCompleteBookingData) {
                    // Create appointment automatically after successful patient info submission
                    try {
                        // Debug: Log the response structure
                        console.log('📋 Response from consent submission:', JSON.stringify(response, null, 2));

                        const patientId = response.user?.id || response.user?._id || response.id || response._id;

                        if (!patientId) {
                            console.error('❌ No patient ID found in response!');
                            throw new Error('Patient ID not found after consent submission');
                        }

                        const bookingPayload = {
                            patientName: response.user?.fullName || elmData?.fullName || '',
                            providerName: doctor.fullName,
                            date: preSelectedTime.date || targetParams.preSelectedDate,
                            startTime: preSelectedTime.startTime,
                            endTime: preSelectedTime.endTime,
                            provider: doctor.id,
                            patient: patientId,
                            reason: targetParams.preSelectedReason || '',
                            providerService: doctor.providerService,
                            currentTime: moment().locale('en').format('YYYY-MM-DD HH:mm:ss'),
                            clientTz: moment.tz.guess(),
                        };

                        const newAppointment = await createAppointment(bookingPayload);

                        if (newAppointment && (newAppointment.id || newAppointment._id)) {
                            // Navigate directly to Checkout with appointment ID
                            navigation.reset({
                                index: 0,
                                routes: [
                                    { name: 'Main' },
                                    { name: 'Checkout', params: { id: newAppointment.id || newAppointment._id } }
                                ],
                            });
                        } else {
                            throw new Error('Failed to create appointment');
                        }
                    } catch (appointmentErr) {
                        console.error('❌ Error creating appointment after patient info:', appointmentErr);
                        console.error('Error details:', appointmentErr?.response?.data);
                        Alert.alert(
                            t('common.error') || 'Error',
                            appointmentErr?.response?.data?.message || appointmentErr?.message || 'Failed to create appointment. Please try booking again.',
                            [
                                {
                                    text: 'OK',
                                    onPress: () => {
                                        // Navigate back to DoctorProfile to retry
                                        navigation.reset({
                                            index: 0,
                                            routes: [
                                                { name: 'Main' },
                                                { name: 'DoctorProfile', params: { doctor: targetParams.doctor } }
                                            ],
                                        });
                                    }
                                }
                            ]
                        );
                    }
                } else {
                    // Normal flow - just navigate to targetScreen or Main
                    console.log('ℹ️ Normal flow - no automatic appointment creation');
                    if (targetScreen === 'DoctorProfile' && !hasCompleteBookingData) {
                        console.warn('⚠️ Incomplete booking data - navigating to DoctorProfile for user to re-select time');
                    }

                    Alert.alert(t('patientInfo.success') || "Success", t('patientInfo.consentSuccess') || "Patient information and consent submitted.");
                    if (targetScreen) {
                        navigation.replace(targetScreen, targetParams);
                    } else {
                        navigation.reset({
                            index: 0,
                            routes: [{ name: 'Main' }],
                        });
                    }
                }
            },
            onError: (consentErr) => {
                console.error("Consent Submission Error:", consentErr);
                const errorMessage = consentErr.response?.data?.message || t('patientInfo.consentFailed') || 'Failed to submit patient consent.';
                setGeneralError(errorMessage);
                Alert.alert(t('common.error'), errorMessage);
            },
        });
    };

    const isSubmitting = isSubmittingConsent || isUploadingSignature || isCreatingAppointment;

    // Web style for react-native-signature-canvas (from old app)
    const webStyle = `.m-signature-pad--footer { display: none; margin: 0px; padding: 0px; background-color: transparent; }
                     .m-signature-pad { background-color: transparent; border: 0; }
                     .m-signature-pad--body { border: none; }`;


    return (
        <SafeAreaView style={styles.container}>
            <View style={[styles.header, rowStyle]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Image source={ICONS.back} style={[styles.backIcon, isRTL && { transform: [{ scaleX: -1 }] }]} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('patientInfo.headerTitle') || "Patient Information"}</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 40 }} scrollEnabled={!isSigningActive}>
                {generalError ? <Text style={[styles.generalErrorText, alignText]}>{generalError}</Text> : null}

                {/* Full Name */}
                <View style={styles.inputGroup}>
                    <View style={[styles.labelRow, rowStyle]}>
                        <Text style={[styles.label, alignText]}>{t('patientInfo.fullNameLabel') || "Full Name*"}</Text>
                        {!ELM_DISABLED && elmVerified && (
                            <View style={styles.verifiedBadgeSmall}>
                                <Image source={ICONS.check} style={styles.verifiedBadgeIcon} />
                                <Text style={styles.verifiedBadgeText}>
                                    {isRTL ? 'تم التحقق' : 'Verified'}
                                </Text>
                            </View>
                        )}
                    </View>
                    <TextInput
                        style={[
                            styles.input,
                            alignText,
                            generalError && !fullName.trim() && { borderColor: 'red' },
                            (!ELM_DISABLED && elmVerified) && styles.inputDisabled
                        ]}
                        placeholder={t('patientInfo.fullNamePlaceholder') || "Enter your full name"}
                        placeholderTextColor={COLORS.gray400}
                        value={fullName}
                        onChangeText={setFullName}
                        editable={ELM_DISABLED || !elmVerified}
                    />
                </View>

                {/* Nationality */}
                <View style={styles.inputGroup}>
                    <Text style={[styles.label, alignText]}>{t('patientInfo.nationalityLabel') || "Nationality*"}</Text>
                    <TouchableOpacity
                        style={[styles.inputWithIcon, rowStyle, generalError && !nationality && { borderColor: 'red' }]}
                        onPress={() => setIsNationalityModalOpen(true)}
                    >
                        <Text style={[styles.inputText, alignText, { flex: 1 }, !nationality && { color: COLORS.gray400 }]}>
                            {nationality || (t('patientInfo.selectNationality') || "Select your nationality")}
                        </Text>
                        <Image source={ICONS.chevronDown} style={[styles.icon, isRTL && { transform: [{ scaleX: -1 }] }]} />
                    </TouchableOpacity>
                </View>

                {/* National ID */}
                <View style={styles.inputGroup}>
                    <Text style={[styles.label, alignText]}>{t('patientInfo.nationalIdLabel') || "National ID*"}</Text>
                    <TextInput
                        style={[styles.input, alignText, (nationalIdError || (generalError && !nationalId.trim())) && { borderColor: 'red' }]}
                        placeholder={
                            isSaudiNationality()
                                ? (isRTL ? 'أدخل رقم الهوية الوطنية (يبدأ بـ 1)' : 'Enter National ID (starts with 1)')
                                : (isRTL ? 'أدخل رقم الإقامة (يبدأ بـ 2)' : 'Enter Iqama Number (starts with 2)')
                        }
                        placeholderTextColor={COLORS.gray400}
                        value={nationalId}
                        onChangeText={(text) => {
                            setNationalId(text);
                            if (nationalIdError) setNationalIdError('');
                            if (generalError) setGeneralError('');
                            resetElmVerification();
                        }}
                        keyboardType="numeric"
                        maxLength={10}
                    />
                    {nationalIdError ? <Text style={[styles.errorText, alignText]}>{nationalIdError}</Text> : null}
                </View>

                {/* Date Format Toggle */}
                <View style={styles.inputGroup}>
                    <Text style={[styles.label, alignText]}>
                        {isRTL ? 'صيغة التاريخ' : 'Date Format'}
                    </Text>
                    <View style={[styles.dateFormatToggle, rowStyle]}>
                        <TouchableOpacity
                            style={[
                                styles.dateFormatOption,
                                dateFormat === 'gregorian' && styles.dateFormatOptionActive
                            ]}
                            onPress={() => setDateFormat('gregorian')}
                        >
                            <Text style={[
                                styles.dateFormatText,
                                dateFormat === 'gregorian' && styles.dateFormatTextActive
                            ]}>
                                {isRTL ? 'ميلادي' : 'Gregorian'}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.dateFormatOption,
                                dateFormat === 'hijri' && styles.dateFormatOptionActive
                            ]}
                            onPress={() => setDateFormat('hijri')}
                        >
                            <Text style={[
                                styles.dateFormatText,
                                dateFormat === 'hijri' && styles.dateFormatTextActive
                            ]}>
                                {isRTL ? 'هجري' : 'Hijri'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* DOB */}
                <View style={styles.inputGroup}>
                    <Text style={[styles.label, alignText]}>
                        {t('patientInfo.dobLabel') || "Date of Birth"}
                        <Text style={styles.dateFormatHint}>
                            {' '}({dateFormat === 'hijri' ? (isRTL ? 'هجري' : 'Hijri') : (isRTL ? 'ميلادي' : 'Gregorian')})
                        </Text>
                    </Text>
                    {dateFormat === 'hijri' ? (
                        // Hijri date picker with calendar UI
                        <HijriDatePicker
                            value={dob}
                            onChange={(gregorianDate, hijriDateStr) => {
                                if (gregorianDate) {
                                    setDob(gregorianDate);
                                    setHijriDateText(hijriDateStr);
                                    setDisplayDob(hijriDateStr);
                                } else {
                                    setHijriDateText('');
                                    setDisplayDob('');
                                }
                                resetElmVerification();
                            }}
                            placeholder={isRTL ? 'اختر تاريخ الميلاد الهجري' : 'Select Hijri birth date'}
                            isRTL={isRTL}
                            maxDate={new Date()}
                            style={generalError && !hijriDateText ? { borderColor: 'red' } : {}}
                        />
                    ) : (
                        // Gregorian date picker
                        <>
                            <TouchableOpacity style={[styles.inputWithIcon, rowStyle, generalError && !dob && { borderColor: 'red' }]} onPress={() => setIsDatePickerOpen(true)}>
                                <Text style={[styles.inputText, alignText, { flex: 1 }]}>{displayDob}</Text>
                                <Image source={ICONS.calendar} style={styles.iconBlue} />
                            </TouchableOpacity>
                            <DatePicker
                                modal
                                open={isDatePickerOpen}
                                date={dob}
                                mode="date"
                                onConfirm={(selectedDate) => {
                                    setIsDatePickerOpen(false);
                                    setDob(selectedDate);
                                    setDisplayDob(formatDate(selectedDate));
                                    resetElmVerification();
                                }}
                                onCancel={() => {
                                    setIsDatePickerOpen(false);
                                }}
                            />
                        </>
                    )}
                </View>

                {/* ELM Verify Button - Required for registration (hidden when ELM is disabled) */}
                {!ELM_DISABLED && (
                    <View style={styles.inputGroup}>
                        <Text style={[styles.requiredLabel, alignText]}>
                            <Text style={{ color: '#EF4444' }}>* </Text>
                            {isRTL
                                ? 'التحقق من الهوية مطلوب للتسجيل'
                                : 'Identity verification is required for registration'}
                        </Text>
                        <TouchableOpacity
                            style={[
                                styles.elmVerifyBtn,
                                elmVerified && styles.elmVerifyBtnVerified,
                                elmVerifying && styles.elmVerifyBtnDisabled
                            ]}
                            onPress={handleElmVerify}
                            disabled={elmVerifying || elmVerified}
                        >
                            {elmVerifying ? (
                                <View style={[styles.elmVerifyBtnContent, rowStyle]}>
                                    <ActivityIndicator size="small" color={COLORS.white} />
                                    <Text style={styles.elmVerifyBtnText}>
                                        {isRTL ? 'جاري التحقق...' : 'Verifying...'}
                                    </Text>
                                </View>
                            ) : elmVerified ? (
                                <View style={[styles.elmVerifyBtnContent, rowStyle]}>
                                    <Image source={ICONS.check} style={styles.elmVerifyIcon} />
                                    <Text style={styles.elmVerifyBtnText}>
                                        {isRTL ? 'تم التحقق من الهوية' : 'Identity Verified'}
                                    </Text>
                                </View>
                            ) : (
                                <View style={[styles.elmVerifyBtnContent, rowStyle]}>
                                    <Image source={ICONS.shield || ICONS.check} style={styles.elmVerifyIcon} />
                                    <Text style={styles.elmVerifyBtnText}>
                                        {isRTL ? 'تحقق من الهوية' : 'Verify Identity'}
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                        {elmVerified && elmData && (
                            <View style={styles.elmVerifiedBadge}>
                                <Image source={ICONS.check} style={styles.elmVerifiedIcon} />
                                <Text style={styles.elmVerifiedText}>
                                    {isRTL ? 'تم التحقق من الهوية' : 'Identity Verified'}
                                </Text>
                            </View>
                        )}
                        {/* ELM Verified Data Display - Read Only */}
                        {elmVerified && elmData && (
                            <View style={styles.elmDataContainer}>
                                <View style={styles.elmDataRow}>
                                    <Text style={styles.elmDataLabel}>{isRTL ? 'الاسم (عربي):' : 'Name (Arabic):'}</Text>
                                    <Text style={styles.elmDataValue}>{elmData.fullNameAr}</Text>
                                </View>
                                <View style={styles.elmDataRow}>
                                    <Text style={styles.elmDataLabel}>{isRTL ? 'الاسم (إنجليزي):' : 'Name (English):'}</Text>
                                    <Text style={styles.elmDataValue}>{elmData.fullNameEn}</Text>
                                </View>
                                <View style={styles.elmDataRow}>
                                    <Text style={styles.elmDataLabel}>{isRTL ? 'الجنس:' : 'Gender:'}</Text>
                                    <Text style={styles.elmDataValue}>
                                        {isRTL
                                            ? (elmData.gender === 'male' ? 'ذكر' : 'أنثى')
                                            : (elmData.gender === 'male' ? 'Male' : 'Female')}
                                    </Text>
                                </View>
                                <View style={styles.elmDataRow}>
                                    <Text style={styles.elmDataLabel}>{isRTL ? 'الجنسية:' : 'Nationality:'}</Text>
                                    <Text style={styles.elmDataValue}>{elmData.nationality}</Text>
                                </View>
                            </View>
                        )}
                    </View>
                )}

                {/* Signature Pad UI */}
                <View style={styles.inputGroup}>
                    <Text style={[styles.label, alignText]}>{t('patientInfo.signatureLabel') || "Patient Signature*"}</Text>
                    <View style={[styles.signatureBox, generalError && !signatureData && { borderColor: 'red' }]}>
                        <SignatureScreen
                            ref={signatureRef}
                            onOK={handleSignatureOK}
                            onBegin={() => setIsSigningActive(true)} // Disable scroll when signing starts
                            onEnd={() => {
                                setIsSigningActive(false); // Re-enable scroll when signing ends
                                signatureRef.current?.readSignature(); // Read signature when drawing ends
                            }}
                            webStyle={webStyle}
                            autoClear={false} // Prevent auto clear on orientation change
                            descriptionText={t('patientInfo.signHere') || "Sign here"} // Placeholder text
                        />
                    </View>
                    <TouchableOpacity
                        style={[styles.clearBtn, rowStyle]}
                        onPress={handleClearSignature}
                    >
                        <Image source={ICONS.refresh} style={[styles.refreshIcon, isRTL && { marginLeft: 8, marginRight: 0 }]} />
                        <Text style={styles.clearText}>{t('patientInfo.clearSignature') || "Clear Signature"}</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.btn, (isSubmitting || (!ELM_DISABLED && !elmVerified)) && { backgroundColor: COLORS.gray500 }]}
                    onPress={handleComplete}
                    disabled={isSubmitting || (!ELM_DISABLED && !elmVerified)}
                >
                    <Text style={styles.btnText}>
                        {isSubmitting
                            ? (t('common.submitting') || "Submitting...")
                            : (!ELM_DISABLED && !elmVerified)
                                ? (isRTL ? "يجب التحقق من الهوية أولاً" : "Verify identity first")
                                : (t('patientInfo.acceptAndContinue') || "Accept & Continue")}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Nationality Selector Modal */}
            <Modal
                visible={isNationalityModalOpen}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsNationalityModalOpen(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t('patientInfo.selectNationality') || "Select Nationality"}</Text>
                            <TouchableOpacity onPress={() => setIsNationalityModalOpen(false)}>
                                <Image source={ICONS.close} style={styles.modalCloseIcon} />
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            style={styles.searchInput}
                            placeholder={t('common.search') || "Search..."}
                            placeholderTextColor={COLORS.gray400}
                            value={nationalitySearchQuery}
                            onChangeText={setNationalitySearchQuery}
                        />

                        <FlatList
                            data={filteredNationalities}
                            keyExtractor={(item, index) => index.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.modalItem}
                                    onPress={() => {
                                        setNationality(item);
                                        setIsNationalityModalOpen(false);
                                        setNationalitySearchQuery('');
                                        resetElmVerification();
                                    }}
                                >
                                    <Text style={[styles.modalItemText, item === nationality && styles.modalItemTextSelected]}>
                                        {item}
                                    </Text>
                                    {item === nationality && (
                                        <Image source={ICONS.check} style={styles.modalCheckIcon} />
                                    )}
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={
                                <View style={styles.emptyList}>
                                    <Text style={styles.emptyListText}>{t('common.noResults') || "No results found"}</Text>
                                </View>
                            }
                        />
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: COLORS.white, borderBottomWidth: 1, borderColor: COLORS.gray100 },
    backIcon: { width: 24, height: 24, tintColor: COLORS.gray700 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary },

    scrollView: { flex: 1, padding: 20 },

    inputGroup: { marginBottom: 20 },
    label: { fontSize: 14, color: COLORS.textPrimary, marginBottom: 8, fontWeight: '500' },
    requiredLabel: { fontSize: 13, color: '#EF4444', marginBottom: 8, fontWeight: '500' },

    input: { borderWidth: 1, borderColor: COLORS.gray300, borderRadius: 8, padding: 15, fontSize: 14, color: COLORS.textPrimary, backgroundColor: COLORS.white },

    dropdownContainer: { height: 50, borderWidth: 1, borderColor: COLORS.gray300, borderRadius: 8, backgroundColor: COLORS.white },
    dropdownStyle: { backgroundColor: COLORS.white, borderWidth: 0 },
    dropdownMenu: { borderWidth: 1, borderColor: COLORS.gray300, borderRadius: 8, backgroundColor: COLORS.white },
    dropdownText: { fontSize: 14, color: COLORS.textPrimary },
    dropdownItemText: { fontSize: 14, color: COLORS.textPrimary },
    dropdownArrow: { width: 14, height: 14, tintColor: COLORS.gray600 },

    inputWithIcon: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: COLORS.gray300, borderRadius: 8, padding: 15, backgroundColor: COLORS.white },

    inputText: { fontSize: 14, color: COLORS.textPrimary, flex: 1 },
    icon: { width: 14, height: 14, tintColor: COLORS.gray600 },
    iconBlue: { width: 20, height: 20, tintColor: COLORS.primary },

    signatureBox: { height: 200, borderWidth: 1, borderColor: COLORS.gray300, borderRadius: 8, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }, // White background to match other inputs

    clearBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: COLORS.gray300, padding: 10, borderRadius: 8, alignSelf: 'flex-start' },
    refreshIcon: { width: 14, height: 14, tintColor: COLORS.textPrimary, marginRight: 5 },
    clearText: { fontSize: 12, color: COLORS.textPrimary },

    footer: { padding: 20, backgroundColor: COLORS.white, borderTopWidth: 1, borderColor: COLORS.gray200 },
    btn: { backgroundColor: COLORS.primary, borderRadius: 8, height: 50, alignItems: 'center', justifyContent: 'center' },
    btnText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },

    errorText: { color: 'red', fontSize: 12, marginTop: 5, marginLeft: 5 },
    generalErrorText: { color: 'red', fontSize: 14, textAlign: 'center', marginBottom: 10 },

    // Label row with verified badge
    labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, justifyContent: 'space-between' },

    // Verified badge small (for name field)
    verifiedBadgeSmall: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    verifiedBadgeIcon: { width: 12, height: 12, tintColor: '#10B981', marginRight: 4 },
    verifiedBadgeText: { fontSize: 11, color: '#10B981', fontWeight: '500' },

    // Disabled input style
    inputDisabled: { backgroundColor: '#F3F4F6', color: '#6B7280' },

    // Date format toggle
    dateFormatToggle: { flexDirection: 'row', gap: 10 },
    dateFormatOption: { flex: 1, paddingVertical: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: COLORS.gray300, borderRadius: 8, alignItems: 'center', backgroundColor: COLORS.white },
    dateFormatOptionActive: { borderColor: COLORS.primary, backgroundColor: '#F0FDFA' },
    dateFormatText: { fontSize: 14, color: COLORS.gray600, fontWeight: '500' },
    dateFormatTextActive: { color: COLORS.primary, fontWeight: '600' },
    dateFormatHint: { fontSize: 12, color: COLORS.gray500, fontWeight: '400' },

    // ELM Verify Button
    elmVerifyBtn: { backgroundColor: COLORS.primary, borderRadius: 8, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
    elmVerifyBtnVerified: { backgroundColor: '#10B981' },
    elmVerifyBtnDisabled: { backgroundColor: COLORS.gray400 },
    elmVerifyBtnContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    elmVerifyBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '600' },
    elmVerifyIcon: { width: 18, height: 18, tintColor: COLORS.white },

    // ELM Verified Badge
    elmVerifiedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', padding: 12, borderRadius: 8, marginTop: 10, borderWidth: 1, borderColor: '#A7F3D0' },
    elmVerifiedIcon: { width: 16, height: 16, tintColor: '#10B981', marginRight: 8 },
    elmVerifiedText: { fontSize: 13, color: '#047857', flex: 1 },
    elmDataContainer: { backgroundColor: '#F0FDF4', padding: 15, borderRadius: 8, marginTop: 10, borderWidth: 1, borderColor: '#BBF7D0' },
    elmDataRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    elmDataLabel: { fontSize: 13, color: '#6B7280', flex: 1 },
    elmDataValue: { fontSize: 14, color: '#111827', fontWeight: '500', flex: 2, textAlign: 'right' },

    // Modal styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%', paddingBottom: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.gray200 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary },
    modalCloseIcon: { width: 24, height: 24, tintColor: COLORS.gray600 },
    searchInput: { margin: 15, marginBottom: 10, borderWidth: 1, borderColor: COLORS.gray300, borderRadius: 8, padding: 12, fontSize: 14, color: COLORS.textPrimary },
    modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: COLORS.gray100 },
    modalItemText: { fontSize: 15, color: COLORS.textPrimary },
    modalItemTextSelected: { color: COLORS.primary, fontWeight: '600' },
    modalCheckIcon: { width: 20, height: 20, tintColor: COLORS.primary },
    emptyList: { padding: 40, alignItems: 'center' },
    emptyListText: { fontSize: 14, color: COLORS.gray500 },
});

export default PatientInfoScreen;