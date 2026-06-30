function isFieldFilled(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  if (Array.isArray(value) && value.length === 0) return false;
  return true;
}

function buildRequiredFields(user) {
  const requiredFields = [
    { key: 'fullName', value: user.fullName, tab: 'patient', label: 'Full name' },
    { key: 'email', value: user.email, tab: 'patient', label: 'Email' },
    { key: 'phone', value: user.phone, tab: 'patient', label: 'Phone' },
    { key: 'dob', value: user.dob, tab: 'patient', label: 'Date of birth' },
    { key: 'gender', value: user.gender, tab: 'patient', label: 'Gender' },
    { key: 'nationality', value: user.nationality, tab: 'patient', label: 'Nationality' },
    {
      key: 'profileImage',
      value: user.profileImage || user.profileImageFileId,
      tab: 'patient',
      label: 'Profile photo',
    },
    { key: 'nationalId', value: user.nationalId, tab: 'patient', label: 'National ID' },
    {
      key: 'emergencyContactName',
      value: user.emergencyContact?.name,
      tab: 'patient',
      label: 'Emergency contact name',
    },
    {
      key: 'emergencyContactPhone',
      value: user.emergencyContact?.phone,
      tab: 'patient',
      label: 'Emergency contact phone',
    },
    { key: 'history', value: user.history, tab: 'medical', label: 'Medical history' },
    {
      key: 'preferredLanguage',
      value: user.preferredLanguage,
      tab: 'medical',
      label: 'Preferred language',
    },
  ];

  const isSaudiPhone = user.phone?.startsWith('+966') || user.phone?.startsWith('966');
  if (user.residencyType === 'KSA' || (user.residencyType === 'GLOBAL_ELM_OFF' && isSaudiPhone)) {
    requiredFields.push({
      key: 'isPhoneVerified',
      value: user.isPhoneVerified === true ? true : null,
      tab: 'verify',
      label: 'Phone verification',
      editable: false,
    });
  }

  requiredFields.push({
    key: 'isEmailVerified',
    value: user.isEmailVerified === true ? true : null,
    tab: 'verify',
    label: 'Email verification',
    editable: false,
  });

  return requiredFields;
}

/** Patient profile completion — matches web `profileCompletion.js`. */
export function calculatePatientProfileCompletion(user) {
  if (!user) return 0;

  const requiredFields = buildRequiredFields(user);
  const filledFields = requiredFields.filter((field) => isFieldFilled(field.value)).length;

  return Math.round((filledFields / requiredFields.length) * 100);
}

/** Returns missing fields so the app can route users to the right tab. */
export function getMissingPatientProfileFields(user) {
  if (!user) return [];

  return buildRequiredFields(user).filter((field) => !isFieldFilled(field.value));
}
